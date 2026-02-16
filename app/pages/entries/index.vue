<template>
  <div class="h-full flex flex-col">
    <!-- Page header -->
    <div class="mb-4 flex-shrink-0">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div class="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <UIcon name="i-heroicons-table-cells" class="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            詞條表格
          </h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            共 <span class="font-semibold text-gray-700 dark:text-gray-300">{{ pagination.total }}</span> {{ viewMode === 'aggregated' ? '個詞形' : '個詞條' }}
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
                { value: 'aggregated', label: '按詞形聚合' }
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
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">{{ viewMode === 'aggregated' ? '暫無詞形' : '暫無詞條' }}</h3>
      <p class="text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
        {{ searchQuery ? (viewMode === 'aggregated' ? '沒有找到匹配的詞形' : '沒有找到匹配的詞條，請嘗試其他關鍵詞') : (viewMode === 'aggregated' ? '可切換為平鋪視圖或點擊上方按鈕新建詞條' : '點擊上方按鈕開始創建第一個詞條') }}
      </p>
      <UButton
        v-if="isAuthenticated && !searchQuery"
        size="lg"
        color="primary"
        icon="i-heroicons-plus"
        @click="addNewRow"
      >
        {{ viewMode === 'aggregated' ? '新建詞條' : '創建第一個詞條' }}
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
                <UButton
                  :icon="expandedGroupKeys.has(row.group.headwordNormalized) ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  :aria-label="expandedGroupKeys.has(row.group.headwordNormalized) ? '收合' : '展開'"
                  @click="toggleGroupExpanded(row.group.headwordNormalized)"
                />
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
                @save="(row.entry as any)._isNew ? saveNewEntry(row.entry) : saveEntryChanges(row.entry)"
                @duplicate="duplicateEntry(row.entry)"
                @delete="deleteEntry(row.entry)"
                @cancel="cancelEdit(row.entry)"
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
            <!-- 其他方言點已有該詞條 -->
            <OtherDialectsRefRow
              v-if="row.type === 'entry' && focusedCell?.rowIndex === rowIndex && getOtherDialectsFormatted(String(row.entry.id ?? (row.entry as any)._tempId ?? '')).length > 0"
              :colspan="editableColumns.length + 2"
              :entries="getOtherDialectsFormatted(String(row.entry.id ?? (row.entry as any)._tempId ?? ''))"
              @dismiss="dismissDuplicateCheck(row.entry)"
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
</template>

<script setup lang="ts">
import { useAuth } from '~/composables/useAuth'
import { getThemeById, getThemeNameById, getFlatThemeList } from '~/composables/useThemeData'
import { dialectOptionsWithAll, DIALECT_OPTIONS_FOR_SELECT, DIALECT_CODE_TO_NAME, getDialectLabel } from '~/utils/dialects'
import type { DialectId } from '~shared/dialects'
import { queryJyutdict, getSuggestedPronunciation } from '~/composables/useJyutdict'
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

definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

const { isAuthenticated, user } = useAuth()

// 主题选项列表（用于搜索下拉）
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
/** 視圖模式：平鋪（一列一條）或聚合（一列一詞形，可展開多方言） */
const viewMode = ref<'flat' | 'aggregated'>('flat')
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
/** 用户未採納/忽略就離開單元格時暫存建議，再點回該列時恢復顯示。key: `${entryId}-${field}` */
const pendingAISuggestions = ref<Map<string, { entryId: string, field: string, text: string }>>(new Map())
const aiDebounceTimer = ref<NodeJS.Timeout | null>(null)

// 唯一焦點格：未編輯時表示「選中格」（方向鍵/Enter/Tab 目標），編輯時即正在編輯的格
const focusedCell = ref<{ rowIndex: number; colIndex: number } | null>(null)
const tableWrapperRef = ref<HTMLElement | null>(null)

// 方案 B：行展開編輯釋義詳情（多義項、例句、分義項）。值為當前展開的 entry id
const expandedEntryId = ref<string | null>(null)

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

