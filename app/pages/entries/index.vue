<template>
  <div class="h-full flex flex-col">
    <!-- Page header -->
    <div class="mb-4 flex-shrink-0">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div class="w-10 h-10 aspect-square flex items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <UIcon name="i-heroicons-table-cells" class="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            詞條表格
          </h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            共 <span class="font-semibold text-gray-700 dark:text-gray-300">{{ pagination.total }}</span>
            {{ viewMode === 'aggregated' ? '個詞形' : (viewMode === 'lexeme' ? '個詞語' : '個詞條') }}
            <span v-if="hasUnsavedChanges" class="ml-2 text-amber-600">· 有未保存的更改</span>
          </p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <!-- 審核員/管理員：新建詞條時預設方言，連續新增時無需每次手動改 -->
          <div v-if="isAuthenticated && isReviewerOrAdmin" class="flex items-center gap-2">
            <span class="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">新建時方言</span>
            <USelectMenu
              v-model="reviewerDefaultDialectForNew"
              :items="newEntryDialectOptions"
              value-key="value"
              size="sm"
              class="w-24"
            />
          </div>
          <UButton
            v-if="isAuthenticated && hasUnsavedChanges"
            icon="i-heroicons-cloud-arrow-up"
            color="warning"
            variant="soft"
            size="md"
            :loading="saving"
            @click="saveAllChanges"
          >
            保存全部
          </UButton>
          <UButton
            v-if="isAuthenticated"
            icon="i-heroicons-plus"
            color="primary"
            size="md"
            class="shadow-lg shadow-primary/25"
            @click="addNewRow"
          >
            新建詞條
          </UButton>
        </div>
      </div>
    </div>

    <!-- Search and filters -->
    <div class="mb-4 flex-shrink-0 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div class="flex flex-col lg:flex-row gap-3">
        <div class="flex-1">
          <UInput
            v-model="searchQuery"
            placeholder="搜索詞條、釋義..."
            icon="i-heroicons-magnifying-glass"
            size="sm"
            class="w-full"
            @keyup.enter="handleSearch"
          />
        </div>
        <div class="flex flex-wrap gap-2">
          <USelectMenu
            v-model="filterRegion"
            :items="dialectOptions"
            value-key="value"
            placeholder="方言"
            size="sm"
            class="w-28"
          />
          <USelectMenu
            v-model="filterTheme"
            :items="themeFilterOptions"
            value-key="value"
            placeholder="主題分類"
            size="sm"
            class="min-w-28 max-w-[14rem]"
            searchable
            searchable-placeholder="搜索分類..."
          />
          <USelectMenu
            v-model="filterStatus"
            :items="statusOptions"
            value-key="value"
            placeholder="狀態"
            size="sm"
            class="w-28"
          />
          <UButton
            color="primary"
            size="sm"
            @click="handleSearch"
          >
            搜索
          </UButton>
          <div class="flex items-center gap-2 border-l border-gray-200 dark:border-gray-600 pl-2">
            <span class="text-sm text-gray-500 dark:text-gray-400">視圖</span>
            <USelectMenu
              :model-value="viewMode"
              :items="[
                { value: 'flat', label: '平鋪' },
                { value: 'aggregated', label: '按詞形聚合（參考）' },
                { value: 'lexeme', label: '按詞語聚合' }
              ]"
              value-key="value"
              size="sm"
              class="w-28"
              @update:model-value="setViewMode"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="flex-1 flex flex-col items-center justify-center">
      <div class="relative">
        <div class="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
        <div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
      </div>
      <p class="mt-4 text-gray-500 dark:text-gray-400">加載中...</p>
    </div>

    <!-- Empty state -->
    <div v-else-if="isEmpty" class="flex-1 flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
        <UIcon name="i-heroicons-table-cells" class="w-10 h-10 text-gray-400" />
      </div>
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {{ viewMode === 'aggregated' ? '暫無詞形' : (viewMode === 'lexeme' ? '暫無詞語' : '暫無詞條') }}
      </h3>
      <p class="text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
        {{
          searchQuery
            ? (viewMode === 'aggregated'
              ? '沒有找到匹配的詞形'
              : (viewMode === 'lexeme' ? '沒有找到匹配的詞語' : '沒有找到匹配的詞條，請嘗試其他關鍵詞'))
            : (viewMode === 'aggregated'
              ? '可切換為平鋪視圖或點擊上方按鈕新建詞條'
              : (viewMode === 'lexeme' ? '可切換為平鋪/按詞形聚合視圖或點擊上方按鈕新建詞條' : '點擊上方按鈕開始創建第一個詞條'))
        }}
      </p>
      <UButton
        v-if="isAuthenticated && !searchQuery"
        size="lg"
        color="primary"
        icon="i-heroicons-plus"
        @click="addNewRow"
      >
        {{ viewMode === 'aggregated' || viewMode === 'lexeme' ? '新建詞條' : '創建第一個詞條' }}
      </UButton>
    </div>

    <!-- Notion 風格表格：方向鍵選格、Enter 進入/確認並下一行、Tab 右移並編輯、Shift+Tab 左移並編輯 -->
    <div v-else class="flex-1 flex flex-col gap-0 overflow-hidden">
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
          <UButton color="neutral" variant="soft" size="sm" @click="clearSelection">
            取消選擇
          </UButton>
          <UButton
            v-if="selectedSavedEntries.length > 0"
            color="error"
            variant="soft"
            size="sm"
            icon="i-heroicons-trash"
            :loading="batchDeleting"
            @click="batchDeleteSelected"
          >
            批量刪除
          </UButton>
        </div>
      </div>
      <div
        class="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col"
        :class="{ 'rounded-t-none': selectedCount > 0 }"
      >
      <div
        ref="tableWrapperRef"
        tabindex="0"
        class="flex-1 overflow-auto outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-inset rounded-b-xl"
        @keydown="handleTableKeydown"
      >
        <table class="w-full border-collapse" ref="tableRef">
          <thead class="sticky top-0 z-10">
            <tr class="bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <th class="w-10 px-2 py-2 text-center border-r border-gray-200 dark:border-gray-700">
                <input
                  ref="headerCheckboxRef"
                  type="checkbox"
                  class="rounded border-gray-300"
                  :checked="selectAllChecked"
                  :aria-label="selectAllChecked ? '取消全選' : '全選本頁'"
                  @change="toggleSelectAll"
                />
              </th>
              <th
                v-for="col in editableColumns"
                :key="col.key"
                class="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700"
                :class="SORTABLE_COLUMN_KEYS.includes(col.key as any) ? 'cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800' : ''"
                :style="{ minWidth: col.width, maxWidth: col.width }"
                @click="handleSort(col.key)"
              >
                <div class="flex items-center gap-1">
                  {{ col.label }}
                  <UIcon
                    v-if="SORTABLE_COLUMN_KEYS.includes(col.key as any) && sortBy === col.key"
                    :name="sortOrder === 'asc' ? 'i-heroicons-arrow-up' : 'i-heroicons-arrow-down'"
                    class="w-3 h-3"
                  />
                </div>
              </th>
              <th class="min-w-[6rem] w-24 px-2 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">
                操作
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <template v-for="(row, rowIndex) in tableRows" :key="row.type === 'group' ? `group-${row.group.headwordNormalized}-${row.groupIndex}` : (row.entry as any)?._tempId ?? row.entry.id ?? `entry-${rowIndex}`">
            <!-- 聚合視圖：詞形組標題行 -->
            <tr
              v-if="row.type === 'group'"
              class="bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border-l-2 border-primary/40"
            >
              <td class="w-10 px-2 py-1 text-center border-r border-gray-200 dark:border-gray-700 text-xs text-gray-400 align-middle">
                {{ (pagination.page - 1) * pagination.perPage + row.groupIndex + 1 }}
              </td>
              <td class="px-3 py-2 border-r border-gray-200 dark:border-gray-700 font-medium text-gray-900 dark:text-white">
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
              <td class="min-w-[6rem] w-24 px-2 py-2 text-center border-r border-gray-200 dark:border-gray-700 align-middle">
                <div class="flex items-center justify-center gap-1">
                  <UButton
                    v-if="viewMode === 'lexeme'"
                    icon="i-heroicons-globe-asia-australia"
                    color="primary"
                    variant="ghost"
                    size="xs"
                    :disabled="!canEditExternalEtymons"
                    :title="!canEditExternalEtymons ? '只有審核員及以上可編輯' : (String(row.group.headwordNormalized || '').startsWith('__unassigned__:') ? '編輯域外方音（將自動創建詞語組）' : '編輯域外方音')"
                    @click="openExternalEtymonsForGroup(String(row.group.headwordNormalized || ''), String(row.group.headwordDisplay || ''), row.group.entries)"
                  />
                  <UButton
                    v-if="viewMode === 'lexeme' && canEditExternalEtymons && !String(row.group.headwordNormalized || '').startsWith('__unassigned__:')"
                    icon="i-heroicons-arrow-path"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    title="合併到其他詞語組"
                    @click="openMergeModalForGroup(String(row.group.headwordNormalized || ''), String(row.group.headwordDisplay || ''), row.group.entries.map(e => String(e.id || (e as any)._tempId || '')).filter(Boolean))"
                  />
                  <UButton
                    :icon="expandedGroupKeys.has(row.group.headwordNormalized) ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    :aria-label="expandedGroupKeys.has(row.group.headwordNormalized) ? '收合' : '展開'"
                    @click="toggleGroupExpanded(row.group.headwordNormalized)"
                  />
                </div>
              </td>
            </tr>
            <!-- 平鋪詞條行 或 聚合視圖下展開的詞條行 -->
            <tr
              v-else
              class="group hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
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
                    @click.stop="toggleSelectEntry(row.entry, $event)"
                  />
                  <span class="text-gray-400">{{ row.groupIndex >= 0 ? `${(pagination.page - 1) * pagination.perPage + row.groupIndex + 1}-${(row.entryIndexInGroup ?? 0) + 1}` : (pagination.page - 1) * pagination.perPage + rowIndex + 1 }}</span>
                </div>
              </td>
              <EntriesEditableCell
                v-for="(col, colIndex) in editableColumns"
                :key="`${row.entry.id ?? (row.entry as any)._tempId}-${col.key}`"
                :col="col"
                :can-edit="canEditEntry(row.entry)"
                :is-editing="isEditing(row.entry.id ?? (row.entry as any)._tempId, col.key)"
                v-model:edit-value="editValue"
                :display-text="getCellDisplay(row.entry, col)"
                :cell-class="getCellClass(row.entry, col.key).join(' ')"
                :wrap="useWrapForField(col.key)"
                :is-selected="isSelected(rowIndex, colIndex)"
                :column-options="getColumnOptions(col)"
                :review-notes="col.key === 'status' && row.entry.status === 'rejected' ? row.entry.reviewNotes : undefined"
                :show-ai-definition="col.key === 'definition' && !!row.entry.headword?.display && !row.entry.senses?.[0]?.definition"
                :show-ai-theme="col.key === 'theme' && !!row.entry.headword?.display && !row.entry.theme?.level3Id"
                :ai-loading-definition="(aiLoadingFor?.entryKey === getEntryKey(row.entry) && aiLoadingFor?.action === 'definition') || (!!aiLoadingInlineFor && aiLoadingInlineFor.field === 'definition' && String(row.entry.id ?? (row.entry as any)._tempId ?? '') === aiLoadingInlineFor.entryId)"
                :ai-loading-theme="(aiLoadingFor?.entryKey === getEntryKey(row.entry) && aiLoadingFor?.action === 'theme') || (!!aiLoadingInlineFor && String(row.entry.id ?? (row.entry as any)._tempId ?? '') === aiLoadingInlineFor.entryId)"
                :show-expand="col.key === 'definition'"
                :is-expanded="expandedEntryId === String(row.entry.id ?? (row.entry as any)._tempId ?? '')"
                :expand-hint="col.key === 'definition' ? getDefinitionExpandHint(row.entry) : undefined"
                :headword-expand-hint="col.key === 'headword' ? getHeadwordExpandHint(row.entry) : undefined"
                :phonetic-hint="col.key === 'phonetic' ? getPhoneticHint(row.entry) : undefined"
                :theme-id="col.key === 'theme' ? row.entry.theme?.level3Id : undefined"
                :is-theme-expanded="expandedThemeEntryId === String(row.entry.id ?? (row.entry as any)._tempId ?? '')"
                @click="handleCellClick(row.entry, col.key, $event, rowIndex, colIndex)"
                @set-ref="(el: any) => setInputRef(el, String(row.entry.id ?? (row.entry as any)._tempId ?? ''), col.key)"
                @keydown="handleKeydown($event, row.entry, col.key)"
                @blur="handleBlur(row.entry, col.key)"
                @ai-definition="generateAIDefinition(row.entry)"
                @ai-theme="generateAICategorization(row.entry)"
                @expand-click="toggleSensesExpand(row.entry)"
                @theme-expand-click="toggleThemeExpand(row.entry)"
                @accept-theme-ai="acceptThemeAI(row.entry)"
                @dismiss-theme-ai="dismissThemeAI(row.entry)"
              />
              <EntryRowActions
                :entry="row.entry"
                :can-edit="canEditEntry(row.entry)"
                :show-lexeme-actions="viewMode === 'lexeme' && canEditExternalEtymons"
                :is-morpheme-refs-expanded="expandedMorphemeRefsEntryId === String(row.entry.id ?? (row.entry as any)._tempId ?? '')"
                @save="(row.entry as any)._isNew ? saveNewEntry(row.entry) : saveEntryChanges(row.entry)"
                @duplicate="duplicateEntry(row.entry)"
                @delete="deleteEntry(row.entry)"
                @cancel="cancelEdit(row.entry)"
                @make-new-lexeme="makeEntryNewLexeme(row.entry)"
                @join-lexeme="openMergeModalForEntry(row.entry)"
                @toggle-morpheme-refs="toggleMorphemeRefsExpand(row.entry)"
              />
            </tr>
            <!-- 行內 AI 釋義建議（Tab 落在釋義格且有待處理建議時顯示） -->
            <AISuggestionRow
              v-if="row.type === 'entry' && aiSuggestion && aiSuggestionForField && editingCell && editingCell.field === aiSuggestionForField && String(row.entry.id ?? (row.entry as any)._tempId) === String(editingCell.entryId)"
              :text="aiSuggestion"
              :title="aiSuggestionForField === 'theme' ? 'AI 分類建議' : 'AI 釋義建議'"
              :colspan="editableColumns.length + 2"
              @accept="acceptAISuggestion"
              @dismiss="dismissAISuggestion"
            />
            <!-- 行內 AI 分類建議 -->
            <AISuggestionRow
              v-if="row.type === 'entry' && focusedCell?.rowIndex === rowIndex && focusedCell?.colIndex === themeColIndex && themeAISuggestions.get(String(row.entry.id ?? (row.entry as any)._tempId ?? ''))"
              :text="formatThemeSuggestion(themeAISuggestions.get(String(row.entry.id ?? (row.entry as any)._tempId ?? '')))"
              title="AI 分類建議"
              :colspan="editableColumns.length + 2"
              @accept="acceptThemeAI(row.entry)"
              @dismiss="dismissThemeAI(row.entry)"
            />
            <!-- 泛粵典粵拼建議 -->
            <JyutdictSuggestionRow
              v-if="row.type === 'entry' && focusedCell?.rowIndex === rowIndex && focusedCell?.colIndex === phoneticColIndex && getJyutdictVisible(String(row.entry.id ?? (row.entry as any)._tempId ?? ''))"
              :colspan="editableColumns.length + 2"
              :char-data="getJyutdictData(String(row.entry.id ?? (row.entry as any)._tempId ?? ''))"
              :dialect-name="getDialectLabel(row.entry.dialect?.name || '') || row.entry.dialect?.name || ''"
              :suggested-pronunciation="getJyutdictSuggested(String(row.entry.id ?? (row.entry as any)._tempId ?? ''))"
              :is-loading="getJyutdictLoading(String(row.entry.id ?? (row.entry as any)._tempId ?? ''))"
              @accept="(pronunciation: string) => acceptJyutdict(row.entry, pronunciation)"
              @dismiss="dismissJyutdict(row.entry)"
            />
            <!-- 詞頭重複檢測 -->
            <DuplicateCheckRow
              v-if="row.type === 'entry' && focusedCell?.rowIndex === rowIndex && (getDuplicateCheckLoading(String(row.entry.id ?? (row.entry as any)._tempId ?? '')) || getDuplicateCheckEntriesFormatted(String(row.entry.id ?? (row.entry as any)._tempId ?? '')).length > 0)"
              :colspan="editableColumns.length + 2"
              :entries="getDuplicateCheckEntriesFormatted(String(row.entry.id ?? (row.entry as any)._tempId ?? ''))"
              :is-loading="getDuplicateCheckLoading(String(row.entry.id ?? (row.entry as any)._tempId ?? ''))"
              @dismiss="dismissDuplicateCheck(row.entry)"
            />
            <!-- 其他方言點已有該詞條（若已觸發同方言詞頭重複檢測則不再顯示，避免重複提示） -->
            <OtherDialectsRefRow
              v-if="
                row.type === 'entry' &&
                focusedCell?.rowIndex === rowIndex &&
                getOtherDialectsFormatted(String(row.entry.id ?? (row.entry as any)._tempId ?? '')).length > 0 &&
                getDuplicateCheckEntriesFormatted(String(row.entry.id ?? (row.entry as any)._tempId ?? '')).length === 0
              "
              :colspan="editableColumns.length + 2"
              :entries="getOtherDialectsFormatted(String(row.entry.id ?? (row.entry as any)._tempId ?? ''))"
              @dismiss="dismissDuplicateCheck(row.entry)"
              @apply-template="applyOtherDialectTemplate(row.entry, $event)"
            />
            <!-- Jyutjyu 參考（新建詞條：填寫詞頭後自動查詢） -->
            <JyutjyuRefRow
              v-if="
                row.type === 'entry' &&
                focusedCell?.rowIndex === rowIndex &&
                getJyutjyuRowVisible(String(row.entry.id ?? (row.entry as any)._tempId ?? ''))
              "
              :colspan="editableColumns.length + 2"
              :query="getJyutjyuQuery(String(row.entry.id ?? (row.entry as any)._tempId ?? ''))"
              :results="formatJyutjyuResults(jyutjyuRefResult.get(String(row.entry.id ?? (row.entry as any)._tempId ?? ''))?.results || [])"
              :raw-results="jyutjyuRefResult.get(String(row.entry.id ?? (row.entry as any)._tempId ?? ''))?.results || []"
              :total="getJyutjyuTotal(String(row.entry.id ?? (row.entry as any)._tempId ?? ''))"
              :is-loading="getJyutjyuLoading(String(row.entry.id ?? (row.entry as any)._tempId ?? ''))"
              :error-message="getJyutjyuError(String(row.entry.id ?? (row.entry as any)._tempId ?? ''))"
              @dismiss="dismissJyutjyuRef(row.entry)"
              @apply-template="applyJyutjyuTemplate(row.entry, $event)"
            />
            <!-- 行內釋義建議錯誤 + 重試 -->
            <tr
              v-if="row.type === 'entry' && aiInlineError && String(row.entry.id ?? (row.entry as any)._tempId) === aiInlineError.entryId && aiInlineError.field === 'definition'"
              class="bg-red-50/80 dark:bg-red-900/20 border-b border-gray-200 dark:border-gray-700"
              role="alert"
            >
              <td :colspan="editableColumns.length + 2" class="px-3 py-2 align-top">
                <div class="flex items-center justify-between gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-gray-800 p-2 text-sm">
                  <span class="text-red-700 dark:text-red-300">{{ aiInlineError.message }}</span>
                  <div class="flex gap-2 flex-shrink-0">
                    <UButton size="xs" color="neutral" variant="ghost" @click="aiInlineError = null">
                      關閉
                    </UButton>
                    <UButton size="xs" color="primary" @click="retryInlineAISuggestion(row.entry)">
                      重試
                    </UButton>
                  </div>
                </div>
              </td>
            </tr>
            <!-- 釋義詳情展開區 -->
            <tr
              v-if="row.type === 'entry' && expandedEntryId === String(row.entry.id ?? (row.entry as any)._tempId ?? '')"
              class="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700"
            >
              <td :colspan="editableColumns.length + 2" class="p-0 align-top">
                <EntrySensesExpand
                  :entry="row.entry"
                  :ai-suggestion="definitionAISuggestions.get(String(row.entry.id ?? (row.entry as any)._tempId ?? ''))"
                  :ai-loading="aiLoadingFor?.entryKey === getEntryKey(row.entry) && aiLoadingFor?.action === 'definition'"
                  :ai-loading-examples="aiLoadingFor?.entryKey === getEntryKey(row.entry) && aiLoadingFor?.action === 'examples'"
                  @close="toggleSensesExpand(row.entry)"
                  @ai-definition="generateAIDefinition(row.entry)"
                  @accept-definition-ai="acceptDefinitionAI(row.entry)"
                  @dismiss-definition-ai="dismissDefinitionAI(row.entry)"
                  @ai-examples="generateAIExamples(row.entry)"
                  @add-sense="addSense(row.entry)"
                  @remove-sense="(senseIdx: number) => removeSense(row.entry, senseIdx)"
                  @add-example="(senseIdx: number) => addExample(row.entry, senseIdx)"
                  @remove-example="(p: { senseIdx: number; exIdx: number }) => removeExample(row.entry, p.senseIdx, p.exIdx)"
                  @add-sub-sense="(senseIdx: number) => addSubSense(row.entry, senseIdx)"
                  @remove-sub-sense="(p: { senseIdx: number; subIdx: number }) => removeSubSense(row.entry, p.senseIdx, p.subIdx)"
                  @add-sub-sense-example="(p: { senseIdx: number; subIdx: number }) => addSubSenseExample(row.entry, p.senseIdx, p.subIdx)"
                  @remove-sub-sense-example="(p: { senseIdx: number; subIdx: number; exIdx: number }) => removeSubSenseExample(row.entry, p.senseIdx, p.subIdx, p.exIdx)"
                />
              </td>
            </tr>
            <!-- 詞素引用展開區 -->
            <tr
              v-if="row.type === 'entry' && expandedMorphemeRefsEntryId === String(row.entry.id ?? (row.entry as any)._tempId ?? '')"
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
                      @click="toggleMorphemeRefsExpand(row.entry)"
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
                            @click="removeMorphemeRef(row.entry, refIdx)"
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
                        @click="openMorphemeSearch(row.entry)"
                      >
                        從數據庫選擇詞素
                      </UButton>
                      <UButton
                        color="neutral"
                        variant="soft"
                        size="sm"
                        icon="i-heroicons-pencil-square"
                        @click="openUnlinkedMorphemeForm(row.entry)"
                      >
                        添加未連結詞素
                      </UButton>
                    </div>
                    <!-- 未連結詞素：自動依詞頭與粵拼帶入，確認或改備註後添加 -->
                    <div
                      v-if="unlinkedMorphemeEntryId === String(row.entry.id ?? (row.entry as any)._tempId ?? '')"
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
                          <UButton size="sm" color="primary" @click="confirmUnlinkedMorphemeRefs(row.entry)">
                            確認添加
                          </UButton>
                          <UButton size="sm" color="neutral" variant="ghost" @click="closeUnlinkedMorphemeForm">
                            取消
                          </UButton>
                        </div>
                      </template>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
            <!-- 詞頭詳情展開區 -->
            <!-- 詞頭詳情展開區（已由詞頭欄位直接展示「主詞形 [異形]」格式取代，暫不再使用） -->
            <!-- 主題分類展開區 -->
            <tr
              v-if="row.type === 'entry' && expandedThemeEntryId === String(row.entry.id ?? (row.entry as any)._tempId ?? '')"
              class="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700"
            >
              <td :colspan="editableColumns.length + 2" class="p-0 align-top">
                <EntryThemeExpand
                  :entry="row.entry"
                  :ai-suggestion="themeAISuggestions.get(String(row.entry.id ?? (row.entry as any)._tempId ?? ''))"
                  :ai-loading="aiLoadingFor?.entryKey === getEntryKey(row.entry) && aiLoadingFor?.action === 'theme'"
                  @close="toggleThemeExpand(row.entry)"
                  @update:theme="onThemeUpdate(row.entry, $event)"
                  @dismiss-ai="dismissThemeAI(row.entry)"
                  @accept-ai="acceptThemeAI(row.entry)"
                  @ai-categorize="generateAICategorization(row.entry)"
                />
              </td>
            </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="flex-shrink-0 px-4 py-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ (pagination.page - 1) * pagination.perPage + 1 }}-{{ Math.min(pagination.page * pagination.perPage, pagination.total) }} / {{ pagination.total }}
        </div>
        <UPagination
          v-model:page="currentPage"
          :total="pagination.total"
          :items-per-page="pagination.perPage"
          size="sm"
        />
      </div>
    </div>
    </div>
  </div>

  <LexemeExternalEtymonsModal
    :open="externalEtymonModalOpen"
    :lexeme-id="activeExternalEtymonLexemeId"
    :lexeme-label="activeExternalEtymonLexemeLabel"
    :can-edit="canEditExternalEtymons"
    @update:open="(v: boolean) => { externalEtymonModalOpen = v }"
  />

  <LexemeMergeModal
    :open="lexemeMergeModalOpen"
    :source-lexeme-id="mergeSourceLexemeId"
    :source-label="mergeSourceLabel"
    :is-group-merge="mergeIsGroupMerge"
    @update:open="(v: boolean) => { lexemeMergeModalOpen = v }"
    @merged="handleLexemeMerge"
  />

  <!-- 詞素引用搜索 Modal -->
  <UModal :open="morphemeSearchModalOpen" @update:open="(v: boolean) => { morphemeSearchModalOpen = v }">
    <template #content>
      <UCard class="w-full max-w-2xl">
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">搜索詞素／單音節詞</h3>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-heroicons-x-mark"
              @click="morphemeSearchModalOpen = false"
            />
          </div>
        </template>

        <div class="space-y-4">
          <div v-if="morphemeSearchTargetEntry" class="text-sm text-gray-600 dark:text-gray-400 p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <p class="font-medium">當前詞條：{{ morphemeSearchTargetEntry.headword?.display || morphemeSearchTargetEntry.text || '—' }}</p>
            <p v-if="morphemeSearchTargetEntry.dialect?.name" class="text-xs mt-1">方言：{{ getDialectLabel(morphemeSearchTargetEntry.dialect.name) || morphemeSearchTargetEntry.dialect.name }}</p>
          </div>

          <div v-if="morphemeSearchLoading" class="flex items-center justify-center py-8">
            <div class="w-8 h-8 border-2 border-gray-200 dark:border-gray-700 border-t-primary rounded-full animate-spin" />
            <span class="ml-3 text-sm text-gray-500 dark:text-gray-400">搜索中...</span>
          </div>

          <div v-else-if="morphemeSearchResults.length === 0" class="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
            暫無匹配的詞素
          </div>

          <div v-else class="space-y-2 max-h-[400px] overflow-y-auto">
            <div
              v-for="item in morphemeSearchResults"
              :key="item.id"
              class="flex items-start justify-between gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer transition-colors"
              @click="addMorphemeRef(item.id, { headword: item.headword, jyutping: item.jyutping })"
            >
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-sm font-medium text-gray-900 dark:text-white">{{ item.headword || '—' }}</span>
                  <span v-if="item.jyutping" class="text-xs text-gray-500 dark:text-gray-400">{{ item.jyutping }}</span>
                  <UBadge size="xs" variant="soft" color="neutral">{{ getDialectLabel(item.dialect) || item.dialect }}</UBadge>
                </div>
                <p v-if="item.definition" class="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{{ item.definition }}</p>
              </div>
              <UButton
                color="primary"
                variant="soft"
                size="xs"
                icon="i-heroicons-plus"
              >
                添加
              </UButton>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex items-center justify-end w-full">
            <UButton color="neutral" variant="soft" size="sm" @click="morphemeSearchModalOpen = false">
              關閉
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { useAuth } from '~/composables/useAuth'
import { getThemeById, getThemeNameById, getFlatThemeList } from '~/composables/useThemeData'
import { dialectOptionsWithAll, DIALECT_OPTIONS_FOR_SELECT, DIALECT_CODE_TO_NAME, getDialectLabel, getDialectLabelByRegionCode } from '~/utils/dialects'
import type { DialectId } from '~shared/dialects'
import { queryJyutdict, getSuggestedPronunciation } from '~/composables/useJyutdict'
import { saveEntriesToLocalStorage, restoreEntriesFromLocalStorage, clearEntriesLocalStorage, removeEntryFromLocalStorage } from '~/composables/useEntriesLocalStorage'
import type { Entry, Register } from '~/types'
import type { CharPronunciationData } from '~/types/jyutdict'
import AISuggestionRow from '~/components/entries/AISuggestionRow.vue'
import JyutdictSuggestionRow from '~/components/entries/JyutdictSuggestionRow.vue'
import EntrySensesExpand from '~/components/entries/EntrySensesExpand.vue'
import EntryThemeExpand from '~/components/entries/EntryThemeExpand.vue'
import EntryRowActions from '~/components/entries/EntryRowActions.vue'
import EntriesEditableCell from '~/components/entries/EntriesEditableCell.vue'
import DuplicateCheckRow from '~/components/entries/DuplicateCheckRow.vue'
import OtherDialectsRefRow from '~/components/entries/OtherDialectsRefRow.vue'
import JyutjyuRefRow, { type JyutjyuRefItem } from '~/components/entries/JyutjyuRefRow.vue'
import LexemeExternalEtymonsModal from '~/components/entries/LexemeExternalEtymonsModal.vue'
import LexemeMergeModal from '~/components/entries/LexemeMergeModal.vue'

definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

const { isAuthenticated, user } = useAuth()

const canEditExternalEtymons = computed(() => {
  const r = user.value?.role
  return r === 'reviewer' || r === 'admin'
})

const externalEtymonModalOpen = ref(false)
const activeExternalEtymonLexemeId = ref<string | null>(null)
const activeExternalEtymonLexemeLabel = ref<string>('')

async function openExternalEtymonsForGroup(groupKey: string, groupLabel: string, groupEntries?: Entry[]) {
  if (!groupKey) return
  
  // 如果是未綁定組（__unassigned__:*），先為該組的所有 entry 創建 lexemeId
  if (groupKey.startsWith('__unassigned__:')) {
    if (!groupEntries || groupEntries.length === 0) {
      alert('無法為空組創建詞語')
      return
    }
    if (!confirm(`此組尚未綁定詞語。是否為 ${groupEntries.length} 條詞條創建新詞語組？`)) {
      return
    }
    try {
      // 為該組的第一個 entry 創建新的 lexemeId（已確保 groupEntries.length > 0）
      const firstEntry = groupEntries[0]!
      const entryId = String(firstEntry.id ?? (firstEntry as any)._tempId ?? '')
      if (!entryId) {
        alert('無法獲取詞條 ID')
        return
      }
      const response = await $fetch<{ success: boolean; data?: { lexemeId?: string } }>(`/api/entries/${entryId}/lexeme`, {
        method: 'PATCH',
        body: { action: 'new' }
      })
      const newLexemeId = response.data?.lexemeId
      if (!newLexemeId) {
        alert('創建詞語組失敗')
        return
      }
      
      // 將該組的其他 entry 也加入同一個 lexemeId
      if (groupEntries.length > 1) {
        await Promise.all(
          groupEntries.slice(1).map((entry) => {
            const id = String(entry.id ?? (entry as any)._tempId ?? '')
            if (!id) return Promise.resolve()
            return $fetch(`/api/entries/${id}/lexeme`, {
              method: 'PATCH',
              body: { action: 'set', lexemeId: newLexemeId }
            })
          })
        )
      }
      
      // 重新拉取列表以更新 lexemeId
      await fetchEntries()
      
      // 使用新創建的 lexemeId 打開 modal
      activeExternalEtymonLexemeId.value = newLexemeId
      activeExternalEtymonLexemeLabel.value = groupLabel || ''
      externalEtymonModalOpen.value = true
    } catch (e: any) {
      console.error('Failed to create lexeme for unassigned group:', e)
      alert(e?.data?.message || e?.message || '創建詞語組失敗')
    }
    return
  }
  
  // 正常情況：直接打開 modal
  activeExternalEtymonLexemeId.value = groupKey
  activeExternalEtymonLexemeLabel.value = groupLabel || ''
  externalEtymonModalOpen.value = true
}

const lexemeMergeModalOpen = ref(false)
const mergeSourceLexemeId = ref<string | null>(null)
const mergeSourceLabel = ref<string>('')
const mergeIsGroupMerge = ref(false)
const mergeTargetEntryIds = ref<string[]>([])

function openMergeModalForGroup(groupKey: string, groupLabel: string, entryIds: string[]) {
  if (!groupKey || groupKey.startsWith('__unassigned__:')) return
  mergeSourceLexemeId.value = groupKey
  mergeSourceLabel.value = groupLabel || ''
  mergeIsGroupMerge.value = true
  mergeTargetEntryIds.value = entryIds
  lexemeMergeModalOpen.value = true
}

function openMergeModalForEntry(entry: Entry) {
  const currentLexemeId = (entry as any).lexemeId
  // 即使沒有 lexemeId 或係 __unassigned__，都允許加入其他組（會用 action: 'set' 直接設定目標 lexemeId）
  mergeSourceLexemeId.value = currentLexemeId && !String(currentLexemeId).startsWith('__unassigned__:') ? currentLexemeId : null
  mergeSourceLabel.value = entry.headword?.display || entry.text || ''
  mergeIsGroupMerge.value = false
  mergeTargetEntryIds.value = [String(entry.id || (entry as any)._tempId || '')]
  lexemeMergeModalOpen.value = true
}

async function handleLexemeMerge(targetLexemeId: string) {
  if (!mergeTargetEntryIds.value.length || !targetLexemeId) return
  try {
    await Promise.all(
      mergeTargetEntryIds.value.map((entryId) =>
        $fetch(`/api/entries/${entryId}/lexeme`, {
          method: 'PATCH',
          body: { action: 'set', lexemeId: targetLexemeId }
        })
      )
    )
    lexemeMergeModalOpen.value = false
    fetchEntries()
  } catch (e: any) {
    console.error('Failed to merge lexeme:', e)
    alert(e?.data?.message || e?.message || '合併失敗')
  }
}

async function makeEntryNewLexeme(entry: Entry) {
  const id = String(entry.id ?? (entry as any)._tempId ?? '')
  if (!id) return
  if (!confirm(`確定要將「${entry.headword?.display || entry.text || id}」拆出成獨立詞語？`)) {
    return
  }
  try {
    await $fetch<{ success: boolean; data?: { lexemeId?: string } }>(`/api/entries/${id}/lexeme`, {
      method: 'PATCH',
      body: { action: 'new' }
    })
    // 操作後重新拉取列表，以反映最新詞語聚合狀態
    fetchEntries()
  } catch (e: any) {
    console.error('Failed to make new lexeme:', e)
    alert(e?.data?.message || e?.message || '操作失敗')
  }
}

