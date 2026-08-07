/**
 * import-batches 純邏輯單元測試（FaanjyutV1Design §10.1 導入報告頁）：
 * summarizeBatch 行視圖字段與 written 合計、resolveReportFile 路徑穿越防護、
 * groupFindings 按 code 分組並保留跳轉字段。handler 層（登錄/權限/DB）不測。
 */
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import type { Finding } from '../import-contract'
import {
  groupFindings,
  resolveReportFile,
  summarizeBatch,
  type BatchDocLike
} from '../import-batches'

describe('faanjyut/import-batches summarizeBatch', () => {
  it('完整文檔：字段透傳 + counts.written 合計 + 時間 ISO 化 + 錯誤/回滾標記', () => {
    const doc: BatchDocLike = {
      batchId: 'fjb_abc123',
      mode: 'initial',
      environment: 'staging',
      status: 'completed',
      source: { sourceWorkbook: '泛粵字表 21.202608051509.xlsx' },
      counts: { written: { faanjyut_columns: 178, lexemes: 8126, entries: 80884, external_etymons: 13890 } },
      error: undefined,
      startedAt: new Date('2026-08-05T10:00:00Z'),
      completedAt: new Date('2026-08-05T10:02:00Z')
    }
    const summary = summarizeBatch(doc)
    expect(summary.batchId).toBe('fjb_abc123')
    expect(summary.mode).toBe('initial')
    expect(summary.environment).toBe('staging')
    expect(summary.status).toBe('completed')
    expect(summary.sourceWorkbook).toBe('泛粵字表 21.202608051509.xlsx')
    expect(summary.countsWrittenTotal).toBe(178 + 8126 + 80884 + 13890)
    expect(summary.startedAt).toBe('2026-08-05T10:00:00.000Z')
    expect(summary.completedAt).toBe('2026-08-05T10:02:00.000Z')
    expect(summary.hasError).toBe(false)
    expect(summary.hasRollbackCounts).toBe(false)
  })

  it('failed 批次帶 error 與 rollbackCounts：hasError/hasRollbackCounts 為 true', () => {
    const summary = summarizeBatch({
      batchId: 'fjb_failed',
      status: 'failed',
      error: '寫入復驗失敗 entries.ndjson:1',
      rollbackCounts: { before: { entries: 10 }, after: { entries: 0 } },
      counts: { written: { entries: 5 } }
    })
    expect(summary.hasError).toBe(true)
    expect(summary.hasRollbackCounts).toBe(true)
  })

  it('缺省字段：空字符串/0/unknown/null 缺省值，不拋錯', () => {
    const summary = summarizeBatch({ batchId: 'fjb_min' })
    expect(summary.mode).toBe('unknown')
    expect(summary.environment).toBe('unknown')
    expect(summary.status).toBe('unknown')
    expect(summary.sourceWorkbook).toBe('')
    expect(summary.countsWrittenTotal).toBe(0)
    expect(summary.startedAt).toBeNull()
    expect(summary.completedAt).toBeNull()
    expect(summary.hasError).toBe(false)
    expect(summary.hasRollbackCounts).toBe(false)
  })
})

describe('faanjyut/import-batches resolveReportFile', () => {
  const ROOT = '/repo/.artifacts/faanjyut'

  it('相對 reportDir 解析到 root 內：返回 root 內絕對路徑', () => {
    const p = resolveReportFile({ artifactsRoot: ROOT, reportDir: 'write/fjb_abc', fileName: 'index-plan.json' })
    expect(p).toBe(join(ROOT, 'write/fjb_abc/index-plan.json'))
  })

  it('絕對 reportDir 在 root 內：正常返回', () => {
    const p = resolveReportFile({ artifactsRoot: ROOT, reportDir: join(ROOT, 'write/fjb_abc'), fileName: 'schema_dry_run_report.json' })
    expect(p).toBe(join(ROOT, 'write/fjb_abc/schema_dry_run_report.json'))
  })

  it('路徑穿越（../ 越界）：返回 null', () => {
    expect(resolveReportFile({ artifactsRoot: ROOT, reportDir: '../../etc', fileName: 'passwd' })).toBeNull()
    expect(resolveReportFile({ artifactsRoot: ROOT, reportDir: '../../../etc', fileName: 'passwd' })).toBeNull()
    expect(resolveReportFile({ artifactsRoot: ROOT, reportDir: '/etc', fileName: 'passwd' })).toBeNull()
  })

  it('文件名本身穿越 root：返回 null', () => {
    expect(resolveReportFile({ artifactsRoot: ROOT, reportDir: 'write/fjb_abc', fileName: '../../../etc/passwd' })).toBeNull()
  })

  it('reportDir 或 fileName 缺失：返回 null', () => {
    expect(resolveReportFile({ artifactsRoot: ROOT, reportDir: undefined, fileName: 'index-plan.json' })).toBeNull()
    expect(resolveReportFile({ artifactsRoot: ROOT, reportDir: 'write/fjb_abc', fileName: '' })).toBeNull()
  })

  it('reportDir 恰好等於 root：允許（target === root）', () => {
    expect(resolveReportFile({ artifactsRoot: ROOT, reportDir: '.', fileName: 'index-plan.json' }))
      .toBe(join(ROOT, 'index-plan.json'))
  })
})

