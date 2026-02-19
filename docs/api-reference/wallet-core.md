# WalletCore

`WalletCore` is the abstract base class that both `BrowserWallet` and `ServerWallet` extend. It provides wallet info, key derivation, payments, multi-output sends, server wallet funding, and change reinternalization.

**Source:** `src/core/WalletCore.ts`

## Constructor

```typescript
constructor(identityKey: string, defaults?: Partial<WalletDefaults>)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `identityKey` | `string` | Compressed public key hex (66 chars) |
| `defaults` | `Partial<WalletDefaults>` | Override default configuration |

## Abstract Methods

### getClient()

```typescript
abstract getClient(): WalletInterface
```

Returns the underlying BSV SDK wallet client. Implemented by `BrowserWallet` (returns `WalletClient`) and `ServerWallet` (returns `ToolboxWallet`).

## Wallet Info

### getIdentityKey()

```typescript
getIdentityKey(): string
```

Returns the wallet's compressed public key hex string (66 characters).

### getAddress()

```typescript
getAddress(): string
```

Returns the P2PKH address derived from the identity key.

### getStatus()

```typescript
getStatus(): WalletStatus
```

**Returns:**

```typescript
{
  isConnected: boolean
  identityKey: string | null
  network: string
}
```

### getWalletInfo()

```typescript
getWalletInfo(): WalletInfo
```

**Returns:**

```typescript
{
  identityKey: string
  address: string
  network: string
  isConnected: boolean
}
```

## Key Derivation

### derivePublicKey()

```typescript
async derivePublicKey(
  protocolID: [SecurityLevel, string],
  keyID: string,
  counterparty?: string,
  forSelf?: boolean
): Promise<string>
```

Derive a public key for any protocol.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `protocolID` | `[SecurityLevel, string]` | *required* | Protocol identifier (e.g., `[2, '3241645161d8']`) |
| `keyID` | `string` | *required* | Key identifier (e.g., `'invoice-001'`) |
| `counterparty` | `string` | `'anyone'` | Counterparty identity key |
| `forSelf` | `boolean` | `false` | Derive for self instead of counterparty |

**Returns:** Compressed public key hex string.

### derivePaymentKey()

```typescript
async derivePaymentKey(counterparty: string, invoiceNumber?: string): Promise<string>
```

Derive a BRC-29 payment key. Uses protocol ID `[2, '3241645161d8']`.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `counterparty` | `string` | *required* | Recipient's identity key |
| `invoiceNumber` | `string` | random | Invoice/key identifier |

**Returns:** Compressed public key hex string.

## Payments

### pay()

```typescript
async pay(options: PaymentOptions): Promise<TransactionResult>
```

Send a P2PKH payment with optional OP_RETURN memo, BRC-29 derivation, and change recovery.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `options.to` | `string` | Yes | Recipient's public key |
| `options.satoshis` | `number` | Yes | Amount to send |
| `options.memo` | `string` | No | OP_RETURN memo (creates second output) |
| `options.description` | `string` | No | Transaction description |
| `options.basket` | `string` | No | Track payment output in a basket |
| `options.changeBasket` | `string` | No | Reinternalize change into this basket |
| `options.derivationPrefix` | `string` | No | BRC-29 derivation prefix |
| `options.derivationSuffix` | `string` | No | BRC-29 derivation suffix |

**Returns:** [`TransactionResult`](types.md#transactionresult)

**Behavior:**
- If `derivationPrefix` or `derivationSuffix` is provided, derives a payment key using BRC-29 protocol
- If `memo` is provided, adds an `OP_FALSE OP_RETURN <memo>` output
- If `changeBasket` is provided, calls `reinternalizeChange()` after the transaction

### send()

```typescript
async send(options: SendOptions): Promise<SendResult>
```

Create a transaction with multiple outputs of different types in a single transaction.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `options.outputs` | `SendOutputSpec[]` | Yes | Array of output specifications |
| `options.description` | `string` | No | Transaction description |
| `options.changeBasket` | `string` | No | Reinternalize change into this basket |

**Returns:** [`SendResult`](types.md#sendresult) (extends `TransactionResult` with `outputDetails`)

**Output routing rules:**

| `to` | `data` | Result |
|------|--------|--------|
| Yes | No | **P2PKH** — Simple payment (`satoshis` required, > 0) |
| No | Yes | **OP_RETURN** — Data inscription (`satoshis` = 0) |
| Yes | Yes | **PushDrop** — Encrypted token (`satoshis` >= 1) |
| No | No | Error |

**`SendOutputSpec` fields:**

| Field | Type | Description |
|-------|------|-------------|
| `to` | `string?` | Recipient public key |
| `satoshis` | `number?` | Amount (required for P2PKH, default 1 for PushDrop, 0 for OP_RETURN) |
| `data` | `(string \| object \| number[])[]?` | Data fields |
| `description` | `string?` | Output description |
| `basket` | `string?` | Track in a basket |
| `protocolID` | `[number, string]?` | PushDrop protocol ID |
| `keyID` | `string?` | PushDrop key ID |

### fundServerWallet()

```typescript
async fundServerWallet(
  request: PaymentRequest,
  basket?: string,
  changeBasket?: string
): Promise<TransactionResult>
```

Fund a `ServerWallet` using a BRC-29 derived payment.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `request` | `PaymentRequest` | Yes | Payment request from `ServerWallet.createPaymentRequest()` |
| `basket` | `string` | No | Track the funding output in a basket |
| `changeBasket` | `string` | No | Reinternalize change |

**Returns:** [`TransactionResult`](types.md#transactionresult)

### reinternalizeChange()

```typescript
async reinternalizeChange(
  tx: number[],
  basket: string,
  skipOutputIndexes?: number[]
): Promise<ReinternalizeResult>
```

Recover orphaned change outputs from a transaction into a named basket.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `tx` | `number[]` | *required* | AtomicBEEF transaction bytes |
| `basket` | `string` | *required* | Target basket for change outputs |
| `skipOutputIndexes` | `number[]` | `[0]` | Output indexes to skip (your payment outputs) |

**Returns:**

```typescript
{
  count: number    // Number of outputs recovered
  errors: string[] // Any errors during recovery
}
```

**Behavior:**
1. Parses the transaction and finds change outputs (non-zero satoshis, not in `skipOutputIndexes`)
2. **Skips the largest change output** — the wallet automatically tracks it
3. Waits for broadcast confirmation with exponential backoff (2s initial, up to 30s timeout)
4. Internalizes each remaining output using `basket insertion` protocol
