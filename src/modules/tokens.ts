import {
  Utils,
  PushDrop,
  SecurityLevel,
  Random,
  LockingScript,
  Transaction,
  Beef
} from '@bsv/sdk'
import { PeerPayClient } from '@bsv/message-box-client'
import { WalletCore } from '../core/WalletCore'
import {
  TokenOptions,
  TokenResult,
  TokenDetail,
  SendTokenOptions,
  RedeemTokenOptions,
  TransactionResult
} from '../core/types'

const TOKEN_MESSAGE_BOX = 'simplifier_token_inbox'

export function createTokenMethods(core: WalletCore) {
  return {
    async createToken(options: TokenOptions): Promise<TokenResult> {
      try {
        const client = core.getClient()
        const basket = options.basket ?? core.defaults.tokenBasket
        const protocolID = (options.protocolID ?? core.defaults.tokenProtocolID) as [SecurityLevel, string]
        const keyID = options.keyID ?? core.defaults.tokenKeyID
        const satoshis = options.satoshis ?? 1

        const dataString = typeof options.data === 'object'
          ? JSON.stringify(options.data)
          : String(options.data)

        const plaintext = Array.from(Utils.toArray(dataString, 'utf8'))
        const encryptResult = await client.encrypt({
          plaintext,
          protocolID,
          keyID,
          counterparty: 'self'
        } as any)

        const ciphertext = Array.from(encryptResult.ciphertext)

        const pushdrop = new PushDrop(client)
        const lockingScript = await pushdrop.lock(
          [ciphertext],
          protocolID,
          keyID,
          'self',
          true,
          false
        )

        const result = await client.createAction({
          description: `Create token in ${basket} basket`,
          outputs: [{
            lockingScript: lockingScript.toHex(),
            satoshis,
            basket,
            customInstructions: JSON.stringify({ protocolID, keyID, counterparty: 'self' }),
            tags: ['token'],
            outputDescription: `Token (${basket})`
          }],
          options: { randomizeOutputs: false }
        })

        return {
          txid: result.txid || '',
          tx: result.tx,
          basket,
          encrypted: true,
          outputs: [{ index: 0, satoshis, lockingScript: lockingScript.toHex() }]
        }
      } catch (error) {
        throw new Error(`Token creation failed: ${(error as Error).message}`)
      }
    },

    async listTokenDetails(basket?: string): Promise<TokenDetail[]> {
      const effectiveBasket = basket ?? core.defaults.tokenBasket
      const client = core.getClient()
      const result = await client.listOutputs({
        basket: effectiveBasket,
        include: 'locking scripts',
        includeCustomInstructions: true
      } as any)

      const outputs = result?.outputs ?? (Array.isArray(result) ? result : [])
      const details: TokenDetail[] = []

      const defaultProtocolID = core.defaults.tokenProtocolID
      const defaultKeyID = core.defaults.tokenKeyID
      const defaultCounterparty = 'self'

      for (const output of outputs) {
        try {
          const lockScript = LockingScript.fromHex(output.lockingScript as string)
          const decoded = PushDrop.decode(lockScript)

          let ci: any = {}
          if ((output as any).customInstructions) {
            try { ci = JSON.parse((output as any).customInstructions) } catch {}
          }
          const protocolID = ci.protocolID || defaultProtocolID
          const keyID = ci.keyID || defaultKeyID
          const counterparty = ci.counterparty || defaultCounterparty

          let data: any = null
          if (decoded.fields[0]) {
            try {
              const { plaintext } = await client.decrypt({
                ciphertext: Array.from(decoded.fields[0]),
                protocolID,
                keyID,
                counterparty
              } as any)
              const text = new TextDecoder().decode(new Uint8Array(plaintext))
              try { data = JSON.parse(text) } catch { data = text }
            } catch {
              // Fallback: try 'anyone' for pre-fix tokens
              if (counterparty === 'self') {
                try {
                  const { plaintext } = await client.decrypt({
                    ciphertext: Array.from(decoded.fields[0]),
                    protocolID,
                    keyID,
                    counterparty: 'anyone'
                  } as any)
                  const text = new TextDecoder().decode(new Uint8Array(plaintext))
                  try { data = JSON.parse(text) } catch { data = text }
                } catch {
                  data = null
                }
              } else {
                data = null
              }
            }
          }

          details.push({
            outpoint: output.outpoint,
            satoshis: output.satoshis || 0,
            data,
            protocolID,
            keyID,
            counterparty
          })
        } catch {
          // Skip non-PushDrop outputs
        }
      }

      return details
    },

    async sendToken(options: SendTokenOptions): Promise<TransactionResult> {
      try {
        const client = core.getClient()
        const { basket, outpoint, to } = options

        const defaultProtocolID: [number, string] = core.defaults.tokenProtocolID
        const defaultKeyID = core.defaults.tokenKeyID
        const defaultCounterparty = 'self'

        const result = await client.listOutputs({
          basket,
          include: 'entire transactions',
          includeCustomInstructions: true
        } as any)

        const outputs = result?.outputs ?? []
        const targetOutput = outputs.find((o: any) => o.outpoint === outpoint)
        if (!targetOutput) throw new Error(`Token not found: ${outpoint}`)

        let ci: any = {}
        if ((targetOutput as any).customInstructions) {
          try { ci = JSON.parse((targetOutput as any).customInstructions) } catch {}
        }
        const protocolID = ci.protocolID || defaultProtocolID
        const keyID = ci.keyID || defaultKeyID
        const counterparty = ci.counterparty || defaultCounterparty

        const beef = new Beef()
        beef.mergeBeef((result as any).BEEF as number[])

        const [txid, voutStr] = outpoint.split('.')
        const vout = Number(voutStr)
        const sourceTx = beef.findAtomicTransaction(txid) as Transaction
        const sourceScript = sourceTx.outputs[vout].lockingScript as LockingScript
        const decoded = PushDrop.decode(sourceScript)

        const newKeyID = Utils.toBase64(Random(8))
        const pushdrop = new PushDrop(client)
        const isSelfSend = to === core.getIdentityKey()
        const newLockingScript = await pushdrop.lock(
          decoded.fields.map((f: number[]) => Array.from(f)),
          protocolID as [SecurityLevel, string],
          newKeyID,
          isSelfSend ? 'self' : to,
          isSelfSend,
          false
        )

        const newCounterparty = isSelfSend ? 'self' : to

        const inputBEEF = beef.toBinary()
        const response = await client.createAction({
          description: `Send token from ${basket}`,
          inputBEEF,
          inputs: [{
            outpoint,
            inputDescription: 'Token input',
            unlockingScriptLength: 73
          }],
          outputs: [{
            satoshis: 1,
            lockingScript: newLockingScript.toHex(),
            outputDescription: 'Token for recipient',
            basket,
            customInstructions: JSON.stringify({ protocolID, keyID: newKeyID, counterparty: newCounterparty }),
            tags: ['token', 'sent']
          }],
          options: { randomizeOutputs: false }
        } as any)

        if (!(response as any)?.signableTransaction) {
          throw new Error('Expected signableTransaction')
        }

        const signable = (response as any).signableTransaction
        const txToSign = Transaction.fromBEEF(signable.tx)
        txToSign.inputs[0].unlockingScriptTemplate = new PushDrop(client).unlock(
          protocolID as [SecurityLevel, string],
          keyID,
          counterparty
        )
        await txToSign.sign()

        const unlockingScript = txToSign.inputs[0].unlockingScript?.toHex()
        if (!unlockingScript) throw new Error('Failed to generate unlocking script')

        const finalResult = await client.signAction({
          reference: signable.reference,
          spends: { '0': { unlockingScript } }
        })

        return {
          txid: (finalResult as any).txid || '',
          tx: (finalResult as any).tx
        }
      } catch (error) {
        throw new Error(`Token send failed: ${(error as Error).message}`)
      }
    },

    async redeemToken(options: RedeemTokenOptions): Promise<TransactionResult> {
      try {
        const client = core.getClient()
        const { basket, outpoint } = options

        const defaultProtocolID: [number, string] = core.defaults.tokenProtocolID
        const defaultKeyID = core.defaults.tokenKeyID
        const defaultCounterparty = 'self'

        const result = await client.listOutputs({
          basket,
          include: 'entire transactions',
          includeCustomInstructions: true
        } as any)

        const outputs = result?.outputs ?? []
        const targetOutput = outputs.find((o: any) => o.outpoint === outpoint)
        if (!targetOutput) throw new Error(`Token not found: ${outpoint}`)

        let ci: any = {}
        if ((targetOutput as any).customInstructions) {
          try { ci = JSON.parse((targetOutput as any).customInstructions) } catch {}
        }
        const protocolID = ci.protocolID || defaultProtocolID
        const keyID = ci.keyID || defaultKeyID
        const counterparty = ci.counterparty || defaultCounterparty

        const beef = new Beef()
        beef.mergeBeef((result as any).BEEF as number[])

        const inputBEEF = beef.toBinary()
        const response = await client.createAction({
          description: `Redeem token from ${basket}`,
          inputBEEF,
          inputs: [{
            outpoint,
            inputDescription: 'Token to redeem',
            unlockingScriptLength: 73
          }],
          outputs: [],
          options: { randomizeOutputs: false }
        } as any)

        if (!(response as any)?.signableTransaction) {
          throw new Error('Expected signableTransaction')
        }

        const signable = (response as any).signableTransaction
        const txToSign = Transaction.fromBEEF(signable.tx)
        txToSign.inputs[0].unlockingScriptTemplate = new PushDrop(client).unlock(
          protocolID as [SecurityLevel, string],
          keyID,
          counterparty
        )
        await txToSign.sign()

        const unlockingScript = txToSign.inputs[0].unlockingScript?.toHex()
        if (!unlockingScript) throw new Error('Failed to generate unlocking script')

        const finalResult = await client.signAction({
          reference: signable.reference,
          spends: { '0': { unlockingScript } }
        })

        return {
          txid: (finalResult as any).txid || '',
          tx: (finalResult as any).tx
        }
      } catch (error) {
        throw new Error(`Token redeem failed: ${(error as Error).message}`)
      }
    },

    async sendTokenViaMessageBox(options: SendTokenOptions): Promise<TransactionResult> {
      try {
        const client = core.getClient()
        const { basket, outpoint, to } = options

        const defaultProtocolID: [number, string] = core.defaults.tokenProtocolID
        const defaultKeyID = core.defaults.tokenKeyID
        const defaultCounterparty = 'self'

        const result = await client.listOutputs({
          basket,
          include: 'entire transactions',
          includeCustomInstructions: true
        } as any)

        const outputs = result?.outputs ?? []
        const targetOutput = outputs.find((o: any) => o.outpoint === outpoint)
        if (!targetOutput) throw new Error(`Token not found: ${outpoint}`)

        let ci: any = {}
        if ((targetOutput as any).customInstructions) {
          try { ci = JSON.parse((targetOutput as any).customInstructions) } catch {}
        }
        const protocolID = ci.protocolID || defaultProtocolID
        const keyID = ci.keyID || defaultKeyID
        const counterparty = ci.counterparty || defaultCounterparty

        const beef = new Beef()
        beef.mergeBeef((result as any).BEEF as number[])

        const [txid, voutStr] = outpoint.split('.')
        const vout = Number(voutStr)
        const sourceTx = beef.findAtomicTransaction(txid) as Transaction
        const sourceScript = sourceTx.outputs[vout].lockingScript as LockingScript
        const decoded = PushDrop.decode(sourceScript)

        const newKeyID = Utils.toBase64(Random(8))
        const pushdrop = new PushDrop(client)
        const newLockingScript = await pushdrop.lock(
          decoded.fields.map((f: number[]) => Array.from(f)),
          protocolID as [SecurityLevel, string],
          newKeyID,
          to,
          false,
          false
        )

        const inputBEEF = beef.toBinary()
        const response = await client.createAction({
          description: `Send token via MessageBox`,
          inputBEEF,
          inputs: [{
            outpoint,
            inputDescription: 'Token input',
            unlockingScriptLength: 73
          }],
          outputs: [{
            satoshis: 1,
            lockingScript: newLockingScript.toHex(),
            outputDescription: 'Token for recipient'
          }],
          options: { randomizeOutputs: false }
        } as any)

        if (!(response as any)?.signableTransaction) {
          throw new Error('Expected signableTransaction')
        }

        const signable = (response as any).signableTransaction
        const txToSign = Transaction.fromBEEF(signable.tx)
        txToSign.inputs[0].unlockingScriptTemplate = new PushDrop(client).unlock(
          protocolID as [SecurityLevel, string],
          keyID,
          counterparty
        )
        await txToSign.sign()

        const unlockingScript = txToSign.inputs[0].unlockingScript?.toHex()
        if (!unlockingScript) throw new Error('Failed to generate unlocking script')

        const finalResult = await client.signAction({
          reference: signable.reference,
          spends: { '0': { unlockingScript } }
        })

        // Send via MessageBox
        const peerPay = new PeerPayClient({
          walletClient: client as any,
          messageBoxHost: core.defaults.messageBoxHost,
          enableLogging: false
        })
        await peerPay.sendMessage({
          recipient: to,
          messageBox: TOKEN_MESSAGE_BOX,
          body: JSON.stringify({
            transaction: (finalResult as any).tx,
            protocolID,
            keyID: newKeyID,
            sender: core.getIdentityKey(),
            outputIndex: 0
          })
        })

        return {
          txid: (finalResult as any).txid || '',
          tx: (finalResult as any).tx
        }
      } catch (error) {
        throw new Error(`Token MessageBox send failed: ${(error as Error).message}`)
      }
    },

    async listIncomingTokens(): Promise<any[]> {
      try {
        const client = core.getClient()
        const peerPay = new PeerPayClient({
          walletClient: client as any,
          messageBoxHost: core.defaults.messageBoxHost,
          enableLogging: false
        })
        const messages = await peerPay.listMessages({
          messageBox: TOKEN_MESSAGE_BOX
        })

        return messages.map((msg: any) => {
          let body = msg.body
          if (typeof body === 'string') {
            try { body = JSON.parse(body) } catch {}
          }
          return {
            messageId: msg.messageId,
            sender: body?.sender || msg.sender,
            transaction: body?.transaction,
            protocolID: body?.protocolID,
            keyID: body?.keyID,
            outputIndex: body?.outputIndex ?? 0,
            createdAt: msg.created_at
          }
        })
      } catch (error) {
        throw new Error(`Failed to list incoming tokens: ${(error as Error).message}`)
      }
    },

    async acceptIncomingToken(token: any, basket?: string): Promise<any> {
      try {
        const client = core.getClient()
        const effectiveBasket = basket ?? core.defaults.tokenBasket

        await client.internalizeAction({
          tx: token.transaction,
          outputs: [{
            outputIndex: token.outputIndex ?? 0,
            protocol: 'basket insertion',
            insertionRemittance: {
              basket: effectiveBasket,
              customInstructions: JSON.stringify({
                protocolID: token.protocolID,
                keyID: token.keyID,
                counterparty: token.sender
              }),
              tags: ['token', 'received']
            }
          }],
          description: `Receive token from ${token.sender?.substring(0, 20)}...`
        } as any)

        const peerPay = new PeerPayClient({
          walletClient: client as any,
          messageBoxHost: core.defaults.messageBoxHost,
          enableLogging: false
        })
        await peerPay.acknowledgeMessage({ messageIds: [token.messageId] })

        return { accepted: true, basket: effectiveBasket, sender: token.sender }
      } catch (error) {
        throw new Error(`Failed to accept incoming token: ${(error as Error).message}`)
      }
    }
  }
}
