# DID (Decentralized Identity)

`@bsv/simple` supports `did:bsv:` Decentralized Identifiers — W3C-compatible DIDs backed by BSV identity keys.

## What is a DID?

A DID is a globally unique identifier that the owner controls without depending on a central authority. In BSV, a DID is derived directly from an identity key (compressed public key):

```
did:bsv:02a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
```

## The DID Class

`DID` is a standalone utility class — no wallet needed.

### Generate a DID Document

```typescript
import { DID } from '@bsv/simple/browser'

const doc = DID.fromIdentityKey('02a1b2c3...')

console.log(doc.id)          // 'did:bsv:02a1b2c3...'
console.log(doc.controller)  // 'did:bsv:02a1b2c3...'
console.log(doc.verificationMethod[0].publicKeyHex)  // '02a1b2c3...'
```

### DID Document Structure

```typescript
{
  '@context': ['https://www.w3.org/ns/did/v1'],
  id: 'did:bsv:02abc...',
  controller: 'did:bsv:02abc...',
  verificationMethod: [{
    id: 'did:bsv:02abc...#key-1',
    type: 'EcdsaSecp256k1VerificationKey2019',
    controller: 'did:bsv:02abc...',
    publicKeyHex: '02abc...'
  }],
  authentication: ['did:bsv:02abc...#key-1'],
  assertionMethod: ['did:bsv:02abc...#key-1']
}
```

### Parse a DID String

```typescript
const parsed = DID.parse('did:bsv:02abc...')
// { method: 'bsv', identityKey: '02abc...' }
```

Throws `DIDError` if the format is invalid.

### Validate a DID String

```typescript
DID.isValid('did:bsv:02abc...')  // true
DID.isValid('did:eth:0x123')     // false
DID.isValid('not-a-did')         // false
```

### Get DID Certificate Type

```typescript
const type = DID.getCertificateType()
// base64-encoded 'did:bsv'
```

Used when persisting DIDs as BSV certificates.

## Wallet DID Methods

When working with a wallet, you get convenience methods:

### Get Your DID

```typescript
const doc = wallet.getDID()
console.log(doc.id)  // 'did:bsv:02...' (your identity key)
```

This is synchronous — it builds the DID Document from the wallet's identity key.

### Resolve Any DID

```typescript
const doc = wallet.resolveDID('did:bsv:02abc...')
console.log(doc.verificationMethod[0].publicKeyHex)
```

Also synchronous. Parses the DID string and builds the Document.

### Register Your DID

Persist your DID as a BSV certificate:

```typescript
const doc = await wallet.registerDID({ persist: true })
console.log('DID registered:', doc.id)
```

This creates an ephemeral `Certifier` with `certificateType: DID.getCertificateType()` and issues a certificate containing:
- `didId`: The DID string
- `didType`: `'identity'`
- `version`: `'1.0'`
- `created`: ISO timestamp
- `isDID`: `'true'`

## Complete Example

```typescript
import { createWallet, DID } from '@bsv/simple/browser'

const wallet = await createWallet()

// Get your DID
const myDID = wallet.getDID()
console.log('My DID:', myDID.id)

// Register on-chain
await wallet.registerDID()

// Resolve someone else's DID
const theirDID = wallet.resolveDID('did:bsv:03def456...')
console.log('Their key:', theirDID.verificationMethod[0].publicKeyHex)

// Static validation
console.log(DID.isValid(myDID.id))  // true
```