// 主題選項列表（用於搜尋下拉）
const themeOptions = getFlatThemeList().map(t => ({
  value: t.id,
  label: `${t.level3Name} (${t.level1Name} > ${t.level2Name})`
}))

// Sentinel for "all" – ComboboxItem does not allow value to be empty string
const ALL_FILTER_VALUE = '__all__'

// Local filters managed by this page (right sidebar filters)
const filters = reactive({ region: ALL_FILTER_VALUE, status: ALL_FILTER_VALUE, theme: ALL_FILTER_VALUE })

// Normalize empty string to sentinel so USelectMenu/ComboboxItem never receives value=""
const filterRegion = computed({
  get: () => filters.region || ALL_FILTER_VALUE,
  set: (v) => { filters.region = (v === '' || v == null) ? ALL_FILTER_VALUE : v }
})
const filterStatus = computed({
  get: () => filters.status || ALL_FILTER_VALUE,
  set: (v) => { filters.status = (v === '' || v == null) ? ALL_FILTER_VALUE : v }
})
const filterTheme = computed({
  get: () => filters.theme ?? ALL_FILTER_VALUE,
  set: (v) => { filters.theme = (v === '' || v == null || v === ALL_FILTER_VALUE) ? ALL_FILTER_VALUE : v }
})

// 頂部篩選用：全部分類 + 扁平化主題列表（與表格分類列同款，單一可搜尋下拉不佔三欄）
const themeFilterOptions = [
  { value: ALL_FILTER_VALUE, label: '全部分類' },
  ...themeOptions
]

// State
const entries = ref<Entry[]>([])
/** 聚合視圖：按詞形分組的列表（每項含 headwordDisplay, headwordNormalized, entries） */
const aggregatedGroups = ref<Array<{ headwordDisplay: string; headwordNormalized: string; entries: Entry[] }>>([])
/** 詞語聚合視圖：按 lexemeId 分組的列表（字段名沿用聚合視圖以減少模板改動） */
const lexemeGroups = ref<Array<{ headwordDisplay: string; headwordNormalized: string; entries: Entry[] }>>([])
/** 詞條 baseline（用於「取消編輯」回滾，避免刷新整個頁面誤傷其他未保存內容）。key: entry.id */
const entryBaselineById = ref<Map<string, any>>(new Map())
/** 視圖模式：平鋪（一列一條）或聚合（一列一詞形，可展開多方言） */
const viewMode = ref<'flat' | 'aggregated' | 'lexeme'>('flat')
/** 聚合視圖下已展開的詞形（headwordNormalized），用 Set 便於切換 */
const expandedGroupKeys = ref<Set<string>>(new Set())
const loading = ref(false)
const saving = ref(false)
const searchQuery = ref('')
const currentPage = ref(1)
const sortBy = ref('createdAt')
const sortOrder = ref<'asc' | 'desc'>('desc')
/** API 僅支援以下欄位排序 */
const SORTABLE_COLUMN_KEYS = ['createdAt', 'updatedAt', 'viewCount', 'likeCount', 'headword'] as const

// Inline editing state
const editingCell = ref<{ entryId: string; field: string } | null>(null)
const editValue = ref<any>('')
const inputRefs = ref<Map<string, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>>(new Map())
const aiSuggestion = ref<string | null>(null)
/** 當前建議對應的列（如 definition / theme），僅在該列編輯時顯示建議 */
const aiSuggestionForField = ref<string | null>(null)
/** 用戶未採納/忽略就離開單元格時暫存建議，再點回該列時恢復顯示。key: `${entryId}-${field}` */
const pendingAISuggestions = ref<Map<string, { entryId: string, field: string, text: string }>>(new Map())
const aiDebounceTimer = ref<NodeJS.Timeout | null>(null)

// 唯一焦點格：未編輯時表示「選中格」（方向鍵/Enter/Tab 目標），編輯時即正在編輯的格
const focusedCell = ref<{ rowIndex: number; colIndex: number } | null>(null)
const tableWrapperRef = ref<HTMLElement | null>(null)

// 方案 B：行展開編輯釋義詳情（多義項、例句、分義項）。值為當前展開的 entry id
const expandedEntryId = ref<string | null>(null)

// 詞素引用展開狀態
const expandedMorphemeRefsEntryId = ref<string | null>(null)

// 主題展開狀態
const expandedThemeEntryId = ref<string | null>(null)

// 主題 AI 建議緩存（key: entryKey, value: AI 建議結果）
const themeAISuggestions = ref<Map<string, {
  level1Name: string
  level2Name: string
  level3Name: string
  level1Id: number
  level2Id: number
  level3Id: number
  confidence?: number
  explanation?: string
}>>(new Map())

/** 釋義詳情展開區的 AI 釋義建議（key: entryKey，先展示給用戶，採納後才寫入） */
const definitionAISuggestions = ref<Map<string, {
  definition: string
  usageNotes?: string
  formalityLevel?: string
}>>(new Map())

/** 行內釋義建議 loading：正在為該 entry 拉取建議時顯示 */
const aiLoadingInlineFor = ref<{ entryId: string, field: string } | null>(null)
/** 行內釋義建議錯誤（可重試） */
const aiInlineError = ref<{ entryId: string, field: string, message: string } | null>(null)

// 粵拼建議相關狀態（採納或忽略後不再顯示，與分類/釋義 AI 一致）
const jyutdictData = ref<Map<string, CharPronunciationData[]>>(new Map())
const jyutdictLoading = ref<Map<string, boolean>>(new Map())
const jyutdictSuggested = ref<Map<string, string>>(new Map())
const jyutdictVisible = ref<Map<string, boolean>>(new Map())
/** 已採納或忽略粵拼建議的 entryId，不再重複顯示 */
const jyutdictHandled = ref<Set<string>>(new Set())

/** 其他方言詞條（API 會帶 senses、theme、meta 供預覽） */
type OtherDialectEntryRaw = {
  id: string
  headword?: { display?: string }
  dialect?: { name?: string }
  status?: string
  createdAt?: string
  senses?: Array<{ definition?: string }>
  theme?: { level1?: string; level2?: string; level3?: string }
  meta?: { pos?: string; register?: string }
}

/** 詞頭重複檢測結果（新建詞條離開詞頭格時觸發）。sameDialect=同詞頭+同方言，otherDialects=同詞頭+其他方言可參考。API 兩者均帶 senses/theme/meta 供預覽。 */
const duplicateCheckResult = ref<Map<string, {
  loading: boolean
  entries?: OtherDialectEntryRaw[]
  otherDialects?: OtherDialectEntryRaw[]
}>>(new Map())

/** Jyutjyu 參考結果（新建詞條離開詞頭格時觸發）。 */
const jyutjyuRefResult = ref<Map<string, {
  loading: boolean
  q: string
  total: number | null
  results: any[]
  errorMessage: string
}>>(new Map())

/** Jyutjyu：是否顯示提示（按 entryId 記） */
const jyutjyuRefVisible = ref<Map<string, boolean>>(new Map())

/** Jyutjyu：已忽略的查詢（按 entryId + q 記，避免同一詞頭反覆彈出；詞頭變更則會重新顯示） */
const jyutjyuRefHandled = ref<Set<string>>(new Set())

// 獲取粵拼建議相關數據
function getJyutdictData(entryId: string): CharPronunciationData[] {
  return jyutdictData.value.get(entryId) || []
}

function getJyutdictLoading(entryId: string): boolean {
  return jyutdictLoading.value.get(entryId) || false
}

function getJyutdictSuggested(entryId: string): string {
  return jyutdictSuggested.value.get(entryId) || ''
}

function getJyutdictVisible(entryId: string): boolean {
  if (jyutdictHandled.value.has(entryId)) return false
  return jyutdictVisible.value.get(entryId) || false
}

function getJyutjyuHandledKey(entryId: string, q: string): string {
  return `${entryId}::${q}`
}

function getJyutjyuRowVisible(entryId: string): boolean {
  return jyutjyuRefVisible.value.get(entryId) || false
}

function getJyutjyuVisible(entryId: string): boolean {
  const state = jyutjyuRefResult.value.get(entryId)
  const q = state?.q || ''
  if (!q) return false
  if (jyutjyuRefHandled.value.has(getJyutjyuHandledKey(entryId, q))) return false
  return jyutjyuRefVisible.value.get(entryId) || false
}

function getJyutjyuLoading(entryId: string): boolean {
  return jyutjyuRefResult.value.get(entryId)?.loading || false
}

function getJyutjyuError(entryId: string): string {
  return jyutjyuRefResult.value.get(entryId)?.errorMessage || ''
}

function getJyutjyuTotal(entryId: string): number | null {
  return jyutjyuRefResult.value.get(entryId)?.total ?? null
}

function getJyutjyuQuery(entryId: string): string {
  return jyutjyuRefResult.value.get(entryId)?.q || ''
}

function formatJyutjyuResults(list: any[]): JyutjyuRefItem[] {
  if (!Array.isArray(list) || list.length === 0) return []
  return list.map((r: any) => ({
    id: String(r.id || ''),
    headwordDisplay: r?.headword?.display || '-',
    jyutping: r?.phonetic?.jyutping?.[0] || '',
    dialectLabel: getDialectLabelByRegionCode(r?.dialect?.region_code || ''),
    sourceBook: r?.source_book || '',
    definitionSummary: r?.senses?.[0]?.definition || ''
  }))
}

async function runJyutjyuRef(entry: Entry) {
  const entryId = String(entry.id ?? (entry as any)._tempId ?? '')
  const q = entry.headword?.display?.trim() || ''
  if (!entryId || !q) return

  const handledKey = getJyutjyuHandledKey(entryId, q)
  if (jyutjyuRefHandled.value.has(handledKey)) return

  // 若同一詞頭已查詢過（且不在 loading），則僅恢復顯示即可，避免重複請求
  const existing = jyutjyuRefResult.value.get(entryId)
  if (existing && existing.q === q && existing.loading === false && (existing.total !== null || existing.results.length > 0 || existing.errorMessage)) {
    jyutjyuRefVisible.value.set(entryId, true)
    jyutjyuRefVisible.value = new Map(jyutjyuRefVisible.value)
    return
  }

  jyutjyuRefResult.value.set(entryId, {
    loading: true,
    q,
    total: null,
    results: [],
    errorMessage: ''
  })
  jyutjyuRefResult.value = new Map(jyutjyuRefResult.value)
  jyutjyuRefVisible.value.set(entryId, true)
  jyutjyuRefVisible.value = new Map(jyutjyuRefVisible.value)

  try {
    const res = await $fetch<any>('/api/jyutjyu/search', { query: { q } })
    jyutjyuRefResult.value.set(entryId, {
      loading: false,
      q,
      total: typeof res?.total === 'number' ? res.total : (Array.isArray(res?.results) ? res.results.length : 0),
      results: Array.isArray(res?.results) ? res.results : [],
      errorMessage: ''
    })
  } catch (e) {
    jyutjyuRefResult.value.set(entryId, {
      loading: false,
      q,
      total: null,
      results: [],
      errorMessage: '查詢 Jyutjyu 時出現問題，請稍後再試。'
    })
  }
  jyutjyuRefResult.value = new Map(jyutjyuRefResult.value)
}

// 查詢泛粵典（方言用香港繁體顯示名，如「廣州」，以便推理與 API 匹配）
async function queryJyutdictForEntry(entry: Entry) {
  const entryId = String(entry.id ?? (entry as any)._tempId ?? '')
  const headword = entry.headword?.display || entry.text || ''
  const dialectId = entry.dialect?.name || ''
  const dialectLabel = getDialectLabel(dialectId) || dialectId

  if (!headword || !dialectLabel) return

  jyutdictLoading.value.set(entryId, true)
  jyutdictVisible.value.set(entryId, true)

  try {
    const data = await queryJyutdict(headword, dialectLabel)
    jyutdictData.value.set(entryId, data)

    const suggested = getSuggestedPronunciation(data, dialectLabel)
    jyutdictSuggested.value.set(entryId, suggested)
  } catch (error) {
    console.error('Failed to query jyutdict:', error)
  } finally {
    jyutdictLoading.value.set(entryId, false)
  }
}

/** 新建詞條：離開詞頭格時檢測數據庫是否已有相同詞頭+方言，並將結果存入 duplicateCheckResult */
async function runDuplicateCheck(entry: Entry) {
  const entryId = String(entry.id ?? (entry as any)._tempId ?? '')
  const headword = entry.headword?.display?.trim() || ''
  const dialect = entry.dialect?.name || ''
  if (!headword || !dialect) return

  duplicateCheckResult.value.set(entryId, { loading: true })
  duplicateCheckResult.value = new Map(duplicateCheckResult.value)

  try {
    const res = await $fetch<{ sameDialect: OtherDialectEntryRaw[], otherDialects: OtherDialectEntryRaw[] }>('/api/entries/check-duplicate', {
      query: { headword, dialect }
    })
    duplicateCheckResult.value.set(entryId, {
      loading: false,
      entries: res.sameDialect || [],
      otherDialects: res.otherDialects || []
    })
  } catch (e) {
    duplicateCheckResult.value.set(entryId, { loading: false, entries: [], otherDialects: [] })
  }
  duplicateCheckResult.value = new Map(duplicateCheckResult.value)
}

const DEFINITION_SUMMARY_MAX_LEN = 50

/** 格式化同方言重複詞條，帶釋義摘要、主題分類、義項數、meta 簡要（與「其他方言點」預覽一致） */
function formatDuplicateEntries(list: OtherDialectEntryRaw[]): Array<{
  id: string
  headwordDisplay: string
  dialectLabel: string
  status: string
  statusLabel: string
  createdAtLabel: string
  definitionSummary: string
  themeLabel: string
  senseCount: number
  metaLabel: string
}> {
  if (!list?.length) return []
  return list.map(e => {
    const firstDef = e.senses?.[0]?.definition?.trim() || ''
    const definitionSummary = firstDef
      ? (firstDef.length <= DEFINITION_SUMMARY_MAX_LEN ? firstDef : firstDef.slice(0, DEFINITION_SUMMARY_MAX_LEN) + '…')
      : '（無釋義）'
    const themeParts = [e.theme?.level1, e.theme?.level2, e.theme?.level3].filter(Boolean) as string[]
    const themeLabel = themeParts.length ? themeParts.join(' → ') : '（未分類）'
    const senseCount = e.senses?.length ?? 0
    const metaParts = [e.meta?.pos, e.meta?.register].filter(Boolean) as string[]
    const metaLabel = metaParts.length ? metaParts.join(' · ') : ''
    return {
      id: e.id,
      headwordDisplay: e.headword?.display || '-',
      dialectLabel: DIALECT_CODE_TO_NAME[e.dialect?.name || ''] || e.dialect?.name || '-',
      status: e.status || 'draft',
      statusLabel: STATUS_LABELS[e.status || 'draft'] || e.status || '-',
      createdAtLabel: e.createdAt ? new Date(e.createdAt).toLocaleString('zh-HK', { dateStyle: 'short', timeStyle: 'short' }) : '-',
      definitionSummary,
      themeLabel,
      senseCount,
      metaLabel
    }
  })
}

/** 格式化「其他方言」詞條，帶釋義摘要、主題分類、義項數、meta 簡要 */
function formatOtherDialectsEntries(list: OtherDialectEntryRaw[]): Array<{
  id: string
  headwordDisplay: string
  dialectLabel: string
  status: string
  statusLabel: string
  createdAtLabel: string
  definitionSummary: string
  themeLabel: string
  senseCount: number
  metaLabel: string
}> {
  if (!list?.length) return []
  return list.map(e => {
    const firstDef = e.senses?.[0]?.definition?.trim() || ''
    const definitionSummary = firstDef
      ? (firstDef.length <= DEFINITION_SUMMARY_MAX_LEN ? firstDef : firstDef.slice(0, DEFINITION_SUMMARY_MAX_LEN) + '…')
      : '（無釋義）'
    const themeParts = [e.theme?.level1, e.theme?.level2, e.theme?.level3].filter(Boolean) as string[]
    const themeLabel = themeParts.length ? themeParts.join(' → ') : '（未分類）'
    const senseCount = e.senses?.length ?? 0
    const metaParts = [e.meta?.pos, e.meta?.register].filter(Boolean) as string[]
    const metaLabel = metaParts.length ? metaParts.join(' · ') : ''
    return {
      id: e.id,
      headwordDisplay: e.headword?.display || '-',
      dialectLabel: DIALECT_CODE_TO_NAME[e.dialect?.name || ''] || e.dialect?.name || '-',
      status: e.status || 'draft',
      statusLabel: STATUS_LABELS[e.status || 'draft'] || e.status || '-',
      createdAtLabel: e.createdAt ? new Date(e.createdAt).toLocaleString('zh-HK', { dateStyle: 'short', timeStyle: 'short' }) : '-',
      definitionSummary,
      themeLabel,
      senseCount,
      metaLabel
    }
  })
}

function getDuplicateCheckEntriesFormatted(entryId: string) {
  return formatDuplicateEntries(duplicateCheckResult.value.get(entryId)?.entries || [])
}

function getOtherDialectsFormatted(entryId: string) {
  return formatOtherDialectsEntries(duplicateCheckResult.value.get(entryId)?.otherDialects || [])
}

/** 將「其他方言點」中的某條詞條內容作為範本，填入當前正在編輯/新建的詞條。
 *  僅在同詞頭但不同方言時使用：保留當前詞條的詞頭與方言，只複製釋義、分類等內容。 */
