# Contributing to awesome-ai-stack

Thank you for helping grow the AI tooling registry! Adding a new tool is one JSON file and a pull request.

## How to add a tool

1. **Fork** the repository and create a branch.
2. **Add a JSON file** under the correct folder:
   - `packages/mcps/` — MCP servers (`type: "mcp"`)
   - `packages/agents/` — agent tools (`type: "agent"`)
   - `packages/skills/` — skills (`type: "skill"`)
   - `packages/memory/` — memory layers (`type: "memory"`)
   - `packages/plugins/` — plugins (`type: "plugin"`)
3. **Follow the package schema** (see examples below).
4. **Validate locally:**
   ```bash
   npm install
   npm run validate
   ```
5. **Open a pull request.**

## Package schema

### MCP / Agent

```json
{
  "id": "my-mcp",
  "name": "My MCP",
  "type": "mcp",
  "description": "Short one-line description",
  "install": {
    "npx": "npx -y my-mcp-package@latest",
    "npm": "npm install -g my-mcp-package"
  },
  "config_target": ["claude_desktop", "cursor", "windsurf"],
  "config_snippet": {
    "mcpServers": {
      "my-mcp": {
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

### Skill (CLI init — e.g. uipro-cli)

Installs into IDE skills folders via `uipro init --ai <assistant>`:

```json
{
  "id": "uiux-promax",
  "name": "UIUX ProMax",
  "type": "skill",
  "description": "Short description",
  "skill_init": {
    "command": "uipro",
    "npm": "npm install -g uipro-cli",
    "npx": "npx -y uipro-cli@latest",
    "package": "uipro-cli",
    "ai_options": [
      { "label": "Cursor", "value": "cursor" },
      { "label": "Claude Code", "value": "claude" }
    ]
  },
  "tags": ["design", "ui"],
  "docs_url": "https://www.npmjs.com/package/uipro-cli",
  "verified": false
}
```

### Memory / Plugin (project files in .aistack/)

```json
{
  "id": "my-memory",
  "name": "My Memory",
  "type": "memory",
  "description": "Short description",
  "content": "Full markdown or config string",
  "filename": "my-memory",
  "extension": ".md",
  "tags": ["memory"],
  "verified": false
}
```

### Field notes

- **type** — `mcp`, `agent`, `skill`, `memory`, or `plugin`
- **skill_init** — for skills installed via CLI init (IDE skills folders)
- **content** / **filename** / **extension** — for memory/plugin project files
- **verified** — set to `true` only after a maintainer confirms install works

## Code changes

For CLI or TUI changes, keep edits focused and run `npm run validate` before pushing.

## Questions?

Open a [GitHub issue](https://github.com/Ash310u/awesome-ai-stack/issues) with the `question` label.
