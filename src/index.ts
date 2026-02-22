// Browser-compatible exports
export { createWallet, Wallet, Overlay, Certifier, WalletCore } from './browser'
export type { BrowserWallet } from './browser'

// DID & Credentials
export { DID } from './modules/did'
export {
  CredentialSchema,
  CredentialIssuer,
  MemoryRevocationStore,
  toVerifiableCredential,
  toVerifiablePresentation
} from './modules/credentials'

// Server-only exports
export {
  ServerWallet,
  generatePrivateKey,
  // Handler utilities
  JsonFileStore,
  toNextHandlers,
  // Identity Registry
  IdentityRegistry,
  createIdentityRegistryHandler,
  // DID Resolver
  DIDResolverService,
  createDIDResolverHandler,
  // Server Wallet Manager
  ServerWalletManager,
  createServerWalletHandler,
  // Credential Issuer Handler
  createCredentialIssuerHandler
} from './server'
export { FileRevocationStore } from './modules/file-revocation-store'

// Types
export type {
  Network,
  WalletDefaults,
  TransactionResult,
  OutputInfo,
  ReinternalizeResult,
  WalletStatus,
  WalletInfo,
  PaymentOptions,
  SendOutputSpec,
  SendOutputDetail,
  SendOptions,
  SendResult,
  DerivationInfo,
  PaymentDerivation,
  TokenOptions,
  TokenResult,
  TokenDetail,
  SendTokenOptions,
  RedeemTokenOptions,
  InscriptionType,
  InscriptionOptions,
  InscriptionResult,
  MessageBoxConfig,
  CertifierConfig,
  CertificateData,
  OverlayConfig,
  OverlayInfo,
  OverlayBroadcastResult,
  OverlayOutput,
  ServerWalletConfig,
  PaymentRequest,
  IncomingPayment,
  DIDDocument,
  DIDVerificationMethod,
  DIDParseResult,
  DIDDocumentV2,
  DIDVerificationMethodV2,
  DIDService,
  DIDCreateOptions,
  DIDCreateResult,
  DIDResolutionResult,
  DIDChainState,
  DIDUpdateOptions,
  CredentialFieldType,
  CredentialFieldSchema,
  CredentialSchemaConfig,
  VerifiableCredential,
  VerifiablePresentation,
  VerificationResult,
  CredentialIssuerConfig,
  RevocationRecord,
  RevocationStore,
  RegistryEntry,
  IdentityRegistryStore,
  IdentityRegistryConfig,
  DIDResolverConfig,
  ServerWalletManagerConfig,
  CredentialIssuerHandlerConfig
} from './core/types'

// Errors
export {
  SimpleError,
  WalletError,
  TransactionError,
  MessageBoxError,
  CertificationError,
  DIDError,
  CredentialError
} from './core/errors'