async function applyOtherDialectTemplate(targetEntry: Entry, sourceId: string) {
  const sid = String(sourceId)

  try {
    // 從後端拉取來源詞條的完整數據（同 EntryModal）
    const response = await $fetch<{ success: boolean; data?: any }>(`/api/entries/${sid}`)
    if (!response?.success || !response.data) return

    const source = response.data as any

    // 深拷貝需要複製的字段，避免共享引用
    const clonedSenses = source.senses?.length ? deepCopy(source.senses) : [{ definition: '', examples: [] }]
    const clonedTheme = source.theme ? deepCopy(source.theme) : {}
    const clonedMeta = source.meta ? deepCopy(source.meta) : {}
    const clonedRefs = source.refs?.length ? deepCopy(source.refs) : undefined
    const clonedEntryType = source.entryType ?? 'word'

    // 僅覆寫內容相關字段，保留當前詞頭與方言
    targetEntry.entryType = clonedEntryType as any
    targetEntry.senses = clonedSenses as any
    if (clonedRefs) {
      ;(targetEntry as any).refs = clonedRefs
    }
    targetEntry.theme = clonedTheme as any
    targetEntry.meta = clonedMeta as any

    // 來源詞條若已隸屬某個詞語（lexeme），沿用其 lexemeId，方便跨方言詞語聚合
    if (source.lexemeId) {
      ;(targetEntry as any).lexemeId = source.lexemeId
    }

    targetEntry._isDirty = true
  } catch (e) {
    console.error('Failed to apply other dialect template', e)
  }
}

/** 將 Jyutjyu 的某條結果內容作為範本，填入當前正在編輯/新建的詞條。
 *  保留當前詞條的詞頭與方言，主要複製釋義（及其例句）；若當前尚未填粵拼，會順便補上。 */
function applyJyutjyuTemplate(targetEntry: Entry, sourceId: string) {
  const entryId = String(targetEntry.id ?? (targetEntry as any)._tempId ?? '')
  if (!entryId) return

  const state = jyutjyuRefResult.value.get(entryId)
  const rawList = state?.results || []
  const sid = String(sourceId)
  const source = Array.isArray(rawList) ? rawList.find((r: any) => String(r?.id || '') === sid) : null
  if (!source) return

  try {
    const rawSenses = Array.isArray(source?.senses) ? source.senses : []
    const nextSenses = rawSenses.length
      ? rawSenses
        .map((s: any) => {
          const definition = String(s?.definition || '').trim()
          if (!definition) return null

          const rawExamples = Array.isArray(s?.examples) ? s.examples : []
          const examples = rawExamples
            .map((ex: any) => {
              const text = String(ex?.text || '').trim()
              if (!text) return null
              return {
                text,
                jyutping: ex?.jyutping ? String(ex.jyutping) : undefined,
                translation: ex?.translation ? String(ex.translation) : undefined
              }
            })
            .filter(Boolean) as any

          return {
            definition,
            label: s?.label ? String(s.label) : undefined,
            examples: examples.length ? examples : []
          }
        })
        .filter(Boolean)
      : [{ definition: '', examples: [] }]

    targetEntry.senses = deepCopy(nextSenses as any)

    // 若當前未填粵拼，嘗試用 Jyutjyu 結果補上
    const currentJyutping = targetEntry.phonetic?.jyutping || []
    const sourceJyutping = source?.phonetic?.jyutping
    if ((!currentJyutping || currentJyutping.length === 0) && Array.isArray(sourceJyutping) && sourceJyutping.length > 0) {
      targetEntry.phonetic = targetEntry.phonetic || {}
      targetEntry.phonetic.jyutping = deepCopy(sourceJyutping)
    }

    targetEntry._isDirty = true
  } catch (e) {
    console.error('Failed to apply Jyutjyu template', e)
  }
}

function dismissDuplicateCheck(entry: Entry) {
  const entryId = String(entry.id ?? (entry as any)._tempId ?? '')
  duplicateCheckResult.value.delete(entryId)
  duplicateCheckResult.value = new Map(duplicateCheckResult.value)
}

function getDuplicateCheckVisible(entryId: string): boolean {
  const r = duplicateCheckResult.value.get(entryId)
  return !!(r && (r.loading || (r.entries && r.entries.length > 0) || (r.otherDialects && r.otherDialects.length > 0)))
}

function getDuplicateCheckLoading(entryId: string): boolean {
  return duplicateCheckResult.value.get(entryId)?.loading ?? false
}

function getDuplicateCheckRowVisible(entryId: string): boolean {
  return getDuplicateCheckLoading(entryId) || getDuplicateCheckEntriesFormatted(entryId).length > 0
}

function getOtherDialectsRowVisible(entryId: string): boolean {
  return getOtherDialectsFormatted(entryId).length > 0 && getDuplicateCheckEntriesFormatted(entryId).length === 0
}

function dismissTopHintForEntry(entry: Entry, colIndex?: number): boolean {
  const entryId = String(entry.id ?? (entry as any)._tempId ?? '')

  // 1) 行內 AI 釋義建議（最上面）
  if (
    aiSuggestion.value &&
    editingCell.value &&
    String(editingCell.value.entryId) === entryId &&
    editingCell.value.field === aiSuggestionForField.value
  ) {
    dismissAISuggestion()
    return true
  }

  // 2) 行內 AI 分類建議（顯示條件：焦點在分類列）
  if (colIndex === themeColIndex && themeAISuggestions.value.get(entryId)) {
    dismissThemeAI(entry)
    return true
  }

  // 3) 泛粵典粵拼建議（顯示條件：焦點在粵拼列）
  if (colIndex === phoneticColIndex && getJyutdictVisible(entryId)) {
    dismissJyutdict(entry)
    return true
  }

  // 4) 詞頭重複檢測（與 v-if 一致：loading 或 sameDialect 有結果）
  if (getDuplicateCheckRowVisible(entryId)) {
    dismissDuplicateCheck(entry)
    return true
  }

  // 5) 其他方言點參考（與 v-if 一致）
  if (getOtherDialectsRowVisible(entryId)) {
    dismissDuplicateCheck(entry)
    return true
  }

  // 6) Jyutjyu 參考（最下面）
  if (getJyutjyuRowVisible(entryId)) {
    dismissJyutjyuRef(entry)
    return true
  }

  return false
}

// 接受粵拼建議（採納後不再顯示，與分類/釋義一致）
function acceptJyutdict(entry: Entry, pronunciation: string) {
  const entryId = String(entry.id ?? (entry as any)._tempId ?? '')
  const col = editableColumns.find(c => c.key === 'phonetic')
  if (col) {
    col.set(entry, pronunciation as never)
    entry._isDirty = true
  }
  // 若當前正在編輯該格，同步 editValue，否則 saveCellEdit 會用舊輸入覆蓋剛採納的值
  if (editingCell.value && String(editingCell.value.entryId) === entryId && editingCell.value.field === 'phonetic') {
    editValue.value = pronunciation
  }
  jyutdictHandled.value.add(entryId)
  jyutdictHandled.value = new Set(jyutdictHandled.value)
  jyutdictVisible.value.set(entryId, false)
}

// 忽略粵拼建議（忽略後不再顯示）
function dismissJyutdict(entry: Entry) {
  const entryId = String(entry.id ?? (entry as any)._tempId ?? '')
  jyutdictHandled.value.add(entryId)
  jyutdictHandled.value = new Set(jyutdictHandled.value)
  jyutdictVisible.value.set(entryId, false)
}

function dismissJyutjyuRef(entry: Entry) {
  const entryId = String(entry.id ?? (entry as any)._tempId ?? '')
  const q = getJyutjyuQuery(entryId).trim()
  if (!entryId || !q) return

  const key = getJyutjyuHandledKey(entryId, q)
  jyutjyuRefHandled.value.add(key)
  jyutjyuRefHandled.value = new Set(jyutjyuRefHandled.value)
  jyutjyuRefVisible.value.set(entryId, false)
  jyutjyuRefVisible.value = new Map(jyutjyuRefVisible.value)
}

// 聚合視圖下用於展示的組列表（含新建未保存的「單條組」）— 須在 currentPageEntries 之前定義
const displayGroups = computed(() => {
  if (viewMode.value !== 'aggregated' && viewMode.value !== 'lexeme') return []
  const base = viewMode.value === 'lexeme' ? lexemeGroups.value : aggregatedGroups.value
  const newOnes = entries.value
    .filter(e => (e as any)._isNew)
    .map(e => ({
      headwordDisplay: e.headword?.display || e.text || '',
      headwordNormalized:
        viewMode.value === 'lexeme'
          ? ((e as any).lexemeId || `__unassigned__:${String(getEntryKey(e))}`)
          : (e.headword?.normalized || e.headword?.display || e.text || ''),
      entries: [e]
    }))
  return [...newOnes, ...base]
})

/** 表格行：平鋪時為 entry 行，聚合時為 group 行 + 展開的 entry 行（entry 帶 entryIndexInGroup 用於組內序號） */
type TableRow = { type: 'group'; group: { headwordDisplay: string; headwordNormalized: string; entries: Entry[] }; groupIndex: number } | { type: 'entry'; entry: Entry; groupIndex: number; entryIndexInGroup?: number }
const tableRows = computed((): TableRow[] => {
  if (viewMode.value === 'flat') {
    return entries.value.map(entry => ({ type: 'entry' as const, entry, groupIndex: -1 }))
  }
  const rows: TableRow[] = []
  displayGroups.value.forEach((group, groupIndex) => {
    rows.push({ type: 'group', group, groupIndex })
    if (expandedGroupKeys.value.has(group.headwordNormalized)) {
      group.entries.forEach((entry, entryIndexInGroup) => rows.push({ type: 'entry', entry, groupIndex, entryIndexInGroup }))
    }
  })
  return rows
})

/** 當前頁用於多選/未保存檢測的條目列表（平鋪=entries，聚合=displayGroups 內所有 entries + 新建） */
const currentPageEntries = computed(() => {
  if (viewMode.value === 'flat') return entries.value
  return displayGroups.value.flatMap(g => g.entries)
})

function toggleGroupExpanded(headwordNormalized: string) {
  const next = new Set(expandedGroupKeys.value)
  if (next.has(headwordNormalized)) next.delete(headwordNormalized)
  else next.add(headwordNormalized)
  expandedGroupKeys.value = next
}

function setViewMode(v: string) {
  const mode = v === 'aggregated' ? 'aggregated' : (v === 'lexeme' ? 'lexeme' : 'flat')
  viewMode.value = mode
  currentPage.value = 1
  fetchEntries()
}

const isEmpty = computed(() => {
  if (viewMode.value === 'flat') return entries.value.length === 0
  const base = viewMode.value === 'lexeme' ? lexemeGroups.value : aggregatedGroups.value
  return base.length === 0 && !entries.value.some(e => (e as any)._isNew)
})

/** 聚合組列顯示：粵拼（首條或「多種」） */
function getGroupPhonetic(group: { entries: Entry[] }): string {
  const first = group.entries[0]?.phonetic?.jyutping?.join?.(' ')
  if (!first) return '—'
  const allSame = group.entries.every(e => (e.phonetic?.jyutping?.join?.(' ') ?? '') === first)
  return allSame ? first : '多種'
}

const ENTRY_TYPE_LABELS: Record<string, string> = { character: '字', word: '詞', phrase: '短語' }
/** 聚合組列顯示：類型（首條或「混合」） */
function getGroupEntryType(group: { entries: Entry[] }): string {
  const first = group.entries[0]?.entryType ?? 'word'
  const allSame = group.entries.every(e => (e.entryType ?? 'word') === first)
  return allSame ? (ENTRY_TYPE_LABELS[first] ?? first) : '混合'
}

/** 聚合組列顯示：分類（首條 L3 名稱或「多種」） */
function getGroupTheme(group: { entries: Entry[] }): string {
  const firstId = group.entries[0]?.theme?.level3Id
  if (firstId == null) return group.entries.some(e => e.theme?.level3Id != null) ? '多種' : '—'
  const name = getThemeNameById(firstId)
  const allSame = group.entries.every(e => (e.theme?.level3Id ?? null) === (firstId ?? null))
  return allSame ? (name || '—') : '多種'
}

/** 聚合組列顯示：語域（首條或「多種」） */
function getGroupRegister(group: { entries: Entry[] }): string {
  const first = (group.entries[0]?.meta?.register as string) ?? '__none__'
  const allSame = group.entries.every(e => ((e.meta?.register as string) ?? '__none__') === first)
  if (first === '__none__' || first === '') return allSame ? '—' : '多種'
  return allSame ? first : '多種'
}

/** 聚合組列顯示：狀態（一致則一項，否則列出各狀態數量） */
function getGroupStatus(group: { entries: Entry[] }): string {
  const statuses = group.entries.map(e => e.status || 'draft')
  const uniq = [...new Set(statuses)]
  const first = uniq[0]
  if (uniq.length === 1 && first) return STATUS_LABELS[first] ?? first
  const counts = statuses.reduce((acc, s) => { acc[s] = (acc[s] ?? 0) + 1; return acc }, {} as Record<string, number>)
  return uniq.filter(Boolean).map(s => `${counts[s]} ${STATUS_LABELS[s] ?? s}`).join(' · ')
}

// 多選：當前選中的詞條 key（id 或 _tempId）集合，用 Set 並整體替換以觸發響應式
const selectedEntryIds = ref<Set<string>>(new Set())
const selectAllChecked = computed(() => {
  if (currentPageEntries.value.length === 0) return false
  return currentPageEntries.value.every((e) => selectedEntryIds.value.has(String(getEntryKey(e))))
})
const selectAllIndeterminate = computed(() => {
  const n = selectedOnCurrentPageCount.value
  return n > 0 && n < currentPageEntries.value.length
})
const selectedOnCurrentPageCount = computed(() =>
  currentPageEntries.value.filter((e) => selectedEntryIds.value.has(String(getEntryKey(e)))).length
)
const selectedCount = computed(() => selectedEntryIds.value.size)
/** 當前選中且已保存（有 id）的詞條，可用於批量刪除 */
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

// Notion 風格：所有列在瀏覽態自動換行顯示（Wrap column），最多 4 行
function useWrapForField(_field: string) {
  return true
}

function isSelected(rowIndex: number, colIndex: number) {
  const f = focusedCell.value
  return f != null && f.rowIndex === rowIndex && f.colIndex === colIndex
}

const pagination = reactive({
  total: 0,
  page: 1,
  perPage: 20,
  totalPages: 0
})

// Editable columns with inline editing support
const editableColumns = [
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
      // 顯示格式：主詞形 [異形1; 異形2]
      return `${main} [${variants.join('; ')}]`
    },
    set: (entry: Entry, value: string) => {
      const raw = (value || '').trim()

      // 解析規則：
      // - 可選中括號：主詞形 [異形1; 異形2]，亦兼容全角【】。
      // - 多個詞形用半角/全角逗號、分號分隔。
      let outside = raw
      let inside = ''

      // 兼容半角 [ ] 及全角 【 】 作為包裹異形詞的括號
      const bracketMatch = raw.match(/^(.*?)(?:[\[\uFF3B](.*)[\]\uFF3D])\s*$/)
      if (bracketMatch) {
        outside = (bracketMatch[1] || '').trim()
        inside = (bracketMatch[2] || '').trim()
      }

      const parts: string[] = []
      const pushFrom = (s: string) => {
        // 支援半角/全角逗號、分號：, ; ， ；
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
      // 標準化詞頭默認等於顯示詞頭
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
    options: [], // 動態設置，見 getOptions
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
        // 新格式：每個元素為一套完整讀音（可包含空格）；舊格式：單讀音按音節拆分
        const hasSpaceInside = arr.some(s => (s || '').includes(' '))
        if (!hasSpaceInside) {
          // 舊數據：視為單一讀音的音節陣列
          return arr.join(' ')
        }
        // 新數據：視為多讀音列表，使用分號連接
        return arr.join('; ')
      }
      return entry.phoneticNotation || ''
    },
    set: (entry: Entry, value: string) => {
      const raw = (value || '').trim()
      if (!entry.phonetic) entry.phonetic = { jyutping: [] }

      // 多個讀音用半角/全角逗號或分號分隔；每個元素為一套完整讀音字串
      const readings = raw
        .split(/[;,，；]/)
        .map(s => s.trim())
        .filter(Boolean)

      entry.phonetic.jyutping = readings
      // phoneticNotation 作為兼容字段，使用分號連接
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
    set: (entry: Entry, value: string) => { entry.entryType = value as any }
  },
  {
    key: 'theme',
    label: '分類',
    width: '140px',
    type: 'theme',
    options: [], // 靜態選項在這裡設置，實際使用 getOptions
    getOptions: () => themeOptions,
    get: (entry: Entry) => entry.theme?.level3Id || undefined,
    set: (entry: Entry, value: number | undefined) => {
      if (!entry.theme) entry.theme = {}
      if (value) {
        // 從 ID 獲取完整的主題信息
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
      entry.meta.register = (value === '__none__' ? '' : value) as any
    }
  },
  {
    key: 'status',
    label: '狀態',
    width: '80px',
    type: 'select',
    options: [], // 動態設置，見 getOptions
    getOptions: () => statusOptionsForTable.value,
    get: (entry: Entry) => entry.status || 'draft',
    set: (entry: Entry, value: string) => { entry.status = value as any }
  }
]

/** 分類列在 editableColumns 中的索引，用於 Tab 落在分類列時顯示 AI 建議 */
const themeColIndex = editableColumns.findIndex(c => c.key === 'theme')
const phoneticColIndex = editableColumns.findIndex(c => c.key === 'phonetic')
const headwordColIndex = editableColumns.findIndex(c => c.key === 'headword')

// Options（方言選項由統一常數提供）
const dialectOptions = dialectOptionsWithAll(ALL_FILTER_VALUE)

