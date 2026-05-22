import React from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';

/**
 * Choose which AI assistant receives the skill via uipro init --ai.
 */
export function SkillClientSelect({ options, onSelect, onBack }) {
  useInput((_input, key) => {
    if (key.escape) onBack?.();
  });

  return (
    <Box flexDirection="column">
      <Text bold>Which AI assistant should receive this skill?</Text>
      <Text dimColor>Runs uipro init --ai &lt;assistant&gt; in your project</Text>
      <Text dimColor>Esc to go back</Text>
      <Box marginTop={1}>
        <SelectInput items={options} onSelect={(item) => onSelect(item.value)} />
      </Box>
    </Box>
  );
}
