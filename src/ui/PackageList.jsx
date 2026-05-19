import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Checkbox } from 'ink-checkbox';

const CATEGORY_COLORS = {
  mcp: 'green',
  memory: 'magenta',
  skill: 'blue',
};

/**
 * Step 2 — multi-select packages with checkboxes.
 */
export function PackageList({ packages, roleLabel, onConfirm, onBack }) {
  const [selected, setSelected] = useState(() => new Set());
  const [focusIndex, setFocusIndex] = useState(0);

  const toggle = (pkgId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pkgId)) next.delete(pkgId);
      else next.add(pkgId);
      return next;
    });
  };

  useInput((input, key) => {
    if (key.upArrow) {
      setFocusIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (key.downArrow) {
      setFocusIndex((i) => Math.min(packages.length - 1, i + 1));
      return;
    }
    if (input === ' ') {
      const pkg = packages[focusIndex];
      if (pkg) toggle(pkg.id);
      return;
    }
    if (key.return) {
      if (selected.size === 0) return;
      onConfirm(packages.filter((p) => selected.has(p.id)));
      return;
    }
    if (key.escape || input === 'b') {
      onBack?.();
    }
  });

  if (packages.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color="yellow">No packages found for this selection.</Text>
        <Text dimColor>Press Esc to go back</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold>Select tools to install</Text>
      <Text dimColor>
        {roleLabel ? `Showing packages for: ${roleLabel}` : 'Showing all packages'}
      </Text>
      <Text dimColor>
        ↑↓ navigate · Space toggle · Enter confirm · Esc back
      </Text>
      <Box marginTop={1} flexDirection="column">
        {packages.map((pkg, index) => {
          const focused = index === focusIndex;
          const badgeColor = CATEGORY_COLORS[pkg.category] ?? 'white';

          return (
            <Box key={pkg.id} flexDirection="column" marginBottom={0}>
              <Box>
                <Text color={focused ? 'cyan' : undefined}>
                  {focused ? '› ' : '  '}
                </Text>
                {focused ? (
                  <Checkbox
                    label=""
                    checked={selected.has(pkg.id)}
                    onChanged={() => toggle(pkg.id)}
                  />
                ) : (
                  <Text>{selected.has(pkg.id) ? '☑' : '☐'} </Text>
                )}
                <Text bold={focused}>
                  {pkg.name}{' '}
                  <Text color={badgeColor}>[{pkg.category}]</Text>
                </Text>
              </Box>
              <Box marginLeft={4}>
                <Text dimColor>{pkg.description}</Text>
              </Box>
            </Box>
          );
        })}
      </Box>
      <Box marginTop={1}>
        <Text>
          {selected.size} selected
          {selected.size === 0 ? ' (select at least one)' : ''}
        </Text>
      </Box>
    </Box>
  );
}
