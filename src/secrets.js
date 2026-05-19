import { getConfigPath } from './paths.js';
import fs from 'node:fs/promises';

/** @typedef {{ packageId: string; packageName: string; serverId: string; envKey: string; label: string }} RequiredSecret */

const PLACEHOLDER_PATTERN =
  /^(YOUR_|REPLACE_|CHANGE_ME|INSERT_|ADD_|<|\$\{)/i;

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isPlaceholderValue(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return true;
  return PLACEHOLDER_PATTERN.test(trimmed);
}

/**
 * @param {string} envKey
 * @returns {string}
 */
export function envKeyLabel(envKey) {
  return envKey
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * @param {Record<string, unknown>} config
 * @param {string} serverId
 * @param {string} envKey
 * @returns {string | undefined}
 */
function getExistingEnvValue(config, serverId, envKey) {
  const servers = config.mcpServers;
  if (!servers || typeof servers !== 'object') return undefined;
  const server = /** @type {Record<string, unknown>} */ (servers)[serverId];
  if (!server || typeof server !== 'object') return undefined;
  const env = /** @type {Record<string, unknown>} */ (server).env;
  if (!env || typeof env !== 'object') return undefined;
  const value = /** @type {Record<string, unknown>} */ (env)[envKey];
  return typeof value === 'string' ? value : undefined;
}

/**
 * @param {Record<string, unknown>} config
 * @param {string} serverId
 * @param {string} headerName
 * @returns {string | undefined}
 */
function getExistingHeaderValue(config, serverId, headerName) {
  const servers = config.mcpServers;
  if (!servers || typeof servers !== 'object') return undefined;
  const server = /** @type {Record<string, unknown>} */ (servers)[serverId];
  if (!server || typeof server !== 'object') return undefined;
  const headers = /** @type {Record<string, unknown>} */ (server).headers;
  if (!headers || typeof headers !== 'object') return undefined;
  const value = /** @type {Record<string, unknown>} */ (headers)[headerName];
  return typeof value === 'string' ? value : undefined;
}

/**
 * @param {string | undefined} headerValue
 * @param {string} [prefix]
 * @returns {boolean}
 */
function isPlaceholderAuthHeader(headerValue, prefix = 'Token ') {
  if (!headerValue) return true;
  const token = headerValue.startsWith(prefix)
    ? headerValue.slice(prefix.length)
    : headerValue;
  return isPlaceholderValue(token);
}

/**
 * @param {import('./paths.js').ConfigTarget} target
 * @returns {Promise<Record<string, unknown>>}
 */
async function readTargetConfig(target) {
  const configPath = getConfigPath(target);
  if (!configPath) return {};

  try {
    const raw = await fs.readFile(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch (err) {
    if (/** @type {NodeJS.ErrnoException} */ (err).code === 'ENOENT') {
      return {};
    }
    throw err;
  }
}

/**
 * @param {object[]} packages
 * @param {import('./paths.js').ConfigTarget} target
 * @returns {Promise<RequiredSecret[]>}
 */
export async function collectRequiredSecrets(packages, target) {
  if (target === 'skip') return [];

  const existingConfig = await readTargetConfig(target);
  /** @type {RequiredSecret[]} */
  const required = [];

  for (const pkg of packages) {
    if (!pkg.config_target?.includes(target)) continue;

    if (pkg.mcp_add?.env_key) {
      const envKey = pkg.mcp_add.env_key;
      const serverId = pkg.mcp_add.name;
      const headerName = pkg.mcp_add.auth_header ?? 'Authorization';
      const prefix = pkg.mcp_add.auth_prefix ?? 'Token ';

      const existingEnv = getExistingEnvValue(existingConfig, serverId, envKey);
      const existingHeader = getExistingHeaderValue(
        existingConfig,
        serverId,
        headerName,
      );

      const hasEnv = existingEnv && !isPlaceholderValue(existingEnv);
      const hasHeader =
        existingHeader && !isPlaceholderAuthHeader(existingHeader, prefix);

      if (!hasEnv && !hasHeader) {
        required.push({
          packageId: pkg.id,
          packageName: pkg.name,
          serverId,
          envKey,
          label: envKeyLabel(envKey),
        });
      }
      continue;
    }

    const snippet = pkg.config_snippet;
    if (!snippet || typeof snippet !== 'object') continue;

    const servers = /** @type {Record<string, unknown>} */ (snippet).mcpServers;
    if (!servers || typeof servers !== 'object') continue;

    for (const [serverId, serverRaw] of Object.entries(servers)) {
      if (!serverRaw || typeof serverRaw !== 'object') continue;
      const env = /** @type {Record<string, unknown>} */ (serverRaw).env;
      if (!env || typeof env !== 'object') continue;

      for (const [envKey, defaultValue] of Object.entries(env)) {
        if (!isPlaceholderValue(defaultValue)) continue;

        const existing = getExistingEnvValue(existingConfig, serverId, envKey);
        if (existing && !isPlaceholderValue(existing)) continue;

        required.push({
          packageId: pkg.id,
          packageName: pkg.name,
          serverId,
          envKey,
          label: envKeyLabel(envKey),
        });
      }
    }
  }

  return required;
}

/**
 * @param {Record<string, unknown>} snippet
 * @param {Record<string, string>} packageSecrets
 * @returns {Record<string, unknown>}
 */
export function applySecretsToSnippet(snippet, packageSecrets) {
  const clone = structuredClone(snippet);
  const servers = clone.mcpServers;
  if (!servers || typeof servers !== 'object') return clone;

  for (const server of Object.values(
    /** @type {Record<string, unknown>} */ (servers),
  )) {
    if (!server || typeof server !== 'object') continue;
    const env = /** @type {Record<string, unknown>} */ (server).env;
    if (!env || typeof env !== 'object') continue;

    for (const [envKey, value] of Object.entries(packageSecrets)) {
      if (value) {
        /** @type {Record<string, string>} */ (env)[envKey] = value;
      }
    }
  }

  return clone;
}

/**
 * @param {Record<string, unknown>} config
 * @param {object[]} packages
 * @param {Record<string, Record<string, string>>} apiKeys
 */
export function patchSecretsIntoConfig(config, packages, apiKeys) {
  if (!config.mcpServers || typeof config.mcpServers !== 'object') {
    config.mcpServers = {};
  }

  const servers = /** @type {Record<string, unknown>} */ (config.mcpServers);

  for (const pkg of packages) {
    const pkgSecrets = apiKeys[pkg.id];
    if (!pkgSecrets || Object.keys(pkgSecrets).length === 0) continue;

    const snippetServers = pkg.config_snippet?.mcpServers;
    if (!snippetServers || typeof snippetServers !== 'object') continue;

    for (const serverId of Object.keys(snippetServers)) {
      const server = servers[serverId];
      if (!server || typeof server !== 'object') continue;

      const env = /** @type {Record<string, unknown>} */ (server).env;
      /** @type {Record<string, unknown>} */ (server).env = {
        ...(env && typeof env === 'object' ? env : {}),
        ...pkgSecrets,
      };
    }
  }
}
