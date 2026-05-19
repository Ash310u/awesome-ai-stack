import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';

/**
 * Collect API keys for packages that need them before install.
 */
export function ApiKeyPrompt({ requiredSecrets, targetLabel, onComplete, onBack }) {
  const [index, setIndex] = useState(0);
  const [values, setValues] = useState({});
  const [inputValue, setInputValue] = useState('');

  const current = requiredSecrets[index];
  const total = requiredSecrets.length;

  useEffect(() => {
    if (requiredSecrets.length === 0) {
      onComplete({});
    }
  }, [requiredSecrets.length]);

  useInput((input, key) => {
    if (!current) return;

    if (key.escape) {
      onBack?.();
      return;
    }

    if (key.return) {
      const trimmed = inputValue.trim();
      if (!trimmed) return;

      const nextValues = {
        ...values,
        [current.packageId]: {
          ...(values[current.packageId] ?? {}),
          [current.envKey]: trimmed,
        },
      };
      setValues(nextValues);
      setInputValue('');

      if (index + 1 >= total) {
        onComplete(nextValues);
      } else {
        setIndex((i) => i + 1);
      }
      return;
    }

    if (key.backspace || key.delete) {
      setInputValue((v) => v.slice(0, -1));
      return;
    }

    if (input && !key.ctrl && !key.meta) {
      setInputValue((v) => v + input);
    }
  });

  if (requiredSecrets.length === 0) {
    return null;
  }

  const masked = '•'.repeat(inputValue.length);

  return (
    <Box flexDirection="column">
      <Text bold>API keys required</Text>
      <Text dimColor>
        Saved to {targetLabel} → mcpServers → env
      </Text>
      <Text dimColor>
        Key {index + 1} of {total} · Enter to continue · Esc to go back
      </Text>

      <Box marginTop={1} flexDirection="column">
        <Text>
          <Text bold>{current.packageName}</Text>
        </Text>
        <Text dimColor>{current.label}</Text>
        <Text dimColor>({current.envKey})</Text>
      </Box>

      <Box marginTop={1}>
        <Text color="cyan">{masked || ' '}</Text>
        <Text color="cyan">▌</Text>
      </Box>
    </Box>
  );
}
