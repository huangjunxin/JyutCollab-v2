<template>
  <div class="flex flex-col h-full bg-gray-50 dark:bg-slate-900">
    <!-- Header -->
    <div class="flex-shrink-0 px-4 py-3 bg-white dark:bg-slate-800 border-b border-[var(--jc-border)] dark:border-[var(--jc-dark-border)]">
      <div class="flex items-center gap-3">
        <UButton icon="i-heroicons-arrow-left" variant="ghost" color="neutral" size="sm" @click="$emit('back')" />
        <div class="min-w-0">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white truncate">釋義詳情</h2>
          <p class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ entry.headword?.display || '—' }}</p>
        </div>
      </div>
    </div>

    <!-- AI definition suggestion -->
    <div
      v-if="aiDefinitionSuggestion"
      class="flex-shrink-0 mx-4 mt-3 p-3 border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20"
    >
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <p class="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">AI 釋義建議</p>
          <p class="text-sm text-gray-900 dark:text-white">{{ aiDefinitionSuggestion.definition }}</p>
          <p v-if="aiDefinitionSuggestion.usageNotes" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            用法：{{ aiDefinitionSuggestion.usageNotes }}
          </p>
        </div>
      </div>
      <div class="flex gap-2 mt-2">
        <UButton size="xs" color="primary" @click="$emit('accept-definition-ai')">採納</UButton>
        <UButton size="xs" color="neutral" variant="ghost" @click="$emit('dismiss-definition-ai')">忽略</UButton>
      </div>
    </div>

    <!-- Senses list -->
    <div class="flex-1 overflow-auto px-4 py-3 space-y-4">
      <div
        v-for="(sense, senseIdx) in senses"
        :key="senseIdx"
        class="bg-white dark:bg-slate-800 border border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] p-3 space-y-3"
      >
        <!-- Sense header -->
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
            義項 {{ senseIdx + 1 }}
            <span v-if="sense.label" class="text-xs font-normal text-gray-500 ml-1">({{ sense.label }})</span>
          </h3>
          <UButton
            v-if="senses.length > 1"
            icon="i-heroicons-trash"
            color="error"
            variant="ghost"
            size="xs"
            @click="handleRemoveSense(senseIdx)"
          />
        </div>

        <!-- Definition -->
        <div>
          <label class="text-xs text-gray-500 dark:text-gray-400 block mb-1">釋義</label>
          <UTextarea
            :model-value="sense.definition"
            :rows="2"
            size="sm"
            :ui="{ base: 'bg-white dark:bg-slate-800' }"
            @update:model-value="(v: string) => updateSenseDefinition(senseIdx, v)"
          />
        </div>

        <!-- Examples -->
        <div v-if="sense.examples && sense.examples.length > 0">
          <label class="text-xs text-gray-500 dark:text-gray-400 block mb-1">例句</label>
          <div class="space-y-2">
            <div
              v-for="(ex, exIdx) in sense.examples"
              :key="exIdx"
              class="flex items-start gap-2 p-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700"
            >
              <div class="flex-1 min-w-0 space-y-1">
                <input
                  :value="ex.text"
                  placeholder="例句"
                  class="w-full text-sm px-2 py-1 border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  @input="(e) => updateExampleText(senseIdx, exIdx, (e.target as HTMLInputElement).value)"
                />
                <input
                  :value="ex.jyutping"
                  placeholder="粵拼"
                  class="w-full text-xs px-2 py-1 border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400"
                  @input="(e) => updateExampleJyutping(senseIdx, exIdx, (e.target as HTMLInputElement).value)"
                />
                <input
                  :value="ex.translation"
                  placeholder="翻譯"
                  class="w-full text-xs px-2 py-1 border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400"
                  @input="(e) => updateExampleTranslation(senseIdx, exIdx, (e.target as HTMLInputElement).value)"
                />
              </div>
              <UButton icon="i-heroicons-x-mark" color="error" variant="ghost" size="xs" class="mt-1" @click="handleRemoveExample(senseIdx, exIdx)" />
            </div>
          </div>
        </div>
        <div class="flex gap-2">
          <UButton size="xs" variant="soft" color="neutral" icon="i-heroicons-plus" @click="handleAddExample(senseIdx)">
            例句
          </UButton>
        </div>

        <!-- Sub-senses -->
        <div v-if="sense.subSenses && sense.subSenses.length > 0">
          <label class="text-xs text-gray-500 dark:text-gray-400 block mb-1">分義項</label>
          <div class="space-y-2">
            <div
              v-for="(sub, subIdx) in sense.subSenses"
              :key="subIdx"
              class="p-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 space-y-2"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {{ sub.label || `分義項 ${subIdx + 1}` }}
                </span>
                <UButton icon="i-heroicons-trash" color="error" variant="ghost" size="xs" @click="handleRemoveSubSense(senseIdx, subIdx)" />
              </div>
              <input
                :value="sub.definition"
                placeholder="分義項釋義"
                class="w-full text-sm px-2 py-1 border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                @input="(e) => updateSubSenseDefinition(senseIdx, subIdx, (e.target as HTMLInputElement).value)"
              />
              <!-- Sub-sense examples -->
              <div v-if="sub.examples && sub.examples.length > 0" class="space-y-1">
                <div
                  v-for="(subEx, subExIdx) in sub.examples"
                  :key="subExIdx"
                  class="flex items-center gap-1"
                >
                  <input
                    :value="subEx.text"
                    placeholder="例句"
                    class="flex-1 text-xs px-2 py-1 border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-800"
                    @input="(e) => updateSubSenseExampleText(senseIdx, subIdx, subExIdx, (e.target as HTMLInputElement).value)"
                  />
                  <UButton icon="i-heroicons-x-mark" color="error" variant="ghost" size="xs" @click="handleRemoveSubSenseExample(senseIdx, subIdx, subExIdx)" />
                </div>
              </div>
              <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-plus" @click="handleAddSubSenseExample(senseIdx, subIdx)">
                分義項例句
              </UButton>
            </div>
          </div>
        </div>
        <div class="flex gap-2">
          <UButton size="xs" variant="soft" color="neutral" icon="i-heroicons-plus" @click="handleAddSubSense(senseIdx)">
            分義項
          </UButton>
        </div>
      </div>
    </div>

    <!-- Bottom actions -->
    <div class="flex-shrink-0 px-4 py-3 bg-white dark:bg-slate-800 border-t border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] flex gap-2">
      <UButton size="sm" color="primary" icon="i-heroicons-plus" @click="handleAddSense">
        新增義項
      </UButton>
      <UButton
        v-if="canGenerateAI"
        size="sm"
        color="neutral"
        variant="soft"
        icon="i-lucide-sparkles"
        :loading="aiLoadingExamples"
        @click="$emit('ai-examples')"
      >
        AI 例句
      </UButton>
      <UButton
        v-if="canGenerateAI"
        size="sm"
        color="neutral"
        variant="soft"
        icon="i-lucide-sparkles"
        :loading="aiLoadingDefinition"
        @click="$emit('ai-definition')"
      >
        AI 釋義
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Entry } from '~/types'
import {
  ensureSensesStructure,
  addSense, removeSense,
  addExample, removeExample,
  addSubSense, removeSubSense,
  addSubSenseExample, removeSubSenseExample
} from '~/composables/useEntrySenses'

