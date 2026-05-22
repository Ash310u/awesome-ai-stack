import React from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';

const CLIENTS = [
  { label: 'Claude Desktop', value: 'claude_desktop' },
  { label: 'Cursor', value: 'cursor' },
  { label: 'Windsurf', value: 'windsurf' },
];

/**
 * Step 5 — choose AI client for MCP/agent packages.
 */
export function ClientSelect({ onSelect, onBack }) {
  useInput((_input, key) => {
    if (key.escape) onBack?.();
  });

  return (
    <Box flexDirection="column">
      <Text bold>Which client should aas configure?</Text>
      <Text dimColor>MCP servers and agents write to global client config</Text>
      <Text dimColor>Esc to go back</Text>
      <Box marginTop={1}>
        <SelectInput items={CLIENTS} onSelect={(item) => onSelect(item.value)} />
      </Box>
    </Box>
  );
}
