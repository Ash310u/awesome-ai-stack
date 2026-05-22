#!/usr/bin/env node

import React, { useEffect, useState } from 'react';
import { render, Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { initRegistry, getPackagesByType } from './registry.js';
import { CategorySelect } from './ui/CategorySelect.jsx';
import { ToolsSubMenu } from './ui/ToolsSubMenu.jsx';
import { BrowseScreen } from './ui/BrowseScreen.jsx';
import { ClientSelect } from './ui/ClientSelect.jsx';
import { SkillClientSelect } from './ui/SkillClientSelect.jsx';
import { ApiKeyPrompt } from './ui/ApiKeyPrompt.jsx';
import { ConfirmInstall } from './ui/ConfirmInstall.jsx';
import { SuccessScreen } from './ui/SuccessScreen.jsx';
import { collectRequiredSecrets } from './secrets.js';
import { getConfigPath } from './config-writer.js';
import {
  isClientLevelType,
  usesSkillInit,
  getSkillInitOptions,
} from './schemas.js';

const CATEGORY_LABELS = {
  mcp: 'MCP Servers',
  agent: 'Agents',
  skill: 'Skills',
  memory: 'Memory',
  plugin: 'Plugins & Extensions',
};

function nextStepAfterSkillClient(chosen) {
  if (chosen.some((p) => isClientLevelType(p.type))) return 'client';
  return 'confirm';
}

function nextStepAfterBrowse(chosen) {
  if (chosen.some((p) => usesSkillInit(p))) return 'skillClient';
  if (chosen.some((p) => isClientLevelType(p.type))) return 'client';
  return 'confirm';
}

/**
 * Root TUI — category → browse → skill client or MCP client → confirm.
 */
function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('category');
  const [browseType, setBrowseType] = useState(null);
  const [packages, setPackages] = useState([]);
  const [selectedPackages, setSelectedPackages] = useState([]);
  const [clientTarget, setClientTarget] = useState(null);
  const [skillAiTarget, setSkillAiTarget] = useState(null);
  const [requiredSecrets, setRequiredSecrets] = useState([]);
  const [apiKeys, setApiKeys] = useState({});
  const [installResult, setInstallResult] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        await initRegistry();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function loadPackagesForType(type) {
    setBrowseType(type);
    setPackages(await getPackagesByType(type));
    setStep('browse');
  }

  function handleCategorySelect(value) {
    if (value === 'tools') {
      setStep('toolsSub');
      return;
    }
    loadPackagesForType(value);
  }

  function handleToolsSubSelect(type) {
    loadPackagesForType(type);
  }

  function handlePackageConfirm(chosen) {
    setSelectedPackages(chosen);
    setSkillAiTarget(null);
    setClientTarget(null);
    setStep(nextStepAfterBrowse(chosen));
  }

  function handleSkillClientSelect(value) {
    setSkillAiTarget(value);
    setStep(nextStepAfterSkillClient(selectedPackages));
  }

  async function handleClientSelect(value) {
    setClientTarget(value);
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

  function handleBackFromBrowse() {
    if (browseType === 'skill' || browseType === 'memory' || browseType === 'plugin') {
      setStep('toolsSub');
    } else {
      setStep('category');
    }
    setBrowseType(null);
    setPackages([]);
  }

  const skillOptions = getSkillInitOptions(selectedPackages);

  if (loading) {
    return (
      <Text color="cyan">
        <Spinner type="dots" /> Loading awesome-ai-stack registry…
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

  if (step === 'category') {
    return <CategorySelect onSelect={handleCategorySelect} />;
  }

  if (step === 'toolsSub') {
    return (
      <ToolsSubMenu
        onSelect={handleToolsSubSelect}
        onBack={() => setStep('category')}
      />
    );
  }

  if (step === 'browse') {
    return (
      <BrowseScreen
        packages={packages}
        categoryLabel={CATEGORY_LABELS[browseType] ?? browseType}
        onConfirm={handlePackageConfirm}
        onBack={handleBackFromBrowse}
      />
    );
  }

  if (step === 'skillClient') {
    return (
      <SkillClientSelect
        options={skillOptions}
        onSelect={handleSkillClientSelect}
        onBack={() => setStep('browse')}
      />
    );
  }

  if (step === 'client') {
    return (
      <ClientSelect
        onSelect={handleClientSelect}
        onBack={() =>
          setStep(
            selectedPackages.some((p) => usesSkillInit(p))
              ? 'skillClient'
              : 'browse',
          )
        }
      />
    );
  }

  if (step === 'apiKeys') {
    const configPath = getConfigPath(clientTarget);
    return (
      <ApiKeyPrompt
        requiredSecrets={requiredSecrets}
        targetLabel={configPath ?? clientTarget}
        onComplete={handleApiKeysComplete}
        onBack={() => setStep('client')}
      />
    );
  }

  if (step === 'confirm') {
    return (
      <ConfirmInstall
        packages={selectedPackages}
        clientTarget={clientTarget}
        skillAiTarget={skillAiTarget}
        apiKeys={apiKeys}
        onComplete={handleInstallComplete}
        onBack={() => {
          if (selectedPackages.some((p) => isClientLevelType(p.type))) {
            setStep(requiredSecrets.length > 0 ? 'apiKeys' : 'client');
          } else if (selectedPackages.some((p) => usesSkillInit(p))) {
            setStep('skillClient');
          } else {
            setStep('browse');
          }
        }}
      />
    );
  }

  if (step === 'success' && installResult) {
    return (
      <SuccessScreen
        result={installResult}
        packages={selectedPackages}
        clientTarget={clientTarget}
        skillAiTarget={skillAiTarget}
        onExit={() => process.exit(0)}
      />
    );
  }

  return null;
}

render(<App />);
