import { describe, it, expect } from 'vitest'
import { spawnSync } from 'node:child_process'
import { resolve, join } from 'node:path'

const root = resolve(import.meta.dirname, '..', '..', '..', '..')
const tsxCli = join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs')
const seedScript = join(root, 'scripts', 'import-faanjyut.ts')
const migrateScript = join(root, 'scripts', 'migrate-faanjyut-indexes.ts')
const rollbackScript = join(root, 'scripts', 'rollback-faanjyut.ts')

function runCli(script: string, args: string[], env: Record<string, string | undefined> = {}, timeout = 30_000): { code: number; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [tsxCli, script, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, ...env },
    timeout
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

  it('寫入模式缺 --confirm-write → 退出碼 1（防誤寫）', () => {
    const { code, stderr } = runCli(seedScript, ['--input', '/tmp/x', '--mode', 'initial'])
    expect(code).toBe(1)
    expect(stderr).toContain('confirm-write')
  })

  it('dry-run 攜帶 --confirm-write → 退出碼 1（僅寫入模式接受）', () => {
    const { code, stderr } = runCli(seedScript, ['--input', '/tmp/x', '--dry-run', '--confirm-write', 'staging_db'])
    expect(code).toBe(1)
    expect(stderr).toContain('confirm-write')
  })

  it('未知 --mode → 退出碼 1', () => {
    const { code } = runCli(seedScript, ['--input', '/tmp/x', '--mode', 'bogus'])
    expect(code).toBe(1)
  })

  it('migrate --apply 缺 --confirm-write → 退出碼 1（防誤寫）', () => {
    const { code, stderr } = runCli(migrateScript, ['--apply'])
    expect(code).toBe(1)
    expect(stderr).toContain('confirm-write')
  })

  it('migrate --apply 攜 --confirm-write 但無 MongoDB URI → 退出碼 1', () => {
    const { code, stderr } = runCli(migrateScript, ['--apply', '--confirm-write', 'staging_db'], { FAANJYUT_MONGODB_URI: '', MONGODB_URI: '' })
    expect(code).toBe(1)
    expect(stderr).toContain('MONGODB_URI')
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

  it('完整 dry-run 對真實導出包（FAANJYUT_MONGODB_URI 可連時）', { skip: !runIntegration, timeout: 300_000 }, () => {
    const input = process.env.FAANJYUT_FIXTURE_INPUT ?? resolve(root, '..', 'FaanJyutZibiu2Database', 'out', 'faanjyut-mongodb')
    const reportDir = resolve(root, '.artifacts', 'faanjyut', 'dry-run-test')
    const { code, stdout, stderr } = runCli(seedScript, ['--input', input, '--dry-run', '--environment', 'staging', '--report-dir', reportDir], {}, 300_000)
    // 集成分支只驗證「跑完並產出報告」；退出碼可能為 2（regression 基線含重複 key，屬預期發現）
    expect([0, 1, 2]).toContain(code)
    if (code === 1) throw new Error(`dry-run 運行錯誤：\n${stderr}\n${stdout}`)
  })

  // 寫入全路徑回歸：P3（a32716d）在 runWrite 誤用 args.reportDir 導致
  // ReferenceError，乾跑測試與單測均未覆蓋 CLI 寫入路徑，直到 P6 彩排才暴露。
  // 此用例固定走 isolated db（faanjyut_integration），initial 寫入 → rollback 歸零。
  it('寫入模式 CLI 全路徑（initial 寫入 → rollback 歸零）', { skip: !runIntegration, timeout: 900_000 }, () => {
    const input = process.env.FAANJYUT_FIXTURE_INPUT ?? resolve(root, '..', 'FaanJyutZibiu2Database', 'out', 'faanjyut-mongodb')
    const reportDir = resolve(root, '.artifacts', 'faanjyut', 'write-cli-test')
    const env = { FAANJYUT_DB_NAME: 'faanjyut_integration' }
    const write = runCli(seedScript, ['--input', input, '--mode', 'initial', '--environment', 'staging', '--confirm-write', 'faanjyut_integration', '--report-dir', reportDir], env, 900_000)
    expect(write.stderr).not.toContain('ReferenceError')
    expect(write.code).toBe(0)
    const match = write.stdout.match(/batchId=(fjb_\w+)/)
    expect(match, `stdout 無 batchId：\n${write.stdout}\n${write.stderr}`).toBeTruthy()
    const rollback = runCli(rollbackScript, ['--batch-id', match![1], '--confirm-write', 'faanjyut_integration'], env, 900_000)
    expect(rollback.code).toBe(0)
  })
})
