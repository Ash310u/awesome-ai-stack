import React from 'react';
import { Box, Text, useInput } from 'ink';

/**
 * Step 5 — installation summary and next steps.
 */
export function SuccessScreen({ result, packages, onExit }) {
  useInput((input, key) => {
    if (key.return || input === 'q') {
      onExit?.();
    }
  });

  const succeeded = result.installs.filter((r) => r.success);
  const failed = result.installs.filter((r) => !r.success);

  return (
    <Box flexDirection="column">
      <Text bold color="green">
        Setup complete
      </Text>

      {succeeded.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold>Installed tools</Text>
          {succeeded.map((item) => {
            const pkg = packages.find((p) => p.id === item.id);
            const label = item.mcpAdd
              ? 'added via mcp-add'
              : item.configOnly
                ? 'configured'
                : 'installed';
            return (
              <Text key={item.id}>
                ✓ {item.name ?? pkg?.name ?? item.id}{' '}
                <Text dimColor>({label})</Text>
              </Text>
            );
          })}
        </Box>
      )}

      {failed.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold color="red">
            Failed ({failed.length})
          </Text>
          {failed.map((item) => (
            <Text key={item.id} color="red">
              ✗ {item.name ?? item.id}
              {item.error ? `: ${item.error}` : ''}
            </Text>
          ))}
        </Box>
      )}

      {result.configWritten && result.configPath && (
        <Box marginTop={1} flexDirection="column">
          <Text bold>Config updated</Text>
          <Text>{result.configPath}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="yellow">Restart your AI client to activate tools</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold>Documentation</Text>
        {succeeded.map((item) => {
          const pkg = packages.find((p) => p.id === item.id);
          if (!pkg?.docs_url) return null;
          return (
            <Text key={item.id}>
              {pkg.name}: {pkg.docs_url}
            </Text>
          );
        })}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Press Enter or Q to exit</Text>
      </Box>
    </Box>
  );
}
