import type { Ref, ComputedRef } from 'vue'
import { ref, computed, watch } from 'vue'
import { getEntryKey } from '~/utils/entryKey'
import type { Entry } from '~/types'

export function useEntriesSelection(
  currentPageEntries: ComputedRef<Entry[]>,
  fetchEntries: () => Promise<void>
) {
  const selectedEntryIds = ref<Set<string>>(new Set())
  const selectAllChecked = computed(() => {
    if (currentPageEntries.value.length === 0) return false
    return currentPageEntries.value.every((e) => selectedEntryIds.value.has(String(getEntryKey(e))))
  })
  const selectAllIndeterminate = computed(() => {
    const n = currentPageEntries.value.filter((e) => selectedEntryIds.value.has(String(getEntryKey(e)))).length
    return n > 0 && n < currentPageEntries.value.length
  })
  const selectedCount = computed(() => selectedEntryIds.value.size)
  const selectedSavedEntries = computed(() =>
    currentPageEntries.value.filter((e) => e.id && selectedEntryIds.value.has(String(e.id)))
  )

  function isEntrySelected(entry: Entry) {
    return selectedEntryIds.value.has(String(getEntryKey(entry)))
  }
  function toggleSelectEntry(entry: Entry, event?: Event) {
    event?.stopPropagation()
    const key = String(getEntryKey(entry))
    const next = new Set(selectedEntryIds.value)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    selectedEntryIds.value = next
  }
  function toggleSelectAll() {
    if (selectAllChecked.value) {
      const onPage = new Set(currentPageEntries.value.map((e) => String(getEntryKey(e))))
      selectedEntryIds.value = new Set([...selectedEntryIds.value].filter((id) => !onPage.has(id)))
    } else {
      const next = new Set(selectedEntryIds.value)
      currentPageEntries.value.forEach((e) => next.add(String(getEntryKey(e))))
      selectedEntryIds.value = next
    }
  }
  function clearSelection() {
    selectedEntryIds.value = new Set()
  }

  const headerCheckboxRef = ref<HTMLInputElement | null>(null)
  watch(selectAllIndeterminate, (val) => {
    if (headerCheckboxRef.value) headerCheckboxRef.value.indeterminate = val
  }, { immediate: true })

  const batchDeleting = ref(false)
  async function batchDeleteSelected() {
    const toDelete = selectedSavedEntries.value
    if (toDelete.length === 0) return
    if (!confirm(`確定要刪除所選的 ${toDelete.length} 條詞條嗎？此操作不可撤銷。`)) return
    batchDeleting.value = true
    try {
      for (const entry of toDelete) {
        await $fetch<unknown>(`/api/entries/${entry.id}`, { method: 'DELETE' })
        selectedEntryIds.value = new Set([...selectedEntryIds.value].filter((id) => id !== String(entry.id)))
      }
      await fetchEntries()
      clearSelection()
    } catch (error: any) {
      console.error('Batch delete failed:', error)
      alert(error?.data?.message || '批量刪除失敗')
    } finally {
      batchDeleting.value = false
    }
  }

  return {
    selectedEntryIds,
    selectAllChecked,
    selectAllIndeterminate,
    selectedCount,
    selectedSavedEntries,
    isEntrySelected,
    toggleSelectEntry,
    toggleSelectAll,
    clearSelection,
    batchDeleting,
    batchDeleteSelected,
    headerCheckboxRef
  }
}