/** 詞頭重複檢測結果（新建詞條離開詞頭格時觸發）。sameDialect=同詞頭+同方言，otherDialects=同詞頭+其他方言可參考 */
const duplicateCheckResult = ref<Map<string, {
  loading: boolean
  entries?: Array<{ id: string, headword?: { display?: string }, dialect?: { name?: string }, status?: string, createdAt?: string }>
  otherDialects?: Array<{ id: string, headword?: { display?: string }, dialect?: { name?: string }, status?: string, createdAt?: string }>
}>>(new Map())

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
    const res = await $fetch<{ sameDialect: Array<{ id: string, headword?: { display?: string }, dialect?: { name?: string }, status?: string, createdAt?: string }>, otherDialects: Array<{ id: string, headword?: { display?: string }, dialect?: { name?: string }, status?: string, createdAt?: string }> }>('/api/entries/check-duplicate', {
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

function formatDuplicateEntries(list: Array<{ id: string, headword?: { display?: string }, dialect?: { name?: string }, status?: string, createdAt?: string }>): Array<{ id: string, headwordDisplay: string, dialectLabel: string, status: string, statusLabel: string, createdAtLabel: string }> {
  if (!list?.length) return []
  return list.map(e => ({
    id: e.id,
    headwordDisplay: e.headword?.display || '-',
    dialectLabel: DIALECT_CODE_TO_NAME[e.dialect?.name || ''] || e.dialect?.name || '-',
    status: e.status || 'draft',
    statusLabel: STATUS_LABELS[e.status || 'draft'] || e.status || '-',
    createdAtLabel: e.createdAt ? new Date(e.createdAt).toLocaleString('zh-HK', { dateStyle: 'short', timeStyle: 'short' }) : '-'
  }))
}

function getDuplicateCheckEntriesFormatted(entryId: string) {
  return formatDuplicateEntries(duplicateCheckResult.value.get(entryId)?.entries || [])
}

function getOtherDialectsFormatted(entryId: string) {
  return formatDuplicateEntries(duplicateCheckResult.value.get(entryId)?.otherDialects || [])
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

// 聚合視圖下用於展示的組列表（含新建未保存的「單條組」）— 須在 currentPageEntries 之前定義
const displayGroups = computed(() => {
  if (viewMode.value !== 'aggregated') return []
  const newOnes = entries.value
    .filter(e => (e as any)._isNew)
    .map(e => ({
      headwordDisplay: e.headword?.display || e.text || '',
      headwordNormalized: e.headword?.normalized || e.headword?.display || e.text || '',
      entries: [e]
    }))
  return [...newOnes, ...aggregatedGroups.value]
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
  const mode = v === 'aggregated' ? 'aggregated' : 'flat'
  viewMode.value = mode
  currentPage.value = 1
  fetchEntries()
}

const isEmpty = computed(() => {
  if (viewMode.value === 'flat') return entries.value.length === 0
  return aggregatedGroups.value.length === 0 && !entries.value.some(e => (e as any)._isNew)
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
      await $fetch(`/api/entries/${entry.id}`, { method: 'DELETE' })
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
    get: (entry: Entry) => entry.headword?.display || entry.text || '',
    set: (entry: Entry, value: string) => {
      if (!entry.headword) entry.headword = { display: '', search: '', normalized: '', isPlaceholder: false }
      entry.headword.display = value
      entry.text = value
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
    get: (entry: Entry) => entry.phonetic?.jyutping?.join(' ') || entry.phoneticNotation || '',
    set: (entry: Entry, value: string) => {
      if (!entry.phonetic) entry.phonetic = { jyutping: [] }
      entry.phonetic.jyutping = value.split(' ').filter(Boolean)
      entry.phoneticNotation = value
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

// 用户可用的方言選項（用於表格編輯下拉）
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

// 獲取用户的默認方言（新建詞條時使用）
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
  if (senseCount > 1) parts.push(`${senseCount}義項`)
  if (exampleCount > 0) parts.push(`${exampleCount}例`)
  return parts.join(' · ')
}

function getCellDisplay(entry: Entry, col: any) {
  const value = col.get(entry)
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

  // 當進入粵拼列編輯時，查詢泛粵典建議（已採納/忽略則不再顯示）
  if (field === 'phonetic') {
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
      // 如果有 AI 釋義建議，忽略它
      if (aiSuggestion.value) {
        dismissAISuggestion()
      }
      // 如果有粵拼建議，忽略它
      else if (getJyutdictVisible(String(entry.id ?? (entry as any)._tempId ?? ''))) {
        dismissJyutdict(entry)
      }
      // 如果有詞頭重複檢測提示，忽略它 (Esc)
      else if (getDuplicateCheckVisible(String(entry.id ?? (entry as any)._tempId ?? ''))) {
        dismissDuplicateCheck(entry)
      }
      else if (field === 'theme' && themeAISuggestions.value.get(String(entry.id ?? (entry as any)._tempId ?? ''))) {
        dismissThemeAI(entry)
      } else {
        cancelCellEdit()
      }
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
  // 未採納/忽略的建議暫存（按「建議目標列」存），等用户點回該列時再顯示
  if (aiSuggestion.value && aiSuggestionForField.value) {
    const key = `${String(entryId)}-${aiSuggestionForField.value}`
    pendingAISuggestions.value.set(key, { entryId: String(entryId), field: aiSuggestionForField.value, text: aiSuggestion.value })
    pendingAISuggestions.value = new Map(pendingAISuggestions.value)
  }
  editingCell.value = null
  aiSuggestion.value = null
  aiSuggestionForField.value = null
  // 新建詞條：離開詞頭格且已填寫詞頭時，做一次重複性檢測
  if (field === 'headword' && entry && (entry as any)._isNew && entry.headword?.display?.trim()) {
    runDuplicateCheck(entry)
  }
  const focusWrapper = options?.focusWrapper !== false
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
    // 未採納/忽略的建議暫存（按「建議目標列」存），等用户點回該列時再顯示
    if (aiSuggestion.value && aiSuggestionForField.value) {
      const key = `${String(entryId)}-${aiSuggestionForField.value}`
      pendingAISuggestions.value.set(key, { entryId: String(entryId), field: aiSuggestionForField.value, text: aiSuggestion.value })
      pendingAISuggestions.value = new Map(pendingAISuggestions.value)
    }
  }
  editingCell.value = null
  aiSuggestion.value = null
  aiSuggestionForField.value = null
  nextTick(() => tableWrapperRef.value?.focus())
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
      // 若當前行有詞頭重複檢測提示，Esc 忽略
      if (currentEntry && getDuplicateCheckVisible(String(currentEntry.id ?? (currentEntry as any)._tempId ?? ''))) {
        event.preventDefault()
        dismissDuplicateCheck(currentEntry)
        return
      }
      // 若當前在分類列且有待處理的 AI 分類建議，Esc 忽略
      if (colIndex === themeColIndex && currentEntry && themeAISuggestions.value.get(entryKeyForTheme)) {
        event.preventDefault()
        dismissThemeAI(currentEntry)
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
  if (aiDebounceTimer.value) {
    clearTimeout(aiDebounceTimer.value)
    aiDebounceTimer.value = null
  }
  // 取消正在進行的行內建議請求（用戶再次輸入時）
  if (aiSuggestAbortController.value) {
    aiSuggestAbortController.value.abort()
    aiSuggestAbortController.value = null
  }

  // 只在用户輸入粵拼時觸發生成釋義建議（詞頭已填好後再問 AI）
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

    const response = await $fetch('/api/entries', {
      method: 'POST',
      body: {
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
    })

    if (response.success) {
      // Replace temp entry with real one; preserve _tempId so v-for key stays stable and Vue doesn't remount the row (avoids parentNode null during patch)
      const index = entries.value.findIndex(e => e.id === entry.id || (e as any)._tempId === (entry as any)._tempId)
      if (index !== -1) {
        const prev = entries.value[index] as any
        const saved = { ...response.data, _isNew: false, _isDirty: false } as Entry
        if (prev?._tempId) (saved as any)._tempId = prev._tempId
        entries.value[index] = saved
        // 泛粵典「已採納/忽略」是用 entryId 記的；保存後 entryId 從 _tempId 變為真實 id，需遷移否則會重複彈出
        if (prev?._tempId && jyutdictHandled.value.has(String(prev._tempId))) {
          jyutdictHandled.value.add(String(saved.id))
          jyutdictHandled.value.delete(String(prev._tempId))
          jyutdictHandled.value = new Set(jyutdictHandled.value)
        }
      }
      pagination.total++
      // 聚合視圖下保存新條目後重新拉取，使新條目歸入對應詞形組
      if (viewMode.value === 'aggregated') {
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
      $fetch(`/api/entries/${entry.id}`, {
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
    const response = await $fetch<{ success: boolean; data?: { status?: string } }>(`/api/entries/${entry.id}`, {
      method: 'PUT',
      body: {
        headword: entry.headword,
        dialect: entry.dialect,
        phonetic: entry.phonetic,
        entryType: entry.entryType,
        senses: entry.senses,
        theme: entry.theme,
        meta: entry.meta,
        status: statusToSave
      }
    })

    if (response.success) {
      entry._isDirty = false
      if (response.data?.status) entry.status = response.data.status as Entry['status']
    }
  } catch (error: any) {
    console.error('Failed to save entry changes:', error)
    alert(error?.data?.message || '保存失敗')
  } finally {
    saving.value = false
  }
}

function cancelEdit(entry: Entry) {
  if (entry._isNew) {
    // Remove new entry
    const index = entries.value.findIndex(e => e.id === entry.id || e._tempId === entry.id)
    if (index !== -1) {
      entries.value.splice(index, 1)
    }
  } else {
    // Reset dirty flag and reload data
    entry._isDirty = false
    fetchEntries()
  }
}

async function deleteEntry(entry: Entry) {
  if (!confirm(`確定要刪除詞條「${entry.headword?.display || entry.text}」嗎？`)) {
    return
  }

  try {
    await $fetch(`/api/entries/${entry.id}`, { method: 'DELETE' })

    // Remove from list
    const index = entries.value.findIndex(e => e.id === entry.id)
    if (index !== -1) {
      entries.value.splice(index, 1)
      pagination.total--
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

    const response = await $fetch<{ data: any[]; total: number; page: number; perPage: number; totalPages: number; grouped?: boolean }>('/api/entries', { query })

    if (response.grouped && Array.isArray(response.data)) {
      aggregatedGroups.value = response.data.map((g: any) => ({
        headwordDisplay: g.headwordDisplay ?? g.headwordNormalized ?? '',
        headwordNormalized: g.headwordNormalized ?? g.headwordDisplay ?? '',
        entries: (g.entries ?? []).map((e: any) => ({ ...e, _isNew: false, _isDirty: false } as Entry))
      }))
      entries.value = []
    } else {
      entries.value = response.data.map((e: any) => ({ ...e, _isNew: false, _isDirty: false } as Entry))
      aggregatedGroups.value = []
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