const statusOptions = [
  { value: ALL_FILTER_VALUE, label: '全部狀態' },
  { value: 'draft', label: '草稿' },
  { value: 'pending_review', label: '待審核' },
  { value: 'approved', label: '已發佈' },
  { value: 'rejected', label: '已拒絕' }
]

/** 狀態值 → 中文標籤（用於表格顯示，與角色無關，避免貢獻者看到 approved/rejected 時顯示英文） */
const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  pending_review: '待審核',
  approved: '已發佈',
  rejected: '已拒絕'
}

// 審核員/管理員新建詞條時的預設方言（僅用於此角色；貢獻者用其貢獻語言，無需選擇）
const REVIEWER_NEW_ENTRY_DIALECT_KEY = 'jyutcollab_reviewer_new_entry_dialect'
const newEntryDialectOptions = DIALECT_OPTIONS_FOR_SELECT
const reviewerDefaultDialectForNew = ref<DialectId>('hongkong')
const isReviewerOrAdmin = computed(() => {
  const r = user.value?.role
  return r === 'reviewer' || r === 'admin'
})

// 方言代碼到顯示名稱的映射（由統一常數提供）
const dialectCodeToName = DIALECT_CODE_TO_NAME

// 貢獻者僅可選草稿/待審核；審核員/管理員可選全部狀態（用於表格狀態列下拉）
const statusOptionsForTable = computed(() => {
  const currentUser = user.value
  if (!currentUser) return [{ value: 'draft', label: '草稿' }, { value: 'pending_review', label: '待審核' }]
  if (currentUser.role === 'reviewer' || currentUser.role === 'admin') {
    return [
      { value: 'draft', label: '草稿' },
      { value: 'pending_review', label: '待審核' },
      { value: 'approved', label: '已發佈' },
      { value: 'rejected', label: '已拒絕' }
    ]
  }
  return [
    { value: 'draft', label: '草稿' },
    { value: 'pending_review', label: '待審核' }
  ]
})

// 用戶可用嘅方言選項（用於表格編輯下拉）
const userDialectOptions = computed(() => {
  const currentUser = user.value
  if (!currentUser) return []

  // 審核員和管理員可以選擇所有方言
  if (currentUser.role === 'reviewer' || currentUser.role === 'admin') {
    return DIALECT_OPTIONS_FOR_SELECT
  }

  // 貢獻者只能選擇自己有權限的方言（方案 A：dialectPermissions 即可貢獻方言列表）
  return (currentUser.dialectPermissions || []).map(p => ({
    value: p.dialectName,
    label: dialectCodeToName[p.dialectName] || p.dialectName
  }))
})

// 獲取用戶嘅預設方言（新建詞條時使用）
function getUserDefaultDialect(): string {
  const currentUser = user.value

  // 審核員/管理員：優先使用頁面上選擇的「新建時方言」
  if (currentUser?.role === 'reviewer' || currentUser?.role === 'admin') {
    if (reviewerDefaultDialectForNew.value) {
      return reviewerDefaultDialectForNew.value
    }
  }

  // 貢獻者：使用其權限內的方言（已默認貢獻語言，無需額外選擇）
  if (currentUser?.dialectPermissions?.length) {
    return currentUser.dialectPermissions?.[0]?.dialectName ?? 'hongkong'
  }

  return 'hongkong'
}

// Computed
const hasUnsavedChanges = computed(() => {
  return currentPageEntries.value.some(e => e._isDirty || (e as any)._isNew)
})

// Helper functions
function isEditing(entryId: string | number, field: string) {
  return editingCell.value != null && String(editingCell.value.entryId) === String(entryId) && editingCell.value.field === field
}

function setInputRef(el: any, entryId: string, field: string) {
  if (el) {
    inputRefs.value.set(`${entryId}-${field}`, el)
  }
}

const MAX_TEXTAREA_HEIGHT_PX = 240

function resizeTextarea(el: EventTarget | null) {
  const ta = el instanceof HTMLTextAreaElement ? el : null
  if (!ta) return
  ta.style.height = 'auto'
  const h = ta.scrollHeight
  ta.style.height = `${h}px`
  ta.style.overflowY = h > MAX_TEXTAREA_HEIGHT_PX ? 'auto' : 'hidden'
}

/** 釋義列展開區旁的數量提示：多義項或例句時顯示「N義項 · M例」 */
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

/** 詞頭列提示：有其他詞形時顯示「N異形」 */
function getHeadwordExpandHint(entry: Entry): string {
  const variants = entry.headword?.variants || []
  const count = variants.filter(v => v && v.trim() !== '').length
  if (count > 0) {
    return `${count} 異形`
  }
  return ''
}

/** 粵拼列提示：有多個讀音時顯示「N 其他讀音」 */
function getPhoneticHint(entry: Entry): string {
  const arr = entry.phonetic?.jyutping
  if (!Array.isArray(arr) || arr.length <= 1) return ''

  // 舊數據：視為單一讀音的音節陣列，不顯示「其他讀音」
  const hasSpaceInside = arr.some(s => (s || '').includes(' '))
  if (!hasSpaceInside) return ''

  const othersCount = arr.length - 1
  if (othersCount <= 0) return ''
  return `${othersCount} 其他讀音`
}

function getCellDisplay(entry: Entry, col: any) {
  const value = col.get(entry)
  // 詞頭：顯示主詞形本身，異形數量用第二行提示顯示
  if (col.key === 'headword') {
    const main = entry.headword?.display || entry.text || value
    return main || '-'
  }
  // 粵拼：顯示主讀音，若有多個讀音則提示「N 其他讀音」
  if (col.key === 'phonetic') {
    const arr = entry.phonetic?.jyutping
    if (Array.isArray(arr) && arr.length > 0) {
      const hasSpaceInside = arr.some(s => (s || '').includes(' '))
      if (!hasSpaceInside) {
        // 舊數據：視為單一讀音的音節陣列
        return arr.join(' ')
      }
      // 新數據：多讀音列表，主行只顯示第一個讀音，其他讀音數量交給提示函數處理
      return arr[0] || '-'
    }
    return entry.phoneticNotation || value || '-'
  }
  if (col.type === 'theme') {
    // 主題類型：顯示 L3 名稱
    if (!value) return '選擇分類'
    return getThemeNameById(value) || '選擇分類'
  }
  if (col.type === 'select') {
    // 特殊處理方言列，使用映射顯示中文名稱
    if (col.key === 'dialect') {
      return dialectCodeToName[value] || value || '-'
    }
    // 狀態列：始終用完整對照表顯示，貢獻者雖不能選「已發佈/已拒絕」，但看到時應顯示中文
    if (col.key === 'status') {
      return STATUS_LABELS[value] || value || '-'
    }
    const options = getColumnOptions(col)
    const opt = options?.find((o: any) => o.value === value)
    return opt?.label || value || '-'
  }
  return value || '-'
}

// 獲取列的選項（支持靜態和動態選項）
function getColumnOptions(col: any) {
  if (col.getOptions) {
    return col.getOptions()
  }
  return col.options || []
}

function toggleSensesExpand(entry: Entry) {
  const key = String(entry.id ?? (entry as any)._tempId ?? '')
  const opening = expandedEntryId.value !== key
  expandedEntryId.value = expandedEntryId.value === key ? null : key
  if (opening && expandedEntryId.value === key) ensureSensesStructure(entry)
}

function toggleMorphemeRefsExpand(entry: Entry) {
  const key = String(entry.id ?? (entry as any)._tempId ?? '')
  expandedMorphemeRefsEntryId.value = expandedMorphemeRefsEntryId.value === key ? null : key
}

// 詞素引用搜索 modal 狀態
const morphemeSearchModalOpen = ref(false)
const morphemeSearchTargetEntry = ref<Entry | null>(null)
const morphemeSearchResults = ref<Array<{ id: string; headword: string; jyutping: string; definition: string; dialect: string; entryType: string }>>([])
const morphemeSearchLoading = ref(false)

// 未連結詞素：自動依詞頭與粵拼帶入，確認或改備註後添加
const unlinkedMorphemeEntryId = ref<string | null>(null)
const unlinkedMorphemeCandidates = ref<Array<{ position: number; char: string; jyutping: string; note: string }>>([])

function openUnlinkedMorphemeForm(entry: Entry) {
  const key = String(entry.id ?? (entry as any)._tempId ?? '')
  unlinkedMorphemeEntryId.value = key
  const headword = entry.headword?.display || entry.text || ''
  const rawJyutping = entry.phonetic?.jyutping
  // 粵拼統一按空格拆成音節（支援 array 如 ['jau5','tou4'] 或 ['jau5 tou4']）
  let syllables: string[] = []
  if (Array.isArray(rawJyutping)) {
    syllables = rawJyutping.join(' ').split(/\s+/).filter(Boolean)
  } else if (typeof rawJyutping === 'string') {
    syllables = rawJyutping.split(/\s+/).filter(Boolean)
  }
  const existingPositions = new Set((entry.morphemeRefs || []).map((r: any) => r.position))
  const candidates: Array<{ position: number; char: string; jyutping: string; note: string }> = []
  for (let i = 0; i < headword.length; i++) {
    if (existingPositions.has(i)) continue
    const char = headword[i]
    if (!char || char === '□') continue
    const jyutping = syllables[i] ?? ''
    candidates.push({ position: i, char, jyutping, note: '' })
  }
  unlinkedMorphemeCandidates.value = candidates
}

function confirmUnlinkedMorphemeRefs(entry: Entry) {
  const list = entry.morphemeRefs ? [...entry.morphemeRefs] : []
  for (const cand of unlinkedMorphemeCandidates.value) {
    list.push({
      position: cand.position,
      char: cand.char,
      jyutping: (cand.jyutping || '').trim() || undefined,
      note: (cand.note || '').trim() || undefined
    })
  }
  ;(entry as any).morphemeRefs = list
  entry._isDirty = true
  closeUnlinkedMorphemeForm()
}

function closeUnlinkedMorphemeForm() {
  unlinkedMorphemeEntryId.value = null
  unlinkedMorphemeCandidates.value = []
}

function openMorphemeSearch(entry: Entry) {
  morphemeSearchTargetEntry.value = entry
  morphemeSearchModalOpen.value = true
  // 自動搜索：根據當前詞條的詞頭、方言點、粵拼、釋義
  searchMorphemes(entry)
}

async function searchMorphemes(entry: Entry) {
  morphemeSearchLoading.value = true
  morphemeSearchResults.value = []
  try {
    const query: Record<string, string> = {}
    if (entry.headword?.display) query.headword = entry.headword.display
    if (entry.dialect?.name) query.dialect = entry.dialect.name
    if (entry.phonetic?.jyutping?.length) query.jyutping = entry.phonetic.jyutping.join(' ')
    if (entry.senses?.[0]?.definition) query.definition = entry.senses[0].definition
    
    const response = await $fetch<{ success: boolean; data: Array<any> }>('/api/entries/search-morphemes', { query })
    if (response.success && Array.isArray(response.data)) {
      morphemeSearchResults.value = response.data
    }
  } catch (e: any) {
    console.error('Failed to search morphemes:', e)
    alert(e?.data?.message || e?.message || '搜索失敗')
  } finally {
    morphemeSearchLoading.value = false
  }
}

function addMorphemeRef(targetEntryId: string, morphemeEntry: { headword: string; jyutping: string }) {
  if (!morphemeSearchTargetEntry.value) return
  
  const entry = morphemeSearchTargetEntry.value
  if (!entry.morphemeRefs) {
    ;(entry as any).morphemeRefs = []
  }
  
  // 檢查是否已存在
  if (entry.morphemeRefs && entry.morphemeRefs.some((r: any) => r.targetEntryId === targetEntryId)) {
    alert('該詞素已引用')
    return
  }
  
  // 計算位置（根據詞頭中的字符位置）
  const headword = entry.headword?.display || ''
  const char = morphemeEntry.headword
  let position: number | undefined = undefined
  if (char && headword.includes(char)) {
    position = headword.indexOf(char)
  }
  
  if (!entry.morphemeRefs) {
    ;(entry as any).morphemeRefs = []
  }
  if (entry.morphemeRefs) {
    entry.morphemeRefs.push({
      targetEntryId,
      position,
      char: morphemeEntry.headword,
      jyutping: morphemeEntry.jyutping || undefined
    })
  }
  
  entry._isDirty = true
  morphemeSearchModalOpen.value = false
}

function removeMorphemeRef(entry: Entry, refIdx: number) {
  if (!entry.morphemeRefs || refIdx < 0 || refIdx >= entry.morphemeRefs.length) return
  entry.morphemeRefs.splice(refIdx, 1)
  entry._isDirty = true
}

function toggleThemeExpand(entry: Entry) {
  const key = String(entry.id ?? (entry as any)._tempId ?? '')
  expandedThemeEntryId.value = expandedThemeEntryId.value === key ? null : key
}

function getThemeExpandHint(entry: Entry): string {
  const key = getEntryKey(entry)
  const suggestion = themeAISuggestions.value.get(String(key))
  if (suggestion) {
    return `AI 建議: ${suggestion.level3Name} (${suggestion.level1Name})`
  }
  return ''
}

/** 用於行內 AI 分類建議的展示文案 */
function formatThemeSuggestion(s: { level1Name: string; level2Name: string; level3Name: string } | undefined): string {
  if (!s) return ''
  return `${s.level3Name} (${s.level1Name} > ${s.level2Name})`
}

function acceptThemeAI(entry: Entry) {
  const key = getEntryKey(entry)
  const keyStr = String(key)
  const suggestion = themeAISuggestions.value.get(keyStr)
  if (suggestion) {
    if (!entry.theme) entry.theme = {}
    entry.theme.level1 = suggestion.level1Name
    entry.theme.level2 = suggestion.level2Name
    entry.theme.level3 = suggestion.level3Name
    entry.theme.level1Id = suggestion.level1Id
    entry.theme.level2Id = suggestion.level2Id
    entry.theme.level3Id = suggestion.level3Id
    entry._isDirty = true
    // 若當前正在編輯該格，同步 editValue，否則 saveCellEdit 會用舊值覆蓋剛採納的分類
    if (editingCell.value && String(editingCell.value.entryId) === keyStr && editingCell.value.field === 'theme') {
      editValue.value = suggestion.level3Id
    }
    themeAISuggestions.value.delete(keyStr)
    themeAISuggestions.value = new Map(themeAISuggestions.value)
  }
}

function dismissThemeAI(entry: Entry) {
  const key = getEntryKey(entry)
  themeAISuggestions.value.delete(String(key))
  themeAISuggestions.value = new Map(themeAISuggestions.value)
}

function acceptDefinitionAI(entry: Entry) {
  const key = String(getEntryKey(entry))
  const suggestion = definitionAISuggestions.value.get(key)
  if (!suggestion) return
  if (!entry.senses || entry.senses.length === 0) {
    entry.senses = [{ definition: suggestion.definition, examples: [] }]
  } else {
    const first = entry.senses[0]
    entry.senses[0] = { ...first, definition: suggestion.definition }
    entry.senses = [...entry.senses]
  }
  if (suggestion.usageNotes) {
    if (!entry.meta) entry.meta = {}
    entry.meta.usage = suggestion.usageNotes
  }
  if (suggestion.formalityLevel) {
    const formalityMap: Record<string, string> = {
      formal: '文雅',
      neutral: '中性',
      informal: '口語',
      slang: '口語',
      vulgar: '粗俗'
    }
    if (!entry.meta) entry.meta = {}
    entry.meta.register = (formalityMap[suggestion.formalityLevel] || '中性') as Register
  }
  entry._isDirty = true
  definitionAISuggestions.value.delete(key)
  definitionAISuggestions.value = new Map(definitionAISuggestions.value)
}

function dismissDefinitionAI(entry: Entry) {
  definitionAISuggestions.value.delete(String(getEntryKey(entry)))
  definitionAISuggestions.value = new Map(definitionAISuggestions.value)
}

function onThemeUpdate(entry: Entry, theme: {
  level1: string
  level2: string
  level3: string
  level1Id: number
  level2Id: number
  level3Id: number
}) {
  if (!entry.theme) entry.theme = {}
  entry.theme.level1 = theme.level1
  entry.theme.level2 = theme.level2
  entry.theme.level3 = theme.level3
  entry.theme.level1Id = theme.level1Id
  entry.theme.level2Id = theme.level2Id
  entry.theme.level3Id = theme.level3Id
  entry._isDirty = true
  // 清除 AI 建議
  const key = getEntryKey(entry)
  themeAISuggestions.value.delete(String(key))
  themeAISuggestions.value = new Map(themeAISuggestions.value)
}

/** 確保 entry.senses 至少有一項，且每項有 examples / subSenses 陣列 */
function ensureSensesStructure(entry: Entry) {
  if (!entry.senses || entry.senses.length === 0) {
    entry.senses = [{ definition: '', examples: [], subSenses: [] }]
    entry._isDirty = true
  }
  entry.senses.forEach((s: any) => {
    if (!Array.isArray(s.examples)) s.examples = []
    if (!Array.isArray(s.subSenses)) s.subSenses = []
    s.subSenses?.forEach((sub: any) => {
      if (!Array.isArray(sub.examples)) sub.examples = []
    })
  })
}

function addSense(entry: Entry) {
  ensureSensesStructure(entry)
  entry.senses.push({ definition: '', label: '', examples: [], subSenses: [] })
  entry._isDirty = true
}

function removeSense(entry: Entry, senseIndex: number) {
  if (entry.senses.length <= 1) return
  entry.senses.splice(senseIndex, 1)
  entry._isDirty = true
}

