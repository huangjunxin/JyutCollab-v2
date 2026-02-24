import type { Ref, ComputedRef } from 'vue'
import { ref, computed, watch, onMounted } from 'vue'
import { DIALECT_OPTIONS_FOR_SELECT } from '~/utils/dialects'

const NEW_ENTRY_DIALECT_KEY = 'jyutcollab_new_entry_dialect'

export function useNewEntryDialect(
  isReviewerOrAdmin: Ref<boolean>,
  userDialectOptions: ComputedRef<Array<{ value: string; label: string }>>,
  user: Ref<{ id?: string; role?: string; dialectPermissions?: Array<{ dialectName: string }> } | null>,
  effectiveDialectPermissions: Ref<Array<{ dialectName: string }> | null>
) {
  const defaultDialectForNew = ref<string>('hongkong')
  const newEntryDialectOptionsForSelector = computed(() =>
    isReviewerOrAdmin.value ? DIALECT_OPTIONS_FOR_SELECT : userDialectOptions.value
  )
  const showNewEntryDialectSelector = computed(() =>
    isReviewerOrAdmin.value || (userDialectOptions.value?.length ?? 0) > 1
  )

  function getUserDefaultDialect(): string {
    const currentUser = user.value
    const options = newEntryDialectOptionsForSelector.value
    const chosen = defaultDialectForNew.value
    if (chosen && options.some((o: { value: string }) => o.value === chosen)) return chosen
    const perms = currentUser?.role === 'contributor' ? effectiveDialectPermissions.value : currentUser?.dialectPermissions
    if (Array.isArray(perms) && perms.length) return perms[0]?.dialectName ?? 'hongkong'
    return 'hongkong'
  }

  function restoreDefaultDialectForNew() {
    if (!import.meta.client) return
    const options = newEntryDialectOptionsForSelector.value
    if (options.length === 0) return
    const stored = localStorage.getItem(NEW_ENTRY_DIALECT_KEY)
    if (stored && options.some((o: { value: string }) => o.value === stored)) {
      defaultDialectForNew.value = stored
    } else {
      const first = options[0]
      if (first) defaultDialectForNew.value = first.value
    }
  }

  onMounted(restoreDefaultDialectForNew)
  watch(newEntryDialectOptionsForSelector, (opts) => {
    if (opts.length > 0 && !opts.some((o: { value: string }) => o.value === defaultDialectForNew.value)) {
      restoreDefaultDialectForNew()
    }
  }, { deep: true })
  watch(defaultDialectForNew, (v) => {
    if (import.meta.client && v) localStorage.setItem(NEW_ENTRY_DIALECT_KEY, v)
  })

  return {
    defaultDialectForNew,
    newEntryDialectOptionsForSelector,
    showNewEntryDialectSelector,
    getUserDefaultDialect,
    restoreDefaultDialectForNew
  }
}
