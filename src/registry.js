import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { packageSchema, roleSchema } from './schemas.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.join(ROOT, 'packages');
const ROLES_DIR = path.join(ROOT, 'roles');

const REGISTRY_BASE =
  process.env.AWESOME_AI_STACK_REGISTRY_URL ??
  'https://raw.githubusercontent.com/Ash310u/awesome-ai-stack/main';

const CACHE_DIR = path.join(os.homedir(), '.cache', 'awesome-ai-stack');

let packagesCache = null;
let rolesCache = null;

/** @returns {Promise<boolean>} */
async function useLocalRegistry() {
  if (process.env.AWESOME_AI_STACK_USE_LOCAL === '1') return true;
  try {
    await fs.access(PACKAGES_DIR);
    return true;
  } catch {
    return false;
  }
}

/**
 * Recursively read all JSON files under a directory.
 * @param {string} dir
 * @returns {Promise<object[]>}
 */
async function readJsonFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await readJsonFiles(fullPath)));
    } else if (entry.name.endsWith('.json')) {
      const raw = await fs.readFile(fullPath, 'utf8');
      results.push(JSON.parse(raw));
    }
  }

  return results;
}

/**
 * Fetch remote registry JSON with filesystem cache fallback.
 * @param {'packages' | 'roles'} kind
 */
async function fetchRemoteRegistry(kind) {
  const cachePath = path.join(CACHE_DIR, `${kind}.json`);
  const baseUrl = `${REGISTRY_BASE}/${kind}/`;

  try {
    const indexRes = await fetch(`${baseUrl}index.json`, {
      signal: AbortSignal.timeout(15_000),
    });

    if (indexRes.ok) {
      const index = await indexRes.json();
      const files = Array.isArray(index.files) ? index.files : [];
      const items = [];

      for (const file of files) {
        const res = await fetch(`${baseUrl}${file}`, {
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) throw new Error(`Failed to fetch ${file}`);
        items.push(await res.json());
      }

      await fs.mkdir(CACHE_DIR, { recursive: true });
      await fs.writeFile(cachePath, JSON.stringify(items), 'utf8');
      return items;
    }
  } catch {
    // fall through to cache / local
  }

  try {
    const cached = await fs.readFile(cachePath, 'utf8');
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

/**
 * Load and validate all packages from local disk or remote registry.
 * @returns {Promise<object[]>}
 */
async function loadPackages() {
  if (packagesCache) return packagesCache;

  const hasLocal = await useLocalRegistry();
  let raw = null;

  if (hasLocal) {
    raw = await readJsonFiles(PACKAGES_DIR);
  } else {
    raw = await fetchRemoteRegistry('packages');
    if (!raw) {
      raw = await readJsonFiles(PACKAGES_DIR).catch(() => []);
    }
  }

  packagesCache = raw.map((item) => packageSchema.parse(item));
  return packagesCache;
}

/**
 * Load and validate all roles.
 * @returns {Promise<object[]>}
 */
async function loadRoles() {
  if (rolesCache) return rolesCache;

  const hasLocal = await useLocalRegistry();
  let raw = null;

  if (hasLocal) {
    const files = await fs.readdir(ROLES_DIR);
    raw = await Promise.all(
      files
        .filter((f) => f.endsWith('.json'))
        .map(async (f) => {
          const content = await fs.readFile(path.join(ROLES_DIR, f), 'utf8');
          return JSON.parse(content);
        }),
    );
  } else {
    raw = await fetchRemoteRegistry('roles');
    if (!raw) {
      const files = await fs.readdir(ROLES_DIR).catch(() => []);
      raw = await Promise.all(
        files
          .filter((f) => f.endsWith('.json'))
          .map(async (f) => {
            const content = await fs.readFile(path.join(ROLES_DIR, f), 'utf8');
            return JSON.parse(content);
          }),
      );
    }
  }

  rolesCache = raw.map((item) => roleSchema.parse(item));
  return rolesCache;
}

/** Initialize registry (call once at startup). */
export async function initRegistry() {
  await Promise.all([loadPackages(), loadRoles()]);
}

/** @returns {Promise<object[]>} */
export async function getAllPackages() {
  return loadPackages();
}

/** @returns {Promise<object[]>} */
export async function getAllRoles() {
  return loadRoles();
}

/**
 * @param {string} roleId
 * @returns {Promise<object[]>}
 */
export async function getPackagesByRole(roleId) {
  const [roles, packages] = await Promise.all([loadRoles(), loadPackages()]);
  const role = roles.find((r) => r.id === roleId);
  if (!role) return [];

  const idSet = new Set(role.packages);
  return packages.filter((p) => idSet.has(p.id));
}

/**
 * @param {string} id
 * @returns {Promise<object | undefined>}
 */
export async function getPackageById(id) {
  const packages = await loadPackages();
  return packages.find((p) => p.id === id);
}
