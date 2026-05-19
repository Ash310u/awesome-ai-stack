import fs from 'node:fs/promises';
import path from 'node:path';
import { applySecretsToSnippet, patchSecretsIntoConfig } from './secrets.js';
import { getConfigPath } from './paths.js';

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
    // existing leaf keys are never overwritten
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
