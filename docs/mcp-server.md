# MCP Server

`@bsv/simplifier` ships with a companion **Model Context Protocol (MCP) server** that gives AI coding assistants (Claude Code, Cursor, Copilot, etc.) structured knowledge about the library and the ability to generate integration code.

## What is MCP?

The [Model Context Protocol](https://modelcontextprotocol.io) is an open standard that lets AI tools connect to external knowledge and capabilities. An MCP server exposes:

- **Resources** — read-only knowledge the AI can consult
- **Tools** — functions the AI can call to generate code
- **Prompts** — pre-built conversation templates for common workflows

## Available Resources

| URI | Description |
|-----|-------------|
| `simplifier://api/wallet` | WalletCore, BrowserWallet, and ServerWallet method reference |
| `simplifier://api/tokens` | Token create, list, send, redeem, and MessageBox transfer |
| `simplifier://api/inscriptions` | Text, JSON, file-hash, and image-hash inscriptions |
| `simplifier://api/messagebox` | MessageBox certification, payments, and identity registry |
| `simplifier://api/certification` | Certifier class and certificate management |
| `simplifier://api/did` | DID class and wallet DID methods |
| `simplifier://api/credentials` | Schema, Issuer, Verifiable Credentials/Presentations |
| `simplifier://api/overlay` | Overlay networks, SHIP/SLAP, broadcasting |
| `simplifier://guide/nextjs` | Complete Next.js integration guide |
| `simplifier://guide/gotchas` | Critical pitfalls and non-obvious behaviors |
| `simplifier://patterns` | Common code patterns and recipes |

## Available Tools

| Tool | Parameters | Description |
|------|-----------|-------------|
| `scaffold_nextjs_config` | `features: string[]` | Generate `next.config.ts`, package.json additions |
| `generate_wallet_setup` | `target`, `framework` | Wallet initialization code (browser or server) |
| `generate_payment_handler` | `type`, `basket?` | Payment handler (simple, multi-output, server-funding) |
| `generate_token_handler` | `operations: string[]` | Token handler functions |
| `generate_inscription_handler` | `types: string[]` | Inscription handler functions |
| `generate_messagebox_setup` | `features: string[]`, `registryUrl?` | MessageBox integration code |
| `generate_server_route` | `actions: string[]`, `walletPersistence` | Next.js API route handler |
| `generate_credential_issuer` | `schemaFields`, `revocation` | CredentialIssuer setup code |
| `generate_did_integration` | `features: string[]` | DID integration code |

## Available Prompts

| Prompt | Description |
|--------|-------------|
| `integrate_simplifier` | Full walkthrough for adding `@bsv/simplifier` to a project |
| `add_bsv_feature` | Generate code for a specific feature (payments, tokens, etc.) |
| `debug_simplifier` | Debugging help with common gotchas checklist |

## Running the MCP Server

### With Docker

```bash
# Build
docker build -t simplifier-mcp simplifier-v2-mcp/

# Run (stdio transport)
docker run -i --rm simplifier-mcp
```

### Without Docker

```bash
cd simplifier-v2-mcp
npm install
npm run build
npm start
```

## Configuring Claude Code

Add the MCP server to your Claude Code settings:

```json
// ~/.claude/settings.json
{
  "mcpServers": {
    "simplifier": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "simplifier-mcp"]
    }
  }
}
```

Or for local development:

```json
{
  "mcpServers": {
    "simplifier": {
      "command": "node",
      "args": ["/path/to/simplifier-v2-mcp/dist/index.js"]
    }
  }
}
```

## Example Usage

Once connected, you can ask your AI assistant things like:

- "Set up @bsv/simplifier in my Next.js project"
- "Generate a payment handler with change recovery"
- "Create a token system with MessageBox transfer"
- "Add verifiable credential issuance to my server"

The AI will consult the MCP resources for accurate API information and use the tools to generate working code that follows the library's patterns.