function addExample(entry: Entry, senseIndex: number) {
  ensureSensesStructure(entry)
  const sense = entry.senses[senseIndex]
  if (!sense) return
  if (!sense.examples) sense.examples = []
  sense.examples.push({ text: '', jyutping: '', translation: '' })
  entry._isDirty = true
}

function removeExample(entry: Entry, senseIndex: number, exIndex: number) {
  const sense = entry.senses[senseIndex]
  if (!sense?.examples) return
  sense.examples.splice(exIndex, 1)
  entry._isDirty = true
}

function addSubSense(entry: Entry, senseIndex: number) {
  ensureSensesStructure(entry)
  const sense = entry.senses[senseIndex]
  if (!sense) return
  if (!sense.subSenses) sense.subSenses = []
  sense.subSenses.push({ label: '', definition: '', examples: [] })
  entry._isDirty = true
}

function removeSubSense(entry: Entry, senseIndex: number, subIndex: number) {
  const sense = entry.senses[senseIndex]
  if (!sense?.subSenses) return
  sense.subSenses.splice(subIndex, 1)
  entry._isDirty = true
}

function addSubSenseExample(entry: Entry, senseIndex: number, subIndex: number) {
  ensureSensesStructure(entry)
  const sub = entry.senses[senseIndex]?.subSenses?.[subIndex]
  if (!sub) return
  if (!sub.examples) sub.examples = []
  sub.examples.push({ text: '', jyutping: '', translation: '' })
  entry._isDirty = true
}

function removeSubSenseExample(entry: Entry, senseIndex: number, subIndex: number, exIndex: number) {
  const sub = entry.senses[senseIndex]?.subSenses?.[subIndex]
  if (!sub?.examples) return
  sub.examples.splice(exIndex, 1)
  entry._isDirty = true
}

// Typed payload handlers for EntrySensesExpand emits (avoid implicit any in template)
function senseRemoveHandler(entry: Entry) {
  return (senseIdx: number) => removeSense(entry, senseIdx)
}
function exampleAddHandler(entry: Entry) {
  return (senseIdx: number) => addExample(entry, senseIdx)
}
function exampleRemoveHandler(entry: Entry) {
  return (payload: { senseIdx: number; exIdx: number }) => removeExample(entry, payload.senseIdx, payload.exIdx)
}
function subSenseAddHandler(entry: Entry) {
  return (senseIdx: number) => addSubSense(entry, senseIdx)
}
function subSenseRemoveHandler(entry: Entry) {
  return (payload: { senseIdx: number; subIdx: number }) => removeSubSense(entry, payload.senseIdx, payload.subIdx)
}
function subSenseExampleAddHandler(entry: Entry) {
  return (payload: { senseIdx: number; subIdx: number }) => addSubSenseExample(entry, payload.senseIdx, payload.subIdx)
}
function subSenseExampleRemoveHandler(entry: Entry) {
  return (payload: { senseIdx: number; subIdx: number; exIdx: number }) =>
    removeSubSenseExample(entry, payload.senseIdx, payload.subIdx, payload.exIdx)
}

function getCellClass(entry: Entry, field: string) {
  const classes: string[] = []
  if (field === 'status') {
    const statusColors: Record<string, string> = {
      draft: 'text-gray-500',
      pending_review: 'text-yellow-600',
      approved: 'text-green-600',
      rejected: 'text-red-600'
    }
    classes.push(statusColors[entry.status] || '')
  }
  return classes
}

/** 貢獻者只能編輯自己創建的詞條；審核員/管理員可編輯任意詞條。新建詞條（_isNew）視為可編輯。 */
function canEditEntry(entry: Entry): boolean {
  const role = user.value?.role
  if (role === 'reviewer' || role === 'admin') return true
  if (entry._isNew) return true
  return entry.createdBy === user.value?.id
}

// Cell editing handlers
// Notion 風格：首次點擊僅選中格（focusedCell），再次點擊同一格或按 Enter 進入編輯；forceEdit 為 true 時（如鍵盤 Enter）直接進入編輯
function handleCellClick(entry: Entry, field: string, event: MouseEvent | KeyboardEvent, rowIndex?: number, colIndex?: number, forceEdit?: boolean) {
  if (!isAuthenticated.value) return

  const col = editableColumns.find(c => c.key === field)
  if (!col) return

  const r = rowIndex ?? tableRows.value.findIndex(row => row.type === 'entry' && (row.entry.id ?? (row.entry as any)._tempId) === (entry.id ?? (entry as any)._tempId))
  const c = colIndex ?? editableColumns.findIndex(colDef => colDef.key === field)
  if (r < 0 || c < 0) return

  const alreadyFocused = focusedCell.value?.rowIndex === r && focusedCell.value?.colIndex === c
  const shouldEnterEdit = forceEdit === true || alreadyFocused

  // 先保存當前編輯格（若有）
  if (editingCell.value) {
    saveCellEdit({ focusWrapper: false })
  }

  // 始終更新焦點格
  focusedCell.value = { rowIndex: r, colIndex: c }

  // 僅當「再次點擊同一格」或「鍵盤 Enter / 直接輸入」時進入編輯
  if (!shouldEnterEdit) return

  // 貢獻者不編輯狀態列：保存時會自動改為待審核，無需手動選擇
  const role = user.value?.role
  if (field === 'status' && role !== 'reviewer' && role !== 'admin') return

  // 貢獻者只能編輯自己創建的詞條；審核員/管理員可編輯任意詞條
  if (!canEditEntry(entry)) return

  const entryId = entry.id ?? (entry as any)._tempId ?? ''
  editingCell.value = { entryId: String(entryId), field }
  editValue.value = col.get(entry)
  // 若該列有未採納的 AI 建議（如釋義建議），再點回該列時恢復顯示
  const pendingKey = `${String(entryId)}-${field}`
  const pending = pendingAISuggestions.value.get(pendingKey)
  if (pending) {
    aiSuggestion.value = pending.text
    aiSuggestionForField.value = pending.field
  }

  // 僅「新建詞條」在編輯粵拼時才啟用泛粵典建議與 AI 建議；
  // 修改已有詞條時不再自動彈出這兩類建議，避免干擾用戶編輯。
  if (field === 'phonetic' && (entry as any)._isNew) {
    const headword = entry.headword?.display || entry.text || ''
    const dialectName = entry.dialect?.name || ''
    const entryIdStr = String(entryId)
    if (headword && dialectName && !jyutdictHandled.value.has(entryIdStr)) {
      const existingData = jyutdictData.value.get(entryIdStr)
      if (!existingData || existingData.length === 0) {
        queryJyutdictForEntry(entry)
      } else {
        jyutdictVisible.value.set(entryIdStr, true)
      }
    }
    // 新建詞條時：進入粵拼格且已有詞頭則自動觸發 AI 推薦釋義與分類（與輸入粵拼時一致）
    if (headword?.trim()) {
      triggerAISuggestion(entry, 'phonetic', (col?.get(entry) ?? '') as string)
    }
  }

  nextTick(() => {
    const input = inputRefs.value.get(`${entryId}-${field}`)
    if (input) {
      input.focus()
      // 僅在鍵盤進入編輯時（Tab/Enter）將游標移到末尾，避免首鍵誤觸清空整格；滑鼠點擊進入時不干擾，方便用鼠標選擇文字
      if (forceEdit === true && input instanceof HTMLInputElement) {
        const len = (input.value || '').length
        input.setSelectionRange(len, len)
      }
      if (input instanceof HTMLTextAreaElement) {
        if (forceEdit === true) {
          const len = (input.value || '').length
          input.setSelectionRange(len, len)
        }
        resizeTextarea(input)
      }
    }
  })
}

function handleKeydown(event: KeyboardEvent, entry: Entry, field: string) {
  const col = editableColumns.find(c => c.key === field)
  if (!col) return

  switch (event.key) {
    case 'Enter':
      // 中文等輸入法組合中（如選字上屏）時不要攔截 Enter，交給 IME 處理
      if (event.isComposing) return
      // Shift+Enter = 單元格內換行（文本/粵拼/釋義/分類 textarea）；Enter = 保存並退出編輯
      if (event.shiftKey) {
        if (col.type === 'text' || col.type === 'phonetic') return
        event.preventDefault()
        break
      }
      event.preventDefault()
      saveCellEdit()
      break
    case 'Tab':
      event.preventDefault()
      // 如果有 AI 釋義建議，採納它
      if (aiSuggestion.value) {
        acceptAISuggestion()
      }
      // 如果有粵拼建議，採納它（與顯示條件一致：getJyutdictVisible）
      const entryId = String(entry.id ?? (entry as any)._tempId ?? '')
      const jyutSuggestion = jyutdictSuggested.value.get(entryId)
      if (jyutSuggestion && getJyutdictVisible(entryId)) {
        acceptJyutdict(entry, jyutSuggestion)
      }
      // 如果在分類列且有待採納的 AI 分類建議，採納它
      if (field === 'theme' && themeAISuggestions.value.get(entryId)) {
        acceptThemeAI(entry)
      }
      saveCellEdit({ focusWrapper: false })
      const opened = moveToNextCell(entry, field, event.shiftKey ? -1 : 1)
      if (!opened) {
        nextTick(() => tableWrapperRef.value?.focus())
      }
      break
    case 'Escape':
      event.preventDefault()
      // 有多個提示時：Esc 逐個由上到下忽略（不要一次全關）
      if (dismissTopHintForEntry(entry, editableColumns.findIndex(c => c.key === field))) {
        return
      }
      cancelCellEdit()
      break
    default:
      // 僅在輸入粵拼時觸發生成釋義建議（詞頭已填好）
      if (field === 'phonetic' && entry.headword?.display?.trim()) {
        triggerAISuggestion(entry, field, editValue.value)
      }
  }
}

function handleBlur(entry: Entry, field: string) {
  const entryId = entry?.id ?? (entry as any)?._tempId
  setTimeout(() => {
    if (editingCell.value && String(editingCell.value.entryId) === String(entryId) && editingCell.value.field === field) {
      saveCellEdit()
    }
  }, 200)
}

function saveCellEdit(options?: { focusWrapper?: boolean }) {
  if (!editingCell.value) return

  const { entryId, field } = editingCell.value
  const entry = currentPageEntries.value.find(e => String(e.id ?? (e as any)._tempId) === String(entryId))
  const col = editableColumns.find(c => c.key === field)

  if (entry && col) {
    const oldValue = col.get(entry)
    if (oldValue !== editValue.value) {
      ;(col.set as (e: Entry, v: string | number | undefined) => void)(entry, editValue.value)
      entry._isDirty = true
    }
  }

  const rowIndex = entry ? tableRows.value.findIndex(r => r.type === 'entry' && (r.entry === entry || String(r.entry.id ?? (r.entry as any)._tempId) === String(entryId))) : -1
  const colIndex = editableColumns.findIndex(c => c.key === field)
  if (rowIndex >= 0 && colIndex >= 0) {
    focusedCell.value = { rowIndex, colIndex }
  }
  // 未採納/忽略嘅建議暫存（按「建議目標列」存），等用戶點返該列時再顯示
  if (aiSuggestion.value && aiSuggestionForField.value) {
    const key = `${String(entryId)}-${aiSuggestionForField.value}`
    pendingAISuggestions.value.set(key, { entryId: String(entryId), field: aiSuggestionForField.value, text: aiSuggestion.value })
    pendingAISuggestions.value = new Map(pendingAISuggestions.value)
  }
  editingCell.value = null
  aiSuggestion.value = null
  aiSuggestionForField.value = null
  // 新建詞條：離開詞頭格且已填寫詞頭時，做一次重複性檢測 + Jyutjyu 參考查詢
  if (field === 'headword' && entry && (entry as any)._isNew && entry.headword?.display?.trim()) {
    runDuplicateCheck(entry)
    runJyutjyuRef(entry)
  }
  // 預設不主動把焦點移回整個表格 wrapper，避免在滑鼠點擊其他區域時觸發瀏覽器自動滾動造成「頁面跳動」感
  const focusWrapper = options?.focusWrapper === true
  if (focusWrapper) {
    nextTick(() => tableWrapperRef.value?.focus())
  }
}

function cancelCellEdit() {
  if (editingCell.value) {
    const { entryId, field } = editingCell.value
    const rowIndex = tableRows.value.findIndex(r => r.type === 'entry' && String(r.entry.id ?? (r.entry as any)._tempId) === String(entryId))
    const colIndex = editableColumns.findIndex(c => c.key === field)
    if (rowIndex >= 0 && colIndex >= 0) {
      focusedCell.value = { rowIndex, colIndex }
    }
    // 未採納/忽略嘅建議暫存（按「建議目標列」存），等用戶點返該列時再顯示
    if (aiSuggestion.value && aiSuggestionForField.value) {
      const key = `${String(entryId)}-${aiSuggestionForField.value}`
      pendingAISuggestions.value.set(key, { entryId: String(entryId), field: aiSuggestionForField.value, text: aiSuggestion.value })
      pendingAISuggestions.value = new Map(pendingAISuggestions.value)
    }
  }
  editingCell.value = null
  aiSuggestion.value = null
  aiSuggestionForField.value = null
  // 取消編輯時同樣不強制把焦點移回表格 wrapper，避免聚合視圖下出現滾動跳動
  nextTick(() => {
    // 僅當前沒有任何焦點格時才主動聚焦 wrapper，盡量減少瀏覽器自動滾動
    if (!focusedCell.value) {
      tableWrapperRef.value?.focus()
    }
  })
}

/** 保存當前格並跳到下一格（Tab 方向）。返回是否成功打開下一格。 */
function moveToNextCell(entry: Entry, currentField: string, direction: number): boolean {
  const currentRowIndex = tableRows.value.findIndex(r => r.type === 'entry' && (r.entry.id ?? (r.entry as any)._tempId) === (entry.id ?? (entry as any)._tempId))
  const currentColIndex = editableColumns.findIndex(c => c.key === currentField)
  let nextRow = currentRowIndex
  let nextCol = currentColIndex + direction

  if (nextCol < 0) {
    nextCol = editableColumns.length - 1
    nextRow--
  } else if (nextCol >= editableColumns.length) {
    nextCol = 0
    nextRow++
  }
  const rows = tableRows.value
  if (nextRow < 0 || nextRow >= rows.length) return false
  // 跳過聚合視圖下的組標題行，只停在可編輯的 entry 行
  let row = rows[nextRow]
  if (row?.type === 'group') {
    nextRow += direction > 0 ? 1 : -1
    while (nextRow >= 0 && nextRow < rows.length && rows[nextRow]?.type !== 'entry') nextRow += direction > 0 ? 1 : -1
    if (nextRow < 0 || nextRow >= rows.length) return false
    row = rows[nextRow]
  }
  const nextEntry = row?.type === 'entry' ? row.entry : null
  const nextColDef = editableColumns[nextCol]
  if (!nextEntry || !nextColDef) return false
  handleCellClick(nextEntry, nextColDef.key, new MouseEvent('click'), nextRow, nextCol, true)
  return true
}

function handleTableKeydown(event: KeyboardEvent) {
  // 若焦點在可編輯元素內（如展開區的 input/textarea），不攔截按鍵，讓用戶正常輸入
  const target = event.target as Node
  if (
    target &&
    (target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLElement && target.isContentEditable))
  ) {
    return
  }
  if (editingCell.value) return
  const rows = entries.value.length
  const cols = editableColumns.length
  if (rows === 0 || cols === 0) return

  // 尚無焦點格時，用方向鍵/Enter/Tab 從 (0,0) 開始
  if (!focusedCell.value) {
    if (event.key === 'Enter' || event.key.startsWith('Arrow') || event.key === 'Tab') {
      focusedCell.value = { rowIndex: 0, colIndex: 0 }
    } else {
      return
    }
  }

  const { rowIndex, colIndex } = focusedCell.value
  const currentEntry = entries.value[rowIndex]
  const entryKeyForTheme = currentEntry ? String(currentEntry.id ?? (currentEntry as any)._tempId ?? '') : ''
  let nextRow = rowIndex
  let nextCol = colIndex

  switch (event.key) {
    case 'ArrowUp':
      event.preventDefault()
      nextRow = Math.max(0, rowIndex - 1)
      break
    case 'ArrowDown':
      event.preventDefault()
      nextRow = Math.min(rows - 1, rowIndex + 1)
      break
    case 'ArrowLeft':
      event.preventDefault()
      nextCol = Math.max(0, colIndex - 1)
      break
    case 'ArrowRight':
      event.preventDefault()
      nextCol = Math.min(cols - 1, colIndex + 1)
      break
    case 'Tab':
      event.preventDefault()
      // 若當前在分類列且有待採納的 AI 分類建議，Tab 先採納再移動（與釋義列一致）
      if (colIndex === themeColIndex && currentEntry && themeAISuggestions.value.get(entryKeyForTheme)) {
        acceptThemeAI(currentEntry)
      }
      if (event.shiftKey) {
        nextCol = colIndex - 1
        if (nextCol < 0) {
          nextCol = cols - 1
          nextRow = Math.max(0, rowIndex - 1)
        }
      } else {
        nextCol = colIndex + 1
        if (nextCol >= cols) {
          nextCol = 0
          nextRow = Math.min(rows - 1, rowIndex + 1)
        }
      }
      const tabEntry = entries.value[nextRow]
      const tabColDef = editableColumns[nextCol]
      if (tabEntry && tabColDef) {
        handleCellClick(tabEntry, tabColDef.key, event, nextRow, nextCol, true)
      }
      return
    case 'Escape':
      // 有多個提示時：Esc 逐個由上到下忽略（不要一次全關）
      if (currentEntry && dismissTopHintForEntry(currentEntry, colIndex)) {
        event.preventDefault()
        return
      }
      return
    case 'Enter':
      event.preventDefault()
      const entry = entries.value[rowIndex]
      const colDef = editableColumns[colIndex]
      if (entry && colDef) {
        handleCellClick(entry, colDef.key, event, rowIndex, colIndex, true)
      }
      return
    default:
      // Notion: 直接輸入字符激活當前選中格進入編輯，並把該字符填入
      if (focusedCell.value && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const typableEntry = entries.value[focusedCell.value.rowIndex]
        const typableCol = editableColumns[focusedCell.value.colIndex]
        if (typableEntry && typableCol) {
          event.preventDefault()
          handleCellClick(typableEntry, typableCol.key, event, focusedCell.value.rowIndex, focusedCell.value.colIndex, true)
          editValue.value = String(editValue.value || '') + event.key
        }
      }
      return
  }

  focusedCell.value = { rowIndex: nextRow, colIndex: nextCol }
}

