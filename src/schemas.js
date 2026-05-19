import { z } from 'zod';

export const categorySchema = z.enum(['mcp', 'memory', 'skill']);

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

export const packageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: categorySchema,
  description: z.string().min(1),
  install: z.object({
    npx: z.string().min(1),
    npm: z.string().min(1),
  }),
  mcp_add: mcpAddSchema.optional(),
  config_target: z.array(
    z.enum(['claude_desktop', 'cursor', 'windsurf']),
  ),
  config_snippet: z.record(z.unknown()),
  tags: z.array(z.string()),
  docs_url: z.string().url(),
  verified: z.boolean(),
});

export const roleSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  packages: z.array(z.string().min(1)),
});
