import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const componentPath = resolve(process.cwd(), 'app/components/entries/EntriesShareViewPopover.vue')
const source = readFileSync(componentPath, 'utf8')

describe('EntriesShareViewPopover', () => {
  it('defines presentational typed props, emits, and accessible Nuxt UI shell', () => {
    expect(source).toContain('defineProps')
    expect(source).toContain('defineEmits')
    expect(source).toContain('generatedUrl')
    expect(source).toContain('canShare')
    expect(source).toContain('version')
    expect(source).toContain('filterCount')
    expect(source).toContain('ruleCount')
    expect(source).toContain('restored')
    expect(source).toContain('restoredSummary')
    expect(source).toContain('sharedViewError')
    expect(source).toContain('copyStatus')
    expect(source).toContain('showFallbackUrl')
    expect(source).toContain('UPopover')
    expect(source).toContain('UTooltip')
    expect(source).toContain('UButton')
    expect(source).toContain('UBadge')
    expect(source).toContain('UAlert')
    expect(source).toMatch(/UInput|readonly|select-all/)
    expect(source).toContain('aria-label="分享目前視圖"')
    expect(source).toContain('aria-live="polite"')
    expect(source).toContain('role="alert"')
    expect(source).toContain("emit('copy'")
    expect(source).toContain("emit('clear-share-query'")
  })

  it('renders exact Hong Kong Traditional Chinese copy from the UI spec', () => {
    expect(source).toContain('分享目前視圖')
    expect(source).toContain('連結會還原公式篩選、正則設定、條件格式和驗證規則，不會修改詞條資料。')
    expect(source).toContain('複製視圖連結')
    expect(source).toContain('視圖連結已複製。')
    expect(source).toContain('無法複製連結。請手動複製下方網址。')
    expect(source).toContain('已套用分享視圖')
    expect(source).toContain('未有可分享設定')
    expect(source).toContain('目前沒有公式篩選、正則設定、條件格式或驗證規則。請先設定視圖，再複製分享連結。')
    expect(source).toContain('分享格式版本：v')
    expect(source).toContain('清除分享參數')
    expect(source).toContain('只會移除網址中的分享參數，不會清除目前表格資料。')
  })

  it('locks copy, restored, empty, fallback, and invalid payload states', () => {
    expect(source).toContain('i-heroicons-share')
    expect(source).toContain(':content="{ side: \'bottom\', sideOffset: 8 }"')
    expect(source).toContain('color="primary"')
    expect(source).toContain('variant="solid"')
    expect(source).toContain(':disabled="!canShare"')
    expect(source).toContain('copyStatus === \'success\'')
    expect(source).toContain('copyStatus === \'error\'')
    expect(source).toContain('showFallbackUrl')
    expect(source).toContain('generatedUrl')
    expect(source).toContain('restoredSummary')
    expect(source).toContain('sharedViewError')
  })

  it('keeps the component local-only with no backend, persistence, route, saved-view, or entry mutation coupling', () => {
    expect(source).not.toMatch(/\$fetch|localStorage|navigateTo|router\.push|router\.replace|save|delete|review|bulk|col\.set|_isDirty/)
  })
})