// AI Suggestion（按「條」+「操作」記錄 loading，避免整表一起轉）
function getEntryKey(entry: Entry): string | number {
  return (entry as any).id ?? (entry as any)._tempId ?? ''
}
const aiLoadingFor = ref<{ entryKey: string | number, action: 'definition' | 'theme' | 'examples' } | null>(null)
const aiLoading = ref(false) // 僅用於編輯時 inline 建議等
/** 行內建議請求的 AbortController，用於取消上一次請求 */
const aiSuggestAbortController = ref<AbortController | null>(null)

async function triggerAISuggestion(entry: Entry, field: string, value: string) {
  // 僅對「新建詞條」啟用行內 AI 建議；編輯已有詞條時不再觸發。
  if (!(entry as any)._isNew) {
    return
  }

  if (aiDebounceTimer.value) {
    clearTimeout(aiDebounceTimer.value)
    aiDebounceTimer.value = null
  }
  // 取消正在進行的行內建議請求（用戶再次輸入時）
  if (aiSuggestAbortController.value) {
    aiSuggestAbortController.value.abort()
    aiSuggestAbortController.value = null
  }

  // 只喺用戶輸入粵拼時觸發生成釋義建議（詞頭已填好後再問 AI）
  const headword = entry.headword?.display?.trim() || ''
  if (field === 'phonetic' && headword.length >= 1) {
    const entryId = String(entry.id ?? (entry as any)._tempId ?? '')
    aiDebounceTimer.value = setTimeout(async () => {
      aiSuggestAbortController.value = new AbortController()
      const signal = aiSuggestAbortController.value.signal
      aiLoadingInlineFor.value = { entryId, field: 'definition' }
      aiInlineError.value = null
      aiLoading.value = true
      try {
        // 並行調用釋義和分類 API（支援取消）
        const [definitionResponse, categorizeResponse] = await Promise.all([
          $fetch<{ success: boolean; data?: { definition?: string } }>('/api/ai/definitions', {
            method: 'POST',
            body: {
              expression: headword,
              region: 'hongkong'
            },
            signal
          }),
          $fetch<{ success: boolean; data?: { themeId?: number; confidence?: number; explanation?: string } }>('/api/ai/categorize', {
            method: 'POST',
            body: {
              expression: headword
            },
            signal
          }).catch(e => {
            if (e?.name === 'AbortError') throw e
            console.error('AI categorization error:', e)
            return null
          })
        ])

        // 結果校驗：詞頭已變更則不套用
        const currentEntry = currentPageEntries.value.find(e => String(e.id ?? (e as any)._tempId) === entryId)
        const currentHeadword = currentEntry?.headword?.display?.trim() || ''
        if (currentHeadword !== headword) {
          return
        }

        // 處理釋義建議
        if (definitionResponse?.success && definitionResponse.data?.definition) {
          const suggestionText = `建議釋義: ${definitionResponse.data.definition}`
          const targetField = 'definition'
          aiSuggestion.value = suggestionText
          aiSuggestionForField.value = targetField
          const stillEditingThisCell = editingCell.value && String(editingCell.value.entryId) === entryId && editingCell.value.field === targetField
          if (!stillEditingThisCell) {
            const key = `${entryId}-${targetField}`
            pendingAISuggestions.value.set(key, { entryId, field: targetField, text: suggestionText })
            pendingAISuggestions.value = new Map(pendingAISuggestions.value)
            aiSuggestion.value = null
            aiSuggestionForField.value = null
          }
        }

        // 處理分類建議
        if (categorizeResponse?.success && categorizeResponse.data?.themeId) {
          const themeId = categorizeResponse.data.themeId
          const theme = getThemeById(themeId)
          if (theme) {
            themeAISuggestions.value.set(entryId, {
              level1Name: theme.level1Name,
              level2Name: theme.level2Name,
              level3Name: theme.level3Name,
              level1Id: theme.level1Id,
              level2Id: theme.level2Id,
              level3Id: theme.level3Id,
              confidence: categorizeResponse.data.confidence,
              explanation: categorizeResponse.data.explanation
            })
            themeAISuggestions.value = new Map(themeAISuggestions.value)
          }
        }
      } catch (error: any) {
        // 用戶切換格或再次觸發時會 abort 上一次請求，不必當成錯誤記錄或展示
        const isAborted =
          error?.name === 'AbortError' ||
          error?.cause?.name === 'AbortError' ||
          (typeof error?.message === 'string' && error.message.toLowerCase().includes('abort'))
        if (isAborted) return
        console.error('AI suggestion error:', error)
        const message = error?.data?.message || error?.message || '釋義建議暫時無法生成'
        aiInlineError.value = { entryId, field: 'definition', message }
      } finally {
        if (aiLoadingInlineFor.value?.entryId === entryId) {
          aiLoadingInlineFor.value = null
        }
        aiLoading.value = false
        aiSuggestAbortController.value = null
      }
    }, 800)
  }
}

async function generateAIExamples(entry: Entry) {
  if (!entry.headword?.display || !entry.senses?.[0]?.definition) {
    alert('請先填寫詞條文本和釋義')
    return
  }

  aiLoadingFor.value = { entryKey: getEntryKey(entry), action: 'examples' }
  try {
    const response = await $fetch('/api/ai/examples', {
      method: 'POST',
      body: {
        expression: entry.headword.display,
        definition: entry.senses[0].definition,
        region: 'hongkong'
      }
    })

    // API 返回 { success: true, data: [{ sentence, explanation, scenario }, ...] }
    // data 直接是數組，不是 { examples: [...] }
    if (response.success && Array.isArray(response.data) && response.data.length > 0) {
      if (!entry.senses?.length) entry.senses = [{ definition: '', examples: [] }]
      const firstSense = entry.senses[0]
      if (firstSense) {
        if (!firstSense.examples) firstSense.examples = []
        const examples = firstSense.examples
        response.data.forEach((ex: any) => {
          examples.push({
            text: ex.sentence || ex.text,
            translation: ex.explanation || ex.translation,
            scenario: ex.scenario,
            source: 'ai_generated'
          })
        })
      }
      entry._isDirty = true
    }
  } catch (error) {
    console.error('AI examples generation error:', error)
    alert('生成例句失敗')
  } finally {
    aiLoadingFor.value = null
  }
}

async function generateAIDefinition(entry: Entry) {
  if (!entry.headword?.display) {
    alert('請先填寫詞條文本')
    return
  }

  const key = getEntryKey(entry)
  aiLoadingFor.value = { entryKey: key, action: 'definition' }
  try {
    const response: any = await $fetch('/api/ai/definitions', {
      method: 'POST',
      body: {
        expression: entry.headword.display,
        region: 'hongkong'
      }
    })

    // 檢查響應（API 返回 { success: true, data: { definition, usageNotes, formalityLevel } }）
    const data = response?.data
    if (response?.success === true && data && typeof data.definition === 'string') {
      const entryKey = String(getEntryKey(entry))
      definitionAISuggestions.value.set(entryKey, {
        definition: data.definition,
        usageNotes: data.usageNotes,
        formalityLevel: data.formalityLevel
      })
      definitionAISuggestions.value = new Map(definitionAISuggestions.value)
    } else {
      alert('AI 未能生成釋義，請檢查服務端日誌')
    }
  } catch (error: any) {
    console.error('[Frontend] AI definition generation error:', error)
    const errMsg = error?.data?.message || error?.message || JSON.stringify(error)
    alert(`生成釋義失敗: ${errMsg}`)
  } finally {
    aiLoadingFor.value = null
  }
}

async function generateAICategorization(entry: Entry) {
  if (!entry.headword?.display) {
    alert('請先填寫詞條文本')
    return
  }

  aiLoadingFor.value = { entryKey: getEntryKey(entry), action: 'theme' }
  try {
    const response: any = await $fetch('/api/ai/categorize', {
      method: 'POST',
      body: {
        expression: entry.headword.display
      }
    })

    // API 返回 { success: true, data: { themeId: number, explanation: string, confidence: number } }
    if (response.success && response.data?.themeId) {
      const themeId = response.data.themeId
      const theme = getThemeById(themeId)
      if (theme) {
        // 存入 themeAISuggestions，讓用戶在展開區域查看並決定是否接受
        const entryKey = String(getEntryKey(entry))
        themeAISuggestions.value.set(entryKey, {
          level1Name: theme.level1Name,
          level2Name: theme.level2Name,
          level3Name: theme.level3Name,
          level1Id: theme.level1Id,
          level2Id: theme.level2Id,
          level3Id: theme.level3Id,
          confidence: response.data.confidence,
          explanation: response.data.explanation
        })
        themeAISuggestions.value = new Map(themeAISuggestions.value)
      }
    } else {
      alert('AI 未能生成分類，請重試或手動選擇')
    }
  } catch (error: any) {
    console.error('AI categorization error:', error)
    alert(`AI分類失敗: ${error?.data?.message || error?.message || '未知錯誤'}`)
  } finally {
    aiLoadingFor.value = null
  }
}

function clearPendingSuggestionForCurrentCell() {
  if (editingCell.value && aiSuggestionForField.value) {
    const key = `${String(editingCell.value.entryId)}-${aiSuggestionForField.value}`
    pendingAISuggestions.value.delete(key)
    pendingAISuggestions.value = new Map(pendingAISuggestions.value)
  }
}

/** 重試行內釋義建議（由錯誤列「重試」觸發） */
function retryInlineAISuggestion(entry: Entry) {
  const entryId = String(entry.id ?? (entry as any)._tempId ?? '')
  if (aiInlineError.value?.entryId === entryId) {
    aiInlineError.value = null
  }
  const phoneticValue = entry.phonetic?.jyutping?.join(' ') ?? (entry as any).phoneticNotation ?? ''
  triggerAISuggestion(entry, 'phonetic', phoneticValue)
}

function acceptAISuggestion() {
  if (!aiSuggestion.value) return
  // 釋義建議：支持 "建議釋義: xxx" 或直接整段作為釋義
  const isDefinition = aiSuggestionForField.value === 'definition'
  let defText = aiSuggestion.value
  const defMatch = aiSuggestion.value.match(/^建議釋義: (.+)$/s)
  if (defMatch) defText = defMatch[1]?.trim() ?? aiSuggestion.value

  if (isDefinition && editingCell.value?.entryId !== undefined) {
    const entry = currentPageEntries.value.find(e => String(e.id ?? (e as any)._tempId) === String(editingCell.value!.entryId))
    if (entry) {
      if (!entry.senses || entry.senses.length === 0) {
        entry.senses = [{ definition: defText, examples: [] }]
      } else {
        const first = entry.senses[0]
        if (first) first.definition = defText
      }
      entry._isDirty = true
    }
    editValue.value = defText
  } else {
    editValue.value = aiSuggestion.value
  }
  clearPendingSuggestionForCurrentCell()
  aiSuggestion.value = null
  aiSuggestionForField.value = null
}

function dismissAISuggestion() {
  clearPendingSuggestionForCurrentCell()
  aiSuggestion.value = null
  aiSuggestionForField.value = null
}

// Entry operations
function addNewRow() {
  const defaultDialect = getUserDefaultDialect()
  const newEntry: any = {
    _tempId: `new-${Date.now()}`,
    id: `new-${Date.now()}`,
    headword: { display: '', search: '', normalized: '', isPlaceholder: false },
    text: '',
    dialect: { name: defaultDialect },
    phonetic: { jyutping: [] },
    entryType: 'word',
    senses: [{ definition: '', examples: [] }],
    theme: {},
    meta: {},
    status: 'draft',
    _isNew: true,
    _isDirty: false
  }
  entries.value.unshift(newEntry)

  // 直接進入詞頭編輯（forceEdit: true），否則只會選中格、焦點仍在按鈕上，用戶按 Enter 會再次觸發「新建詞條」
  nextTick(() => {
    handleCellClick(newEntry, 'headword', new MouseEvent('click'), 0, 0, true)
  })
}

/** 深拷貝（避開 Vue reactive Proxy，structuredClone 會報 DataCloneError） */
function deepCopy<T>(x: T): T {
  return JSON.parse(JSON.stringify(x))
}

type EntryBaselineSnapshot = {
  headword?: any
  text?: any
  dialect?: any
  phonetic?: any
  phoneticNotation?: any
  entryType?: any
  senses?: any
  refs?: any
  theme?: any
  meta?: any
  status?: any
  reviewNotes?: any
}

function getEntryIdKey(entry: Entry): string {
  return String((entry as any)?.id ?? '')
}

function makeBaselineSnapshot(entry: Entry): EntryBaselineSnapshot {
  return deepCopy({
    headword: (entry as any).headword,
    text: (entry as any).text,
    dialect: (entry as any).dialect,
    phonetic: (entry as any).phonetic,
    phoneticNotation: (entry as any).phoneticNotation,
    entryType: (entry as any).entryType,
    senses: (entry as any).senses,
    refs: (entry as any).refs,
    theme: (entry as any).theme,
    meta: (entry as any).meta,
    status: (entry as any).status,
    reviewNotes: (entry as any).reviewNotes
  })
}

function setBaselineForEntry(entry: Entry) {
  const id = getEntryIdKey(entry)
  if (!id) return
  entryBaselineById.value.set(id, makeBaselineSnapshot(entry))
  entryBaselineById.value = new Map(entryBaselineById.value)
}

function restoreEntryFromBaseline(entry: Entry): boolean {
  const id = getEntryIdKey(entry)
  if (!id) return false
  const snap = entryBaselineById.value.get(id) as EntryBaselineSnapshot | undefined
  if (!snap) return false

  ;(entry as any).headword = snap.headword ? deepCopy(snap.headword) : undefined
  ;(entry as any).text = snap.text
  ;(entry as any).dialect = snap.dialect ? deepCopy(snap.dialect) : undefined
  ;(entry as any).phonetic = snap.phonetic ? deepCopy(snap.phonetic) : undefined
  ;(entry as any).phoneticNotation = snap.phoneticNotation
  ;(entry as any).entryType = snap.entryType
  ;(entry as any).senses = snap.senses ? deepCopy(snap.senses) : undefined
  ;(entry as any).refs = snap.refs ? deepCopy(snap.refs) : undefined
  ;(entry as any).theme = snap.theme ? deepCopy(snap.theme) : undefined
  ;(entry as any).meta = snap.meta ? deepCopy(snap.meta) : undefined
  ;(entry as any).status = snap.status
  ;(entry as any).reviewNotes = snap.reviewNotes
  entry._isDirty = false
  return true
}

function applyDraftOntoEntry(target: Entry, draft: Entry) {
  ;(target as any).headword = (draft as any).headword ? deepCopy((draft as any).headword) : undefined
  ;(target as any).text = (draft as any).text
  ;(target as any).dialect = (draft as any).dialect ? deepCopy((draft as any).dialect) : undefined
  ;(target as any).phonetic = (draft as any).phonetic ? deepCopy((draft as any).phonetic) : undefined
  ;(target as any).phoneticNotation = (draft as any).phoneticNotation
  ;(target as any).entryType = (draft as any).entryType
  ;(target as any).senses = (draft as any).senses ? deepCopy((draft as any).senses) : undefined
  ;(target as any).refs = (draft as any).refs ? deepCopy((draft as any).refs) : undefined
  ;(target as any).theme = (draft as any).theme ? deepCopy((draft as any).theme) : undefined
  ;(target as any).meta = (draft as any).meta ? deepCopy((draft as any).meta) : undefined
  ;(target as any).status = (draft as any).status
  ;(target as any).reviewNotes = (draft as any).reviewNotes
  ;(target as any)._isNew = (draft as any)._isNew ?? false
  ;(target as any)._isDirty = (draft as any)._isDirty ?? false
  if ((draft as any)._tempId) (target as any)._tempId = (draft as any)._tempId
}

/** 複製詞條：複製所有內容，方言改為當前用戶的母語/默認方言，插入為新行（草稿） */
function duplicateEntry(entry: Entry) {
  const defaultDialect = getUserDefaultDialect()
  const tempId = `dup-${Date.now()}`
  const clonedHeadword = entry.headword
    ? deepCopy(entry.headword)
    : { display: '', search: '', normalized: '', isPlaceholder: false }
  const clonedPhonetic = entry.phonetic ? deepCopy(entry.phonetic) : { jyutping: [] }
  const clonedSenses = entry.senses?.length
    ? deepCopy(entry.senses)
    : [{ definition: '', examples: [] }]
  const clonedTheme = entry.theme ? deepCopy(entry.theme) : {}
  const clonedMeta = entry.meta ? deepCopy(entry.meta) : {}
  const clonedRefs = entry.refs?.length ? deepCopy(entry.refs) : undefined
  const clonedMorphemeRefs = entry.morphemeRefs?.length ? deepCopy(entry.morphemeRefs) : undefined

  const newEntry: any = {
    _tempId: tempId,
    id: tempId,
    headword: clonedHeadword,
    text: entry.text ?? clonedHeadword.display,
    dialect: { name: defaultDialect },
    phonetic: clonedPhonetic,
    entryType: entry.entryType ?? 'word',
    senses: clonedSenses,
    refs: clonedRefs,
    theme: clonedTheme,
    meta: clonedMeta,
    // 若原詞條已經屬於某個詞語（lexeme），沿用該 lexemeId，方便跨方言聚合
    lexemeId: (entry as any).lexemeId,
    // 詞素引用也一併複製
    morphemeRefs: clonedMorphemeRefs,
    status: 'draft',
    _isNew: true,
    _isDirty: false
  }
  entries.value.unshift(newEntry)

  nextTick(() => {
    handleCellClick(newEntry, 'headword', new MouseEvent('click'), 0, 0, true)
  })
}

