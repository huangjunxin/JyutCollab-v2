<template>
  <UModal :open="open" @update:open="(v: boolean) => emit('update:open', v)">
    <template #content>
      <UCard class="w-full max-w-2xl">
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ isGroupMerge ? '合併詞語組' : '加入詞語組' }}
            </h3>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-heroicons-x-mark"
              @click="emit('update:open', false)"
            />
          </div>
        </template>

        <div class="space-y-4">
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {{ isGroupMerge ? '選擇目標詞語組，將當前組的所有詞條合併過去：' : '選擇目標詞語組，將此詞條加入：' }}
            </p>
            <div v-if="sourceLabel" class="text-sm font-medium text-gray-900 dark:text-white mb-3 p-2 bg-gray-50 dark:bg-gray-800 rounded">
              來源：{{ sourceLabel }}
            </div>
          </div>

          <div v-if="loading" class="flex items-center justify-center py-8">
            <div class="w-8 h-8 border-2 border-gray-200 dark:border-gray-700 border-t-primary rounded-full animate-spin" />
            <span class="ml-3 text-sm text-gray-500 dark:text-gray-400">加載詞語組列表...</span>
          </div>

          <div v-else-if="errorMessage" class="rounded-lg border border-red-200 dark:border-red-800 bg-red-50/60 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {{ errorMessage }}
          </div>

          <div v-else class="space-y-2 max-h-[400px] overflow-y-auto">
            <div
              v-for="group in availableGroups"
              :key="group.lexemeId"
              class="flex items-start justify-between gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer transition-colors"
              :class="{ 'border-primary bg-primary/5': selectedLexemeId === group.lexemeId }"
              @click="selectedLexemeId = group.lexemeId"
            >
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ group.headwordDisplay || '—' }}
                  </span>
                  <UBadge size="xs" variant="soft" color="neutral">
                    {{ group.entryCount }} 條
                  </UBadge>
                </div>
                <div class="flex flex-wrap gap-1 mt-1">
                  <UBadge
                    v-for="dialect in group.dialects"
                    :key="dialect"
                    size="xs"
                    variant="outline"
                    color="neutral"
                  >
                    {{ dialect }}
                  </UBadge>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  ID: {{ group.lexemeId }}
                </p>
              </div>
              <div class="flex-shrink-0">
                <input
                  type="radio"
                  :checked="selectedLexemeId === group.lexemeId"
                  @click.stop="selectedLexemeId = group.lexemeId"
                  class="rounded border-gray-300"
                />
              </div>
            </div>

            <div v-if="availableGroups.length === 0" class="text-center py-8 space-y-2">
              <p class="text-sm text-gray-500 dark:text-gray-400">
                暫無其他詞語組
              </p>
              <p class="text-xs text-gray-400 dark:text-gray-500">
                {{ !sourceLexemeId ? '提示：你可以先將其他詞條「拆出成新詞語」，然後再將此詞條加入該組。' : '提示：如果所有詞條都未綁定詞語，請先使用「拆出成新詞語」功能為部分詞條建立詞語組。' }}
              </p>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex items-center justify-end gap-2">
            <UButton color="neutral" variant="soft" size="sm" @click="emit('update:open', false)">
              取消
            </UButton>
            <UButton
              color="primary"
              size="sm"
              :disabled="!selectedLexemeId || merging"
              :loading="merging"
              @click="handleMerge"
            >
              確認{{ isGroupMerge ? '合併' : '加入' }}
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
interface LexemeGroup {
  lexemeId: string
  headwordDisplay: string
  entryCount: number
  dialects: string[]
}

const props = withDefaults(defineProps<{
  open: boolean
  sourceLexemeId: string | null
  sourceLabel?: string
  isGroupMerge?: boolean
}>(), {
  sourceLabel: '',
  isGroupMerge: false
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'merged': [targetLexemeId: string]
}>()

const loading = ref(false)
const errorMessage = ref('')
const availableGroups = ref<LexemeGroup[]>([])
const selectedLexemeId = ref<string | null>(null)
const merging = ref(false)

async function fetchAvailableGroups() {
  if (!props.open) return
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await $fetch<{ data: any[]; total: number; grouped?: boolean }>('/api/entries', {
      query: {
        page: 1,
        perPage: 100,
        groupBy: 'lexeme'
      }
    })
    if (response.grouped && Array.isArray(response.data)) {
      availableGroups.value = response.data
        .filter((g: any) => {
          const key = g.headwordNormalized || ''
          // 只過濾掉未綁定組（__unassigned__）和當前來源組（如果有的話）
          if (!key || key.startsWith('__unassigned__:')) return false
          if (props.sourceLexemeId && key === props.sourceLexemeId) return false
          return true
        })
        .map((g: any) => ({
          lexemeId: g.headwordNormalized || '',
          headwordDisplay: g.headwordDisplay || '—',
          entryCount: Array.isArray(g.entries) ? g.entries.length : 0,
          dialects: Array.isArray(g.entries)
            ? [...new Set(g.entries.map((e: any) => e.dialect?.name || '').filter(Boolean))]
            : []
        }))
        .sort((a, b) => b.entryCount - a.entryCount)
    } else {
      availableGroups.value = []
    }
  } catch (e: any) {
    errorMessage.value = e?.data?.message || e?.message || '獲取詞語組列表失敗'
    availableGroups.value = []
  } finally {
    loading.value = false
  }
}

async function handleMerge() {
  // 允許 sourceLexemeId 為 null（entry 沒有 lexemeId 時也可以加入其他組）
  if (!selectedLexemeId.value) return
  merging.value = true
  errorMessage.value = ''
  try {
    emit('merged', selectedLexemeId.value)
    emit('update:open', false)
  } catch (e: any) {
    errorMessage.value = e?.data?.message || e?.message || '操作失敗'
  } finally {
    merging.value = false
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      selectedLexemeId.value = null
      errorMessage.value = ''
      return
    }
    fetchAvailableGroups()
  }
)

watch(
  () => props.sourceLexemeId,
  () => {
    if (props.open) fetchAvailableGroups()
  }
)
</script>
