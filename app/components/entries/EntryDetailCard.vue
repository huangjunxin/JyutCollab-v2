<template>
  <div class="entry-detail-card">
    <!-- 頭部：詞頭 + 粵拼 + 標籤 + 可選操作區 -->
    <div
      class="card-header px-6 py-4 border-b border-gray-100 dark:border-gray-700"
      :class="{ 'pb-4': !!$slots.actions }"
    >
      <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-4">
        <div class="flex-1 min-w-0">
          <h3 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1 break-words">
            {{ displayEntry.headwordDisplay }}
            <sup
              v-if="displayEntry.meta?.variant_number"
              class="ml-1 text-sm text-gray-500 dark:text-gray-400"
            >
              {{ displayEntry.meta.variant_number }}
            </sup>
          </h3>
          <div
            v-if="displayEntry.jyutpingDisplay"
            class="mt-2 font-mono text-lg text-blue-600 dark:text-blue-400 font-semibold whitespace-nowrap"
          >
            {{ displayEntry.jyutpingDisplay }}
          </div>
          <p
            v-if="displayEntry.headwordVariants?.length"
            class="text-sm text-gray-600 dark:text-gray-400 break-words mt-2"
          >
            異形詞：{{ displayEntry.headwordVariants.join('、') }}
          </p>
          <p
            v-if="
              displayEntry.normalized &&
              displayEntry.headwordDisplay !== displayEntry.normalized
            "
            class="text-sm text-gray-500 dark:text-gray-400 break-words mt-1"
          >
            標準寫法：{{ displayEntry.normalized }}
          </p>
        </div>

        <div
          class="flex flex-wrap gap-2 md:justify-end md:mt-0 md:ml-4 md:max-w-[40%] items-start"
        >
          <span
            v-if="displayEntry.dialectLabel"
            class="px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm whitespace-nowrap"
          >
            {{ displayEntry.dialectLabel }}
          </span>
          <span
            v-if="displayEntry.entryTypeLabel"
            class="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm whitespace-nowrap"
          >
            {{ displayEntry.entryTypeLabel }}
          </span>
          <span
            v-if="displayEntry.register"
            class="px-3 py-1 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg text-sm whitespace-nowrap"
          >
            {{ displayEntry.register }}
          </span>
          <span
            v-if="displayEntry.categoryLabel"
            class="px-3 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-sm break-words max-w-full"
          >
            {{ displayEntry.categoryLabel }}
          </span>
          <span
            v-if="displayEntry.sourceBook"
            class="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm"
          >
            {{ displayEntry.sourceBook }}
          </span>
          <slot name="actions" />
        </div>
      </div>
    </div>

    <!-- 內容：釋義、例句、使用説明、備註、提交信息 -->
    <div class="card-body px-6 py-4">
      <div
        v-for="(sense, senseIdx) in displayEntry.senses"
        :key="senseIdx"
        class="mb-4 last:mb-0"
      >
        <div class="flex items-start gap-3">
          <span
            v-if="displayEntry.senses.length > 1"
            class="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm flex items-center justify-center font-semibold"
          >
            {{ senseIdx + 1 }}
          </span>
          <div class="flex-1">
            <span
              v-if="sense.label"
              class="inline-block text-xs text-gray-500 dark:text-gray-400 mb-1"
            >
              {{ sense.label }}
            </span>
            <p class="text-gray-800 dark:text-gray-200 text-base leading-relaxed mb-2">
              {{ sense.definition }}
            </p>
            <div v-if="sense.examples?.length" class="space-y-2">
              <div
                v-for="(example, exIdx) in sense.examples"
                :key="exIdx"
                class="pl-4 border-l-2 border-gray-200 dark:border-gray-600"
              >
                <p class="text-gray-700 dark:text-gray-300 text-base">
                  {{ example.text || example.sentence }}
                </p>
                <p
                  v-if="example.jyutping"
                  class="text-sm text-blue-600 dark:text-blue-400 font-mono mt-1"
                >
                  {{ example.jyutping }}
                </p>
                <p
                  v-if="example.translation || example.explanation"
                  class="text-base text-gray-500 dark:text-gray-400 mt-1"
                >
                  → {{ example.translation || example.explanation }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="displayEntry.usage"
        class="mt-3 p-3 border-l-4 bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-600 text-sm text-gray-700 dark:text-gray-300"
      >
        <span class="font-semibold text-blue-700 dark:text-blue-300">使用説明：</span>
        {{ displayEntry.usage }}
      </div>

      <div
        v-if="displayEntry.notes"
        class="mt-3 p-3 border-l-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400 dark:border-yellow-600 text-sm text-gray-700 dark:text-gray-300"
      >
        <span class="font-semibold text-yellow-700 dark:text-yellow-300">備註：</span>
        {{ displayEntry.notes }}
      </div>

      <div
        v-if="displayEntry.createdBy || displayEntry.createdAt"
        class="mt-4 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400"
      >
        <span v-if="displayEntry.createdBy">提交者：{{ displayEntry.createdBy }}</span>
        <span v-if="displayEntry.createdAt">
          提交時間：{{ formatEntryDate(displayEntry.createdAt) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DisplayEntry } from '~/composables/useEntryDisplay'
import { formatEntryDate } from '~/composables/useEntryDisplay'

defineProps<{
  displayEntry: DisplayEntry
}>()
</script>
