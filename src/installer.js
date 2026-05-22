import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { writePackageConfig, getToolRelativePath, updatePlatformFiles } from './config-writer.js';
import { runMcpAdd } from './mcp-add.js';
import { TOOL_TYPE_DIRS, usesSkillInit } from './schemas.js';

/**
 * Run a shell command with inherited stdio.
 * @param {string} command
 * @param {string} [cwd]
 */
function runCommand(command, cwd = process.cwd()) {
  execSync(command, {
    stdio: 'inherit',
    shell: true,
    cwd,
    env: { ...process.env, npm_config_yes: 'true' },
  });
}

/**
 * @param {unknown} err
 * @returns {boolean}
 */
function isPermissionError(err) {
  const message =
    err instanceof Error
      ? `${err.message}${'stderr' in err && err.stderr ? String(err.stderr) : ''}`
      : String(err);
  return /EACCES|permission denied|EPERM/i.test(message);
}

/**
 * @param {string} command
 * @param {string} [cwd]
 */
function runCommandSafe(command, cwd = process.cwd()) {
  try {
    execSync(command, {
      stdio: 'pipe',
      shell: true,
      cwd,
      env: { ...process.env, npm_config_yes: 'true' },
    });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err,
      permissionDenied: isPermissionError(err),
    };
  }
}

/**
 * @param {{ npm?: string; npx?: string; package?: string }} install
 * @returns {string | null}
 */
function resolvePackageName(install) {
  if (install.package) return install.package;
  const source = install.npm ?? install.npx ?? '';
  const match = source.match(/(?:npm install(?:\s+-g)?|npx\s+-y)\s+([@\w/-]+)/i);
  return match?.[1] ?? null;
}

/**
 * @typedef {'local' | 'skip' | 'cancel'} InstallFallbackChoice
 * @typedef {{ packageName: string; command: string; reason: string }} InstallFallbackRequest
 * @typedef {(request: InstallFallbackRequest) => Promise<InstallFallbackChoice>} PromptInstallFallback
 */

/**
 * @param {object} pkg
 * @param {object} installConfig
 * @param {string} cwd
 * @param {PromptInstallFallback} promptInstallFallback
 * @param {(message: string) => void} [onLog]
 */
async function installCli(
  pkg,
  installConfig,
  cwd,
  promptInstallFallback,
  onLog,
) {
  if (!installConfig) return { ok: true, method: 'none' };

  const packageName = resolvePackageName(installConfig);
  const aistackDir = path.join(cwd, '.aistack');

  if (installConfig.npm) {
    onLog?.(`Running: ${installConfig.npm}`);
    const globalResult = runCommandSafe(installConfig.npm);

    if (globalResult.ok) {
      onLog?.(`✅ Installed ${pkg.name} CLI globally`);
      return { ok: true, method: 'global' };
    }

    if (globalResult.permissionDenied) {
      const choice = await promptInstallFallback({
        packageName: pkg.name,
        command: installConfig.npm,
        reason: 'Global npm install requires permissions your user does not have',
      });

      if (choice === 'cancel') {
        return { ok: false, cancelled: true };
      }

      if (choice === 'skip') {
        onLog?.(`⚠ Skipped ${pkg.name} CLI install (permission denied)`);
        return { ok: true, method: 'skipped', warning: true };
      }

      if (choice === 'local' && packageName) {
        fs.mkdirSync(aistackDir, { recursive: true });
        const localCmd = `npm install --prefix "${aistackDir}" ${packageName}`;
        onLog?.(`Running: ${localCmd}`);
        const localResult = runCommandSafe(localCmd);

        if (localResult.ok) {
          onLog?.(`✅ Installed ${pkg.name} CLI locally → .aistack/node_modules/`);
          return { ok: true, method: 'local' };
        }

        onLog?.(
          `⚠ Local CLI install failed${
            localResult.error instanceof Error
              ? `: ${localResult.error.message}`
              : ''
          }`,
        );
      }
    } else if (installConfig.npx) {
      onLog?.(`Global install failed, trying npx…`);
    } else {
      return { ok: true, method: 'skipped', warning: true };
    }
  }

  if (installConfig.npx) {
    onLog?.(`Running: ${installConfig.npx}`);
    const npxResult = runCommandSafe(installConfig.npx);
    if (npxResult.ok) {
      onLog?.(`✅ ${pkg.name} CLI available via npx`);
      return { ok: true, method: 'npx' };
    }

    onLog?.(
      `⚠ npx failed${
        npxResult.error instanceof Error ? `: ${npxResult.error.message}` : ''
      }`,
    );
  }

  return { ok: true, method: 'skipped', warning: true };
}

