import { RevocationRecord, RevocationStore } from '../core/types'

// ============================================================================
// FileRevocationStore (Node.js server only — not browser-safe)
// ============================================================================

export class FileRevocationStore implements RevocationStore {
  private filePath: string
  private mutex: Promise<void> = Promise.resolve()

  constructor(filePath?: string) {
    const path = require('path')
    this.filePath = filePath || path.join(process.cwd(), '.revocation-secrets.json')
  }

  private loadAll(): Record<string, RevocationRecord> {
    try {
      const fs = require('fs')
      if (fs.existsSync(this.filePath)) {
        return JSON.parse(fs.readFileSync(this.filePath, 'utf-8'))
      }
    } catch {}
    return {}
  }

  private saveAll(records: Record<string, RevocationRecord>): void {
    const fs = require('fs')
    fs.writeFileSync(this.filePath, JSON.stringify(records, null, 2))
  }

  private async withLock<T>(fn: (records: Record<string, RevocationRecord>) => T): Promise<T> {
    const prev = this.mutex
    let resolve: () => void
    this.mutex = new Promise<void>(r => { resolve = r })
    await prev
    try {
      const records = this.loadAll()
      const result = fn(records)
      this.saveAll(records)
      return result
    } finally {
      resolve!()
    }
  }

  async save(serialNumber: string, record: RevocationRecord): Promise<void> {
    await this.withLock(records => {
      records[serialNumber] = record
    })
  }

  async load(serialNumber: string): Promise<RevocationRecord | undefined> {
    const records = this.loadAll()
    return records[serialNumber]
  }

  async delete(serialNumber: string): Promise<void> {
    await this.withLock(records => {
      delete records[serialNumber]
    })
  }

  async has(serialNumber: string): Promise<boolean> {
    const records = this.loadAll()
    return serialNumber in records
  }

  async findByOutpoint(outpoint: string): Promise<boolean> {
    const records = this.loadAll()
    return Object.values(records).some(r => r.outpoint === outpoint)
  }
}
