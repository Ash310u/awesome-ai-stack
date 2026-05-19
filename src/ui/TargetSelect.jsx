import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';

const TARGETS = [
  { label: 'Claude Desktop', value: 'claude_desktop' },
  { label: 'Cursor', value: 'cursor' },
  { label: 'Windsurf', value: 'windsurf' },
  { label: 'Skip config (install only)', value: 'skip' },
];

/**
 * Step 3 — choose which AI client config to update.
 */
export function TargetSelect({ onSelect, onBack }) {
  return (
    <Box flexDirection="column">
      <Text bold>Where should aistack configure these tools?</Text>
      <Text dimColor>Esc to go back</Text>
      <Box marginTop={1}>
        <SelectInput
          items={TARGETS}
          onSelect={(item) => onSelect(item.value)}
        />
      </Box>
    </Box>
  );
}
