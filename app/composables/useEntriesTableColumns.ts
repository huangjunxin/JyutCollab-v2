import type { Ref, ComputedRef } from 'vue'
import { computed } from 'vue'
import { getThemeById } from '~/composables/useThemeData'
import type { Entry } from '~/types'

export interface EditableColumnDef {
  key: string
  label: string
  width: string
  type: string
  get: (entry: Entry) => unknown
  set: (entry: Entry, value: any) => void
  options?: Array<{ value: string | number; label: string }>
  getOptions?: () => Array<{ value: string | number; label: string }>
}

export function useEntriesTableColumns(
  userDialectOptions: Ref<Array<{ value: string; label: string }>>,
  themeOptions: Array<{ value: number; label: string }>,
  statusOptionsForTable: Ref<Array<{ value: string; label: string }>>
): {
  editableColumns: ComputedRef<EditableColumnDef[]>
  themeColIndex: ComputedRef<number>
  phoneticColIndex: ComputedRef<number>
  headwordColIndex: ComputedRef<number>
} {
  const editableColumns = computed<EditableColumnDef[]>(() => [
    {
      key: 'headword',
      label: '詞頭',
      width: '120px',
      type: 'text',
      get: (entry: Entry) => {
        const hw = entry.headword
        const main = hw?.display || entry.text || ''
        const variants = (hw?.variants || []).map(v => v.trim()).filter(Boolean)
        if (!main) return ''
        if (!variants.length) return main
        return `${main} [${variants.join('; ')}]`
      },
      set: (entry: Entry, value: string) => {
        const raw = (value || '').trim()
        let outside = raw
        let inside = ''
        const bracketMatch = raw.match(/^(.*?)(?:[\[\uFF3B](.*)[\]\uFF3D])\s*$/)
        if (bracketMatch) {
          outside = (bracketMatch[1] || '').trim()
          inside = (bracketMatch[2] || '').trim()
        }
        const parts: string[] = []
        const pushFrom = (s: string) => {
          s.split(/[;,，；]/).forEach(token => {
            const v = token.trim()
            if (v) parts.push(v)
          })
        }
        if (outside) pushFrom(outside)
        if (inside) pushFrom(inside)
        const uniq = [...new Set(parts)]
        const main = uniq[0] || ''
        const variants = uniq.slice(1)
        if (!entry.headword) {
          entry.headword = { display: '', normalized: '', isPlaceholder: false, variants: [] }
        }
        entry.headword.display = main
        entry.headword.normalized = main
        entry.headword.isPlaceholder = main.includes('□')
        entry.headword.variants = variants
        entry.text = main
      }
    },
    {
      key: 'dialect',
      label: '方言',
      width: '80px',
      type: 'select',
      options: [],
      getOptions: () => userDialectOptions.value,
      get: (entry: Entry) => entry.dialect?.name || '',
      set: (entry: Entry, value: string) => {
        if (!entry.dialect) entry.dialect = { name: value }
        entry.dialect.name = value
      }
    },
    {
      key: 'phonetic',
      label: '粵拼',
      width: '100px',
      type: 'phonetic',
      get: (entry: Entry) => {
        const arr = entry.phonetic?.jyutping
        if (Array.isArray(arr) && arr.length > 0) {
          const hasSpaceInside = arr.some(s => (s || '').includes(' '))
          if (!hasSpaceInside) return arr.join(' ')
          return arr.join('; ')
        }
        return entry.phoneticNotation || ''
      },
      set: (entry: Entry, value: string) => {
        const raw = (value || '').trim()
        if (!entry.phonetic) entry.phonetic = { jyutping: [] }
        const readings = raw.split(/[;,，；]/).map(s => s.trim()).filter(Boolean)
        entry.phonetic.jyutping = readings
        entry.phoneticNotation = readings.join('; ')
      }
    },
    {
      key: 'entryType',
      label: '類型',
      width: '80px',
      type: 'select',
      options: [
        { value: 'character', label: '字' },
        { value: 'word', label: '詞' },
        { value: 'phrase', label: '短語' }
      ],
      get: (entry: Entry) => entry.entryType || 'word',
      set: (entry: Entry, value: string) => { entry.entryType = value as Entry['entryType'] }
    },
    {
      key: 'theme',
      label: '分類',
      width: '140px',
      type: 'theme',
      options: [],
      getOptions: () => themeOptions,
      get: (entry: Entry) => entry.theme?.level3Id || undefined,
      set: (entry: Entry, value: number | undefined) => {
        if (!entry.theme) entry.theme = {}
        if (value) {
          const theme = getThemeById(value)
          if (theme) {
            entry.theme.level1 = theme.level1Name
            entry.theme.level2 = theme.level2Name
            entry.theme.level3 = theme.level3Name
            entry.theme.level1Id = theme.level1Id
            entry.theme.level2Id = theme.level2Id
            entry.theme.level3Id = theme.level3Id
          }
        } else {
          entry.theme.level1 = undefined
          entry.theme.level2 = undefined
          entry.theme.level3 = undefined
          entry.theme.level1Id = undefined
          entry.theme.level2Id = undefined
          entry.theme.level3Id = undefined
        }
      }
    },
    {
      key: 'definition',
      label: '釋義',
      width: '200px',
      type: 'text',
      get: (entry: Entry) => entry.senses?.[0]?.definition || entry.definition || '',
      set: (entry: Entry, value: string) => {
        if (!entry.senses || entry.senses.length === 0) {
          entry.senses = [{ definition: value, examples: [] }]
        } else {
          const first = entry.senses[0]
          if (first) first.definition = value
        }
        entry.definition = value
      }
    },
    {
      key: 'register',
      label: '語域',
      width: '80px',
      type: 'select',
      options: [
        { value: '__none__', label: '-' },
        { value: '口語', label: '口語' },
        { value: '書面', label: '書面' },
        { value: '粗俗', label: '粗俗' },
        { value: '文雅', label: '文雅' },
        { value: '中性', label: '中性' }
      ],
      get: (entry: Entry) => entry.meta?.register || '__none__',
      set: (entry: Entry, value: string) => {
        if (!entry.meta) entry.meta = {}
        entry.meta.register = (value === '__none__' ? '' : value) as Entry['meta']['register']
      }
    },
    {
      key: 'status',
      label: '狀態',
      width: '80px',
      type: 'select',
      options: [],
      getOptions: () => statusOptionsForTable.value,
      get: (entry: Entry) => entry.status || 'draft',
      set: (entry: Entry, value: string) => { entry.status = value as Entry['status'] }
    }
  ])

  const themeColIndex = computed(() => editableColumns.value.findIndex(c => c.key === 'theme'))
  const phoneticColIndex = computed(() => editableColumns.value.findIndex(c => c.key === 'phonetic'))
  const headwordColIndex = computed(() => editableColumns.value.findIndex(c => c.key === 'headword'))

  return {
    editableColumns,
    themeColIndex,
    phoneticColIndex,
    headwordColIndex
  }
}
