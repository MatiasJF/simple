export class SimplifierError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'SimplifierError'
  }
}

export class WalletError extends SimplifierError {
  constructor(message: string) {
    super(message, 'WALLET_ERROR')
    this.name = 'WalletError'
  }
}

export class TransactionError extends SimplifierError {
  constructor(message: string) {
    super(message, 'TRANSACTION_ERROR')
    this.name = 'TransactionError'
  }
}

export class MessageBoxError extends SimplifierError {
  constructor(message: string) {
    super(message, 'MESSAGEBOX_ERROR')
    this.name = 'MessageBoxError'
  }
}

export class CertificationError extends SimplifierError {
  constructor(message: string) {
    super(message, 'CERTIFICATION_ERROR')
    this.name = 'CertificationError'
  }
}

export class DIDError extends SimplifierError {
  constructor(message: string) {
    super(message, 'DID_ERROR')
    this.name = 'DIDError'
  }
}

export class CredentialError extends SimplifierError {
  constructor(message: string) {
    super(message, 'CREDENTIAL_ERROR')
    this.name = 'CredentialError'
  }
}
