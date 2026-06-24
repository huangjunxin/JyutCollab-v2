<template>
  <!-- Notion 風格表格：方向鍵選格、Enter 進入/確認並下一行、Tab 右移並編輯、Shift+Tab 左移並編輯 -->
  <div class="flex-1 flex flex-col gap-0 overflow-hidden">
    <!-- 多選時顯示批量操作欄 -->
    <div
      v-if="selectedCount > 0"
      class="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-2 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 border-b-0 rounded-t-xl"
    >
      <span class="text-sm font-medium text-primary-700 dark:text-primary-300">
        已選 <span class="font-semibold">{{ selectedCount }}</span> 項
        <span v-if="selectedSavedEntries.length < selectedCount" class="text-primary-600 dark:text-primary-400 ml-1">
          （其中 {{ selectedSavedEntries.length }} 條可批量刪除）
        </span>
      </span>
      <div class="flex items-center gap-2">
        <UButton color="neutral" variant="soft" size="sm" @click="$emit('clear-selection')">
          取消選擇
        </UButton>
        <UButton
          v-if="selectedSavedEntries.length > 0"
          color="error"
          variant="soft"
          size="sm"
          icon="i-heroicons-trash"
          :loading="batchDeleting"
          @click="$emit('batch-delete')"
        >
          批量刪除
        </UButton>
      </div>
    </div>
    <div
      class="jc-entries-table-font flex-1 bg-white dark:bg-slate-800 shadow-[var(--jc-shadow-hard)] border border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] overflow-hidden flex flex-col"
      :class="{ 'border-t-0': selectedCount > 0 }"
    >
    <div
      ref="tableWrapperRef"
      tabindex="0"
      class="flex-1 overflow-auto outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-inset"
      @keydown="$emit('table-keydown', $event)"
    >
      <table class="border-collapse w-full" style="table-layout: fixed" ref="tableRef">
        <colgroup>
          <col style="width: 40px" />
          <col
            v-for="col in editableColumns"
            :key="col.key"
            :style="{ width: (columnWidths[col.key] ?? parseInt(col.width, 10)) + 'px' }"
          />
          <col style="width: 128px" />
        </colgroup>
        <thead class="sticky top-0 z-10">
          <tr class="bg-[var(--jc-canvas-soft)] dark:bg-slate-950 border-b border-[var(--jc-border)] dark:border-[var(--jc-dark-border)]">
            <th class="w-10 px-2 py-2 text-center border-r border-gray-200 dark:border-gray-700">
              <input
                ref="headerCheckboxEl"
                type="checkbox"
                class="rounded border-gray-300"
                :checked="selectAllChecked"
                :aria-label="selectAllChecked ? '取消全選' : '全選本頁'"
                @change="$emit('toggle-select-all')"
              />
            </th>
            <th
              v-for="col in editableColumns"
              :key="col.key"
              class="relative select-none px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 overflow-hidden"
              :class="SORTABLE_COLUMN_KEYS.includes(col.key as any) ? 'cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800' : ''"
              @click="$emit('sort', col.key)"
            >
              <div class="flex items-center gap-1 overflow-hidden">
                <span class="truncate">{{ col.label }}</span>
                <UIcon
                  v-if="SORTABLE_COLUMN_KEYS.includes(col.key as any) && sortBy === col.key"
                  :name="sortOrder === 'asc' ? 'i-heroicons-arrow-up' : 'i-heroicons-arrow-down'"
                  class="w-3 h-3 flex-shrink-0"
                />
              </div>
              <!-- 拖動手柄 -->
              <div
                class="absolute top-0 right-0 h-full w-1.5 cursor-col-resize z-20 hover:bg-primary/40 active:bg-primary/60 transition-colors"
                @mousedown.stop="$emit('start-resize', $event, col.key, columnWidths[col.key] ?? parseInt(col.width, 10))"
              />
            </th>
            <th class="min-w-[8rem] w-32 px-2 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">
              操作
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
          <template v-for="(row, rowIndex) in tableRows" :key="row.type === 'group' ? `group-${row.group.headwordNormalized}-${row.groupIndex}` : getEntryKey(row.entry) ?? `entry-${rowIndex}`">
          <!-- 聚合視圖：詞形組標題行 -->
          <tr
            v-if="row.type === 'group'"
            class="bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border-l-2 border-primary/40"
          >
            <td class="w-10 px-2 py-1 text-center border-r border-gray-200 dark:border-gray-700 text-xs text-gray-400 align-middle">
              {{ (pagination.page - 1) * pagination.perPage + row.groupIndex + 1 }}
            </td>
            <td class="jc-headword-rare-font px-3 py-2 border-r border-gray-200 dark:border-gray-700 font-medium text-gray-900 dark:text-white">
              {{ row.group.headwordDisplay || '—' }}
            </td>
            <td class="px-3 py-2 border-r border-gray-200 dark:border-gray-700">
              <div class="flex flex-wrap gap-1">
                <UBadge
                  v-for="e in row.group.entries"
                  :key="e.id ?? (e as any)._tempId"
                  size="xs"
                  variant="soft"
                  color="neutral"
                >
                  {{ getDialectLabel(e.dialect?.name || '') || e.dialect?.name || '—' }}
                </UBadge>
              </div>
            </td>
            <td class="px-3 py-2 border-r border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
              {{ getGroupPhonetic(row.group) }}
            </td>
            <td class="px-3 py-2 border-r border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
              {{ getGroupEntryType(row.group) }}
            </td>
            <td class="px-3 py-2 border-r border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
              {{ getGroupTheme(row.group) }}
            </td>
            <td class="px-3 py-2 border-r border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {{ row.group.entries.length > 1 ? `共 ${row.group.entries.length} 個方言點` : (row.group.entries[0]?.senses?.[0]?.definition || row.group.entries[0]?.definition || '—') }}
            </td>
            <td class="px-3 py-2 border-r border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
              {{ getGroupRegister(row.group) }}
            </td>
            <td class="px-3 py-2 border-r border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
              {{ getGroupStatus(row.group) }}
            </td>
            <td class="min-w-[8rem] w-32 px-2 py-2 text-center border-r border-gray-200 dark:border-gray-700 align-middle">
              <div class="flex items-center justify-center gap-1 flex-nowrap">
                <UButton
                  v-if="viewMode === 'lexeme'"
                  icon="i-heroicons-globe-asia-australia"
                  color="primary"
                  variant="ghost"
                  size="xs"
                  :disabled="!canEditExternalEtymons"
                  :title="!canEditExternalEtymons ? '只有審核員及以上可編輯' : (String(row.group.headwordNormalized || '').startsWith('__unassigned__:') ? '編輯域外方音（將自動創建詞語組）' : '編輯域外方音')"
                  :ui="{ base: 'hover:bg-primary-500/10 dark:hover:bg-primary-500/20' }"
                  @click="$emit('open-external-etymons', String(row.group.headwordNormalized || ''), String(row.group.headwordDisplay || ''), row.group.entries)"
                />
                <UButton
                  v-if="viewMode === 'lexeme' && canEditExternalEtymons && !String(row.group.headwordNormalized || '').startsWith('__unassigned__:')"
                  icon="i-heroicons-folder-plus"
                  color="primary"
                  variant="ghost"
                  size="xs"
                  title="合併到其他詞語組"
                  :ui="{ base: 'hover:bg-primary-500/10 dark:hover:bg-primary-500/20' }"
                  @click="$emit('open-merge-modal-for-group', String(row.group.headwordNormalized || ''), String(row.group.headwordDisplay || ''), row.group.entries.map(e => String(e.id || (e as any)._tempId || '')).filter(Boolean))"
                />
                <UButton
                  :icon="expandedGroupKeys.has(row.group.headwordNormalized) ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
                  color="primary"
                  variant="ghost"
                  size="xs"
                  :aria-label="expandedGroupKeys.has(row.group.headwordNormalized) ? '收合' : '展開'"
                  :ui="{ base: 'hover:bg-primary-500/10 dark:hover:bg-primary-500/20' }"
                  @click="$emit('toggle-group-expanded', row.group.headwordNormalized)"
                />
              </div>
            </td>
          </tr>
          <!-- 平鋪詞條行 或 聚合視圖下展開的詞條行 -->
          <tr
            v-else
            class="group hover:bg-[var(--jc-accent-soft)] dark:hover:bg-red-950/10 transition-colors"
            :class="{ 'bg-amber-50 dark:bg-amber-900/10': row.entry._isDirty }"
          >
            <td
              class="w-10 px-2 py-1 text-center border-r border-gray-200 dark:border-gray-700 text-xs text-gray-400"
              @click.stop
            >
              <div class="flex items-center justify-center gap-1.5">
                <input
                  type="checkbox"
                  class="rounded border-gray-300 cursor-pointer"
                  :checked="isEntrySelected(row.entry)"
                  :aria-label="`${isEntrySelected(row.entry) ? '取消選中' : '選中'}此詞條`"
                  @click.stop="$emit('toggle-select-entry', row.entry, $event)"
                />
                <span class="text-gray-400">{{ row.groupIndex >= 0 ? `${(pagination.page - 1) * pagination.perPage + row.groupIndex + 1}-${(row.entryIndexInGroup ?? 0) + 1}` : (pagination.page - 1) * pagination.perPage + rowIndex + 1 }}</span>
              </div>
            </td>
            <EntriesEditableCell
              v-for="(col, colIndex) in editableColumns"
              :key="`${getEntryKey(row.entry)}-${col.key}`"
              :col="col"
              :can-edit="canEditEntry(row.entry)"
              :is-editing="isEditing(getEntryKey(row.entry), col.key)"
              v-model:edit-value="editValueModel"
              :display-text="getCellDisplay(row.entry, col)"
              :cell-class="getCellClass(row.entry, col.key).join(' ')"
              :cell-meta="isAdvancedFilterFieldKey(col.key) ? getCellOverlayMeta(row.entry, col.key) : undefined"
              :wrap="true"
              :is-selected="isSelected(rowIndex, colIndex)"
              :column-options="getColumnOptions(col)"
              :review-notes="col.key === 'status' && row.entry.status === 'rejected' ? row.entry.reviewNotes : undefined"
              :show-ai-definition="col.key === 'definition' && !!row.entry.headword?.display && !row.entry.senses?.[0]?.definition"
              :show-ai-theme="col.key === 'theme' && !!row.entry.headword?.display && !row.entry.theme?.level3Id"
              :show-ai-register="col.key === 'register' && !!row.entry.headword?.display && !row.entry.meta?.register"
              :ai-loading-definition="(aiLoadingFor?.entryKey === getEntryKey(row.entry) && aiLoadingFor?.action === 'definition') || (!!aiLoadingInlineFor && aiLoadingInlineFor.field === 'definition' && getEntryIdString(row.entry) === aiLoadingInlineFor.entryId)"
              :ai-loading-theme="(aiLoadingFor?.entryKey === getEntryKey(row.entry) && aiLoadingFor?.action === 'theme') || (!!aiLoadingInlineFor && getEntryIdString(row.entry) === aiLoadingInlineFor.entryId)"
              :ai-loading-register="(aiLoadingFor?.entryKey === getEntryKey(row.entry) && aiLoadingFor?.action === 'register') || (!!aiLoadingInlineFor && getEntryIdString(row.entry) === aiLoadingInlineFor.entryId)"
              :show-expand="col.key === 'definition'"
              :is-expanded="expandedEntryId === getEntryIdString(row.entry)"
              :expand-hint="col.key === 'definition' ? getDefinitionExpandHint(row.entry) : undefined"
              :headword-expand-hint="col.key === 'headword' ? getHeadwordExpandHint(row.entry) : undefined"
              :phonetic-hint="col.key === 'phonetic' ? getPhoneticHint(row.entry) : undefined"
              :theme-id="col.key === 'theme' ? row.entry.theme?.level3Id : undefined"
              :is-theme-expanded="expandedThemeEntryId === getEntryIdString(row.entry)"
              @click="$emit('cell-click', row.entry, col.key, $event, rowIndex, colIndex)"
              @set-ref="(el: any) => $emit('set-input-ref', el, getEntryIdString(row.entry), col.key)"
              @keydown="$emit('cell-keydown', $event, row.entry, col.key)"
              @blur="$emit('cell-blur', row.entry, col.key)"
              @ai-definition="$emit('ai-definition', row.entry)"
              @ai-theme="$emit('ai-theme', row.entry)"
              @ai-register="$emit('ai-register', row.entry, rowIndex, colIndex)"
              @expand-click="$emit('expand-click', row.entry)"
              @theme-expand-click="$emit('theme-expand-click', row.entry)"
              @accept-theme-ai="$emit('accept-theme-ai', row.entry)"
              @dismiss-theme-ai="$emit('dismiss-theme-ai', row.entry)"
            />
            <EntryRowActions
              :entry="row.entry"
              :can-edit="canEditEntry(row.entry)"
              :show-lexeme-actions="viewMode === 'lexeme' && canEditExternalEtymons"
              :is-morpheme-refs-expanded="expandedMorphemeRefsEntryId === getEntryIdString(row.entry)"
              :is-saving="isEntrySaving(row.entry)"
              @save="$emit('save-row', row.entry)"
              @duplicate="$emit('duplicate', row.entry)"
              @delete="$emit('delete', row.entry)"
              @cancel="$emit('cancel', row.entry)"
              @make-new-lexeme="$emit('make-new-lexeme', row.entry)"
              @join-lexeme="$emit('join-lexeme', row.entry)"
              @toggle-morpheme-refs="$emit('toggle-morpheme-refs', row.entry)"
            />
          </tr>
          <!-- 行內 AI 釋義建議（Tab 落在釋義格且有待處理建議時顯示） -->
          <AISuggestionRow
            v-if="row.type === 'entry' && aiSuggestion && aiSuggestionForField && editingCell && editingCell.field === aiSuggestionForField && getEntryIdString(row.entry) === String(editingCell.entryId)"
            :text="aiSuggestion"
            :title="aiSuggestionForField === 'theme' ? 'AI 分類建議' : 'AI 釋義建議'"
            :colspan="editableColumns.length + 2"
            @accept="$emit('accept-suggestion')"
            @dismiss="$emit('dismiss-suggestion')"
          />
          <!-- 行內 AI 分類建議 -->
          <AISuggestionRow
            v-if="row.type === 'entry' && focusedCell?.rowIndex === rowIndex && focusedCell?.colIndex === columnIndices.themeColIndex && themeAISuggestions.get(getEntryIdString(row.entry))"
            :text="formatThemeSuggestion(themeAISuggestions.get(getEntryIdString(row.entry)))"
            :alternatives="getThemeAlternativesForRow(row.entry)"
            :confidence="themeAISuggestions.get(getEntryIdString(row.entry))?.confidence"
            title="AI 分類建議"
            :colspan="editableColumns.length + 2"
            @accept="$emit('accept-theme-ai-row', row.entry)"
            @dismiss="$emit('dismiss-theme-ai-row', row.entry)"
            @select-alternative="(idx: number) => $emit('select-theme-alternative', row.entry, idx)"
          />
          <!-- 行內 AI 語域建議 -->
          <AISuggestionRow
            v-if="row.type === 'entry' && focusedCell?.rowIndex === rowIndex && focusedCell?.colIndex === columnIndices.registerColIndex && registerAISuggestions.get(getEntryIdString(row.entry))"
            :text="formatRegisterSuggestion(registerAISuggestions.get(getEntryIdString(row.entry)))"
            title="AI 語域建議"
            :colspan="editableColumns.length + 2"
            @accept="$emit('accept-register-ai', row.entry)"
            @dismiss="$emit('dismiss-register-ai', row.entry)"
          />
          <!-- 泛粵典粵拼建議 -->
          <JyutdictSuggestionRow
            v-if="row.type === 'entry' && focusedCell?.rowIndex === rowIndex && focusedCell?.colIndex === columnIndices.phoneticColIndex && getJyutdictVisible(getEntryIdString(row.entry))"
            :colspan="editableColumns.length + 2"
            :char-data="getJyutdictData(getEntryIdString(row.entry))"
            :dialect-name="getDialectLabel(row.entry.dialect?.name || '') || row.entry.dialect?.name || ''"
            :suggested-pronunciation="getJyutdictSuggested(getEntryIdString(row.entry))"
            :is-loading="getJyutdictLoading(getEntryIdString(row.entry))"
            @accept="(pronunciation: string) => $emit('accept-jyutdict', row.entry, pronunciation)"
            @dismiss="$emit('dismiss-jyutdict', row.entry)"
          />
          <!-- 詞頭重複檢測 -->
          <DuplicateCheckRow
            v-if="row.type === 'entry' && focusedCell?.rowIndex === rowIndex && (getDuplicateCheckLoading(getEntryIdString(row.entry)) || getDuplicateCheckEntriesFormatted(getEntryIdString(row.entry)).length > 0)"
            :colspan="editableColumns.length + 2"
            :entries="getDuplicateCheckEntriesFormatted(getEntryIdString(row.entry))"
            :is-loading="getDuplicateCheckLoading(getEntryIdString(row.entry))"
            @dismiss="$emit('dismiss-duplicate-check', row.entry)"
            @open-reference="$emit('open-reference', getEntryIdString(row.entry))"
          />
          <!-- 手動輸入另一個參考詞條 -->
          <ReferenceHeadwordRow
            v-if="
              row.type === 'entry' &&
              focusedCell?.rowIndex === rowIndex &&
              referenceHeadwordVisibleEntryId === getEntryIdString(row.entry)
            "
            :colspan="editableColumns.length + 2"
            :query="getReferenceSearchQuery(getEntryIdString(row.entry))"
            :is-loading="getReferenceSearchLoading(getEntryIdString(row.entry))"
            @update:query="(q: string) => $emit('update-reference-query', getEntryIdString(row.entry), q)"
            @search="(q: string) => $emit('run-reference-search', row.entry, q)"
            @dismiss="$emit('close-reference')"
          />
          <!-- 其他方言點已有該詞條 -->
          <OtherDialectsRefRow
            v-if="
              row.type === 'entry' &&
              focusedCell?.rowIndex === rowIndex &&
              getOtherDialectsFormatted(getEntryIdString(row.entry)).length > 0 &&
              getDuplicateCheckEntriesFormatted(getEntryIdString(row.entry)).length === 0
            "
            :colspan="editableColumns.length + 2"
            :entries="getOtherDialectsFormatted(getEntryIdString(row.entry))"
            @dismiss="$emit('dismiss-duplicate-check', row.entry)"
            @apply-template="(sourceId: string) => $emit('apply-other-dialect-template', row.entry, sourceId)"
            @open-reference="$emit('open-reference', getEntryIdString(row.entry))"
          />
          <!-- Jyutjyu 參考 -->
          <JyutjyuRefRow
            v-if="
              row.type === 'entry' &&
              focusedCell?.rowIndex === rowIndex &&
              getJyutjyuRowVisible(getEntryIdString(row.entry))
            "
            :colspan="editableColumns.length + 2"
            :query="getJyutjyuQuery(getEntryIdString(row.entry))"
            :results="formatJyutjyuResults(jyutjyuRefResult.get(getEntryIdString(row.entry))?.results || [])"
            :raw-results="jyutjyuRefResult.get(getEntryIdString(row.entry))?.results || []"
            :total="getJyutjyuTotal(getEntryIdString(row.entry))"
            :is-loading="getJyutjyuLoading(getEntryIdString(row.entry))"
            :error-message="getJyutjyuError(getEntryIdString(row.entry))"
            @dismiss="$emit('dismiss-jyutjyu-ref', row.entry)"
            @apply-template="(sourceId: string) => $emit('apply-jyutjyu-template', row.entry, sourceId)"
            @open-reference="$emit('open-reference', getEntryIdString(row.entry))"
          />
          <!-- 行內釋義建議錯誤 + 重試 -->
          <tr
            v-if="row.type === 'entry' && aiInlineError && getEntryIdString(row.entry) === aiInlineError.entryId && aiInlineError.field === 'definition'"
            class="bg-red-50/80 dark:bg-red-900/20 border-b border-gray-200 dark:border-gray-700"
            role="alert"
          >
            <td :colspan="editableColumns.length + 2" class="px-3 py-2 align-top">
              <div class="flex items-center justify-between gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-gray-800 p-2 text-sm">
                <span class="text-red-700 dark:text-red-300">{{ aiInlineError.message }}</span>
                <div class="flex gap-2 flex-shrink-0">
                  <UButton size="xs" color="neutral" variant="ghost" @click="$emit('clear-inline-error')">
                    關閉
                  </UButton>
                  <UButton size="xs" color="primary" @click="$emit('retry-inline-ai', row.entry)">
                    重試
                  </UButton>
                </div>
              </div>
            </td>
          </tr>
          <!-- 釋義詳情展開區 -->
          <tr
            v-if="row.type === 'entry' && expandedEntryId === getEntryIdString(row.entry)"
            class="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700"
          >
            <td :colspan="editableColumns.length + 2" class="p-0 align-top">
              <EntrySensesExpand
                :entry="row.entry"
                :ai-suggestion="definitionAISuggestions.get(getEntryIdString(row.entry))"
                :ai-loading="aiLoadingFor?.entryKey === getEntryKey(row.entry) && aiLoadingFor?.action === 'definition'"
                :ai-loading-examples="aiLoadingFor?.entryKey === getEntryKey(row.entry) && aiLoadingFor?.action === 'examples'"
                @close="$emit('close-senses', row.entry)"
                @ai-definition="$emit('ai-definition-expand', row.entry)"
                @accept-definition-ai="$emit('accept-definition-ai', row.entry)"
                @dismiss-definition-ai="$emit('dismiss-definition-ai', row.entry)"
                @ai-examples="$emit('ai-examples', row.entry)"
                @add-sense="$emit('add-sense', row.entry)"
                @remove-sense="(senseIdx: number) => $emit('remove-sense', row.entry, senseIdx)"
                @add-example="(senseIdx: number) => $emit('add-example', row.entry, senseIdx)"
                @remove-example="(p: { senseIdx: number; exIdx: number }) => $emit('remove-example', row.entry, p.senseIdx, p.exIdx)"
                @add-sub-sense="(senseIdx: number) => $emit('add-sub-sense', row.entry, senseIdx)"
                @remove-sub-sense="(p: { senseIdx: number; subIdx: number }) => $emit('remove-sub-sense', row.entry, p.senseIdx, p.subIdx)"
                @add-sub-sense-example="(p: { senseIdx: number; subIdx: number }) => $emit('add-sub-sense-example', row.entry, p.senseIdx, p.subIdx)"
                @remove-sub-sense-example="(p: { senseIdx: number; subIdx: number; exIdx: number }) => $emit('remove-sub-sense-example', row.entry, p.senseIdx, p.subIdx, p.exIdx)"
              />
            </td>
          </tr>
          <!-- 詞素引用展開區 -->
          <tr
            v-if="row.type === 'entry' && expandedMorphemeRefsEntryId === getEntryIdString(row.entry)"
            class="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700"
          >
            <td :colspan="editableColumns.length + 2" class="p-0 align-top">
              <div class="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                <div class="flex items-center justify-between mb-3">
                  <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">詞素／單音節來源</h4>
                  <UButton
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    icon="i-heroicons-chevron-up"
                    @click="$emit('toggle-morpheme-refs', row.entry)"
                  >
                    收起
                  </UButton>
                </div>
                <div class="space-y-2">
                  <div class="flex flex-wrap items-center gap-2">
                    <template v-for="(ref, refIdx) in (row.entry.morphemeRefs || [])" :key="refIdx">
                      <div
                        class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                        :title="ref.note ? `備註：${ref.note}` : (ref.targetEntryId ? `ID: ${ref.targetEntryId}` : undefined)"
                      >
                        <span v-if="ref.char" class="font-medium text-gray-900 dark:text-white">{{ ref.char }}</span>
                        <span v-if="ref.jyutping" class="text-gray-500 dark:text-gray-400">{{ ref.jyutping }}</span>
                        <span v-if="ref.position !== undefined" class="text-xs text-gray-400 dark:text-gray-500">第{{ (ref.position ?? 0) + 1 }}字</span>
                        <span v-if="!ref.targetEntryId" class="text-xs text-amber-600 dark:text-amber-400" title="數據庫暫無對應詞條">(未連結)</span>
                        <UButton
                          color="error"
                          variant="ghost"
                          size="xs"
                          icon="i-heroicons-trash"
                          title="刪除此引用"
                          class="p-0.5 min-w-0"
                          @click="$emit('remove-morpheme-ref', row.entry, refIdx)"
                        />
                      </div>
                    </template>
                    <span v-if="!row.entry.morphemeRefs || row.entry.morphemeRefs.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
                      暫無詞素引用
                    </span>
                  </div>
                  <div class="pt-1 border-t border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-2">
                    <UButton
                      color="primary"
                      variant="soft"
                      size="sm"
                      icon="i-heroicons-plus"
                      @click="$emit('open-morpheme-search', row.entry)"
                    >
                      從數據庫選擇詞素
                    </UButton>
                    <UButton
                      color="neutral"
                      variant="soft"
                      size="sm"
                      icon="i-heroicons-pencil-square"
                      @click="$emit('open-unlinked-morpheme-form', row.entry)"
                    >
                      添加未連結詞素
                    </UButton>
                  </div>
                  <!-- 未連結詞素 -->
                  <div
                    v-if="unlinkedMorphemeEntryId === getEntryIdString(row.entry)"
                    class="mt-3 p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20 space-y-2"
                  >
                    <p class="text-xs text-amber-800 dark:text-amber-200">以下為詞頭各字自動帶入的未連結詞素，可補備註後確認添加。</p>
                    <div v-if="unlinkedMorphemeCandidates.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
                      詞頭各字均已有關聯或未連結詞素。
                    </div>
                    <template v-else>
                      <div class="flex flex-wrap gap-2">
                        <div
                          v-for="(cand, idx) in unlinkedMorphemeCandidates"
                          :key="idx"
                          class="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-900"
                        >
                          <span class="text-sm text-gray-500 dark:text-gray-400">第{{ cand.position + 1 }}字</span>
                          <span class="font-medium text-gray-900 dark:text-white">{{ cand.char }}</span>
                          <span v-if="cand.jyutping" class="text-sm text-gray-500 dark:text-gray-400">{{ cand.jyutping }}</span>
                          <input
                            v-model="cand.note"
                            type="text"
                            placeholder="備註（可選）"
                            class="w-20 px-1.5 py-0.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                          />
                        </div>
                      </div>
                      <div class="flex gap-2 pt-1">
                        <UButton size="sm" color="primary" @click="$emit('confirm-unlinked-morpheme', row.entry)">
                          確認添加
                        </UButton>
                        <UButton size="sm" color="neutral" variant="ghost" @click="$emit('close-unlinked-morpheme-form')">
                          取消
                        </UButton>
                      </div>
                    </template>
                  </div>
                </div>
              </div>
            </td>
          </tr>
          <!-- 主題分類展開區 -->
          <tr
            v-if="row.type === 'entry' && expandedThemeEntryId === getEntryIdString(row.entry)"
            class="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700"
          >
            <td :colspan="editableColumns.length + 2" class="p-0 align-top">
              <EntryThemeExpand
                :entry="row.entry"
                :ai-suggestion="themeAISuggestions.get(getEntryIdString(row.entry))"
                :ai-loading="aiLoadingFor?.entryKey === getEntryKey(row.entry) && aiLoadingFor?.action === 'theme'"
                @close="$emit('close-theme-expand', row.entry)"
                @update:theme="(theme: any) => $emit('update:theme', row.entry, theme)"
                @dismiss-ai="$emit('dismiss-theme-ai-expand', row.entry)"
                @accept-ai="(suggestion: any) => $emit('accept-theme-ai-expand', row.entry, suggestion)"
                @ai-categorize="$emit('ai-categorize', row.entry)"
              />
            </td>
          </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="!hasActiveAdvancedFilters" class="flex-shrink-0 px-4 py-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4 bg-gray-50 dark:bg-gray-900/50">
      <div class="text-sm text-gray-500 dark:text-gray-400">
        {{ (pagination.page - 1) * pagination.perPage + 1 }}-{{ Math.min(pagination.page * pagination.perPage, pagination.total) }} / {{ pagination.total }}
      </div>
      <div class="flex items-center gap-3">
        <UPagination
          v-model:page="currentPageModel"
          :total="pagination.total"
          :items-per-page="pagination.perPage"
          size="sm"
        />
        <div class="flex items-center gap-2 border-l border-gray-200 dark:border-gray-600 pl-3">
          <span class="text-sm text-gray-500 dark:text-gray-400">跳至</span>
          <UInput
            v-model="jumpToPageInput"
            type="number"
            size="sm"
            class="w-16"
            :min="1"
            :max="pagination.totalPages || 1"
            @keyup.enter="handleJumpToPage"
          />
          <span class="text-sm text-gray-500 dark:text-gray-400">頁</span>
          <UButton
            size="sm"
            color="neutral"
            variant="soft"
            @click="handleJumpToPage"
          >
            跳轉
          </UButton>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