async function saveNewEntry(entry: Entry) {
  if (!entry.headword?.display && !entry.text) {
    alert('請輸入詞條文本')
    return
  }

  saving.value = true
  try {
    // 審核員/管理員新建即為已發佈；貢獻者新建為待審核
    const role = user.value?.role
    const statusForNew = (role === 'reviewer' || role === 'admin') ? 'approved' : 'pending_review'

    const body: Record<string, unknown> = {
      headword: entry.headword,
      text: entry.text,
      dialect: entry.dialect,
      phonetic: entry.phonetic,
      entryType: entry.entryType,
      senses: entry.senses,
      theme: entry.theme,
      meta: entry.meta,
      status: statusForNew
    }
    // 複製／用作範本時沿用原詞條的 lexemeId，方便按詞語聚合視圖自動歸類
    const lexemeId = (entry as any).lexemeId
    if (lexemeId && !String(lexemeId).startsWith('__unassigned__:')) {
      body.lexemeId = lexemeId
    }
    // 詞素引用
    if (entry.morphemeRefs && entry.morphemeRefs.length > 0) {
      body.morphemeRefs = entry.morphemeRefs
    }
    const response = await $fetch('/api/entries', {
      method: 'POST',
      body
    })

    if (response.success) {
      // Replace temp entry with real one; preserve _tempId so v-for key stays stable and Vue doesn't remount the row (avoids parentNode null during patch)
      const index = entries.value.findIndex(e => e.id === entry.id || (e as any)._tempId === (entry as any)._tempId)
      if (index !== -1) {
        const prev = entries.value[index] as any
        const saved = { ...response.data, _isNew: false, _isDirty: false } as unknown as Entry
        if (prev?._tempId) (saved as any)._tempId = prev._tempId
        entries.value[index] = saved
        // 泛粵典「已採納/忽略」是用 entryId 記的；保存後 entryId 從 _tempId 變為真實 id，需遷移否則會重複彈出
        if (prev?._tempId && jyutdictHandled.value.has(String(prev._tempId))) {
          jyutdictHandled.value.add(String(saved.id))
          jyutdictHandled.value.delete(String(prev._tempId))
          jyutdictHandled.value = new Set(jyutdictHandled.value)
        }
        // Jyutjyu 參考：狀態以 entryId 存 Map；保存後 entryId 從 _tempId 變為真實 id，需遷移避免提示狀態丟失/重複
        if (prev?._tempId) {
          const prevId = String(prev._tempId)
          const nextId = String(saved.id)

          const prevJyutjyuState = jyutjyuRefResult.value.get(prevId)
          if (prevJyutjyuState) {
            jyutjyuRefResult.value.set(nextId, prevJyutjyuState)
            jyutjyuRefResult.value.delete(prevId)
            jyutjyuRefResult.value = new Map(jyutjyuRefResult.value)
          }

          const prevVisible = jyutjyuRefVisible.value.get(prevId)
          if (prevVisible !== undefined) {
            jyutjyuRefVisible.value.set(nextId, prevVisible)
            jyutjyuRefVisible.value.delete(prevId)
            jyutjyuRefVisible.value = new Map(jyutjyuRefVisible.value)
          }

          // 遷移已忽略 key（`${entryId}::${q}`）
          const nextHandled = new Set<string>()
          jyutjyuRefHandled.value.forEach((k) => {
            if (k.startsWith(`${prevId}::`)) nextHandled.add(k.replace(`${prevId}::`, `${nextId}::`))
            else nextHandled.add(k)
          })
          jyutjyuRefHandled.value = nextHandled
        }
        // 從本地儲存中移除已保存嘅詞條
        removeEntryFromLocalStorage(prev?._tempId || entry.id || '')
        // 更新 baseline（之後「取消編輯」應回滾到最新已保存狀態）
        setBaselineForEntry(saved)
      }
      pagination.total++
      // 聚合／按詞語視圖下保存新條目後重新拉取，使新條目歸入對應詞形組或詞語組
      if (viewMode.value === 'aggregated' || viewMode.value === 'lexeme') {
        await fetchEntries()
      }
    }
  } catch (error: any) {
    console.error('Failed to save entry:', error)
    const msg = error.data?.message || error.message
    const is409 = error.statusCode === 409 || error.data?.statusCode === 409
    alert(is409 ? '該方言下已有相同詞頭，請修改詞頭或方言後再保存' : (msg || '保存失敗'))
  } finally {
    saving.value = false
  }
}

async function saveAllChanges() {
  saving.value = true
  const dirtyEntries = currentPageEntries.value.filter(e => e._isDirty && !(e as any)._isNew)

  try {
    // 先更新本地狀態（如審核員保存→已發佈），再發送請求，避免保存後仍顯示「有修改」
    dirtyEntries.forEach(entry => {
      entry.status = getStatusForSave(entry)
    })
    await Promise.all(dirtyEntries.map(entry =>
      $fetch<unknown>(`/api/entries/${entry.id}`, {
        method: 'PUT',
        body: {
          headword: entry.headword,
          dialect: entry.dialect,
          phonetic: entry.phonetic,
          entryType: entry.entryType,
          senses: entry.senses,
          theme: entry.theme,
          meta: entry.meta,
          status: entry.status
        }
      })
    ))

    dirtyEntries.forEach(entry => {
      entry._isDirty = false
      removeEntryFromLocalStorage(entry.id || '')
      setBaselineForEntry(entry)
    })
  } catch (error: any) {
    console.error('Failed to save changes:', error)
    alert(error?.data?.message || '保存失敗，請重試')
  } finally {
    saving.value = false
  }
}

/** 貢獻者保存：草稿/已拒絕 → 待審核。審核員/管理員保存：草稿/待審核 → 已發佈（無需再審）；已發佈/已拒絕按選擇保留。 */
function getStatusForSave(entry: Entry): Entry['status'] {
  const role = user.value?.role
  const status = entry.status || 'draft'
  if (role === 'reviewer' || role === 'admin') {
    if (status === 'draft' || status === 'pending_review') return 'approved'
    return status
  }
  if (status === 'draft' || status === 'rejected') return 'pending_review'
  return status
}

async function saveEntryChanges(entry: Entry) {
  saving.value = true
  const statusToSave = getStatusForSave(entry)
  // 先更新本地狀態（如審核員保存→已發佈），再發送請求，避免保存後比對仍顯示「有修改」
  entry.status = statusToSave
  try {
    const putBody: Record<string, unknown> = {
      headword: entry.headword,
      dialect: entry.dialect,
      phonetic: entry.phonetic,
      entryType: entry.entryType,
      senses: entry.senses,
      theme: entry.theme,
      meta: entry.meta,
      status: statusToSave
    }
    // 用作範本時可能已寫入 lexemeId，一併提交以便按詞語聚合視圖歸類
    const lexemeId = (entry as any).lexemeId
    if (lexemeId !== undefined && lexemeId !== null && !String(lexemeId).startsWith('__unassigned__:')) {
      putBody.lexemeId = lexemeId
    }
    // 詞素引用
    if (entry.morphemeRefs !== undefined) {
      putBody.morphemeRefs = entry.morphemeRefs || []
    }
    const response = await $fetch<{ success: boolean; data?: { status?: string } }>(`/api/entries/${entry.id}`, {
      method: 'PUT',
      body: putBody
    })

    if (response.success) {
      entry._isDirty = false
      if (response.data?.status) entry.status = response.data.status as Entry['status']
      // 從本地儲存中移除已保存嘅詞條
      removeEntryFromLocalStorage(entry.id || '')
      // 更新 baseline（之後「取消編輯」應回滾到最新已保存狀態）
      setBaselineForEntry(entry)
    }
  } catch (error: any) {
    console.error('Failed to save entry changes:', error)
    alert(error?.data?.message || '保存失敗')
  } finally {
    saving.value = false
  }
}

async function cancelEdit(entry: Entry) {
  // 若正在編輯同一條詞條，先退出單元格編輯，避免把 editValue 寫返去
  if (editingCell.value && String(editingCell.value.entryId) === String(entry.id ?? (entry as any)._tempId ?? '')) {
    cancelCellEdit()
  }

  if (entry._isNew) {
    // Remove new entry
    const index = entries.value.findIndex(e => e.id === entry.id || e._tempId === entry.id)
    if (index !== -1) {
      entries.value.splice(index, 1)
      // 從本地儲存中移除已取消嘅詞條
      removeEntryFromLocalStorage((entry as any)._tempId || entry.id || '')
    }
  } else {
    // 只回滾當前詞條（唔刷新整表，避免其他未保存詞條被沖走/本地草稿被覆寫）
    const restored = restoreEntryFromBaseline(entry)
    if (!restored) {
      try {
        const resp = await $fetch<{ success: boolean; data?: any }>(`/api/entries/${entry.id}`)
        if (resp?.success && resp.data) {
          applyDraftOntoEntry(entry, { ...resp.data, _isNew: false, _isDirty: false } as any)
        }
        entry._isDirty = false
        setBaselineForEntry(entry)
      } catch (e) {
        console.error('Failed to restore entry from server:', e)
        // 兜底：至少清除 dirty，避免一直顯示「有修改」
        entry._isDirty = false
      }
    }
    removeEntryFromLocalStorage(entry.id || '')
  }
}

async function deleteEntry(entry: Entry) {
  if (!confirm(`確定要刪除詞條「${entry.headword?.display || entry.text}」嗎？`)) {
    return
  }

  try {
    await $fetch<unknown>(`/api/entries/${entry.id}`, { method: 'DELETE' })
    // 從本地儲存中移除已刪除嘅詞條
    removeEntryFromLocalStorage(entry.id || '')

    // 聚合／詞語視圖的表格數據來自 aggregatedGroups/lexemeGroups，須重新拉取才能更新；平鋪視圖直接從 entries 移除即可
    if (viewMode.value === 'aggregated' || viewMode.value === 'lexeme') {
      await fetchEntries()
    } else {
      const index = entries.value.findIndex(e => e.id === entry.id)
      if (index !== -1) {
        entries.value.splice(index, 1)
        pagination.total--
      }
    }
  } catch (error: any) {
    console.error('Failed to delete entry:', error)
    alert(error?.data?.message || '刪除失敗')
  }
}

// Fetch entries
async function fetchEntries() {
  loading.value = true
  try {
    const query: Record<string, any> = {
      page: currentPage.value,
      perPage: pagination.perPage,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value
    }

    if (searchQuery.value) query.query = searchQuery.value
    if (filters.region && filters.region !== ALL_FILTER_VALUE) query.dialectName = filters.region
    if (filters.status && filters.status !== ALL_FILTER_VALUE) query.status = filters.status
    if (filters.theme && filters.theme !== ALL_FILTER_VALUE) query.themeIdL3 = Number(filters.theme)

    if (viewMode.value === 'aggregated') query.groupBy = 'headword'
    if (viewMode.value === 'lexeme') query.groupBy = 'lexeme'

    const response = await $fetch<{ data: any[]; total: number; page: number; perPage: number; totalPages: number; grouped?: boolean }>('/api/entries', { query })

    if (response.grouped && Array.isArray(response.data)) {
      const nextGroups = response.data.map((g: any) => ({
        headwordDisplay: g.headwordDisplay ?? g.headwordNormalized ?? '',
        headwordNormalized: g.headwordNormalized ?? g.headwordDisplay ?? '',
        entries: (g.entries ?? []).map((e: any) => ({ ...e, _isNew: false, _isDirty: false } as Entry))
      }))
      // baseline：以伺服器返回狀態為準（取消編輯用）
      const nextBaseline = new Map<string, any>()
      nextGroups.forEach((g: any) => g.entries.forEach((e: any) => nextBaseline.set(String(e.id ?? ''), makeBaselineSnapshot(e))))
      entryBaselineById.value = nextBaseline

      if (viewMode.value === 'lexeme') lexemeGroups.value = nextGroups
      else aggregatedGroups.value = nextGroups
      entries.value = []
    } else {
      const nextEntries = response.data.map((e: any) => ({ ...e, _isNew: false, _isDirty: false } as Entry))
      const nextBaseline = new Map<string, any>()
      nextEntries.forEach((e: any) => nextBaseline.set(String(e.id ?? ''), makeBaselineSnapshot(e)))
      entryBaselineById.value = nextBaseline

      entries.value = nextEntries
      aggregatedGroups.value = []
      lexemeGroups.value = []
    }
    
    // 恢復本地儲存嘅草稿：
    // - 任何頁面/篩選都會嘗試「覆蓋到當前已載入嘅詞條」（避免 fetch 後草稿消失）
    // - 只喺「第一頁 + 無搜尋/篩選」先會把「搵唔到對應詞條」嘅草稿插入列表頂部（避免干擾篩選結果）
    const restoredEntries = restoreEntriesFromLocalStorage()
    const canInsertOrphans =
      currentPage.value === 1 &&
      !searchQuery.value &&
      filters.region === ALL_FILTER_VALUE &&
      filters.status === ALL_FILTER_VALUE &&
      filters.theme === ALL_FILTER_VALUE

    if (restoredEntries.length > 0) {
      if (viewMode.value === 'aggregated' || viewMode.value === 'lexeme') {
        restoredEntries.forEach((restoredEntry) => {
          const restoredId = String((restoredEntry as any).id ?? '')
          let applied = false
          if (restoredId) {
            const base = viewMode.value === 'lexeme' ? lexemeGroups.value : aggregatedGroups.value
            for (const g of base) {
              const hit = g.entries.find(e => String((e as any).id ?? '') === restoredId)
              if (hit) {
                applyDraftOntoEntry(hit, restoredEntry)
                applied = true
                break
              }
            }
          }
          if (!applied && canInsertOrphans) entries.value.unshift(restoredEntry)
        })
      } else {
        restoredEntries.forEach((restoredEntry) => {
          const restoredId = String((restoredEntry as any).id ?? '')
          const hit = restoredId ? entries.value.find(e => String((e as any).id ?? '') === restoredId) : null
          if (hit) applyDraftOntoEntry(hit, restoredEntry)
          else if (canInsertOrphans) entries.value.unshift(restoredEntry)
        })
      }
    }
    
    pagination.total = response.total
    pagination.page = response.page
    pagination.totalPages = response.totalPages
  } catch (error) {
    console.error('Failed to fetch entries:', error)
  } finally {
    loading.value = false
  }
}

// Handlers
function handleSearch() {
  currentPage.value = 1
  fetchEntries()
}

function handleSort(key: string) {
  if (!SORTABLE_COLUMN_KEYS.includes(key as any)) return
  if (sortBy.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = key
    sortOrder.value = 'asc'
  }
  fetchEntries()
}

// Watch for page changes
watch(currentPage, () => {
  fetchEntries()
})

// Watch for filter changes (sidebar or page dropdowns) - reset to page 1 and fetch
watch([() => filters.region, () => filters.status, () => filters.theme], () => {
  currentPage.value = 1
  fetchEntries()
})

// 監聽 entries / 聚合 groups 變化，即時保存到本地儲存
watch(
  [() => entries.value, () => aggregatedGroups.value, () => lexemeGroups.value],
  () => {
    // 收集所有需要保存嘅詞條（新建或已修改）
    const allEntries: Entry[] = []
    
    // 從 entries 中收集
    entries.value.forEach(e => {
      if ((e as any)._isNew || e._isDirty) {
        allEntries.push(e)
      }
    })
    
    // 從 aggregatedGroups 中收集
    aggregatedGroups.value.forEach(g => {
      g.entries.forEach(e => {
        if ((e as any)._isNew || e._isDirty) {
          allEntries.push(e)
        }
      })
    })

    // 從 lexemeGroups 中收集
    lexemeGroups.value.forEach(g => {
      g.entries.forEach(e => {
        if ((e as any)._isNew || e._isDirty) {
          allEntries.push(e)
        }
      })
    })
    
    saveEntriesToLocalStorage(allEntries)
  },
  { deep: true }
)

// Initial fetch
onMounted(fetchEntries)

// 審核員新建詞條預設方言：從 localStorage 恢復
onMounted(() => {
  if (import.meta.client) {
    const stored = localStorage.getItem(REVIEWER_NEW_ENTRY_DIALECT_KEY)
    if (stored && newEntryDialectOptions.some(o => o.value === stored)) {
      reviewerDefaultDialectForNew.value = stored as DialectId
    }
  }
})
watch(reviewerDefaultDialectForNew, (v) => {
  if (import.meta.client && v) {
    localStorage.setItem(REVIEWER_NEW_ENTRY_DIALECT_KEY, v)
  }
})
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

/* Notion 風格：所有列自動換行顯示（Wrap column），最多 4 行 */
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

/* 內聯編輯：輸入框與 textarea */
.cell-inline-input {
  min-height: 1.75rem;
}

</style>
