import { execSync } from 'node:child_process';

/** @typedef {import('./paths.js').ConfigTarget} ConfigTarget */

/**
 * @param {string} value
 * @returns {string}
 */
function shellQuote(value) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/**
 * @param {object} mcpAdd
 * @param {ConfigTarget} target
 * @param {Record<string, string>} packageSecrets
 * @returns {string[]}
 */
export function buildMcpAddArgs(mcpAdd, target, packageSecrets = {}) {
  const client = mcpAdd.clients?.[target];
  if (!client) {
    throw new Error(`No mcp-add client mapping for target: ${target}`);
  }

  /** @type {string[]} */
  const args = [
    '-y',
    'mcp-add@latest',
    '--name',
    mcpAdd.name,
    '--type',
    mcpAdd.type,
    '--scope',
    mcpAdd.scope ?? 'global',
    '--clients',
    client,
  ];

  if (mcpAdd.type === 'stdio') {
    if (!mcpAdd.command) {
      throw new Error(`mcp_add command required for stdio server ${mcpAdd.name}`);
    }
    args.push('--command', mcpAdd.command);
  } else {
    if (!mcpAdd.url) {
      throw new Error(`mcp_add url required for remote server ${mcpAdd.name}`);
    }
    args.push('--url', mcpAdd.url);
  }

  const envKey = mcpAdd.env_key;
  const token = envKey ? packageSecrets[envKey] : undefined;

  if (token) {
    const headerName = mcpAdd.auth_header ?? 'Authorization';
    const prefix = mcpAdd.auth_prefix ?? 'Token ';
    args.push('--headers', `${headerName}=${prefix}${token}`);
    if (envKey) {
      args.push('--env', `${envKey}=${token}`);
    }
  }

  return args;
}

/**
 * @param {object} pkg
 * @param {ConfigTarget} target
 * @param {Record<string, string>} packageSecrets
 */
export function runMcpAdd(pkg, target, packageSecrets = {}) {
  const args = buildMcpAddArgs(pkg.mcp_add, target, packageSecrets);
  execSync(`npx ${args.map(shellQuote).join(' ')}`, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, npm_config_yes: 'true' },
  });
}