import type { Entry } from '~/types'
import type { AdvancedFilterFieldKey } from '~/utils/entriesAdvancedFilter'
import { getEntryKey, getEntryIdString } from '~/utils/entryKey'
import { SORTABLE_COLUMN_KEYS } from '~/utils/entriesTableConstants'
import { getDialectLabel } from '~/utils/dialects'
import { getGroupPhonetic, getGroupEntryType, getGroupTheme, getGroupRegister, getGroupStatus } from '~/composables/useEntryGroupDisplay'
import AISuggestionRow from '~/components/entries/AISuggestionRow.vue'
import JyutdictSuggestionRow from '~/components/entries/JyutdictSuggestionRow.vue'
import EntrySensesExpand from '~/components/entries/EntrySensesExpand.vue'
import EntryThemeExpand from '~/components/entries/EntryThemeExpand.vue'
import EntryRowActions from '~/components/entries/EntryRowActions.vue'
import EntriesEditableCell from '~/components/entries/EntriesEditableCell.vue'
import DuplicateCheckRow from '~/components/entries/DuplicateCheckRow.vue'
import OtherDialectsRefRow from '~/components/entries/OtherDialectsRefRow.vue'
import JyutjyuRefRow from '~/components/entries/JyutjyuRefRow.vue'
import ReferenceHeadwordRow from '~/components/entries/ReferenceHeadwordRow.vue'

