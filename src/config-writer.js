import fs from 'node:fs/promises';
import path from 'node:path';
import { applySecretsToSnippet, patchSecretsIntoConfig } from './secrets.js';
import { getConfigPath } from './paths.js';
import { TOOL_TYPE_DIRS } from './schemas.js';

export { getConfigPath } from './paths.js';
/** @typedef {import('./paths.js').ConfigTarget} ConfigTarget */

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isPlainObject(value) {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

/**
 * Deep-merge incoming into existing without overwriting existing keys.
 * @param {Record<string, unknown>} existing
 * @param {Record<string, unknown>} incoming
 * @returns {Record<string, unknown>}
 */
export function deepMergePreserve(existing, incoming) {
  const result = { ...existing };

  for (const [key, value] of Object.entries(incoming)) {
    if (!(key in result)) {
      result[key] = structuredClone(value);
      continue;
    }

    const existingValue = result[key];
    if (isPlainObject(existingValue) && isPlainObject(value)) {
      result[key] = deepMergePreserve(
        /** @type {Record<string, unknown>} */ (existingValue),
        /** @type {Record<string, unknown>} */ (value),
      );
    }
  }

  return result;
}

/**
 * @param {string} filePath
 * @returns {Promise<Record<string, unknown>>}
 */
async function readConfig(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return isPlainObject(parsed) ? parsed : {};
  } catch (err) {
    if (/** @type {NodeJS.ErrnoException} */ (err).code === 'ENOENT') {
      return {};
    }
    throw err;
  }
}

/**
 * @param {string} targetPath
 * @returns {Promise<boolean>}
 */
async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} [cwd]
 * @returns {Promise<{ cursor: boolean; claude: boolean; codex: boolean }>}
 */
export async function detectClientsInCwd(cwd = process.cwd()) {
  const cursorDir = path.join(cwd, '.cursor');
  const claudeFile = path.join(cwd, '.claude');
  const codexFile = path.join(cwd, '.codex');

  const [cursor, claude, codex] = await Promise.all([
    fs
      .stat(cursorDir)
      .then((s) => s.isDirectory())
      .catch(() => false),
    pathExists(claudeFile),
    pathExists(codexFile),
  ]);

  return { cursor, claude, codex };
}

/**
 * @param {object} pkg
 * @param {string} [cwd]
 * @returns {string}
 */
export function getToolRelativePath(pkg, cwd = process.cwd()) {
  const subdir = TOOL_TYPE_DIRS[pkg.type] ?? `${pkg.type}s`;
  return path.join('.aistack', subdir, `${pkg.filename}${pkg.extension}`);
}

/**
 * @param {string} filePath
 * @param {string} line
 */
async function appendLineIfMissing(filePath, line) {
  let existing = '';
  try {
    existing = await fs.readFile(filePath, 'utf8');
  } catch (err) {
    if (/** @type {NodeJS.ErrnoException} */ (err).code !== 'ENOENT') {
      throw err;
    }
  }

  if (existing.includes(line)) return false;

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const prefix = existing.length > 0 && !existing.endsWith('\n') ? '\n' : '';
  await fs.writeFile(filePath, `${existing}${prefix}${line}\n`, 'utf8');
  return true;
}

/**
 * Append references to platform-specific files in the project cwd.
 * @param {object} pkg
 * @param {string} installedRelativePath
 * @param {string} [cwd]
 * @returns {Promise<string[]>}
 */
export async function updatePlatformFiles(pkg, installedRelativePath, cwd = process.cwd()) {
  const clients = await detectClientsInCwd(cwd);
  /** @type {string[]} */
  const updated = [];

  const refLine = `- ${pkg.name} → ${installedRelativePath}`;

  if (clients.cursor) {
    const rulesPath = path.join(cwd, '.cursor', 'rules');
    if (await appendLineIfMissing(rulesPath, refLine)) {
      updated.push('.cursor/rules');
    }
  }

  if (clients.claude) {
    const claudePath = path.join(cwd, '.claude');
    if (await appendLineIfMissing(claudePath, refLine)) {
      updated.push('.claude');
    }
  }

  if (clients.codex) {
    const codexPath = path.join(cwd, '.codex');
    if (await appendLineIfMissing(codexPath, refLine)) {
      updated.push('.codex');
    }
  }

  const agentsPath = path.join(cwd, 'AGENTS.md');
  const agentsLine = `- **${pkg.name}** (${pkg.type}): \`${installedRelativePath}\``;
  if (await appendLineIfMissing(agentsPath, agentsLine)) {
    updated.push('AGENTS.md');
  }

  return updated;
}

/**
 * Merge config snippets from packages and write to the target config file.
 * @param {ConfigTarget} target
 * @param {object[]} packages
 * @param {Record<string, Record<string, string>>} [apiKeys]
 * @returns {Promise<{ path: string | null; written: boolean }>}
 */
export async function writeConfig(target, packages, apiKeys = {}) {
  if (target === 'skip') {
    return { path: null, written: false };
  }

  const configPath = getConfigPath(target);
  if (!configPath) {
    throw new Error(`Unsupported config target: ${target}`);
  }

  let config = await readConfig(configPath);

  for (const pkg of packages) {
    if (!pkg.config_snippet || Object.keys(pkg.config_snippet).length === 0) {
      continue;
    }
    if (!pkg.config_target?.includes(target)) {
      continue;
    }
    const snippet = applySecretsToSnippet(
      pkg.config_snippet,
      apiKeys[pkg.id] ?? {},
    );
    config = deepMergePreserve(config, snippet);
  }

  patchSecretsIntoConfig(config, packages, apiKeys);

  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

  return { path: configPath, written: true };
}

/**
 * @param {ConfigTarget} target
 * @param {object} pkg
 * @param {Record<string, Record<string, string>>} [apiKeys]
 * @returns {Promise<{ path: string; written: boolean }>}
 */
export async function writePackageConfig(target, pkg, apiKeys = {}) {
  return writeConfig(target, [pkg], apiKeys);
}