const props = defineProps<{
  entry: Entry
  aiDefinitionSuggestion?: { definition: string; usageNotes?: string } | null
  aiLoadingDefinition?: boolean
  aiLoadingExamples?: boolean
}>()

const emit = defineEmits<{
  'back': []
  'ai-definition': []
  'ai-examples': []
  'accept-definition-ai': []
  'dismiss-definition-ai': []
}>()

const canGenerateAI = computed(() => !!props.entry.headword?.display?.trim())

// Ensure senses structure on mount
onMounted(() => {
  ensureSensesStructure(props.entry)
})

const senses = computed(() => props.entry.senses || [])

function markDirty() {
  props.entry._isDirty = true
}

function handleAddSense() {
  addSense(props.entry)
  markDirty()
}

function handleRemoveSense(idx: number) {
  removeSense(props.entry, idx)
  markDirty()
}

function handleAddExample(senseIdx: number) {
  addExample(props.entry, senseIdx)
  markDirty()
}

function handleRemoveExample(senseIdx: number, exIdx: number) {
  removeExample(props.entry, senseIdx, exIdx)
  markDirty()
}

function handleAddSubSense(senseIdx: number) {
  addSubSense(props.entry, senseIdx)
  markDirty()
}

function handleRemoveSubSense(senseIdx: number, subIdx: number) {
  removeSubSense(props.entry, senseIdx, subIdx)
  markDirty()
}

function handleAddSubSenseExample(senseIdx: number, subIdx: number) {
  addSubSenseExample(props.entry, senseIdx, subIdx)
  markDirty()
}

function handleRemoveSubSenseExample(senseIdx: number, subIdx: number, exIdx: number) {
  removeSubSenseExample(props.entry, senseIdx, subIdx, exIdx)
  markDirty()
}

function updateSenseDefinition(senseIdx: number, value: string) {
  if (!props.entry.senses?.[senseIdx]) return
  props.entry.senses[senseIdx].definition = value
  markDirty()
}

function updateExampleText(senseIdx: number, exIdx: number, value: string) {
  const ex = props.entry.senses?.[senseIdx]?.examples?.[exIdx]
  if (!ex) return
  ex.text = value
  markDirty()
}

function updateExampleJyutping(senseIdx: number, exIdx: number, value: string) {
  const ex = props.entry.senses?.[senseIdx]?.examples?.[exIdx]
  if (!ex) return
  ex.jyutping = value
  markDirty()
}

function updateExampleTranslation(senseIdx: number, exIdx: number, value: string) {
  const ex = props.entry.senses?.[senseIdx]?.examples?.[exIdx]
  if (!ex) return
  ex.translation = value
  markDirty()
}

function updateSubSenseDefinition(senseIdx: number, subIdx: number, value: string) {
  const sub = props.entry.senses?.[senseIdx]?.subSenses?.[subIdx]
  if (!sub) return
  sub.definition = value
  markDirty()
}

function updateSubSenseExampleText(senseIdx: number, subIdx: number, exIdx: number, value: string) {
  const ex = props.entry.senses?.[senseIdx]?.subSenses?.[subIdx]?.examples?.[exIdx]
  if (!ex) return
  ex.text = value
  markDirty()
}
</script>