/**
 * @param {object} init
 * @param {string} method
 * @param {string} cwd
 */
function resolveInitBinary(init, method, cwd) {
  if (method === 'local') {
    return path.join(cwd, '.aistack', 'node_modules', '.bin', init.command);
  }
  if (method === 'npx' || method === 'skipped') {
    const pkg = init.package ?? 'uipro-cli';
    return `npx -y ${pkg}`;
  }
  return init.command;
}

/**
 * @param {object} pkg
 * @param {import('./config-writer.js').ConfigTarget} clientTarget
 * @param {Record<string, Record<string, string>>} apiKeys
 * @param {(message: string) => void} [onLog]
 */
export async function installMCPOrAgent(
  pkg,
  clientTarget,
  apiKeys = {},
  onLog,
) {
  try {
    if (pkg.mcp_add) {
      runMcpAdd(pkg, clientTarget, apiKeys[pkg.id] ?? {});
      onLog?.(`✅ ${pkg.name} configured for ${clientTarget} via mcp-add`);
      return { id: pkg.id, success: true, configPath: null };
    }

    try {
      runCommand(pkg.install.npx);
    } catch {
      runCommand(pkg.install.npm);
    }

    const configResult = await writePackageConfig(
      clientTarget,
      pkg,
      apiKeys,
    );

    onLog?.(`✅ ${pkg.name} configured for ${clientTarget}`);

    return {
      id: pkg.id,
      success: true,
      configPath: configResult.path,
    };
  } catch (err) {
    return {
      id: pkg.id,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Install skill via uipro init (or similar) into IDE skills folders.
 * @param {object} pkg
 * @param {string} aiTarget
 * @param {PromptInstallFallback} promptInstallFallback
 * @param {(message: string) => void} [onLog]
 * @param {string} [cwd]
 */
export async function installSkillInit(
  pkg,
  aiTarget,
  promptInstallFallback,
  onLog,
  cwd = process.cwd(),
) {
  try {
    const init = pkg.skill_init;
    const cliResult = await installCli(
      pkg,
      init,
      cwd,
      promptInstallFallback,
      onLog,
    );

    if (cliResult.cancelled) {
      return {
        id: pkg.id,
        success: false,
        error: 'Install cancelled by user',
      };
    }

    if (cliResult.method === 'skipped' && !init.npx && !init.npm) {
      return {
        id: pkg.id,
        success: false,
        error: 'CLI install failed — cannot run skill init',
        cliWarning: true,
      };
    }

    const binary = resolveInitBinary(init, cliResult.method, cwd);
    const initCmd = `${binary} init --ai ${aiTarget}`;

    onLog?.(`Running: ${initCmd}`);
    runCommand(initCmd, cwd);

    onLog?.(`✅ ${pkg.name} installed to project skills folder (${aiTarget})`);

    return {
      id: pkg.id,
      success: true,
      aiTarget,
      scope: 'project',
      cliWarning: Boolean(cliResult.warning),
    };
  } catch (err) {
    return {
      id: pkg.id,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Install memory/plugin (and legacy content skills) into .aistack/.
 */
export async function installContentTool(
  pkg,
  promptOverwrite,
  promptInstallFallback,
  onLog,
  cwd = process.cwd(),
) {
  try {
    let cliWarning = false;

    if (pkg.install) {
      const cliResult = await installCli(
        pkg,
        pkg.install,
        cwd,
        promptInstallFallback,
        onLog,
      );

      if (cliResult.cancelled) {
        return {
          id: pkg.id,
          success: false,
          error: 'Install cancelled by user',
        };
      }

      cliWarning = Boolean(cliResult.warning);
    }

    const subdir = TOOL_TYPE_DIRS[pkg.type] ?? `${pkg.type}s`;
    const targetDir = path.join(cwd, '.aistack', subdir);
    fs.mkdirSync(targetDir, { recursive: true });

    const filePath = path.join(targetDir, `${pkg.filename}${pkg.extension}`);

    if (fs.existsSync(filePath)) {
      const overwrite = await promptOverwrite(pkg.filename);
      if (!overwrite) {
        onLog?.(`⏭ Skipped ${pkg.name} (already installed)`);
        return { id: pkg.id, success: true, skipped: true, filePath, cliWarning };
      }
    }

    fs.writeFileSync(filePath, pkg.content, 'utf8');

    const relativePath = getToolRelativePath(pkg, cwd);
    onLog?.(`✅ Installed ${pkg.name} → ${relativePath}`);

    const platformFiles = await updatePlatformFiles(pkg, relativePath, cwd);
    for (const platformFile of platformFiles) {
      onLog?.(`✅ Updated ${platformFile}`);
    }

    return {
      id: pkg.id,
      success: true,
      filePath,
      platformFiles,
      cliWarning,
    };
  } catch (err) {
    return {
      id: pkg.id,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * @param {object[]} packages
 * @param {import('./config-writer.js').ConfigTarget | null} clientTarget
 * @param {string | null} skillAiTarget
 * @param {(event: { type: string; packageId?: string; message?: string }) => void} [onProgress]
 * @param {Record<string, Record<string, string>>} [apiKeys]
 * @param {(filename: string) => Promise<boolean>} [promptOverwrite]
 * @param {PromptInstallFallback} [promptInstallFallback]
 */
export async function installPackages(
  packages,
  clientTarget,
  skillAiTarget,
  onProgress,
  apiKeys = {},
  promptOverwrite = async () => true,
  promptInstallFallback = async () => 'skip',
) {
  /** @type {object[]} */
  const installs = [];
  /** @type {string[]} */
  const logs = [];
  /** @type {Set<string>} */
  const configPaths = new Set();

  for (const pkg of packages) {
    onProgress?.({ type: 'installing', packageId: pkg.id });

    const onLog = (message) => {
      logs.push(message);
      onProgress?.({ type: 'log', packageId: pkg.id, message });
    };

    let result;
    if (pkg.type === 'mcp' || pkg.type === 'agent') {
      if (!clientTarget) {
        result = {
          id: pkg.id,
          success: false,
          error: 'Client target required for MCP/agent packages',
        };
      } else {
        result = await installMCPOrAgent(pkg, clientTarget, apiKeys, onLog);
        if (result.configPath) configPaths.add(result.configPath);
      }
    } else if (usesSkillInit(pkg)) {
      if (!skillAiTarget) {
        result = {
          id: pkg.id,
          success: false,
          error: 'AI assistant required for skill install',
        };
      } else {
        result = await installSkillInit(
          pkg,
          skillAiTarget,
          promptInstallFallback,
          onLog,
        );
      }
    } else {
      result = await installContentTool(
        pkg,
        promptOverwrite,
        promptInstallFallback,
        onLog,
      );
    }

    installs.push({
      ...result,
      name: pkg.name,
      type: pkg.type,
      docs_url: pkg.docs_url,
    });

    onProgress?.({
      type: result.success ? 'installed' : 'failed',
      packageId: pkg.id,
    });
  }

  onProgress?.({ type: 'done' });

  return {
    installs,
    logs,
    configPaths: [...configPaths],
    configWritten: configPaths.size > 0,
    configPath: configPaths.size === 1 ? [...configPaths][0] : null,
  };
}