// ---- Types ----
type TableRow = { type: 'group'; group: { headwordDisplay: string; headwordNormalized: string; entries: Entry[] }; groupIndex: number } | { type: 'entry'; entry: Entry; groupIndex: number; entryIndexInGroup?: number }
type EditableColumnDef = { key: string; label: string; width: string; type: string; get: (e: Entry) => unknown; set: (e: Entry, v: any) => void; options?: Array<{ value: string; label: string }>; getOptions?: () => Array<{ value: string; label: string }> }
type EntryCellOverlayMeta = { formattingMatches: any[]; validationMatches: any[]; classNames: string[]; style: Record<string, string>; tooltipText: string; formattingTooltipText: string; validationTooltipText: string }
type ColumnIndices = { themeColIndex: number; phoneticColIndex: number; headwordColIndex: number; registerColIndex: number }

// ---- Props ----
const props = defineProps<{
  // Data
  tableRows: TableRow[]
  editableColumns: EditableColumnDef[]
  columnWidths: Record<string, number>
  viewMode: 'flat' | 'aggregated' | 'lexeme'
  pagination: { page: number; perPage: number; total: number; totalPages: number }
  expandedGroupKeys: Set<string>

  // Editing state
  editingCell: { entryId: string; field: string } | null
  editValue: any
  focusedCell: { rowIndex: number; colIndex: number } | null
  expandedEntryId: string | null
  expandedMorphemeRefsEntryId: string | null
  expandedThemeEntryId: string | null

  // Display
  getCellDisplay: (entry: Entry, col: EditableColumnDef) => string
  getCellClass: (entry: Entry, field: string) => string[]
  getColumnOptions: (col: EditableColumnDef) => Array<{ value: string; label: string }>

  // Selection
  selectedCount: number
  selectedSavedEntries: Entry[]
  selectAllChecked: boolean
  isEntrySelected: (entry: Entry) => boolean
  batchDeleting: boolean

  // Rule overlays
  getCellOverlayMeta: (entry: Entry, field: string) => EntryCellOverlayMeta | undefined
  isAdvancedFilterFieldKey: (field: string) => boolean
  hasActiveAdvancedFilters: boolean

  // AI suggestions
  aiSuggestion: string | null
  aiSuggestionForField: string | null
  aiLoadingFor: { entryKey: string; action: string } | null
  aiLoadingInlineFor: { entryId: string; field: string } | null
  aiInlineError: { entryId: string; field: string; message: string } | null
  themeAISuggestions: Map<string, any>
  definitionAISuggestions: Map<string, any>
  registerAISuggestions: Map<string, any>
  formatThemeSuggestion: (s: any) => string
  formatRegisterSuggestion: (s: any) => string

  // Row hints
  getJyutdictData: (id: string) => any
  getJyutdictLoading: (id: string) => boolean
  getJyutdictSuggested: (id: string) => string | undefined
  getJyutdictVisible: (id: string) => boolean
  getDuplicateCheckLoading: (id: string) => boolean
  getDuplicateCheckEntriesFormatted: (id: string) => any[]
  getOtherDialectsFormatted: (id: string) => any[]
  getJyutjyuRowVisible: (id: string) => boolean
  getJyutjyuQuery: (id: string) => string
  getJyutjyuTotal: (id: string) => number
  getJyutjyuLoading: (id: string) => boolean
  getJyutjyuError: (id: string) => string | undefined
  jyutjyuRefResult: Map<string, any>
  formatJyutjyuResults: (results: any[]) => any[]
  getReferenceSearchLoading: (id: string) => boolean
  getReferenceSearchQuery: (id: string) => string
  referenceHeadwordVisibleEntryId: string | null

  // Column indices
  columnIndices: ColumnIndices

  // Saving
  isEntrySaving: (entry: Entry) => boolean

  // Auth
  canEditEntry: (entry: Entry) => boolean
  canEditExternalEtymons: boolean

  // Sort
  sortBy: string
  sortOrder: 'asc' | 'desc'

  // Morpheme refs (inline expand)
  unlinkedMorphemeEntryId: string | null
  unlinkedMorphemeCandidates: Array<{ position: number; char: string; jyutping: string; note: string }>
}>()

