import { describe, it, expect } from 'vitest'
import { spawnSync } from 'node:child_process'
import { resolve, join } from 'node:path'

const root = resolve(import.meta.dirname, '..', '..', '..', '..')
const tsxCli = join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs')
const seedScript = join(root, 'scripts', 'import-faanjyut.ts')
const migrateScript = join(root, 'scripts', 'migrate-faanjyut-indexes.ts')

function runCli(script: string, args: string[], env: Record<string, string | undefined> = {}): { code: number; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [tsxCli, script, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, ...env },
    timeout: 30_000
  })
  return { code: result.status ?? -1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' }
}

describe('CLI 退出碼契約（不依賴 MongoDB 的分支）', () => {
  it('--help → 退出碼 0', () => {
    const { code, stdout } = runCli(seedScript, ['--help'])
    expect(code).toBe(0)
    expect(stdout).toContain('seed:faanjyut')
  })

  it('缺少 --input → 退出碼 1', () => {
    const { code } = runCli(seedScript, [])
    expect(code).toBe(1)
  })

  it('非法 --environment → 退出碼 1', () => {
    const { code } = runCli(seedScript, ['--input', '/tmp/x', '--environment', 'bogus'])
    expect(code).toBe(1)
  })

  it('寫入模式（--mode initial）→ 退出碼 3（P2 未實現）', () => {
    const { code, stderr } = runCli(seedScript, ['--input', '/tmp/x', '--mode', 'initial', '--confirm-write', 'staging_db'])
    expect(code).toBe(3)
    expect(stderr).toContain('P2')
  })

  it('未知 --mode → 退出碼 1', () => {
    const { code } = runCli(seedScript, ['--input', '/tmp/x', '--mode', 'bogus'])
    expect(code).toBe(1)
  })

  it('migrate --apply → 退出碼 3（P2 未實現）', () => {
    const { code, stderr } = runCli(migrateScript, ['--apply', '--confirm-write', 'staging_db'])
    expect(code).toBe(3)
    expect(stderr).toContain('P2')
  })

  it('dry-run 無 MongoDB URI → 退出碼 1', () => {
    const { code, stderr } = runCli(seedScript, ['--input', '/tmp/x', '--dry-run'], { FAANJYUT_MONGODB_URI: '', MONGODB_URI: '' })
    expect(code).toBe(1)
    expect(stderr).toContain('MONGODB_URI')
  })

  it('migrate dry-run 無 MongoDB URI → 退出碼 1', () => {
    const { code, stderr } = runCli(migrateScript, ['--dry-run'], { FAANJYUT_MONGODB_URI: '', MONGODB_URI: '' })
    expect(code).toBe(1)
    expect(stderr).toContain('MONGODB_URI')
  })
})

describe('CLI 集成（需真實 MongoDB；默認跳過）', () => {
  const runIntegration = process.env.RUN_FAANJYUT_MONGO_INTEGRATION === '1'

  it('完整 dry-run 對真實導出包（FAANJYUT_MONGODB_URI 可連時）', { skip: !runIntegration }, () => {
    const input = process.env.FAANJYUT_FIXTURE_INPUT ?? resolve(root, '..', 'FaanJyutZibiu2Database', 'out', 'faanjyut-mongodb')
    const reportDir = resolve(root, '.artifacts', 'faanjyut', 'dry-run-test')
    const { code, stdout, stderr } = runCli(seedScript, ['--input', input, '--dry-run', '--environment', 'staging', '--report-dir', reportDir])
    // 集成分支只驗證「跑完並產出報告」；退出碼可能為 2（regression 基線含重複 key，屬預期發現）
    expect([0, 1, 2]).toContain(code)
    if (code === 1) throw new Error(`dry-run 運行錯誤：\n${stderr}\n${stdout}`)
  })
})
