import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { getConfigPath } from '../config-writer.js';
import { installPackages } from '../installer.js';

/**
 * Step 4 — confirm, install with per-package spinners, then advance.
 */
export function ConfirmInstall({
  packages,
  target,
  apiKeys = {},
  onComplete,
  onBack,
}) {
  const [phase, setPhase] = useState('confirm');
  const [currentId, setCurrentId] = useState(null);
  const [completed, setCompleted] = useState([]);

  const configPath = getConfigPath(target);
  const targetLabel =
    target === 'skip'
      ? 'Install only (no config file)'
      : configPath ?? target;

  useInput((input, key) => {
    if (phase !== 'confirm') return;
    if (key.escape) {
      onBack?.();
      return;
    }
    const answer = input.toLowerCase();
    if (answer === 'y') {
      setPhase('installing');
      runInstall();
    } else if (answer === 'n') {
      onBack?.();
    }
  });

  async function runInstall() {
    const result = await installPackages(
      packages,
      target,
      (event) => {
      if (event.type === 'installing' && event.packageId) {
        setCurrentId(event.packageId);
      }
      if (event.type === 'installed' || event.type === 'failed') {
        setCompleted((prev) => [...prev, event.packageId]);
        setCurrentId(null);
      }
      },
      apiKeys,
    );

    onComplete(result);
  }

  const keysConfigured = Object.values(apiKeys).some(
    (pkgKeys) => Object.keys(pkgKeys).length > 0,
  );

  if (phase === 'confirm') {
    return (
      <Box flexDirection="column">
        <Text bold>Confirm setup</Text>
        <Text dimColor>Config target: {targetLabel}</Text>
        {keysConfigured && (
          <Text dimColor>API keys will be written to your IDE config</Text>
        )}
        <Box marginTop={1} flexDirection="column">
          {packages.map((pkg) => (
            <Text key={pkg.id}>
              • {pkg.name} <Text dimColor>[{pkg.category}]</Text>
            </Text>
          ))}
        </Box>
        <Box marginTop={1}>
          <Text>
            Press <Text bold color="green">Y</Text> to install or{' '}
            <Text bold color="red">N</Text> / Esc to cancel
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold>Installing…</Text>
      {packages.map((pkg) => {
        const isCurrent = currentId === pkg.id;
        const isDone = completed.includes(pkg.id);

        return (
          <Box key={pkg.id}>
            {isCurrent ? (
              <Text color="cyan">
                <Spinner type="dots" /> {pkg.name}
              </Text>
            ) : isDone ? (
              <Text color="green">✓ {pkg.name}</Text>
            ) : (
              <Text dimColor>○ {pkg.name}</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
