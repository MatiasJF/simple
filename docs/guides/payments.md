# Payments

## Simple Payment

Send BSV to a recipient using their identity key:

```typescript
const result = await wallet.pay({
  to: recipientIdentityKey,
  satoshis: 1000
})

console.log('TXID:', result.txid)
```

### With a Memo

Attach an OP_RETURN memo to the transaction:

```typescript
const result = await wallet.pay({
  to: recipientKey,
  satoshis: 1000,
  memo: 'Coffee payment'
})
```

This creates two outputs: the P2PKH payment and an OP_RETURN output containing the memo text.

### With Change Recovery

By default, change outputs from transactions are not tracked in any basket. Pass `changeBasket` to automatically recover them:

```typescript
const result = await wallet.pay({
  to: recipientKey,
  satoshis: 1000,
  basket: 'my-payments',
  changeBasket: 'my-change'
})

console.log('Change recovered:', result.reinternalized?.count)
```

### With BRC-29 Derivation

For payment protocols that require key derivation:

```typescript
const result = await wallet.pay({
  to: recipientKey,
  satoshis: 5000,
  derivationPrefix: 'cGF5bWVudA==',   // base64('payment')
  derivationSuffix: 'invoice-123'
})
```

When derivation parameters are provided, the library derives a payment-specific key using the BRC-29 protocol (`[2, '3241645161d8']`), so the payment is locked to a unique derived address rather than the recipient's main address.

## Multi-Output Send

The `send()` method is the core primitive that lets you combine multiple output types in a single transaction.

### Output Routing Rules

| Fields | Output Type | Satoshis |
|--------|------------|----------|
| `to` only | P2PKH payment | Must be > 0 |
| `data` only | OP_RETURN inscription | Always 0 |
| `to` + `data` | PushDrop token | Must be >= 1 |

### Example: Three Output Types in One Transaction

```typescript
const result = await wallet.send({
  outputs: [
    // P2PKH payment
    { to: recipientKey, satoshis: 1000, basket: 'payments' },

    // OP_RETURN data
    { data: ['Hello blockchain!'], basket: 'text' },

    // PushDrop token
    {
      to: wallet.getIdentityKey(),
      data: [{ type: 'receipt', amount: 1000 }],
      satoshis: 1,
      basket: 'receipts'
    }
  ],
  description: 'Payment with receipt',
  changeBasket: 'change'
})

// Check what was created
for (const detail of result.outputDetails) {
  console.log(`Output #${detail.index}: ${detail.type} (${detail.satoshis} sats)`)
}
// Output #0: p2pkh (1000 sats)
// Output #1: op_return (0 sats)
// Output #2: pushdrop (1 sats)
```

### Data Fields

The `data` array in output specs accepts multiple types:

```typescript
{ data: ['text string'] }                        // String → UTF-8 bytes
{ data: [{ key: 'value' }] }                     // Object → JSON string → UTF-8 bytes
{ data: [[0x48, 0x65, 0x6c, 0x6c, 0x6f]] }     // number[] → raw bytes
{ data: ['field1', { field2: true }, [0x00]] }   // Mixed types
```

## Change Recovery

When `createAction` produces change outputs, they exist in the wallet but aren't in any named basket. This means you can't query them via `listOutputs`. Change recovery puts them into a basket you can track.

### Automatic (Recommended)

Pass `changeBasket` to any payment method:

```typescript
await wallet.pay({ to: key, satoshis: 1000, changeBasket: 'my-change' })
await wallet.send({ outputs: [...], changeBasket: 'my-change' })
```

### Manual

If you have raw transaction bytes:

```typescript
const result = await wallet.reinternalizeChange(
  txBytes,        // number[] from createAction result
  'my-change',    // target basket
  [0, 1]          // output indexes to skip (your actual outputs)
)

console.log(`${result.count} change outputs recovered`)
if (result.errors.length) {
  console.warn('Errors:', result.errors)
}
```

### How It Works

1. Parse the transaction to find all outputs
2. Skip outputs at the specified indexes (your payment/token outputs)
3. Skip the largest remaining output (the wallet auto-tracks one change output)
4. For each remaining output, call `internalizeAction` with `basket insertion` protocol
5. Wait for broadcast with exponential backoff (up to 30 seconds)

## Funding a Server Wallet

See the [Server Wallet Guide](server-wallet.md) for the complete funding flow.

```typescript
// Get payment request from server
const res = await fetch('/api/server-wallet?action=request')
const { paymentRequest } = await res.json()

// Fund using browser wallet
const result = await wallet.fundServerWallet(
  paymentRequest,
  'server-funding',
  'change'
)
```

## PaymentOptions Reference

```typescript
interface PaymentOptions {
  to: string              // Recipient identity key (required)
  satoshis: number        // Amount in satoshis (required)
  memo?: string           // OP_RETURN memo text
  description?: string    // Transaction description
  basket?: string         // Track payment in this basket
  changeBasket?: string   // Recover change to this basket
  derivationPrefix?: string  // BRC-29 derivation prefix
  derivationSuffix?: string  // BRC-29 derivation suffix
}
```

## TransactionResult Reference

```typescript
interface TransactionResult {
  txid: string            // Transaction ID
  tx: number[]            // Raw transaction bytes (AtomicBEEF)
  outputs?: OutputInfo[]  // Output details
  reinternalized?: {      // Change recovery results
    count: number         // Number of change outputs recovered
    errors: string[]      // Any errors during recovery
  }
}
```