describe('faanjyut/import-batches groupFindings', () => {
  const findings: Finding[] = [
    { code: 'TARGET_ID_CONFLICT', severity: 'blocker', objectType: 'lexemes', objectId: 'lx_a', sourceKey: '>1', message: '目標 DB 已存在同 id 的 Lexeme（2 條）' },
    { code: 'TARGET_ID_CONFLICT', severity: 'blocker', objectType: 'lexemes', objectId: 'lx_b', sourceKey: '>2', sourceCell: '主表!B2', message: '目標 DB 已存在同 id 的 Lexeme（2 條）' },
    { code: 'MISSING_NDJSON', severity: 'blocker', objectType: 'package', file: 'entries.ndjson', line: 3, message: '缺少 NDJSON 文件' },
    { code: 'WEAK_DIALECT', severity: 'warning', objectType: 'column', sourceKey: '>3', message: '方言映射較弱' }
  ]

  it('按 code 分組：count 正確，組序為 count 降序 → code 字典序', () => {
    const groups = groupFindings(findings)
    expect(groups.map((g) => g.code)).toEqual(['TARGET_ID_CONFLICT', 'MISSING_NDJSON', 'WEAK_DIALECT'])
    expect(groups[0].count).toBe(2)
    expect(groups[1].count).toBe(1)
    expect(groups[2].count).toBe(1)
  })

  it('組內保留跳轉字段（sourceKey/sourceCell/message/file/line/objectId）', () => {
    const groups = groupFindings(findings)
    const conflict = groups.find((g) => g.code === 'TARGET_ID_CONFLICT')!
    expect(conflict.items).toEqual([
      { objectId: 'lx_a', sourceKey: '>1', message: '目標 DB 已存在同 id 的 Lexeme（2 條）' },
      { objectId: 'lx_b', sourceKey: '>2', sourceCell: '主表!B2', message: '目標 DB 已存在同 id 的 Lexeme（2 條）' }
    ])
    const missing = groups.find((g) => g.code === 'MISSING_NDJSON')!
    expect(missing.items[0]).toEqual({ file: 'entries.ndjson', line: 3, message: '缺少 NDJSON 文件' })
  })

  it('空數組：返回空數組', () => {
    expect(groupFindings([])).toEqual([])
  })

  it('審計 L5/M46：details.examples 字符串保留為 text，sourceKey 格式可跳轉', () => {
    const findingsWithExamples: Finding[] = [
      {
        code: 'TARGET_SOURCE_KEY_CONFLICT',
        severity: 'blocker',
        objectType: 'lexemes',
        objectId: 'lx_a',
        sourceKey: '>1',
        message: '衝突（2 條）',
        details: {
          total: 2,
          examples: ['>416461483360343', 'fjl_1|廣州', '>B']
        }
      },
    ]
    const groups = groupFindings(findingsWithExamples)
    const items = groups[0].items
    expect(items).toHaveLength(1)
    expect(items[0].examples).toEqual([
      { text: '>416461483360343', sourceKey: '>416461483360343' },
      { text: 'fjl_1|廣州' },
      { text: '>B', sourceKey: '>B' },
    ])
  })

  it('無 details.examples 時 examples 為 undefined', () => {
    const groups = groupFindings([
      { code: 'X', severity: 'blocker', objectType: 'lexemes', message: 'm' }
    ])
    expect(groups[0].items[0].examples).toBeUndefined()
  })
})
