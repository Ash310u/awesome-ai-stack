# Contributing to awesome-ai-stack

Thank you for helping grow the AI tooling registry! Adding a new tool is intentionally simple: one JSON file and a pull request.

## How to add a tool

1. **Fork** the repository and create a branch.
2. **Add a JSON file** under the correct category folder:
   - `packages/mcps/` — MCP servers
   - `packages/memory/` — memory layers
   - `packages/skills/` — skills
3. **Follow the package schema exactly** (see example below).
4. **Optionally add the package id** to one or more files in `roles/` so it appears for that role.
5. **Validate locally:**
   ```bash
   npm install
   npm run validate
   ```
6. **Open a pull request.** CI runs `scripts/validate.js` automatically on every PR.
7. A **maintainer reviews** the entry (install command works, docs URL is valid, `verified` is set only when tested) and merges.

## Package schema

```json
{
  "id": "my-tool",
  "name": "My Tool",
  "category": "mcp",
  "description": "Short one-line description",
  "install": {
    "npx": "npx -y my-mcp-package@latest",
    "npm": "npm install -g my-mcp-package"
  },
  "config_target": ["claude_desktop", "cursor", "windsurf"],
  "config_snippet": {
    "mcpServers": {
      "my-tool": {
        "command": "npx",
        "args": ["-y", "my-mcp-package@latest"]
      }
    }
  },
  "tags": ["developer"],
  "docs_url": "https://example.com/docs",
  "verified": false
}
```

### Field notes

- **id** — unique slug, lowercase with hyphens
- **category** — one of: `mcp`, `memory`, `skill`
- **config_snippet** — merged into the user's config; use `{}` for tools that don't need MCP config
- **config_target** — which clients this snippet applies to
- **verified** — set to `true` only after a maintainer has confirmed install + config work

## Role schema

```json
{
  "id": "developer",
  "label": "Developer / Engineer",
  "description": "Short role description",
  "packages": ["context7", "github-mcp"]
}
```

Every `packages` entry must match an existing package `id`.

## Code changes

For CLI or TUI changes, keep edits focused and run `npm run validate` before pushing.

## Questions?

Open a [GitHub issue](https://github.com/Ash310u/awesome-ai-stack/issues) with the `question` label.
