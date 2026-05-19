# aistack

> AI tooling package manager. Install MCP servers, memory layers, and AI skills in one command.

**aistack** is a terminal UI that helps you browse, select, and install AI tools for your role — MCP servers, memory layers, and skills — then writes the right config for Claude Desktop, Cursor, or Windsurf.

## Quick Start

```bash
npx aistack
```

Or install globally:

```bash
npm install -g aistack
aistack
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
git clone https://github.com/aistack/aistack.git
cd aistack
npm install
npm run validate   # validate all registry JSON
npm start          # launch TUI locally
```

Set `AISTACK_USE_LOCAL=1` to force reading the local `packages/` and `roles/` directories.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) — adding a tool is just adding a JSON file.

## License

MIT
