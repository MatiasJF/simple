# Installation

## NPM

```bash
npm install @bsv/simplifier @bsv/sdk
```

`@bsv/sdk` is a peer dependency — it must be installed alongside `@bsv/simplifier`.

## Entry Points

The library provides three entry points:

| Import Path | Environment | Use Case |
|-------------|-------------|----------|
| `@bsv/simplifier/browser` | Browser | Connect to user's wallet extension |
| `@bsv/simplifier/server` | Node.js | Server wallet with private key |
| `@bsv/simplifier` | Both | All exports (use with care — includes server-only code) |

### Browser

```typescript
import { createWallet, Certifier, DID, Overlay } from '@bsv/simplifier/browser'
import { CredentialSchema, CredentialIssuer, MemoryRevocationStore } from '@bsv/simplifier/browser'
```

### Server (Node.js)

```typescript
import { ServerWallet, FileRevocationStore } from '@bsv/simplifier/server'
```

Or with dynamic import (recommended in frameworks like Next.js):

```typescript
const { ServerWallet } = await import('@bsv/simplifier/server')
```

## TypeScript

The library ships with full TypeScript declarations. No additional `@types/` packages are needed.

```typescript
import type { BrowserWallet } from '@bsv/simplifier/browser'
import type { PaymentOptions, TokenOptions, SendOptions } from '@bsv/simplifier'
```

## Framework-Specific Setup

### Next.js

Next.js with Turbopack requires additional configuration to prevent server-only packages from being bundled for the browser. See the [Next.js Integration Guide](guides/nextjs-integration.md) for the required `next.config.ts` setup.

### React / Vite

No special configuration needed. Import from `@bsv/simplifier/browser` in your components.

### Vanilla TypeScript / Node.js

No special configuration needed. Use `@bsv/simplifier/browser` for browser apps or `@bsv/simplifier/server` for Node.js scripts.
