import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';

const CATEGORIES = [
  { label: 'MCP Servers', value: 'mcp' },
  // { label: 'Agents', value: 'agent' },
  { label: 'Tools', value: 'tools' },
];

/**
 * Step 1 — top-level category menu.
 */
export function CategorySelect({ onSelect }) {
  return (
    <Box flexDirection="column">
      <Text bold>awesome-ai-stack</Text>
      <Text dimColor>AI tooling package manager · aas</Text>
      <Text dimColor>cwd: {process.cwd()}</Text>
      <Box marginTop={1}>
        <Text bold>What do you want to install?</Text>
      </Box>
      <Box marginTop={1}>
        <SelectInput items={CATEGORIES} onSelect={(item) => onSelect(item.value)} />
      </Box>
    </Box>
  );
}
