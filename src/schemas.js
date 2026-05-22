import { z } from 'zod';

export const packageTypeSchema = z.enum([
  'mcp',
  'agent',
  'skill',
  'memory',
  'plugin',
]);

export const mcpAddSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['stdio', 'http', 'sse']),
  url: z.string().min(1).optional(),
  command: z.string().min(1).optional(),
  scope: z.enum(['global', 'project']).default('global'),
  env_key: z.string().min(1).optional(),
  auth_header: z.string().min(1).optional(),
  auth_prefix: z.string().optional(),
  clients: z.record(
    z.enum(['claude_desktop', 'cursor', 'windsurf']),
    z.string().min(1),
  ),
});

const packageBaseSchema = {
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  tags: z.array(z.string()),
  verified: z.boolean(),
  docs_url: z.string().url().optional(),
};

const installCommandsSchema = z
  .object({
    npx: z.string().min(1).optional(),
    npm: z.string().min(1).optional(),
    package: z.string().min(1).optional(),
  })
  .refine((data) => data.npx || data.npm, {
    message: 'At least one of npx or npm is required in install',
  });

export const skillInitSchema = z.object({
  command: z.string().min(1),
  npm: z.string().min(1).optional(),
  npx: z.string().min(1).optional(),
  package: z.string().min(1).optional(),
  ai_options: z
    .array(
      z.object({
        label: z.string().min(1),
        value: z.string().min(1),
      }),
    )
    .min(1),
});

const mcpInstallSchema = z.object({
  npx: z.string().min(1),
  npm: z.string().min(1),
});

const mcpAgentFields = {
  install: mcpInstallSchema,
  config_target: z.array(
    z.enum(['claude_desktop', 'cursor', 'windsurf']),
  ),
  config_snippet: z.record(z.unknown()),
  mcp_add: mcpAddSchema.optional(),
};

const contentToolFields = {
  content: z.string().min(1),
  filename: z.string().min(1),
  extension: z.string().min(1),
  install: installCommandsSchema.optional(),
};

const skillFields = {
  skill_init: skillInitSchema.optional(),
  content: z.string().optional(),
  filename: z.string().optional(),
  extension: z.string().optional(),
  install: installCommandsSchema.optional(),
};

export const packageSchema = z
  .discriminatedUnion('type', [
    z.object({ ...packageBaseSchema, type: z.literal('mcp'), ...mcpAgentFields }),
    z.object({ ...packageBaseSchema, type: z.literal('agent'), ...mcpAgentFields }),
    z.object({ ...packageBaseSchema, type: z.literal('skill'), ...skillFields }),
    z.object({ ...packageBaseSchema, type: z.literal('memory'), ...contentToolFields }),
    z.object({ ...packageBaseSchema, type: z.literal('plugin'), ...contentToolFields }),
  ])
  .superRefine((data, ctx) => {
    if (data.type !== 'skill') return;
    if (data.skill_init) return;

    if (!data.content) {
      ctx.addIssue({
        code: 'custom',
        message: 'content is required when skill_init is not set',
        path: ['content'],
      });
    }
    if (!data.filename) {
      ctx.addIssue({
        code: 'custom',
        message: 'filename is required when skill_init is not set',
        path: ['filename'],
      });
    }
    if (!data.extension) {
      ctx.addIssue({
        code: 'custom',
        message: 'extension is required when skill_init is not set',
        path: ['extension'],
      });
    }
  });

/** @typedef {z.infer<typeof packageTypeSchema>} PackageType */

export const TOOL_TYPE_DIRS = {
  skill: 'skills',
  memory: 'memory',
  plugin: 'plugins',
};

export const CLIENT_TARGETS = ['claude_desktop', 'cursor', 'windsurf'];

/** @param {string} type */
export function isClientLevelType(type) {
  return type === 'mcp' || type === 'agent';
}

/** @param {string} type */
export function isProjectLevelType(type) {
  return type === 'skill' || type === 'memory' || type === 'plugin';
}

/** @param {object} pkg */
export function usesSkillInit(pkg) {
  return Boolean(pkg.skill_init);
}

/** @param {object} pkg */
export function isContentTool(pkg) {
  return (
    (pkg.type === 'memory' || pkg.type === 'plugin' || pkg.type === 'skill') &&
    !pkg.skill_init
  );
}

/** @param {object[]} packages */
export function getSkillInitOptions(packages) {
  const skillPackages = packages.filter((p) => p.skill_init);
  if (skillPackages.length === 0) return [];

  const optionSets = skillPackages.map(
    (p) => new Set(p.skill_init.ai_options.map((o) => o.value)),
  );

  const sharedValues = [...optionSets[0]].filter((value) =>
    optionSets.every((set) => set.has(value)),
  );

  const labelByValue = new Map();
  for (const pkg of skillPackages) {
    for (const option of pkg.skill_init.ai_options) {
      labelByValue.set(option.value, option.label);
    }
  }

  return sharedValues.map((value) => ({
    label: labelByValue.get(value) ?? value,
    value,
  }));
}
