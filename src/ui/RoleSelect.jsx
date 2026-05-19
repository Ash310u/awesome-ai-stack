import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';

const BROWSE_ALL = '__browse_all__';

/**
 * Step 1 — pick a role or browse every package.
 */
export function RoleSelect({ roles, onSelect }) {
  const items = [
    ...roles.map((role) => ({
      label: role.label,
      value: role.id,
      description: role.description,
    })),
    {
      label: 'Browse all tools',
      value: BROWSE_ALL,
      description: 'Show every package without role filtering',
    },
  ];

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        awesome-ai-stack — AI Tooling Package Manager
      </Text>
      <Text dimColor>What's your primary role?</Text>
      <Box marginTop={1}>
        <SelectInput
          items={items.map((item) => ({
            label: item.description
              ? `${item.label} — ${item.description}`
              : item.label,
            value: item.value,
          }))}
          onSelect={(item) => {
            onSelect(item.value === BROWSE_ALL ? null : item.value);
          }}
        />
      </Box>
    </Box>
  );
}
