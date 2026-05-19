import { execSync } from 'node:child_process';
import { writeConfig } from './config-writer.js';
import { runMcpAdd } from './mcp-add.js';

/**
 * Run a shell command with inherited stdio.
 * @param {string} command
 */
function runCommand(command) {
  execSync(command, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, npm_config_yes: 'true' },
  });
}

/**
 * Remote HTTP MCP entries (url + headers) need no npm install.
 * @param {object} pkg
 * @returns {boolean}
 */
function isRemoteMcpPackage(pkg) {
  const servers = pkg.config_snippet?.mcpServers;
  if (!servers || typeof servers !== 'object') return false;

  return Object.values(servers).some((server) => {
    if (!server || typeof server !== 'object') return false;
    const s = /** @type {Record<string, unknown>} */ (server);
    return typeof s.url === 'string' && !s.command;
  });
}

/**
 * Install a single package, trying npx first then npm fallback.
 * @param {object} pkg
 * @param {import('./config-writer.js').ConfigTarget} target
 * @param {Record<string, Record<string, string>>} [apiKeys]
 * @returns {{ id: string; success: boolean; error?: string; configOnly?: boolean; mcpAdd?: boolean }}
 */
export function installPackage(pkg, target, apiKeys = {}) {
  if (pkg.mcp_add) {
    if (target === 'skip') {
      return { id: pkg.id, success: true, configOnly: true };
    }

    try {
      runMcpAdd(pkg, target, apiKeys[pkg.id] ?? {});
      return { id: pkg.id, success: true, mcpAdd: true };
    } catch (err) {
      return {
        id: pkg.id,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // MCP / remote URL servers are configured in the IDE — no global install.
  if (pkg.category === 'mcp' || isRemoteMcpPackage(pkg)) {
    return { id: pkg.id, success: true, configOnly: true };
  }

  try {
    runCommand(pkg.install.npx);
    return { id: pkg.id, success: true };
  } catch (npxErr) {
    try {
      runCommand(pkg.install.npm);
      return { id: pkg.id, success: true };
    } catch (npmErr) {
      const message =
        npmErr instanceof Error ? npmErr.message : String(npmErr);
      return {
        id: pkg.id,
        success: false,
        error: npxErr instanceof Error ? npxErr.message : message,
      };
    }
  }
}

/**
 * Install all selected packages and optionally write client config.
 * @param {object[]} packages
 * @param {import('./config-writer.js').ConfigTarget} target
 * @param {(event: { type: string; packageId?: string }) => void} [onProgress]
 * @param {Record<string, Record<string, string>>} [apiKeys]
 */
export async function installPackages(packages, target, onProgress, apiKeys = {}) {
  const results = [];

  for (const pkg of packages) {
    onProgress?.({ type: 'installing', packageId: pkg.id });
    const result = installPackage(pkg, target, apiKeys);
    results.push({ ...result, name: pkg.name, docs_url: pkg.docs_url });
    onProgress?.({
      type: result.success ? 'installed' : 'failed',
      packageId: pkg.id,
    });
  }

  let configResult = { path: null, written: false };
  if (target !== 'skip') {
    onProgress?.({ type: 'configuring' });
    const configurable = packages.filter(
      (p) =>
        !p.mcp_add &&
        p.config_target?.includes(target) &&
        Object.keys(p.config_snippet ?? {}).length > 0,
    );
    if (configurable.length > 0) {
      configResult = await writeConfig(target, configurable, apiKeys);
    }
  }

  onProgress?.({ type: 'done' });

  return {
    installs: results,
    configPath: configResult.path,
    configWritten: configResult.written,
  };
}