// ---- Emits ----
const emit = defineEmits<{
  // Cell events
  'cell-click': [entry: Entry, field: string, event: MouseEvent | KeyboardEvent, rowIndex?: number, colIndex?: number, forceEdit?: boolean]
  'set-input-ref': [el: any, entryId: string, field: string]
  'cell-keydown': [event: KeyboardEvent, entry: Entry, field: string]
  'cell-blur': [entry: Entry, field: string]
  'expand-click': [entry: Entry]
  'theme-expand-click': [entry: Entry]
  'accept-theme-ai': [entry: Entry]
  'dismiss-theme-ai': [entry: Entry]

  // Row actions
  'save-row': [entry: Entry]
  'duplicate': [entry: Entry]
  'delete': [entry: Entry]
  'cancel': [entry: Entry]
  'make-new-lexeme': [entry: Entry]
  'join-lexeme': [entry: Entry]
  'toggle-morpheme-refs': [entry: Entry]

  // Table events
  'sort': [columnKey: string]
  'start-resize': [event: MouseEvent, key: string, currentWidth: number]
  'toggle-select-entry': [entry: Entry, event?: MouseEvent]
  'toggle-select-all': []
  'clear-selection': []
  'batch-delete': []
  'update:currentPage': [page: number]
  'jump-to-page': [page: number]
  'table-keydown': [event: KeyboardEvent]

  // Suggestion events
  'ai-definition': [entry: Entry]
  'ai-theme': [entry: Entry]
  'ai-register': [entry: Entry, rowIndex: number, colIndex: number]
  'accept-suggestion': []
  'dismiss-suggestion': []
  'accept-theme-ai-row': [entry: Entry]
  'dismiss-theme-ai-row': [entry: Entry]
  'select-theme-alternative': [entry: Entry, idx: number]
  'accept-register-ai': [entry: Entry]
  'dismiss-register-ai': [entry: Entry]

  // Hint events
  'accept-jyutdict': [entry: Entry, pronunciation: string]
  'dismiss-jyutdict': [entry: Entry]
  'dismiss-duplicate-check': [entry: Entry]
  'open-reference': [entryId: string]
  'update-reference-query': [entryId: string, query: string]
  'run-reference-search': [entry: Entry, query: string]
  'close-reference': []
  'apply-other-dialect-template': [entry: Entry, sourceId: string]
  'dismiss-jyutjyu-ref': [entry: Entry]
  'apply-jyutjyu-template': [entry: Entry, sourceId: string]
  'retry-inline-ai': [entry: Entry]
  'clear-inline-error': []

  // Expand events
  'close-senses': [entry: Entry]
  'ai-definition-expand': [entry: Entry]
  'accept-definition-ai': [entry: Entry]
  'dismiss-definition-ai': [entry: Entry]
  'ai-examples': [entry: Entry]
  'add-sense': [entry: Entry]
  'remove-sense': [entry: Entry, senseIdx: number]
  'add-example': [entry: Entry, senseIdx: number]
  'remove-example': [entry: Entry, senseIdx: number, exIdx: number]
  'add-sub-sense': [entry: Entry, senseIdx: number]
  'remove-sub-sense': [entry: Entry, senseIdx: number, subIdx: number]
  'add-sub-sense-example': [entry: Entry, senseIdx: number, subIdx: number]
  'remove-sub-sense-example': [entry: Entry, senseIdx: number, subIdx: number, exIdx: number]
  'close-theme-expand': [entry: Entry]
  'update:theme': [entry: Entry, theme: any]
  'dismiss-theme-ai-expand': [entry: Entry]
  'accept-theme-ai-expand': [entry: Entry, suggestion: any]
  'ai-categorize': [entry: Entry]

  // Morpheme ref events
  'open-morpheme-search': [entry: Entry]
  'open-unlinked-morpheme-form': [entry: Entry]
  'remove-morpheme-ref': [entry: Entry, refIdx: number]
  'confirm-unlinked-morpheme': [entry: Entry]
  'close-unlinked-morpheme-form': []

  // Group events
  'toggle-group-expanded': [headwordNormalized: string]
  'open-external-etymons': [groupKey: string, groupLabel: string, entries: Entry[]]
  'open-merge-modal-for-group': [groupKey: string, groupLabel: string, entryIds: string[]]
}>()

