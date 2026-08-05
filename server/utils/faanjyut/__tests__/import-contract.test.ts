import { describe, it, expect } from 'vitest'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { validateExportPackage, FINDING_CODES } from '../import-contract'
import {
  buildFixtureDir,
  LEXEME_1,
  LEXEME_2,
  KEY_1,
  ENTRY_GZ,
  CELL_GZ,
  COL_GZ,
  SHEET
} from './fixtures'
import { cellStateId, columnId, lexemeId } from '../stable-id'

async function run(dir: string, environment: 'local' | 'staging' | 'production' = 'local') {
  return validateExportPackage(dir, environment)
}

function codes(findings: Array<{ code: string }>): string[] {
  return findings.map((f) => f.code)
}

describe('faanjyut/import-contract', () => {
  it('合法 fixture → 零 blocker 零 warning，計數正確', async () => {
    const dir = buildFixtureDir()
    const result = await run(dir)
    expect(result.blockers).toEqual([])
    expect(result.warnings).toEqual([])
    expect(result.counts['lexemes.ndjson']).toEqual({ input: 2, valid: 2, invalid: 0 })
    expect(result.counts['entries.ndjson']).toEqual({ input: 2, valid: 2, invalid: 0 })
    expect(result.counts['columns.ndjson']).toEqual({ input: 3, valid: 3, invalid: 0 })
    expect(result.manifest.baselineLevel).toBe('regression')
    expect(result.conflictFacts.lexemeSourceKeys).toContain(KEY_1)
    expect(result.conflictFacts.allIds.lexemes).toContain(LEXEME_1)
  })

  it('缺 manifest → MISSING_REQUIRED_ARTIFACT', async () => {
    const dir = buildFixtureDir({ omitManifest: true })
    const result = await run(dir)
    expect(codes(result.blockers)).toContain(FINDING_CODES.missingRequiredArtifact)
  })

  it('缺某 NDJSON → MISSING_REQUIRED_ARTIFACT', async () => {
    const dir = buildFixtureDir({ omitFiles: ['entries.ndjson'] })
    const result = await run(dir)
    expect(codes(result.blockers)).toContain(FINDING_CODES.missingRequiredArtifact)
  })

  it('缺 reports 目錄 → MISSING_REQUIRED_ARTIFACT', async () => {
    const dir = buildFixtureDir({ omitReports: true })
    const result = await run(dir)
    expect(codes(result.blockers)).toContain(FINDING_CODES.missingRequiredArtifact)
  })

  it('staging + diagnostic baseline → INVALID_BASELINE_LEVEL', async () => {
    const dir = buildFixtureDir({ manifest: { baselineLevel: 'diagnostic' } })
    const result = await run(dir, 'staging')
    expect(codes(result.blockers)).toContain(FINDING_CODES.invalidBaselineLevel)
  })

  it('staging + sourceExportedAt null → warning（非 blocker）', async () => {
    const dir = buildFixtureDir({ manifest: { sourceExportedAt: null } })
    const result = await run(dir, 'staging')
    expect(result.blockers).toEqual([])
    expect(codes(result.warnings)).toContain(FINDING_CODES.invalidBaselineLevel)
  })

  it('production 要求 cutover + sourceExportedAt + gitDirty=false', async () => {
    const dir = buildFixtureDir()
    const result = await run(dir, 'production')
    expect(codes(result.blockers)).toContain(FINDING_CODES.invalidBaselineLevel) // regression → blocker

    const cutoverDir = buildFixtureDir({ manifest: { baselineLevel: 'cutover', sourceExportedAt: '2026-08-01T00:00:00Z', gitDirty: false } })
    const ok = await run(cutoverDir, 'production')
    expect(ok.blockers).toEqual([])

    const dirtyDir = buildFixtureDir({ manifest: { baselineLevel: 'cutover', sourceExportedAt: '2026-08-01T00:00:00Z', gitDirty: true } })
    const dirty = await run(dirtyDir, 'production')
    expect(codes(dirty.blockers)).toContain(FINDING_CODES.dirtyGeneratorInProduction)
  })

  it('production + TEST- sourceKey → TEST_DATA_IN_PRODUCTION', async () => {
    const dir = buildFixtureDir({
      manifest: { baselineLevel: 'cutover', sourceExportedAt: '2026-08-01T00:00:00Z' },
      mutate: (fileName, records) => {
        if (fileName === 'lexemes.ndjson') {
          return [{ ...records[0], id: lexemeId('TEST-abc'), meta: { ...(records[0] as { meta: object }).meta, sourceKey: 'TEST-abc' } }, ...records.slice(1)]
        }
        return records
      }
    })
    const result = await run(dir, 'production')
    expect(codes(result.blockers)).toContain(FINDING_CODES.testDataInProduction)
  })

  it('未知頂層欄位 → CONTRACT_UNKNOWN_FIELD', async () => {
    const dir = buildFixtureDir({
      mutate: (fileName, records) => {
        if (fileName === 'lexemes.ndjson') {
          return [{ ...records[0], foo: 1 }, ...records.slice(1)]
        }
        return records
      }
    })
    const result = await run(dir)
    expect(codes(result.blockers)).toContain(FINDING_CODES.contractUnknownField)
  })

  it('meta 內嵌 importBatchId → IMPORT_BATCH_ID_IN_INPUT', async () => {
    const dir = buildFixtureDir({
      mutate: (fileName, records) => {
        if (fileName === 'lexemes.ndjson') {
          return [{ ...records[0], meta: { ...(records[0] as { meta: object }).meta, importBatchId: 'fjb_x' } }, ...records.slice(1)]
        }
        return records
      }
    })
    const result = await run(dir)
    expect(codes(result.blockers)).toContain(FINDING_CODES.importBatchIdInInput)
  })

  it('非法 dialect.name → INVALID_DIALECT_ID', async () => {
    const dir = buildFixtureDir({
      mutate: (fileName, records) => {
        if (fileName === 'entries.ndjson') {
          return [{ ...records[0], dialect: { name: 'nowhere', regionCode: 'XX' } }, ...records.slice(1)]
        }
        return records
      }
    })
    const result = await run(dir)
    expect(codes(result.blockers)).toContain(FINDING_CODES.invalidDialectId)
  })

  it('域內列缺 dialectId → INVALID_DIALECT_ID（superRefine）', async () => {
    const dir = buildFixtureDir({
      mutate: (fileName, records) => {
        if (fileName === 'columns.ndjson') {
          return records.map((r) => {
            const { dialectId, ...rest } = r as { dialectId?: string }
            void dialectId
            return rest
          })
        }
        return records
      }
    })
    const result = await run(dir)
    expect(codes(result.blockers)).toContain(FINDING_CODES.invalidDialectId)
  })

  it('重複 sourceKey → DUPLICATE_SOURCE_KEY（並與報告對賬）', async () => {
    const dir = buildFixtureDir({
      mutate: (fileName, records) => {
        if (fileName === 'lexemes.ndjson') {
          return [{ ...records[1], id: LEXEME_1, meta: { ...(records[1] as { meta: object }).meta, sourceKey: KEY_1 } }, ...records]
        }
        return records
      }
    })
    const result = await run(dir)
    const dups = result.blockers.filter((f) => f.code === FINDING_CODES.duplicateSourceKey)
    expect(dups).toHaveLength(1)
    // 報告 duplicateGroups=0 與實測 1 不一致 → MANIFEST_MISMATCH
    expect(codes(result.blockers)).toContain(FINDING_CODES.manifestMismatch)
  })

  it('重複 Entry id → DUPLICATE_ID + DUPLICATE_CELL', async () => {
    const dir = buildFixtureDir({
      mutate: (fileName, records) => {
        if (fileName === 'entries.ndjson') {
          return [records[0], records[0], ...records.slice(1)]
        }
        return records
      }
    })
    const result = await run(dir)
    expect(codes(result.blockers)).toContain(FINDING_CODES.duplicateId)
    expect(codes(result.blockers)).toContain(FINDING_CODES.duplicateCell)
  })

  it('Entry 引用不存在的 lexemeId → MISSING_REFERENCE', async () => {
    const dir = buildFixtureDir({
      mutate: (fileName, records) => {
        if (fileName === 'entries.ndjson') {
          return [{ ...records[0], lexemeId: 'fjl_000000000000000000000000' }, ...records.slice(1)]
        }
        return records
      }
    })
    const result = await run(dir)
    expect(codes(result.blockers)).toContain(FINDING_CODES.missingReference)
  })

  it('穩定 ID 與契約 §4 重算不符 → STABLE_ID_MISMATCH', async () => {
    const dir = buildFixtureDir({
      mutate: (fileName, records) => {
        if (fileName === 'lexemes.ndjson') {
          return [{ ...records[0], id: 'fjl_deadbeefdeadbeefdeadbeef' }, ...records.slice(1)]
        }
        return records
      }
    })
    const result = await run(dir)
    expect(codes(result.blockers)).toContain(FINDING_CODES.stableIdMismatch)
  })

  it('manifest 計數不一致 → MANIFEST_MISMATCH', async () => {
    const dir = buildFixtureDir()
    const manifestPath = join(dir, 'import_manifest.json')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { counts: Record<string, number> }
    manifest.counts.lexemes = 999
    writeFileSync(manifestPath, JSON.stringify(manifest), 'utf8')
    const result = await run(dir)
    expect(codes(result.blockers)).toContain(FINDING_CODES.manifestMismatch)
  })

  it('報告 envelope 損壞 → INVALID_REPORT_FILE / MANIFEST_MISMATCH', async () => {
    const dir = buildFixtureDir()
    const reportPath = join(dir, 'reports', 'import_report.json')
    const report = JSON.parse(readFileSync(reportPath, 'utf8')) as { summary: { outputCounts?: Record<string, unknown> } }
    // 1) 缺必需 summary 字段 → INVALID_REPORT_FILE
    delete report.summary.outputCounts
    writeFileSync(reportPath, JSON.stringify(report), 'utf8')
    const result1 = await run(dir)
    expect(codes(result1.blockers)).toContain(FINDING_CODES.invalidReportFile)

    // 2) summary 數值與 manifest 不一致 → MANIFEST_MISMATCH
    report.summary.outputCounts = { lexemes: 999 }
    writeFileSync(reportPath, JSON.stringify(report), 'utf8')
    const result2 = await run(dir)
    expect(codes(result2.blockers)).toContain(FINDING_CODES.manifestMismatch)
  })

  it('active 域內列同 dialectId → COLUMN_MAPPING_AMBIGUOUS', async () => {
    const dir = buildFixtureDir({
      mutate: (fileName, records) => {
        if (fileName === 'columns.ndjson') {
          const [a, b, c] = records as Array<Record<string, unknown>>
          return [{ ...a, id: columnId(SHEET, 99, '穗'), sourceColumnIndex: 99, dialectId: 'guangzhou' }, a, b, c]
        }
        return records
      }
    })
    const result = await run(dir)
    expect(codes(result.blockers)).toContain(FINDING_CODES.columnMappingAmbiguous)
  })

  it('空表頭 → EMPTY_HEADER_COLUMN warning；同名表頭 → DUPLICATE_HEADER_COLUMN warning', async () => {
    const dir = buildFixtureDir({
      mutate: (fileName, records) => {
        if (fileName === 'columns.ndjson') {
          const [a, b, c] = records as Array<Record<string, unknown>>
          return [
            { ...a, id: columnId(SHEET, 5, null), sourceColumn: null, sourceColumnIndex: 5, sourceRole: 'meta' },
            { ...a, id: columnId(SHEET, 6, '穗'), sourceColumn: '穗', sourceColumnIndex: 6, sourceRole: 'meta' },
            a, b, c
          ]
        }
        return records
      }
    })
    const result = await run(dir)
    expect(codes(result.warnings)).toContain(FINDING_CODES.emptyHeaderColumn)
    expect(codes(result.warnings)).toContain(FINDING_CODES.duplicateHeaderColumn)
  })

  it('CellState projection.entryId 指向錯誤 lexeme → PROJECTION_MISMATCH', async () => {
    const dir = buildFixtureDir({
      mutate: (fileName, records) => {
        if (fileName === 'cell_states.ndjson') {
          return [{ ...records[0], id: cellStateId(LEXEME_2, COL_GZ), lexemeId: LEXEME_2, projection: { entryId: ENTRY_GZ } }, ...records.slice(1)]
        }
        return records
      }
    })
    const result = await run(dir)
    expect(codes(result.blockers)).toContain(FINDING_CODES.projectionMismatch)
  })

  it('Comment 未脫敏（sanitized!=true）→ UNSANITIZED_COMMENT', async () => {
    const dir = buildFixtureDir({
      mutate: (fileName, records) => {
        if (fileName === 'comments.ndjson') {
          return [{ ...records[0], legacyMeta: { ...(records[0] as { legacyMeta: object }).legacyMeta, sanitized: false } }, ...records.slice(1)]
        }
        return records
      }
    })
    const result = await run(dir)
    expect(codes(result.blockers)).toContain(FINDING_CODES.unsanitizedComment)
  })

  it('threadedPlaceholder 且無正文 → MISSING_COMMENT_BODY', async () => {
    const dir = buildFixtureDir({
      mutate: (fileName, records) => {
        if (fileName === 'comments.ndjson') {
          return [{ ...records[0], content: '  ', legacyMeta: { ...(records[0] as { legacyMeta: object }).legacyMeta, threadedPlaceholder: true } }, ...records.slice(1)]
        }
        return records
      }
    })
    const result = await run(dir)
    expect(codes(result.blockers)).toContain(FINDING_CODES.missingCommentBody)
  })

  it('Link active 但缺 toLexemeId → MISSING_REFERENCE', async () => {
    const dir = buildFixtureDir({
      mutate: (fileName, records) => {
        if (fileName === 'links.ndjson') {
          const { toLexemeId, targetKey, ...rest } = records[0] as Record<string, unknown>
          void toLexemeId
          void targetKey
          return [rest, ...records.slice(1)]
        }
        return records
      }
    })
    const result = await run(dir)
    expect(codes(result.blockers)).toContain(FINDING_CODES.missingReference)
  })

  it('cell 引用不存在的 columnId → MISSING_REFERENCE', async () => {
    const dir = buildFixtureDir({
      mutate: (fileName, records) => {
        if (fileName === 'cell_states.ndjson') {
          const badColumnId = 'fjcol_000000000000000000000000'
          return [{ ...records[0], id: cellStateId(LEXEME_1, badColumnId), columnId: badColumnId }, ...records.slice(1)]
        }
        return records
      }
    })
    const result = await run(dir)
    expect(codes(result.blockers)).toContain(FINDING_CODES.missingReference)
  })

  it('columns 額外未知字段 → CONTRACT_UNKNOWN_FIELD', async () => {
    const dir = buildFixtureDir({
      mutate: (fileName, records) => {
        if (fileName === 'columns.ndjson') {
          return [{ ...records[0], unexpectedField: 1 }, ...records.slice(1)]
        }
        return records
      }
    })
    const result = await run(dir)
    expect(codes(result.blockers)).toContain(FINDING_CODES.contractUnknownField)
  })

  it('非 JSON 行 → CONTRACT_INVALID_FIELD', async () => {
    const dir = buildFixtureDir()
    writeFileSync(join(dir, 'lexemes.ndjson'), '{"id": "not-json\n', 'utf8')
    const result = await run(dir)
    expect(codes(result.blockers)).toContain(FINDING_CODES.contractInvalidField)
  })

  it('衝突事實完整暴露（供 DB 衝突檢查）', async () => {
    const dir = buildFixtureDir()
    const result = await run(dir)
    expect(result.conflictFacts.entryCells).toContainEqual({ lexemeId: LEXEME_1, dialectName: 'guangzhou' })
    expect(result.conflictFacts.columnActiveMappings).toContainEqual({ sourceRole: 'domestic', key: 'guangzhou' })
    expect(result.conflictFacts.columnPositions).toContainEqual({ sourceSheet: SHEET, sourceColumnIndex: 35 })
    expect(result.conflictFacts.allIds.faanjyut_cell_states).toContain(CELL_GZ)
    expect(result.conflictFacts.allIds.faanjyut_columns).toContain(COL_GZ)
  })

  it('真實導出形態：占位字頭帶 missing_headword parseWarnings 不告警', async () => {
    const dir = buildFixtureDir({
      mutate: (fileName, records) => {
        if (fileName === 'entries.ndjson') {
          return [{ ...records[0], headword: { ...(records[0].headword as object), isPlaceholder: true, display: '__unknown_', normalized: '__unknown_' }, meta: { ...(records[0].meta as object), parseWarnings: ['missing_headword'] } }, ...records.slice(1)]
        }
        return records
      }
    })
    const result = await run(dir)
    expect(result.blockers).toEqual([])
    expect(result.warnings.filter((w) => /占位/.test(w.message))).toEqual([])
  })

  it('真實導出形態：columns sourceMeta.skippedReason 通過 DTO', async () => {
    const dir = buildFixtureDir({
      mutate: (fileName, records) => {
        if (fileName === 'columns.ndjson') {
          return [{ ...records[0], sourceRole: 'skipped', sourceMeta: { mark: 'x', rawMark: 'x', skippedReason: 'mark_x' } }, ...records.slice(1)]
        }
        return records
      }
    })
    const result = await run(dir)
    expect(result.counts['columns.ndjson'].invalid).toBe(0)
    expect(codes(result.blockers)).not.toContain(FINDING_CODES.contractUnknownField)
  })
})
