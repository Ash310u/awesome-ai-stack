import React from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';

const TOOL_TYPES = [
  { label: 'Skills', value: 'skill' },
  { label: 'Memory', value: 'memory' },
  { label: 'Plugins & Extensions', value: 'plugin' },
];

/**
 * Step 2 — tools submenu when Tools is selected.
 */
export function ToolsSubMenu({ onSelect, onBack }) {
  useInput((_input, key) => {
    if (key.escape) onBack?.();
  });

  return (
    <Box flexDirection="column">
      <Text bold>Tools</Text>
      <Text dimColor>Skills → uipro init into IDE skills folders</Text>
      <Text dimColor>Memory → MCP client config (Claude / Cursor / Windsurf)</Text>
      <Text dimColor>Plugins → .aistack/ in your cwd</Text>
      <Text dimColor>Esc to go back</Text>
      <Box marginTop={1}>
        <SelectInput
          items={TOOL_TYPES}
          onSelect={(item) => onSelect(item.value)}
        />
      </Box>
    </Box>
  );
}