// ---- v-model proxies ----
const editValueModel = computed({
  get: () => props.editValue,
  set: (val) => emit('update:editValue' as any, val)
})

const currentPageModel = computed({
  get: () => props.pagination.page,
  set: (val) => emit('update:currentPage', val)
})

// ---- Refs ----
const tableWrapperRef = ref<HTMLElement | null>(null)
const tableRef = ref<HTMLTableElement | null>(null)
const headerCheckboxEl = ref<HTMLInputElement | null>(null)
const jumpToPageInput = ref('')

// Sync headerCheckboxRef with parent
watch(headerCheckboxEl, (el) => {
  // Handled via prop-based indeterminate if needed
})

// ---- Template helpers (local to this component) ----
function isEditing(entryId: string | number, field: string) {
  return props.editingCell != null && String(props.editingCell.entryId) === String(entryId) && props.editingCell.field === field
}

function isSelected(rowIndex: number, colIndex: number) {
  const f = props.focusedCell
  return f != null && f.rowIndex === rowIndex && f.colIndex === colIndex
}

function getDefinitionExpandHint(entry: Entry): string {
  const senses = entry.senses ?? []
  const senseCount = senses.length
  let exampleCount = 0
  senses.forEach((s: any) => {
    exampleCount += (s.examples?.length ?? 0)
    s.subSenses?.forEach((sub: any) => {
      exampleCount += (sub.examples?.length ?? 0)
    })
  })
  const parts: string[] = []
  if (senseCount > 1) parts.push(`${senseCount} 義項`)
  if (exampleCount > 0) parts.push(`${exampleCount} 例`)
  return parts.join(' · ')
}

