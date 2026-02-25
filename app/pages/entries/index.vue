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
            個{{ viewModeEntityLabel }}
            <span v-if="hasUnsavedChanges" class="ml-2 text-amber-600">· 有未保存的更改</span>
          </p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <!-- 新建詞條時預設方言：審核員/管理員可選全部；貢獻者有多個方言權限時可選其一 -->
          <div v-if="isAuthenticated && showNewEntryDialectSelector" class="flex items-center gap-2">
            <span class="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">新建時方言</span>
            <USelectMenu
              v-model="defaultDialectForNew"
              :items="newEntryDialectOptionsForSelector"
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
          <div class="flex items-center gap-1 border-l border-gray-200 dark:border-gray-600 pl-2">
            <UTooltip text="根據本頁內容自動調整各欄寬度">
              <UButton
                size="xs"
                variant="ghost"
                color="neutral"
                icon="i-heroicons-arrows-right-left"
                @click="autoFit(tableRef, editableColumns.map(c => c.key))"
              />
            </UTooltip>
            <UTooltip text="重置所有欄寬為默認值">
              <UButton
                size="xs"
                variant="ghost"
                color="neutral"
                icon="i-heroicons-arrow-path"
                @click="resetWidths"
              />
            </UTooltip>
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
                class="relative select-none px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 overflow-hidden"
                :class="SORTABLE_COLUMN_KEYS.includes(col.key as any) ? 'cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800' : ''"
                @click="handleSort(col.key)"
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
                  @mousedown.stop="startResize($event, col.key, columnWidths[col.key] ?? parseInt(col.width, 10))"
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
                    @click="openExternalEtymonsForGroup(String(row.group.headwordNormalized || ''), String(row.group.headwordDisplay || ''), row.group.entries)"
                  />
                  <UButton
                    v-if="viewMode === 'lexeme' && canEditExternalEtymons && !String(row.group.headwordNormalized || '').startsWith('__unassigned__:')"
                    icon="i-heroicons-folder-plus"
                    color="primary"
                    variant="ghost"
                    size="xs"
                    title="合併到其他詞語組"
                    :ui="{ base: 'hover:bg-primary-500/10 dark:hover:bg-primary-500/20' }"
                    @click="openMergeModalForGroup(String(row.group.headwordNormalized || ''), String(row.group.headwordDisplay || ''), row.group.entries.map(e => String(e.id || (e as any)._tempId || '')).filter(Boolean))"
                  />
                  <UButton
                    :icon="expandedGroupKeys.has(row.group.headwordNormalized) ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
                    color="primary"
                    variant="ghost"
                    size="xs"
                    :aria-label="expandedGroupKeys.has(row.group.headwordNormalized) ? '收合' : '展開'"
                    :ui="{ base: 'hover:bg-primary-500/10 dark:hover:bg-primary-500/20' }"
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
                :key="`${getEntryKey(row.entry)}-${col.key}`"
                :col="col"
                :can-edit="canEditEntry(row.entry)"
                :is-editing="isEditing(getEntryKey(row.entry), col.key)"
                v-model:edit-value="editValue"
                :display-text="getCellDisplay(row.entry, col)"
                :cell-class="getCellClass(row.entry, col.key).join(' ')"
                :wrap="useWrapForField(col.key)"
                :is-selected="isSelected(rowIndex, colIndex)"
                :column-options="getColumnOptions(col)"
                :review-notes="col.key === 'status' && row.entry.status === 'rejected' ? row.entry.reviewNotes : undefined"
                :show-ai-definition="col.key === 'definition' && !!row.entry.headword?.display && !row.entry.senses?.[0]?.definition"
                :show-ai-theme="col.key === 'theme' && !!row.entry.headword?.display && !row.entry.theme?.level3Id"
                :ai-loading-definition="(aiLoadingFor?.entryKey === getEntryKey(row.entry) && aiLoadingFor?.action === 'definition') || (!!aiLoadingInlineFor && aiLoadingInlineFor.field === 'definition' && getEntryIdString(row.entry) === aiLoadingInlineFor.entryId)"
                :ai-loading-theme="(aiLoadingFor?.entryKey === getEntryKey(row.entry) && aiLoadingFor?.action === 'theme') || (!!aiLoadingInlineFor && getEntryIdString(row.entry) === aiLoadingInlineFor.entryId)"
                :show-expand="col.key === 'definition'"
                :is-expanded="expandedEntryId === getEntryIdString(row.entry)"
                :expand-hint="col.key === 'definition' ? getDefinitionExpandHint(row.entry) : undefined"
                :headword-expand-hint="col.key === 'headword' ? getHeadwordExpandHint(row.entry) : undefined"
                :phonetic-hint="col.key === 'phonetic' ? getPhoneticHint(row.entry) : undefined"
                :theme-id="col.key === 'theme' ? row.entry.theme?.level3Id : undefined"
                :is-theme-expanded="expandedThemeEntryId === getEntryIdString(row.entry)"
                @click="handleCellClick(row.entry, col.key, $event, rowIndex, colIndex)"
                @set-ref="(el: any) => setInputRef(el, getEntryIdString(row.entry), col.key)"
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
                :is-morpheme-refs-expanded="expandedMorphemeRefsEntryId === getEntryIdString(row.entry)"
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
              v-if="row.type === 'entry' && aiSuggestion && aiSuggestionForField && editingCell && editingCell.field === aiSuggestionForField && getEntryIdString(row.entry) === String(editingCell.entryId)"
              :text="aiSuggestion"
              :title="aiSuggestionForField === 'theme' ? 'AI 分類建議' : 'AI 釋義建議'"
              :colspan="editableColumns.length + 2"
              @accept="acceptAISuggestion"
              @dismiss="dismissAISuggestion"
            />
            <!-- 行內 AI 分類建議 -->
            <AISuggestionRow
              v-if="row.type === 'entry' && focusedCell?.rowIndex === rowIndex && focusedCell?.colIndex === themeColIndex && themeAISuggestions.get(getEntryIdString(row.entry))"
              :text="formatThemeSuggestion(themeAISuggestions.get(getEntryIdString(row.entry)))"
              title="AI 分類建議"
              :colspan="editableColumns.length + 2"
              @accept="acceptThemeAI(row.entry)"
              @dismiss="dismissThemeAI(row.entry)"
            />
            <!-- 泛粵典粵拼建議 -->
            <JyutdictSuggestionRow
              v-if="row.type === 'entry' && focusedCell?.rowIndex === rowIndex && focusedCell?.colIndex === phoneticColIndex && getJyutdictVisible(getEntryIdString(row.entry))"
              :colspan="editableColumns.length + 2"
              :char-data="getJyutdictData(getEntryIdString(row.entry))"
              :dialect-name="getDialectLabel(row.entry.dialect?.name || '') || row.entry.dialect?.name || ''"
              :suggested-pronunciation="getJyutdictSuggested(getEntryIdString(row.entry))"
              :is-loading="getJyutdictLoading(getEntryIdString(row.entry))"
              @accept="(pronunciation: string) => acceptJyutdict(row.entry, pronunciation)"
              @dismiss="dismissJyutdict(row.entry)"
            />
            <!-- 詞頭重複檢測 -->
            <DuplicateCheckRow
              v-if="row.type === 'entry' && focusedCell?.rowIndex === rowIndex && (getDuplicateCheckLoading(getEntryIdString(row.entry)) || getDuplicateCheckEntriesFormatted(getEntryIdString(row.entry)).length > 0)"
              :colspan="editableColumns.length + 2"
              :entries="getDuplicateCheckEntriesFormatted(getEntryIdString(row.entry))"
              :is-loading="getDuplicateCheckLoading(getEntryIdString(row.entry))"
              @dismiss="dismissDuplicateCheck(row.entry)"
            />
            <!-- 其他方言點已有該詞條（若已觸發同方言詞頭重複檢測則不再顯示，避免重複提示） -->
            <OtherDialectsRefRow
              v-if="
                row.type === 'entry' &&
                focusedCell?.rowIndex === rowIndex &&
                getOtherDialectsFormatted(getEntryIdString(row.entry)).length > 0 &&
                getDuplicateCheckEntriesFormatted(getEntryIdString(row.entry)).length === 0
              "
              :colspan="editableColumns.length + 2"
              :entries="getOtherDialectsFormatted(getEntryIdString(row.entry))"
              @dismiss="dismissDuplicateCheck(row.entry)"
              @apply-template="applyOtherDialectTemplate(row.entry, $event)"
            />
            <!-- Jyutjyu 參考（新建詞條：填寫詞頭後自動查詢） -->
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
              @dismiss="dismissJyutjyuRef(row.entry)"
              @apply-template="applyJyutjyuTemplate(row.entry, $event)"
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
              v-if="row.type === 'entry' && expandedEntryId === getEntryIdString(row.entry)"
              class="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700"
            >
              <td :colspan="editableColumns.length + 2" class="p-0 align-top">
                <EntrySensesExpand
                  :entry="row.entry"
                  :ai-suggestion="definitionAISuggestions.get(getEntryIdString(row.entry))"
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
              v-if="row.type === 'entry' && expandedThemeEntryId === getEntryIdString(row.entry)"
              class="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700"
            >
              <td :colspan="editableColumns.length + 2" class="p-0 align-top">
                <EntryThemeExpand
                  :entry="row.entry"
                  :ai-suggestion="themeAISuggestions.get(getEntryIdString(row.entry))"
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
import { useAuth, useProfileUpdatedUser } from '~/composables/useAuth'
import { getThemeById, getThemeNameById, getFlatThemeList } from '~/composables/useThemeData'
import { dialectOptionsWithAll, DIALECT_OPTIONS_FOR_SELECT, getDialectLabel, getDialectLabelByRegionCode } from '~/utils/dialects'
import { getEntryKey, getEntryIdString } from '~/utils/entryKey'
import { ALL_FILTER_VALUE, SORTABLE_COLUMN_KEYS, STATUS_LABELS, ENTRY_TYPE_LABELS } from '~/utils/entriesTableConstants'
import { getGroupPhonetic, getGroupEntryType, getGroupTheme, getGroupRegister, getGroupStatus } from '~/composables/useEntryGroupDisplay'
import { useEntriesTableColumns } from '~/composables/useEntriesTableColumns'
import { useColumnResize } from '~/composables/useColumnResize'
import { deepCopy, getEntryIdKey, makeBaselineSnapshot, useEntryBaseline } from '~/composables/useEntryBaseline'
import { ensureSensesStructure, addSense, removeSense, addExample, removeExample, addSubSense, removeSubSense, addSubSenseExample, removeSubSenseExample } from '~/composables/useEntrySenses'
import { useEntriesList } from '~/composables/useEntriesList'
import { useEntriesSelection } from '~/composables/useEntriesSelection'
import { useNewEntryDialect } from '~/composables/useNewEntryDialect'
import { useEntryMorphemeRefs } from '~/composables/useEntryMorphemeRefs'
import { useEntriesTableEdit } from '~/composables/useEntriesTableEdit'
import { useEntriesAISuggestions } from '~/composables/useEntriesAISuggestions'
import { useEntriesRowHints } from '~/composables/useEntriesRowHints'
import type { DialectId } from '~shared/dialects'
import { saveEntriesToLocalStorage, restoreEntriesFromLocalStorage, clearEntriesLocalStorage, removeEntryFromLocalStorage } from '~/composables/useEntriesLocalStorage'
import type { Entry, Register } from '~/types'
import AISuggestionRow from '~/components/entries/AISuggestionRow.vue'
import JyutdictSuggestionRow from '~/components/entries/JyutdictSuggestionRow.vue'
import EntrySensesExpand from '~/components/entries/EntrySensesExpand.vue'
import EntryThemeExpand from '~/components/entries/EntryThemeExpand.vue'
import EntryRowActions from '~/components/entries/EntryRowActions.vue'
import EntriesEditableCell from '~/components/entries/EntriesEditableCell.vue'
import DuplicateCheckRow from '~/components/entries/DuplicateCheckRow.vue'
import OtherDialectsRefRow from '~/components/entries/OtherDialectsRefRow.vue'
import JyutjyuRefRow from '~/components/entries/JyutjyuRefRow.vue'
import LexemeExternalEtymonsModal from '~/components/entries/LexemeExternalEtymonsModal.vue'
import LexemeMergeModal from '~/components/entries/LexemeMergeModal.vue'

definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

const { isAuthenticated, user } = useAuth()
const profileUpdatedUser = useProfileUpdatedUser()

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
    // 域外方音需先有已保存的詞條（有真實 id）才能調 PATCH；未保存詞條無法綁定 lexeme
    const savedEntries = groupEntries.filter(e => !(e as any)._isNew)
    if (savedEntries.length === 0) {
      alert('此組僅含未保存詞條，請先保存詞條後再操作域外方音。')
      return
    }
    if (!confirm(`此組尚未綁定詞語。是否為 ${groupEntries.length} 條詞條創建新詞語組？`)) {
      return
    }
    try {
      // 用第一個「已保存」的詞條創建 lexemeId（未保存的沒有資料庫 id，無法 PATCH）
      const firstEntry = savedEntries[0]!
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
      
      // 將該組其他「已保存」的 entry 也加入同一個 lexemeId；未保存的僅在本地寫入 lexemeId，保存時會帶上
      const othersSaved = savedEntries.slice(1)
      if (othersSaved.length > 0) {
        await Promise.all(
          othersSaved.map((entry) =>
            $fetch(`/api/entries/${entry.id}/lexeme`, {
              method: 'PATCH',
              body: { action: 'set', lexemeId: newLexemeId }
            })
          )
        )
      }
      // 未保存的詞條：本地寫入 lexemeId，保存新詞條時 POST body 會帶上
      groupEntries.filter(e => (e as any)._isNew).forEach((e) => {
        ;(e as any).lexemeId = newLexemeId
      })
      
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
  const id = getEntryIdString(entry)
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
/** 詞條 baseline（用於「取消編輯」回滾，避免刷新整個頁面誤傷其他未保存內容）。key: entry.id */
const entryBaselineById = ref<Map<string, any>>(new Map())
const { setBaselineForEntry, restoreEntryFromBaseline, applyDraftOntoEntry } = useEntryBaseline(entryBaselineById)
/** 視圖模式：平鋪（一列一條）或聚合（一列一詞形，可展開多方言） */
const viewMode = ref<'flat' | 'aggregated' | 'lexeme'>('flat')
/** 當前視圖對應的實體標籤（詞條/詞形/詞語），用於標題與空狀態文案 */
const viewModeEntityLabel = computed(() => ({ flat: '詞條', aggregated: '詞形', lexeme: '詞語' }[viewMode.value] ?? '詞條'))
/** 聚合視圖下已展開的詞形（headwordNormalized），用 Set 便於切換 */
const expandedGroupKeys = ref<Set<string>>(new Set())
const saving = ref(false)
const searchQuery = ref('')
const sortBy = ref('createdAt')
const sortOrder = ref<'asc' | 'desc'>('desc')
const { entries, aggregatedGroups, lexemeGroups, loading, currentPage, pagination, fetchEntries, handleSearch, handleSort } = useEntriesList(viewMode, searchQuery, filters, sortBy, sortOrder, entryBaselineById, makeBaselineSnapshot, applyDraftOntoEntry)
/** API 僅支援以下欄位排序 */

// Inline editing state
const editingCell = ref<{ entryId: string; field: string } | null>(null)
const editValue = ref<any>('')
const inputRefs = ref<Map<string, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>>(new Map())

// 唯一焦點格：未編輯時表示「選中格」（方向鍵/Enter/Tab 目標），編輯時即正在編輯的格
const focusedCell = ref<{ rowIndex: number; colIndex: number } | null>(null)
const tableWrapperRef = ref<HTMLElement | null>(null)
const tableRef = ref<HTMLTableElement | null>(null)

// 方案 B：行展開編輯釋義詳情（多義項、例句、分義項）。值為當前展開的 entry id
const expandedEntryId = ref<string | null>(null)

// 詞素引用展開狀態
const expandedMorphemeRefsEntryId = ref<string | null>(null)

// 主題展開狀態
const expandedThemeEntryId = ref<string | null>(null)

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

const {
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
} = useEntriesSelection(currentPageEntries, fetchEntries)

const {
  aiSuggestion,
  aiSuggestionForField,
  pendingAISuggestions,
  themeAISuggestions,
  definitionAISuggestions,
  aiLoadingFor,
  aiLoading,
  aiLoadingInlineFor,
  aiInlineError,
  formatThemeSuggestion,
  triggerAISuggestion,
  generateAIExamples,
  generateAIDefinition,
  generateAICategorization,
  clearPendingSuggestionForCurrentCell,
  retryInlineAISuggestion,
  acceptAISuggestion,
  dismissAISuggestion,
  acceptThemeAI,
  dismissThemeAI,
  clearThemeSuggestionForEntry,
  acceptDefinitionAI,
  dismissDefinitionAI
} = useEntriesAISuggestions({ editingCell, editValue, currentPageEntries })

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

// Notion 風格：所有列在瀏覽態自動換行顯示（Wrap column），最多 4 行
function useWrapForField(_field: string) {
  return true
}

function isSelected(rowIndex: number, colIndex: number) {
  const f = focusedCell.value
  return f != null && f.rowIndex === rowIndex && f.colIndex === colIndex
}

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

// 貢獻者實際使用的 dialectPermissions：個人資料更新後以 profileUpdatedUser 為準，否則用 session user
const effectiveDialectPermissions = computed(() => {
  const currentUser = user.value
  if (!currentUser) return []
  if (currentUser.role === 'reviewer' || currentUser.role === 'admin') return null
  const fromProfile = profileUpdatedUser.value?.id === currentUser.id ? profileUpdatedUser.value.dialectPermissions : null
  return fromProfile ?? currentUser.dialectPermissions ?? []
})

// 用戶可用嘅方言選項（用於表格編輯下拉）
const userDialectOptions = computed(() => {
  const currentUser = user.value
  if (!currentUser) return []

  // 審核員和管理員可以選擇所有方言
  if (currentUser.role === 'reviewer' || currentUser.role === 'admin') {
    return DIALECT_OPTIONS_FOR_SELECT
  }

  // 貢獻者：使用 effectiveDialectPermissions（個人資料更新後即時反映刪除/新增）
  const perms = effectiveDialectPermissions.value ?? []
  const seen = new Set<string>()
  return perms
    .filter(p => {
      if (seen.has(p.dialectName)) return false
      seen.add(p.dialectName)
      return true
    })
    .map(p => ({
      value: p.dialectName,
      label: dialectCodeToName[p.dialectName] || p.dialectName
    }))
})

const {
  defaultDialectForNew,
  newEntryDialectOptionsForSelector,
  showNewEntryDialectSelector,
  getUserDefaultDialect
} = useNewEntryDialect(isReviewerOrAdmin, userDialectOptions, user, effectiveDialectPermissions)

const { editableColumns, themeColIndex, phoneticColIndex, headwordColIndex } = useEntriesTableColumns(userDialectOptions, themeOptions, statusOptionsForTable)

// 欄寬調整：預設寬度從 editableColumns 的 width 字段讀取
const defaultColumnWidths = computed(() =>
  Object.fromEntries(editableColumns.value.map(col => [col.key, parseInt(col.width, 10)]))
)
const { columnWidths, resizingCol: _resizingCol, startResize, autoFit, resetWidths } = useColumnResize(defaultColumnWidths.value)
// 當 editableColumns 變動時補齊新欄（如首次渲染時 computed 還未穩定）
watch(defaultColumnWidths, (newDefaults) => {
  for (const [key, val] of Object.entries(newDefaults)) {
    if (!(key in columnWidths.value)) {
      columnWidths.value[key] = val
    }
  }
}, { immediate: false })

const tableEdit = useEntriesTableEdit(editableColumns, dialectCodeToName)
const getCellDisplay = tableEdit.getCellDisplay as (entry: Entry, col: { key: string; type: string; get: (e: Entry) => unknown }) => string
const getCellClass = tableEdit.getCellClass
const getColumnOptions = tableEdit.getColumnOptions as (col: { getOptions?: () => unknown[]; options?: unknown[] }) => Array<{ value: string; label: string }>
const resizeTextarea = tableEdit.resizeTextarea

const rowHints = useEntriesRowHints({ editableColumns, editingCell, editValue })
const jyutdictData = rowHints.jyutdictData
const jyutdictLoading = rowHints.jyutdictLoading
const jyutdictSuggested = rowHints.jyutdictSuggested
const jyutdictVisible = rowHints.jyutdictVisible
const jyutdictHandled = rowHints.jyutdictHandled
const duplicateCheckResult = rowHints.duplicateCheckResult
const jyutjyuRefResult = rowHints.jyutjyuRefResult
const jyutjyuRefVisible = rowHints.jyutjyuRefVisible
const jyutjyuRefHandled = rowHints.jyutjyuRefHandled
const getJyutdictData = rowHints.getJyutdictData
const getJyutdictLoading = rowHints.getJyutdictLoading
const getJyutdictSuggested = rowHints.getJyutdictSuggested
const getJyutdictVisible = rowHints.getJyutdictVisible
const getJyutjyuHandledKey = rowHints.getJyutjyuHandledKey
const getJyutjyuRowVisible = rowHints.getJyutjyuRowVisible
const getJyutjyuVisible = rowHints.getJyutjyuVisible
const getJyutjyuLoading = rowHints.getJyutjyuLoading
const getJyutjyuError = rowHints.getJyutjyuError
const getJyutjyuTotal = rowHints.getJyutjyuTotal
const getJyutjyuQuery = rowHints.getJyutjyuQuery
const formatJyutjyuResults = rowHints.formatJyutjyuResults
const runJyutjyuRef = rowHints.runJyutjyuRef
const queryJyutdictForEntry = rowHints.queryJyutdictForEntry
const runDuplicateCheck = rowHints.runDuplicateCheck
const formatDuplicateEntries = rowHints.formatDuplicateEntries
const formatOtherDialectsEntries = rowHints.formatOtherDialectsEntries
const getDuplicateCheckEntriesFormatted = rowHints.getDuplicateCheckEntriesFormatted
const getOtherDialectsFormatted = rowHints.getOtherDialectsFormatted
const applyOtherDialectTemplate = rowHints.applyOtherDialectTemplate
const applyJyutjyuTemplate = rowHints.applyJyutjyuTemplate
const dismissDuplicateCheck = rowHints.dismissDuplicateCheck
const getDuplicateCheckVisible = rowHints.getDuplicateCheckVisible
const getDuplicateCheckLoading = rowHints.getDuplicateCheckLoading
const getDuplicateCheckRowVisible = rowHints.getDuplicateCheckRowVisible
const getOtherDialectsRowVisible = rowHints.getOtherDialectsRowVisible
const acceptJyutdict = rowHints.acceptJyutdict
const dismissJyutdict = rowHints.dismissJyutdict
const dismissJyutjyuRef = rowHints.dismissJyutjyuRef

function dismissTopHintForEntry(entry: Entry, colIndex?: number): boolean {
  const entryId = getEntryIdString(entry)
  if (aiSuggestion.value && editingCell.value && String(editingCell.value.entryId) === entryId && editingCell.value.field === aiSuggestionForField.value) {
    dismissAISuggestion()
    return true
  }
  if (colIndex === themeColIndex.value && themeAISuggestions.value.get(entryId)) {
    dismissThemeAI(entry)
    return true
  }
  if (colIndex === phoneticColIndex.value && getJyutdictVisible(entryId)) {
    dismissJyutdict(entry)
    return true
  }
  if (getDuplicateCheckRowVisible(entryId)) {
    dismissDuplicateCheck(entry)
    return true
  }
  if (getOtherDialectsRowVisible(entryId)) {
    dismissDuplicateCheck(entry)
    return true
  }
  if (getJyutjyuRowVisible(entryId)) {
    dismissJyutjyuRef(entry)
    return true
  }
  return false
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

function toggleSensesExpand(entry: Entry) {
  const key = getEntryIdString(entry)
  const opening = expandedEntryId.value !== key
  expandedEntryId.value = expandedEntryId.value === key ? null : key
  if (opening && expandedEntryId.value === key) ensureSensesStructure(entry)
}

function toggleMorphemeRefsExpand(entry: Entry) {
  const key = getEntryIdString(entry)
  expandedMorphemeRefsEntryId.value = expandedMorphemeRefsEntryId.value === key ? null : key
}

const {
  morphemeSearchModalOpen,
  morphemeSearchTargetEntry,
  morphemeSearchResults,
  morphemeSearchLoading,
  unlinkedMorphemeEntryId,
  unlinkedMorphemeCandidates,
  openUnlinkedMorphemeForm,
  confirmUnlinkedMorphemeRefs,
  closeUnlinkedMorphemeForm,
  openMorphemeSearch,
  addMorphemeRef,
  removeMorphemeRef
} = useEntryMorphemeRefs(getEntryIdString)

function toggleThemeExpand(entry: Entry) {
  const key = getEntryIdString(entry)
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
  clearThemeSuggestionForEntry(entry)
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

  const col = editableColumns.value.find(c => c.key === field)
  if (!col) return

  const r = rowIndex ?? tableRows.value.findIndex(row => row.type === 'entry' && getEntryKey(row.entry) === getEntryKey(entry))
  const c = colIndex ?? editableColumns.value.findIndex(colDef => colDef.key === field)
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

  const entryId = getEntryIdString(entry)
  editingCell.value = { entryId, field }
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
  const col = editableColumns.value.find(c => c.key === field)
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
      const entryId = getEntryIdString(entry)
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
      if (dismissTopHintForEntry(entry, editableColumns.value.findIndex(c => c.key === field))) {
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
  const col = editableColumns.value.find(c => c.key === field)

  if (entry && col) {
    const oldValue = col.get(entry)
    if (oldValue !== editValue.value) {
      ;(col.set as (e: Entry, v: string | number | undefined) => void)(entry, editValue.value)
      entry._isDirty = true
    }
  }

  const rowIndex = entry ? tableRows.value.findIndex(r => r.type === 'entry' && (r.entry === entry || getEntryIdString(r.entry) === String(entryId))) : -1
  const colIndex = editableColumns.value.findIndex(c => c.key === field)
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
    const rowIndex = tableRows.value.findIndex(r => r.type === 'entry' && getEntryIdString(r.entry) === String(entryId))
    const colIndex = editableColumns.value.findIndex(c => c.key === field)
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
  const currentRowIndex = tableRows.value.findIndex(r => r.type === 'entry' && getEntryKey(r.entry) === getEntryKey(entry))
  const currentColIndex = editableColumns.value.findIndex(c => c.key === currentField)
  let nextRow = currentRowIndex
  let nextCol = currentColIndex + direction

  if (nextCol < 0) {
    nextCol = editableColumns.value.length - 1
    nextRow--
  } else if (nextCol >= editableColumns.value.length) {
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
  const nextColDef = editableColumns.value[nextCol]
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
  const cols = editableColumns.value.length
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
      if (colIndex === themeColIndex.value && currentEntry && themeAISuggestions.value.get(entryKeyForTheme)) {
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
      const tabColDef = editableColumns.value[nextCol]
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
      const colDef = editableColumns.value[colIndex]
      if (entry && colDef) {
        handleCellClick(entry, colDef.key, event, rowIndex, colIndex, true)
      }
      return
    default:
      // Notion: 直接輸入字符激活當前選中格進入編輯，並把該字符填入
      if (focusedCell.value && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const typableEntry = entries.value[focusedCell.value.rowIndex]
        const typableCol = editableColumns.value[focusedCell.value.colIndex]
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
    await Promise.all(dirtyEntries.map(entry => {
      const putBody: Record<string, unknown> = {
        headword: entry.headword,
        dialect: entry.dialect,
        phonetic: entry.phonetic,
        entryType: entry.entryType,
        senses: entry.senses,
        theme: entry.theme,
        meta: entry.meta,
        status: entry.status
      }
      const lexemeId = (entry as any).lexemeId
      if (lexemeId !== undefined && lexemeId !== null && !String(lexemeId).startsWith('__unassigned__:')) {
        putBody.lexemeId = lexemeId
      }
      if (entry.morphemeRefs !== undefined) {
        putBody.morphemeRefs = entry.morphemeRefs || []
      }
      return $fetch<unknown>(`/api/entries/${entry.id}`, {
        method: 'PUT',
        body: putBody
      })
    }))

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
  if (editingCell.value && String(editingCell.value.entryId) === getEntryIdString(entry)) {
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
