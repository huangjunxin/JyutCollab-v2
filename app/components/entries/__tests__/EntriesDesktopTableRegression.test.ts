import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const pageSource = readFileSync(resolve(process.cwd(), 'app/pages/entries/index.vue'), 'utf8')
const desktopTableSource = readFileSync(resolve(process.cwd(), 'app/components/entries/EntriesDesktopTable.vue'), 'utf8')
const themeExpandSource = readFileSync(resolve(process.cwd(), 'app/components/entries/EntryThemeExpand.vue'), 'utf8')
const tableColumnsSource = readFileSync(resolve(process.cwd(), 'app/composables/useEntriesTableColumns.ts'), 'utf8')
const tableEditSource = readFileSync(resolve(process.cwd(), 'app/composables/useEntriesTableEdit.ts'), 'utf8')
const aiSuggestionsSource = readFileSync(resolve(process.cwd(), 'app/composables/useEntriesAISuggestions.ts'), 'utf8')
const breakpointSource = readFileSync(resolve(process.cwd(), 'app/composables/useMobileBreakpoint.ts'), 'utf8')

describe('Entries desktop table regression guards', () => {
  it('declares and emits the desktop edit-value v-model event without an undeclared event cast', () => {
    expect(desktopTableSource).toContain("'update:editValue': [value: any]")
    expect(desktopTableSource).toContain("emit('update:editValue', val)")
    expect(desktopTableSource).not.toContain("emit('update:editValue' as any")
  })

  it('returns focus to the desktop table after Enter saves an edited cell', () => {
    expect(pageSource).toContain("case 'Enter':")
    expect(pageSource).toContain('saveCellEdit({ focusWrapper: true })')
  })

  it('normalizes theme IDs across desktop table display, save, and selector updates', () => {
    expect(tableEditSource).toContain("const themeId = typeof value === 'number' ? value : Number(value)")
    expect(tableColumnsSource).toContain("set: (entry: Entry, value: number | string | undefined)")
    expect(tableColumnsSource).toContain("const themeId = typeof value === 'number' ? value : Number(value)")
    expect(tableColumnsSource).toContain('getThemeById(themeId)')
    expect(themeExpandSource).toContain('function toThemeId(value: unknown): number | undefined')
    expect(themeExpandSource).toContain('selectedLevel1.value = toThemeId(level1Id)')
    expect(themeExpandSource).toContain('selectedLevel2.value = toThemeId(level2Id)')
    expect(themeExpandSource).toContain('const themeId = toThemeId(value)')
  })

  it('keeps desktop suggestion rows guarded across component prop updates', () => {
    expect(desktopTableSource).toContain('const props = withDefaults(defineProps<{')
    expect(desktopTableSource).toContain('themeAISuggestions?: Map<string, any>')
    expect(desktopTableSource).toContain('themeAISuggestions: () => new Map()')
    expect(desktopTableSource).toContain('definitionAISuggestions: () => new Map()')
    expect(desktopTableSource).toContain('registerAISuggestions: () => new Map()')
    expect(desktopTableSource).toContain('jyutjyuRefResult: () => new Map()')
    expect(desktopTableSource).toContain('function getMapValue<T>(map: Map<string, T> | undefined | null, key: string): T | undefined')
    expect(desktopTableSource).toContain('function getThemeSuggestion(entry: Entry)')
    expect(desktopTableSource).toContain('function getDefinitionSuggestion(entry: Entry)')
    expect(desktopTableSource).toContain('function getRegisterSuggestion(entry: Entry)')
    expect(desktopTableSource).toContain('function getJyutjyuResult(entry: Entry)')
    expect(desktopTableSource).toContain('themeAISuggestions?.get(')
    expect(desktopTableSource).not.toContain('definitionAISuggestions.get(')
    expect(desktopTableSource).toContain('registerAISuggestions?.get(')
    expect(desktopTableSource).not.toContain('jyutjyuRefResult.get(')
    expect(desktopTableSource).toContain(':key="`ai-theme-${getEntryIdString(row.entry)}-${themeAISuggestions?.get(getEntryIdString(row.entry)) ? \'1\' : \'0\'}`"')
    expect(desktopTableSource).toContain(':key="`ai-register-${getEntryIdString(row.entry)}-${registerAISuggestions?.get(getEntryIdString(row.entry)) ? \'1\' : \'0\'}`"')
    expect(desktopTableSource).toContain(':key="`senses-${getEntryIdString(row.entry)}`"')
    expect(desktopTableSource).toContain(':key="`theme-expand-${getEntryIdString(row.entry)}`"')
  })

  it('keeps desktop AI theme and register suggestions visible after async generation', () => {
    expect(desktopTableSource).toContain("@ai-theme=\"$emit('ai-theme', row.entry, rowIndex, colIndex)\"")
    expect(desktopTableSource).toContain("'ai-theme': [entry: Entry, rowIndex: number, colIndex: number]")
    expect(pageSource).toContain('@ai-theme="(entry: any, rowIndex: number, colIndex: number) => { focusedCell = { rowIndex, colIndex }; generateAICategorization(entry) }"')
    expect(pageSource).toContain("@ai-register=\"(entry: any, rowIndex: number, colIndex: number) => { focusedCell = { rowIndex, colIndex }; generateAIRegister(entry) }\"")
    expect(desktopTableSource).toContain('function isThemeSuggestionVisible(entry: Entry, rowIndex: number)')
    expect(desktopTableSource).toContain('function isRegisterSuggestionVisible(entry: Entry, rowIndex: number)')
    expect(desktopTableSource).toContain('function isTargetCellActive(entry: Entry, rowIndex: number, colIndex: number, field: string)')
    expect(desktopTableSource).toContain("return !!getThemeSuggestion(entry) && isTargetCellActive(entry, rowIndex, props.columnIndices.themeColIndex, 'theme')")
    expect(desktopTableSource).toContain("return !!getRegisterSuggestion(entry) && isTargetCellActive(entry, rowIndex, props.columnIndices.registerColIndex, 'register')")
    expect(desktopTableSource).toContain("v-if=\"row.type === 'entry' && focusedCell?.rowIndex === rowIndex && focusedCell?.colIndex === columnIndices.themeColIndex && themeAISuggestions?.get(getEntryIdString(row.entry))\"")
    expect(desktopTableSource).toContain("v-if=\"row.type === 'entry' && focusedCell?.rowIndex === rowIndex && focusedCell?.colIndex === columnIndices.registerColIndex && registerAISuggestions?.get(getEntryIdString(row.entry))\"")
    expect(pageSource).toContain('const registerSuggestion = registerAISuggestions.value.get(prevId)')
    expect(pageSource).toContain('registerAISuggestions.value.set(nextId, registerSuggestion)')
    expect(desktopTableSource).toContain(':ai-suggestion-hint="getCellAISuggestionHint(row.entry, col.key, rowIndex, colIndex)"')
    expect(desktopTableSource).toContain('function getCellAISuggestionHint(entry: Entry, field: string, rowIndex: number, colIndex: number)')
    expect(desktopTableSource).toContain("if (!isTargetCellActive(entry, rowIndex, colIndex, field)) return ''")
    expect(desktopTableSource).toContain("if (field === 'theme') return props.formatThemeSuggestion(getThemeSuggestion(entry))")
    expect(desktopTableSource).toContain("if (field === 'register') return props.formatRegisterSuggestion(getRegisterSuggestion(entry))")
    expect(desktopTableSource).toContain('@accept-ai-suggestion="acceptCellAISuggestion(row.entry, col.key)"')
    expect(desktopTableSource).toContain('@dismiss-ai-suggestion="dismissCellAISuggestion(row.entry, col.key)"')
    expect(readFileSync(resolve(process.cwd(), 'app/components/entries/EntriesEditableCell.vue'), 'utf8')).toContain('activeAISuggestionHint')
    expect(readFileSync(resolve(process.cwd(), 'app/components/entries/AISuggestionRow.vue'), 'utf8')).toContain('sticky left-3')
  })

  it('opens the desktop senses panel before generating a manual AI definition suggestion', () => {
    expect(pageSource).toContain('@ai-definition="(entry: any) => generateAIDefinitionFromDesktopCell(entry)"')
    expect(pageSource).toContain('function generateAIDefinitionFromDesktopCell(entry: Entry)')
    expect(pageSource).toContain('expandedEntryId.value = getEntryIdString(entry)')
    expect(pageSource).toContain('ensureSensesStructure(entry)')
    expect(pageSource).toContain('generateAIDefinition(entry)')
    expect(pageSource).toContain('@ai-definition-expand="(entry: any) => generateAIDefinition(entry)"')
  })

  it('treats aborted automatic AI suggestion requests as cancellation, not console errors', () => {
    expect(aiSuggestionsSource).toContain('function isAbortError(error: any): boolean')
    expect(aiSuggestionsSource).toContain("error?.cause?.name === 'AbortError'")
    expect(aiSuggestionsSource).toContain("error.message.toLowerCase().includes('abort')")
    expect(aiSuggestionsSource).toContain('function handleAIRequestError(error: any, label: string)')
    expect(aiSuggestionsSource).toContain("return handleAIRequestError(e, 'AI definition error:')")
    expect(aiSuggestionsSource).toContain("return handleAIRequestError(e, 'AI register error:')")
    expect(aiSuggestionsSource).toContain("return handleAIRequestError(e, 'AI categorization error:')")
    expect(aiSuggestionsSource).toContain('if (isAbortError(error)) return')
    expect(aiSuggestionsSource).not.toContain("if (e?.name === 'AbortError') throw e")
  })

  it('keeps mobile detection desktop-first during SSR so entries desktop state is not initialized as mobile', () => {
    expect(breakpointSource).toContain('const isMobile = ref(false)')
    expect(breakpointSource).not.toContain('window.innerWidth < MOBILE_BREAKPOINT : true')
  })
})
