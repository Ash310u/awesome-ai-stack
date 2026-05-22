import React from 'react';
import { Box, Text, useInput } from 'ink';
import { needsClientTarget, usesSkillInit } from '../schemas.js';

/**
 * Installation summary after success.
 */
export function SuccessScreen({
  result,
  packages,
  clientTarget,
  skillAiTarget,
  onExit,
}) {
  useInput((input, key) => {
    if (key.return || input === 'q') {
      onExit?.();
    }
  });

  const succeeded = result.installs.filter((r) => r.success && !r.skipped);
  const skipped = result.installs.filter((r) => r.skipped);
  const warnings = result.installs.filter((r) => r.success && r.cliWarning);
  const failed = result.installs.filter((r) => !r.success);
  const hasClientPackages = packages.some((p) => needsClientTarget(p));
  const hasSkillInit = packages.some((p) => usesSkillInit(p));

  return (
    <Box flexDirection="column">
      <Text bold color="green">
        awesome-ai-stack setup complete
      </Text>

      {succeeded.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold>Installed</Text>
          {succeeded.map((item) => {
            const pkg = packages.find((p) => p.id === item.id);
            let label = 'installed to project';
            if (pkg && needsClientTarget(pkg)) {
              label =
                pkg.type === 'memory' ? 'memory configured' : 'configured';
            }
            else if (pkg && usesSkillInit(pkg)) {
              label = `project skills (${item.aiTarget})`;
            }
            return (
              <Text key={item.id}>
                ✓ {item.name ?? pkg?.name ?? item.id}{' '}
                <Text dimColor>({label})</Text>
              </Text>
            );
          })}
        </Box>
      )}

      {skipped.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold color="yellow">
            Skipped
          </Text>
          {skipped.map((item) => (
            <Text key={item.id} color="yellow">
              ⏭ {item.name ?? item.id}
            </Text>
          ))}
        </Box>
      )}

      {warnings.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold color="yellow">
            Warnings
          </Text>
          {warnings.map((item) => (
            <Text key={item.id} color="yellow">
              ⚠ {item.name ?? item.id}: CLI install used fallback (npx/local)
            </Text>
          ))}
        </Box>
      )}

      {failed.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold color="red">
            Failed ({failed.length})
          </Text>
          {failed.map((item) => (
            <Text key={item.id} color="red">
              ✗ {item.name ?? item.id}
              {item.error ? `: ${item.error}` : ''}
            </Text>
          ))}
        </Box>
      )}

      {result.logs?.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold>Details</Text>
          {result.logs.map((line, index) => (
            <Text key={`${index}-${line}`}>{line}</Text>
          ))}
        </Box>
      )}

      {result.configWritten && result.configPaths?.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold>Client config updated</Text>
          {result.configPaths.map((configPath) => (
            <Text key={configPath}>{configPath}</Text>
          ))}
        </Box>
      )}

      {hasSkillInit && skillAiTarget && (
        <Box marginTop={1}>
          <Text dimColor>
            Skill installed via uipro init --ai {skillAiTarget} in {process.cwd()}
          </Text>
        </Box>
      )}

      {packages.some((p) => p.type === 'plugin') && (
        <Box marginTop={1}>
          <Text dimColor>
            Plugins installed under {process.cwd()}/.aistack/
          </Text>
        </Box>
      )}

      {hasClientPackages && clientTarget && (
        <Box marginTop={1}>
          <Text color="yellow">
            Restart your AI client to activate MCP and memory tools
          </Text>
        </Box>
      )}

      <Box marginTop={1} flexDirection="column">
        <Text bold>Documentation</Text>
        {packages.map((pkg) => {
          if (!pkg.docs_url) return null;
          return (
            <Text key={pkg.id}>
              {pkg.name}: {pkg.docs_url}
            </Text>
          );
        })}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Press Enter or Q to exit</Text>
      </Box>
    </Box>
  );
}
