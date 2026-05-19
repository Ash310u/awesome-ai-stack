import path from 'node:path';
import os from 'node:os';

/** @typedef {'claude_desktop' | 'cursor' | 'windsurf' | 'skip'} ConfigTarget */

const TARGET_PATHS = {
  claude_desktop: {
    darwin: path.join(
      os.homedir(),
      'Library',
      'Application Support',
      'Claude',
      'claude_desktop_config.json',
    ),
    win32: path.join(
      process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming'),
      'Claude',
      'claude_desktop_config.json',
    ),
    linux: path.join(
      os.homedir(),
      '.config',
      'Claude',
      'claude_desktop_config.json',
    ),
  },
  cursor: {
    darwin: path.join(os.homedir(), '.cursor', 'mcp.json'),
    win32: path.join(os.homedir(), '.cursor', 'mcp.json'),
    linux: path.join(os.homedir(), '.cursor', 'mcp.json'),
  },
  windsurf: {
    darwin: path.join(os.homedir(), '.codeium', 'windsurf', 'mcp_config.json'),
    win32: path.join(os.homedir(), '.codeium', 'windsurf', 'mcp_config.json'),
    linux: path.join(os.homedir(), '.codeium', 'windsurf', 'mcp_config.json'),
  },
};

/**
 * @param {ConfigTarget} target
 * @returns {string | null}
 */
export function getConfigPath(target) {
  if (target === 'skip') return null;
  const platform = process.platform;
  const paths = TARGET_PATHS[target];
  if (!paths) return null;
  return paths[platform] ?? paths.linux;
}
