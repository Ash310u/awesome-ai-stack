import React, { useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Checkbox } from 'ink-checkbox';

const TYPE_COLORS = {
  mcp: 'green',
  agent: 'yellow',
  skill: 'blue',
  memory: 'magenta',
  plugin: 'cyan',
};

/**
 * @param {object[]} packages
 * @param {object[]} selected
 * @param {object[]} pool
 */
function getSuggestions(packages, selected, pool) {
  if (selected.length === 0) return [];

  const selectedTags = new Set(selected.flatMap((p) => p.tags));
  const selectedIds = new Set(selected.map((p) => p.id));

  return pool
    .filter((p) => !selectedIds.has(p.id))
    .map((p) => ({
      pkg: p,
      score: p.tags.filter((tag) => selectedTags.has(tag)).length,
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => entry.pkg);
}

/**
 * Step 3 — browse with search, multi-select, and tag-based suggestions.
 */
export function BrowseScreen({
  packages,
  categoryLabel,
  onConfirm,
  onBack,
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [focusIndex, setFocusIndex] = useState(0);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return packages;

    return packages.filter((pkg) => {
      const haystack = [
        pkg.name,
        pkg.description,
        ...(pkg.tags ?? []),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [packages, search]);

  const selectedPackages = useMemo(
    () => packages.filter((p) => selected.has(p.id)),
    [packages, selected],
  );

  const suggestions = useMemo(
    () => getSuggestions(packages, selectedPackages, packages),
    [packages, selectedPackages],
  );

  const toggle = (pkgId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pkgId)) next.delete(pkgId);
      else next.add(pkgId);
      return next;
    });
  };

  useInput((input, key) => {
    if (key.escape) {
      if (search.length > 0) {
        setSearch('');
        setFocusIndex(0);
        return;
      }
      onBack?.();
      return;
    }

    if (key.upArrow) {
      setFocusIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (key.downArrow) {
      setFocusIndex((i) => Math.min(Math.max(filtered.length - 1, 0), i + 1));
      return;
    }
    if (input === ' ') {
      const pkg = filtered[focusIndex];
      if (pkg) toggle(pkg.id);
      return;
    }
    if (key.return) {
      if (selected.size === 0) return;
      onConfirm(packages.filter((p) => selected.has(p.id)));
      return;
    }
    if (key.backspace || key.delete) {
      setSearch((s) => s.slice(0, -1));
      setFocusIndex(0);
      return;
    }
    if (input && !key.ctrl && !key.meta && input.length === 1) {
      setSearch((s) => s + input);
      setFocusIndex(0);
    }
  });

  if (packages.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color="yellow">No packages found for {categoryLabel}.</Text>
        <Text dimColor>Press Esc to go back</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold>Browse — {categoryLabel}</Text>
      <Text dimColor>
        Type to search · Space toggle · Enter confirm · Esc clear/back
      </Text>

      <Box marginTop={1} borderStyle="round" paddingX={1}>
        <Text>
          Search: {search}
          <Text color="cyan">▌</Text>
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        {filtered.length === 0 ? (
          <Text dimColor>No matches for "{search}"</Text>
        ) : (
          filtered.map((pkg, index) => {
            const focused = index === focusIndex;
            const badgeColor = TYPE_COLORS[pkg.type] ?? 'white';

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
                  <Text bold={focused}>{pkg.name} </Text>
                  <Text color={badgeColor}>[{pkg.type}]</Text>
                </Box>
                <Box marginLeft={4}>
                  <Text dimColor>{pkg.description}</Text>
                </Box>
                <Box marginLeft={4}>
                  <Text dimColor>{(pkg.tags ?? []).join(' · ')}</Text>
                </Box>
              </Box>
            );
          })
        )}
      </Box>

      {suggestions.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold color="yellow">
            You might also need:
          </Text>
          {suggestions.map((pkg) => (
            <Text key={pkg.id} dimColor>
              • {pkg.name} — {pkg.description}
            </Text>
          ))}
        </Box>
      )}

      <Box marginTop={1}>
        <Text>
          {selected.size} selected
          {selected.size === 0 ? ' (select at least one)' : ''}
        </Text>
      </Box>
    </Box>
  );
}