function getHeadwordExpandHint(entry: Entry): string {
  const variants = entry.headword?.variants || []
  const count = variants.filter(v => v && v.trim() !== '').length
  return count > 0 ? `${count} 異形` : ''
}

function getPhoneticHint(entry: Entry): string {
  const arr = entry.phonetic?.jyutping?.map(s => (s || '').trim()).filter(Boolean)
  if (!Array.isArray(arr) || arr.length <= 1) return ''
  return `${arr.length - 1} 其他讀音`
}

function getThemeAlternativesForRow(entry: Entry) {
  const suggestion = props.themeAISuggestions.get(getEntryIdString(entry))
  if (!suggestion?.alternatives || suggestion.alternatives.length === 0) return undefined
  return suggestion.alternatives.map((alt: any) => ({
    text: props.formatThemeSuggestion(alt),
    confidence: alt.confidence
  }))
}

function handleJumpToPage() {
  const pageNum = parseInt(jumpToPageInput.value, 10)
  const totalPages = props.pagination.totalPages || 1
  if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
    emit('jump-to-page', pageNum)
    jumpToPageInput.value = ''
  }
}

// Expose tableWrapperRef for parent to focus
defineExpose({ tableWrapperRef, tableRef })
</script>

<style scoped>
table {
  table-layout: fixed;
}

td, th {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell-td-wrap {
  overflow: visible;
  white-space: normal;
}

.cell-display-wrap {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  line-clamp: 4;
}

.cell-td {
  min-height: 2rem;
  vertical-align: top;
}

.cell-inline-input {
  min-height: 1.75rem;
}
</style>
