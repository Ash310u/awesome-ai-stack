# awesome-ai-stack

> A TUI-based package manager for your AI stack. Browse and install MCP servers, memory layers, skills, and agent tools — configured automatically.

**awesome-ai-stack** (`aas`) helps you browse, select, and install AI tools — MCP servers, agents, skills, memory layers, and plugins.

## Quick Start

```bash
npx awesome-ai-stack
```

Or install globally (command: `aas`):

```bash
npm install -g awesome-ai-stack
aas
```

## Menu flow

1. **MCP Servers** / **Agents** / **Tools**
2. Tools → **Skills** / **Memory** / **Plugins & Extensions**
3. Browse with search, multi-select, and tag-based suggestions
4. Skills (e.g. UIUX ProMax) → pick AI assistant
5. MCP/Agent → pick client (Claude Desktop, Cursor, Windsurf)
6. Confirm and install

## Install behavior

### MCP Servers & Agents (client-level)

- Installed via `npx`/`npm`
- Config written to your AI client config file (Claude Desktop, Cursor, Windsurf)

### Skills (IDE skills folders via uipro-cli)

Skills like **UIUX ProMax** use [uipro-cli](https://www.npmjs.com/package/uipro-cli):

```bash
npm install -g uipro-cli
cd /path/to/your/project
uipro init --ai cursor              # project skills folder
```

`aas` runs these steps for you after you pick the assistant (always installs to the current project).

Supported assistants include: Claude, Cursor, Windsurf, Codex, Copilot, Gemini, Continue, and more — or `all`.

### Memory (client-level MCP)

Mem0, Claude Mem, and Zep install like MCP servers — config goes to Claude Desktop, Cursor, or Windsurf. API keys are prompted when needed.

### Plugins (project-level)

Plugins install into `.aistack/plugins/` in your current working directory.

## Development

```bash
git clone https://github.com/Ash310u/awesome-ai-stack.git
cd awesome-ai-stack
npm install
npm run validate
npm start
```

Set `AWESOME_AI_STACK_USE_LOCAL=1` to force reading local `packages/`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
