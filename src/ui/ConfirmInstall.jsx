import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { getConfigPath } from '../config-writer.js';
import { installPackages } from '../installer.js';
import { isClientLevelType, usesSkillInit } from '../schemas.js';

/**
 * Overwrite prompt shown during tool install.
 */
function OverwritePrompt({ filename, onAnswer }) {
  useInput((input, key) => {
    if (key.escape) {
      onAnswer(false);
      return;
    }
    const answer = input.toLowerCase();
    if (answer === 'y') onAnswer(true);
    else if (answer === 'n') onAnswer(false);
  });

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color="yellow">
        {filename} already installed. Overwrite? (Y/N)
      </Text>
    </Box>
  );
}

/**
 * Permission prompt when global npm install fails.
 */
function PermissionPrompt({ request, onAnswer }) {
  useInput((input, key) => {
    if (key.escape) {
      onAnswer('cancel');
      return;
    }
    const answer = input.toLowerCase();
    if (answer === 'y') onAnswer('local');
    else if (answer === 'n') onAnswer('skip');
  });

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold color="yellow">
        Permission required — {request.packageName}
      </Text>
      <Text dimColor>{request.reason}</Text>
      <Text dimColor>Command: {request.command}</Text>
      <Box marginTop={1} flexDirection="column">
        <Text>
          <Text bold color="green">Y</Text> Install locally to .aistack/node_modules/
        </Text>
        <Text>
          <Text bold color="yellow">N</Text> Skip CLI install, continue with skill files
        </Text>
        <Text>
          <Text bold color="red">Esc</Text> Cancel install
        </Text>
      </Box>
    </Box>
  );
}

/**
 * Confirm and run install with per-package progress.
 */
export function ConfirmInstall({
  packages,
  clientTarget,
  skillAiTarget,
  apiKeys = {},
  onComplete,
  onBack,
}) {
  const [phase, setPhase] = useState('confirm');
  const [currentId, setCurrentId] = useState(null);
  const [completed, setCompleted] = useState([]);
  const [logs, setLogs] = useState([]);
  const [overwritePrompt, setOverwritePrompt] = useState(null);
  const [permissionPrompt, setPermissionPrompt] = useState(null);

  const needsClient = packages.some((p) => isClientLevelType(p.type));
  const hasSkillInit = packages.some((p) => usesSkillInit(p));
  const configPath = clientTarget ? getConfigPath(clientTarget) : null;

  let targetLabel = `Project: ${process.cwd()}/.aistack/`;
  if (needsClient && hasSkillInit) {
    targetLabel = `${configPath ?? clientTarget} + uipro init --ai ${skillAiTarget}`;
  } else if (needsClient) {
    targetLabel = configPath ?? clientTarget;
  } else if (hasSkillInit) {
    targetLabel = `uipro init --ai ${skillAiTarget} (this project)`;
  }

  useInput((input, key) => {
    if (phase !== 'confirm' || overwritePrompt || permissionPrompt) return;
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
    const promptOverwrite = (filename) =>
      new Promise((resolve) => {
        setOverwritePrompt({ filename, resolve });
      });

    const promptInstallFallback = (request) =>
      new Promise((resolve) => {
        setPermissionPrompt({ request, resolve });
      });

    const result = await installPackages(
      packages,
      clientTarget,
      skillAiTarget,
      (event) => {
        if (event.type === 'installing' && event.packageId) {
          setCurrentId(event.packageId);
        }
        if (event.type === 'log' && event.message) {
          setLogs((prev) => [...prev, event.message]);
        }
        if (event.type === 'installed' || event.type === 'failed') {
          setCompleted((prev) => [...prev, event.packageId]);
          setCurrentId(null);
        }
      },
      apiKeys,
      promptOverwrite,
      promptInstallFallback,
    );

    onComplete(result);
  }

  const keysConfigured = Object.values(apiKeys).some(
    (pkgKeys) => Object.keys(pkgKeys).length > 0,
  );

  if (permissionPrompt) {
    return (
      <Box flexDirection="column">
        <Text bold>Installing…</Text>
        <PermissionPrompt
          request={permissionPrompt.request}
          onAnswer={(answer) => {
            permissionPrompt.resolve(answer);
            setPermissionPrompt(null);
          }}
        />
      </Box>
    );
  }

  if (overwritePrompt) {
    return (
      <Box flexDirection="column">
        <Text bold>Installing…</Text>
        <OverwritePrompt
          filename={overwritePrompt.filename}
          onAnswer={(answer) => {
            overwritePrompt.resolve(answer);
            setOverwritePrompt(null);
          }}
        />
      </Box>
    );
  }

  if (phase === 'confirm') {
    return (
      <Box flexDirection="column">
        <Text bold>Confirm install</Text>
        <Text dimColor>Target: {targetLabel}</Text>
        {keysConfigured && (
          <Text dimColor>API keys will be written to your IDE config</Text>
        )}
        <Box marginTop={1} flexDirection="column">
          {packages.map((pkg) => (
            <Text key={pkg.id}>
              • {pkg.name} <Text dimColor>[{pkg.type}]</Text>
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
      {logs.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          {logs.slice(-8).map((line, index) => (
            <Text key={`${index}-${line}`} dimColor>
              {line}
            </Text>
          ))}
        </Box>
      )}
    </Box>
  );
}
