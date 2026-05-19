#!/usr/bin/env node

import React, { useEffect, useState } from 'react';
import { render, Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import {
  initRegistry,
  getAllRoles,
  getAllPackages,
  getPackagesByRole,
} from './registry.js';
import { RoleSelect } from './ui/RoleSelect.jsx';
import { PackageList } from './ui/PackageList.jsx';
import { TargetSelect } from './ui/TargetSelect.jsx';
import { ApiKeyPrompt } from './ui/ApiKeyPrompt.jsx';
import { ConfirmInstall } from './ui/ConfirmInstall.jsx';
import { SuccessScreen } from './ui/SuccessScreen.jsx';
import { collectRequiredSecrets } from './secrets.js';
import { getConfigPath } from './config-writer.js';

/**
 * Root TUI — orchestrates the five-step install flow.
 */
function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roles, setRoles] = useState([]);
  const [step, setStep] = useState('role');
  const [roleId, setRoleId] = useState(null);
  const [roleLabel, setRoleLabel] = useState(null);
  const [packages, setPackages] = useState([]);
  const [selectedPackages, setSelectedPackages] = useState([]);
  const [target, setTarget] = useState(null);
  const [requiredSecrets, setRequiredSecrets] = useState([]);
  const [apiKeys, setApiKeys] = useState({});
  const [installResult, setInstallResult] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        await initRegistry();
        setRoles(await getAllRoles());
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleRoleSelect(id) {
    setRoleId(id);
    if (id === null) {
      setRoleLabel(null);
      setPackages(await getAllPackages());
    } else {
      const role = roles.find((r) => r.id === id);
      setRoleLabel(role?.label ?? id);
      setPackages(await getPackagesByRole(id));
    }
    setStep('packages');
  }

  function handlePackageConfirm(chosen) {
    setSelectedPackages(chosen);
    setStep('target');
  }

  async function handleTargetSelect(value) {
    setTarget(value);
    setApiKeys({});

    const needed = await collectRequiredSecrets(selectedPackages, value);
    setRequiredSecrets(needed);
    setStep(needed.length > 0 ? 'apiKeys' : 'confirm');
  }

  function handleApiKeysComplete(keys) {
    setApiKeys(keys);
    setStep('confirm');
  }

  function handleInstallComplete(result) {
    setInstallResult(result);
    setStep('success');
  }

  if (loading) {
    return (
      <Text color="cyan">
        <Spinner type="dots" /> Loading registry…
      </Text>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Failed to load registry: {error}</Text>
      </Box>
    );
  }

  if (step === 'role') {
    return <RoleSelect roles={roles} onSelect={handleRoleSelect} />;
  }

  if (step === 'packages') {
    return (
      <PackageList
        packages={packages}
        roleLabel={roleLabel}
        onConfirm={handlePackageConfirm}
        onBack={() => setStep('role')}
      />
    );
  }

  if (step === 'target') {
    return (
      <TargetSelect
        onSelect={handleTargetSelect}
        onBack={() => setStep('packages')}
      />
    );
  }

  if (step === 'apiKeys') {
    const configPath = getConfigPath(target);
    return (
      <ApiKeyPrompt
        requiredSecrets={requiredSecrets}
        targetLabel={configPath ?? target}
        onComplete={handleApiKeysComplete}
        onBack={() => setStep('target')}
      />
    );
  }

  if (step === 'confirm') {
    return (
      <ConfirmInstall
        packages={selectedPackages}
        target={target}
        apiKeys={apiKeys}
        onComplete={handleInstallComplete}
        onBack={() =>
          setStep(requiredSecrets.length > 0 ? 'apiKeys' : 'target')
        }
      />
    );
  }

  if (step === 'success' && installResult) {
    return (
      <SuccessScreen
        result={installResult}
        packages={selectedPackages}
        onExit={() => process.exit(0)}
      />
    );
  }

  return null;
}

render(<App />);
