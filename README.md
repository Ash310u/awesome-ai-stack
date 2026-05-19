# awesome-ai-stack

> AI tooling package manager. Install MCP servers, memory layers, and AI skills in one command.

**awesome-ai-stack** is a terminal UI that helps you browse, select, and install AI tools for your role — MCP servers, memory layers, and skills — then writes the right config for Claude Desktop, Cursor, or Windsurf.

## Quick Start

```bash
npx awesome-ai-stack
```

Or install globally:

```bash
npm install -g awesome-ai-stack
awesome-ai-stack
```

## What it installs

- **MCP Servers** — Context7, Browser Use, Firecrawl, GitHub MCP, Perplexity MCP
- **Memory layers** — Claude Mem, Mem0, Zep Memory
- **Skills** — UIUX ProMax

## How it works

1. Pick your role (Developer, Marketer, Researcher, Designer) or browse all tools
2. Multi-select packages with checkboxes
3. Choose where to write config (Claude Desktop, Cursor, Windsurf, or install-only)
4. Confirm and install — MCP servers are config-only (`npx` from client config); memory and skills run `npx`/`npm` install
5. Config snippets are deep-merged into your client config (existing keys are never overwritten)

## Supported targets

| Target         | Config path |
|----------------|-------------|
| Claude Desktop | macOS: `~/Library/Application Support/Claude/claude_desktop_config.json` |
|                | Linux: `~/.config/Claude/claude_desktop_config.json` |
|                | Windows: `%APPDATA%\Claude\claude_desktop_config.json` |
| Cursor         | `~/.cursor/mcp.json` |
| Windsurf       | `~/.codeium/windsurf/mcp_config.json` |

## Development

```bash
git clone https://github.com/Ash310u/awesome-ai-stack.git
cd awesome-ai-stack
npm install
npm run validate   # validate all registry JSON
npm start          # launch TUI locally
```

Set `AWESOME_AI_STACK_USE_LOCAL=1` to force reading the local `packages/` and `roles/` directories.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) — adding a tool is just adding a JSON file.

## License

MIT
