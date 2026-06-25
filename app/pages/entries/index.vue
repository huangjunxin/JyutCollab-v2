<template>
  <div class="flex h-full min-h-0 flex-col">
    <!-- Page header -->
    <div v-if="!isMobile" class="mb-4 flex-shrink-0">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="jc-serif text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div class="w-10 h-10 aspect-square flex items-center justify-center bg-[var(--jc-accent-soft-strong)] border border-[var(--jc-accent)]">
              <UIcon name="i-heroicons-table-cells" class="w-6 h-6 text-[var(--jc-accent)]" />
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
            type="button"
            :loading="savingAll"
            :disabled="isAnyEntrySaving"
            @click="saveAllChanges"
          >
            保存全部
          </UButton>
          <UButton
            v-if="isAuthenticated"
            icon="i-heroicons-plus"
            color="primary"
            size="md"
            class="shadow-[var(--jc-shadow-hard)] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5"
            @click="addNewRow"
          >
            新建詞條
          </UButton>
        </div>
      </div>
    </div>

    <!-- Agent filter applied banner -->
    <div
      v-if="!isMobile && agentFilterLabel"
      class="mb-4 flex flex-wrap items-center justify-between gap-3 border border-[var(--jc-border)] bg-white p-3 shadow-[var(--jc-shadow-hard)] dark:bg-slate-800"
    >
      <div class="flex min-w-0 items-center gap-3">
        <UIcon name="i-lucide-sparkles" class="h-5 w-5 shrink-0 text-[var(--jc-accent)]" />
        <div class="min-w-0">
          <p class="text-sm font-medium text-gray-900 dark:text-white">AI 助手已更新表格篩選</p>
          <p class="truncate text-xs text-gray-500 dark:text-gray-400">{{ agentFilterLabel }}</p>
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <UButton size="xs" variant="ghost" color="neutral" @click="dismissAgentFilterNotice">
          關閉提示
        </UButton>
        <UButton size="xs" variant="outline" color="primary" @click="clearAgentFilter">
          清除篩選
        </UButton>
      </div>
    </div>

    <!-- Search and filters -->
    <SharedSearchFilterBar
      v-if="!isMobile"
      v-model:search-query="searchQuery"
      v-model:filter-user="filterUser"
      v-model:filter-dialect="filterDialect"
      v-model:filter-theme="filterTheme"
      v-model:filter-status="filterStatus"
      :user-filter-options="userFilterOptions"
      :dialect-options="dialectOptions"
      :theme-filter-options="themeFilterOptions"
      :status-options="statusOptions"
      :all-filter-value="ALL_FILTER_VALUE"
      @search="handleSearch"
    >
      <template #extra-filters>
        <EntriesAdvancedFilterPanel
          v-model:expanded="advancedFilters.advancedFilterExpanded.value"
          v-model:formula-input="advancedFilters.formulaInput.value"
          teleport-to="#entries-advanced-filter-host"
          :regex-rows="advancedFilters.regexRows.value"
          :regex-row-errors="advancedFilters.advancedFilterErrors.regexRows"
          :field-options="advancedFilterFieldOptions"
          :formula-error="advancedFilters.advancedFilterErrors.formula?.message || ''"
          :regex-error="advancedFilters.advancedFilterErrors.regex?.message || ''"
          :has-active-advanced-filters="advancedFilters.hasActiveAdvancedFilters.value"
          :visible-count="advancedFilters.visibleEntryCount.value"
          :loaded-count="advancedFilters.loadedEntryCount.value"
          @add-regex-row="advancedFilters.addRegexRow"
          @remove-regex-row="advancedFilters.removeRegexRow"
          @update-regex-row="advancedFilters.updateRegexRow"
          @apply="advancedFilters.applyAdvancedFilters"
          @clear="advancedFilters.clearAdvancedFilters"
        />
        <EntriesRuleOverlayPanel
          v-model:expanded="ruleOverlays.ruleOverlayExpanded.value"
          :draft-rule="ruleOverlays.draftRule"
          teleport-to="#entries-rule-overlay-host"
          @update:draft-rule="updateRuleOverlayDraft"
          :rules="ruleOverlays.rules.value"
          :errors="ruleOverlays.ruleOverlayErrors"
          :active-rule-count="ruleOverlays.activeRuleCount.value"
          :field-options="advancedFilterFieldOptions"
          :editing-rule-id="ruleOverlays.editingRuleId.value"
          @apply="ruleOverlays.applyRuleFromDraft"
          @clear="ruleOverlays.clearRules"
          @toggle-rule="ruleOverlays.toggleRule"
          @remove-rule="ruleOverlays.removeRule"
          @move-rule="ruleOverlays.moveRule"
          @update-rule-color="ruleOverlays.updateRuleColor"
          @edit-rule="ruleOverlays.startEditingRule"
          @cancel-edit="ruleOverlays.cancelEditingRule"
        />
        <EntriesViewsDropdown
          :view-mode="viewMode"
          :saved-views="savedViews.views.value"
          :selected-view-id="selectedViewId"
          :current-user-id="user?.id || ''"
          :loading="savedViews.isLoading.value"
          :error="savedViews.error.value"
          @update:view-mode="setViewMode"
          @select-saved-view="applySavedView"
          @save-current="openSaveCurrentViewModal"
          @manage="openManageViewsModal"
          @share-current="shareSavedView"
        />
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
      </template>
    </SharedSearchFilterBar>
    <template v-if="!isMobile">
      <div id="entries-advanced-filter-host" class="w-full" />
      <div id="entries-rule-overlay-host" class="w-full" />
      <EntriesSharedViewBanner
        v-if="sharedViewBanner"
        class="mt-3"
        :kind="sharedViewBanner.kind"
        :view-name="sharedViewBanner.viewName"
        :creator-name="sharedViewBanner.creatorName"
        @apply="applySharedViewBannerState"
        @save-as-own="saveSharedViewBannerAsOwn"
        @close="clearSharedViewQuery"
      />
    </template>

    <!-- Loading state -->
    <div v-if="!isMobile && loading" class="flex-1 min-h-72 flex flex-col items-center justify-center bg-white dark:bg-slate-800 border border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] shadow-[var(--jc-shadow-hard)]">
      <div class="relative">
        <div class="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
        <div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
      </div>
      <p class="mt-4 text-gray-500 dark:text-gray-400">加載中...</p>
    </div>

    <!-- Empty state -->
    <div v-else-if="!isMobile && isEmpty" class="flex-1 min-h-72 flex flex-col items-center justify-center bg-white dark:bg-slate-800 border border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] shadow-[var(--jc-shadow-hard)]">
      <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
        <UIcon name="i-heroicons-table-cells" class="w-10 h-10 text-gray-400" />
      </div>
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {{ advancedFilters.advancedEmptyStateActive.value ? '進階篩選沒有匹配結果' : (viewMode === 'aggregated' ? '暫無詞形' : (viewMode === 'lexeme' ? '暫無詞語' : '暫無詞條')) }}
      </h3>
      <p class="text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
        {{
          advancedFilters.advancedEmptyStateActive.value
            ? '沒有詞條符合目前公式或正則條件。請調整條件，或清除進階篩選返回原本結果。'
            : (searchQuery
              ? (viewMode === 'aggregated'
                ? '沒有找到匹配的詞形'
                : (viewMode === 'lexeme' ? '沒有找到匹配的詞語' : '沒有找到匹配的詞條，請嘗試其他關鍵詞'))
              : (viewMode === 'aggregated'
                ? '可切換為平鋪視圖或點擊上方按鈕新建詞條'
                : (viewMode === 'lexeme' ? '可切換為平鋪/按詞形聚合視圖或點擊上方按鈕新建詞條' : '點擊上方按鈕開始創建第一個詞條')))
        }}
      </p>
      <UButton
        v-if="advancedFilters.advancedEmptyStateActive.value"
        size="sm"
        color="neutral"
        variant="soft"
        @click="advancedFilters.clearAdvancedFilters"
      >
        清除進階篩選
      </UButton>
      <UButton
        v-else-if="isAuthenticated && !searchQuery"
        size="lg"
        color="primary"
        icon="i-heroicons-plus"
        @click="addNewRow"
      >
        {{ viewMode === 'aggregated' || viewMode === 'lexeme' ? '新建詞條' : '創建第一個詞條' }}
      </UButton>
    </div>

    <!-- Desktop table / Mobile workbench split -->
    <div v-else class="flex-1 min-h-0 flex flex-col gap-0 overflow-hidden">
    <EntriesDesktopTable
      v-if="!isMobile"
      ref="desktopTableRef"
      :table-rows="tableRows"
      :editable-columns="editableColumns"
      :column-widths="columnWidths"
      :view-mode="viewMode"
      :pagination="pagination"
      :expanded-group-keys="expandedGroupKeys"
      :editing-cell="editingCell"
      :edit-value="editValue"
      :focused-cell="focusedCell"
      :expanded-entry-id="expandedEntryId"
      :expanded-morpheme-refs-entry-id="expandedMorphemeRefsEntryId"
      :expanded-theme-entry-id="expandedThemeEntryId"
      :get-cell-display="getCellDisplay"
      :get-cell-class="getCellClass"
      :get-column-options="getColumnOptions"
      :selected-count="selectedCount"
      :selected-saved-entries="selectedSavedEntries"
      :select-all-checked="selectAllChecked"
      :is-entry-selected="isEntrySelected"
      :batch-deleting="batchDeleting"
      :get-cell-overlay-meta="(e: any, f: string) => ruleOverlays.getCellOverlayMeta(e, f)"
      :is-advanced-filter-field-key="isAdvancedFilterFieldKey"
      :has-active-advanced-filters="hasActiveAdvancedFilters"
      :ai-suggestion="aiSuggestion"
      :ai-suggestion-for-field="aiSuggestionForField"
      :ai-loading-for="aiLoadingFor"
      :ai-loading-inline-for="aiLoadingInlineFor"
      :ai-inline-error="aiInlineError"
      :theme-ai-suggestions="themeAISuggestions"
      :definition-ai-suggestions="definitionAISuggestions"
      :register-ai-suggestions="registerAISuggestions"
      :format-theme-suggestion="formatThemeSuggestion"
      :format-register-suggestion="formatRegisterSuggestion"
      :get-jyutdict-data="getJyutdictData"
      :get-jyutdict-loading="getJyutdictLoading"
      :get-jyutdict-suggested="getJyutdictSuggested"
      :get-jyutdict-visible="getJyutdictVisible"
      :get-duplicate-check-loading="getDuplicateCheckLoading"
      :get-duplicate-check-entries-formatted="getDuplicateCheckEntriesFormatted"
      :get-other-dialects-formatted="getOtherDialectsFormatted"
      :get-jyutjyu-row-visible="getJyutjyuRowVisible"
      :get-jyutjyu-query="getJyutjyuQuery"
      :get-jyutjyu-total="getJyutjyuTotal"
      :get-jyutjyu-loading="getJyutjyuLoading"
      :get-jyutjyu-error="getJyutjyuError"
      :jyutjyu-ref-result="jyutjyuRefResult"
      :format-jyutjyu-results="formatJyutjyuResults"
      :get-reference-search-loading="getReferenceSearchLoading"
      :get-reference-search-query="getReferenceSearchQuery"
      :reference-headword-visible-entry-id="referenceHeadwordVisibleEntryId"
      :column-indices="{ themeColIndex: themeColIndex, phoneticColIndex: phoneticColIndex, headwordColIndex: headwordColIndex, registerColIndex: registerColIndex }"
      :is-entry-saving="isEntrySaving"
      :can-edit-entry="canEditEntry"
      :can-edit-external-etymons="canEditExternalEtymons"
      :sort-by="sortBy"
      :sort-order="sortOrder"
      :unlinked-morpheme-entry-id="unlinkedMorphemeEntryId"
      :unlinked-morpheme-candidates="unlinkedMorphemeCandidates"
      v-model:edit-value="editValue"
      @update:currentPage="(p: number) => { currentPage = p }"
      @cell-click="(entry: any, field: string, event: any, rowIndex?: number, colIndex?: number, forceEdit?: boolean) => handleCellClick(entry, field, event, rowIndex, colIndex, forceEdit)"
      @set-input-ref="(el: any, entryId: string, field: string) => setInputRef(el, entryId, field)"
      @cell-keydown="(event: KeyboardEvent, entry: any, field: string) => handleKeydown(event, entry, field)"
      @cell-blur="(entry: any, field: string) => handleBlur(entry, field)"
      @expand-click="(entry: any) => toggleSensesExpand(entry)"
      @theme-expand-click="(entry: any) => toggleThemeExpand(entry)"
      @accept-theme-ai="(entry: any) => acceptThemeAI(entry)"
      @dismiss-theme-ai="(entry: any) => dismissThemeAI(entry)"
      @save-row="(entry: any) => (entry as any)._isNew ? saveNewEntry(entry) : saveEntryChanges(entry)"
      @duplicate="(entry: any) => duplicateEntry(entry)"
      @delete="(entry: any) => deleteEntry(entry)"
      @cancel="(entry: any) => cancelEdit(entry)"
      @make-new-lexeme="(entry: any) => makeEntryNewLexeme(entry)"
      @join-lexeme="(entry: any) => openMergeModalForEntry(entry)"
      @toggle-morpheme-refs="(entry: any) => toggleMorphemeRefsExpand(entry)"
      @sort="(key: string) => handleSort(key)"
      @start-resize="(event: MouseEvent, key: string, width: number) => startResize(event, key, width)"
      @toggle-select-entry="(entry: any, event?: MouseEvent) => toggleSelectEntry(entry, event)"
      @toggle-select-all="toggleSelectAll"
      @clear-selection="clearSelection"
      @batch-delete="batchDeleteSelected"
      @jump-to-page="(page: number) => { currentPage = page }"
      @table-keydown="(event: KeyboardEvent) => handleTableKeydown(event)"
      @ai-definition="(entry: any) => generateAIDefinition(entry)"
      @ai-theme="(entry: any) => generateAICategorization(entry)"
      @ai-register="(entry: any, rowIndex: number, colIndex: number) => { focusedCell = { rowIndex, colIndex }; generateAIRegister(entry) }"
      @accept-suggestion="acceptAISuggestion"
      @dismiss-suggestion="dismissAISuggestion"
      @accept-theme-ai-row="(entry: any) => acceptThemeAI(entry)"
      @dismiss-theme-ai-row="(entry: any) => dismissThemeAI(entry)"
      @select-theme-alternative="(entry: any, idx: number) => acceptThemeAI(entry, idx)"
      @accept-register-ai="(entry: any) => acceptRegisterAI(entry)"
      @dismiss-register-ai="(entry: any) => dismissRegisterAI(entry)"
      @accept-jyutdict="(entry: any, pronunciation: string) => acceptJyutdict(entry, pronunciation)"
      @dismiss-jyutdict="(entry: any) => dismissJyutdict(entry)"
      @dismiss-duplicate-check="(entry: any) => dismissDuplicateCheck(entry)"
      @open-reference="(entryId: string) => referenceHeadwordVisibleEntryId = entryId"
      @update-reference-query="(entryId: string, q: string) => setReferenceSearchQuery(entryId, q)"
      @run-reference-search="(entry: any, q: string) => runReferenceSearchForEntry(entry, q)"
      @close-reference="referenceHeadwordVisibleEntryId = null"
      @apply-other-dialect-template="(entry: any, sourceId: string) => applyOtherDialectTemplate(entry, sourceId)"
      @dismiss-jyutjyu-ref="(entry: any) => dismissJyutjyuRef(entry)"
      @apply-jyutjyu-template="(entry: any, sourceId: string) => applyJyutjyuTemplate(entry, sourceId)"
      @retry-inline-ai="(entry: any) => retryInlineAISuggestion(entry)"
      @clear-inline-error="aiInlineError = null"
      @close-senses="(entry: any) => toggleSensesExpand(entry)"
      @ai-definition-expand="(entry: any) => generateAIDefinition(entry)"
      @accept-definition-ai="(entry: any) => acceptDefinitionAI(entry)"
      @dismiss-definition-ai="(entry: any) => dismissDefinitionAI(entry)"
      @ai-examples="(entry: any) => generateAIExamples(entry)"
      @add-sense="(entry: any) => addSense(entry)"
      @remove-sense="(entry: any, senseIdx: number) => removeSense(entry, senseIdx)"
      @add-example="(entry: any, senseIdx: number) => addExample(entry, senseIdx)"
      @remove-example="(entry: any, senseIdx: number, exIdx: number) => removeExample(entry, senseIdx, exIdx)"
      @add-sub-sense="(entry: any, senseIdx: number) => addSubSense(entry, senseIdx)"
      @remove-sub-sense="(entry: any, senseIdx: number, subIdx: number) => removeSubSense(entry, senseIdx, subIdx)"
      @add-sub-sense-example="(entry: any, senseIdx: number, subIdx: number) => addSubSenseExample(entry, senseIdx, subIdx)"
      @remove-sub-sense-example="(entry: any, senseIdx: number, subIdx: number, exIdx: number) => removeSubSenseExample(entry, senseIdx, subIdx, exIdx)"
      @close-theme-expand="(entry: any) => toggleThemeExpand(entry)"
      @update:theme="(entry: any, theme: any) => onThemeUpdate(entry, theme)"
      @dismiss-theme-ai-expand="(entry: any) => dismissThemeAI(entry)"
      @accept-theme-ai-expand="(entry: any, suggestion: any) => onThemeExpandAcceptAI(entry, suggestion)"
      @ai-categorize="(entry: any) => generateAICategorization(entry)"
      @open-morpheme-search="(entry: any) => openMorphemeSearch(entry)"
      @open-unlinked-morpheme-form="(entry: any) => openUnlinkedMorphemeForm(entry)"
      @remove-morpheme-ref="(entry: any, refIdx: number) => removeMorphemeRef(entry, refIdx)"
      @confirm-unlinked-morpheme="(entry: any) => confirmUnlinkedMorphemeRefs(entry)"
      @close-unlinked-morpheme-form="closeUnlinkedMorphemeForm"
      @toggle-group-expanded="(key: string) => toggleGroupExpanded(key)"
      @open-external-etymons="(groupKey: string, groupLabel: string, entries: any[]) => openExternalEtymonsForGroup(groupKey, groupLabel, entries)"
      @open-merge-modal-for-group="(groupKey: string, groupLabel: string, entryIds: string[]) => openMergeModalForGroup(groupKey, groupLabel, entryIds)"
    />
    <!-- Mobile workbench -->
    <EntriesMobileWorkbench
      v-else
      :filtered-entries="filteredEntries"
      :table-rows="tableRows"
      :view-mode="viewMode"
      :pagination="pagination"
      :current-page="currentPage"
      :loading="loading"
      :is-empty="isEmpty"
      :search-query="searchQuery"
      :has-unsaved-changes="hasUnsavedChanges"
      :saving="savingAll"
      :is-authenticated="isAuthenticated"
      :get-cell-display="getCellDisplay"
      :get-cell-class="getCellClass"
      :dialect-options="userDialectOptions"
      :filter-dialect-options="dialectOptions"
      :status-options="statusOptionsForTable"
      :can-change-status="isReviewerOrAdmin"
      :can-edit-entry="canEditEntry"
      :is-entry-saving="isEntrySaving"
      :filter-dialect="filters.dialect"
      :filter-status="filters.status"
      :filter-theme="filters.theme"
      :theme-filter-options="themeFilterOptions"
      :status-filter-options="statusOptions"
      :saved-views="savedViews.views.value"
      :selected-view-id="selectedViewId"
      :expanded-group-keys="expandedGroupKeys"
      :sort-by="sortBy"
      :sort-order="sortOrder"
      :reset-selection-trigger="mobileResetSelectionTrigger"
      :theme-ai-suggestions="themeAISuggestions"
      :definition-ai-suggestions="definitionAISuggestions"
      :register-ai-suggestions="registerAISuggestions"
      :ai-loading-for="aiLoadingFor"
      :duplicate-entries="duplicateCheckEntriesMap"
      :other-dialect-entries="otherDialectEntriesMap"
      :jyutjyu-results="jyutjyuResultsMap"
      :unlinked-morpheme-candidates="unlinkedMorphemeCandidates"
      :unlinked-morpheme-entry-id="unlinkedMorphemeEntryId"
      :morpheme-search-results="morphemeSearchResults"
      :morpheme-search-loading="morphemeSearchLoading"
      :rules="ruleOverlays.rules.value"
      :jyutdict-suggested="jyutdictSuggested"
      :jyutdict-visible="jyutdictVisible"
      :get-cell-overlay-meta="(e: any, f: string) => ruleOverlays.getCellOverlayMeta(e, f)"
      @search="(q: string) => { searchQuery = q; handleSearch() }"
      @add-new="addNewRow"
      @save-all="saveAllChanges"
      @row-click="(entry: any) => {}"
      @update:entry="onMobileEntryUpdate"
      @update:currentPage="(p: number) => { currentPage = p }"
      @update:viewMode="(v: string) => setViewMode(v)"
      @update:filterDialect="(v: string) => { filterDialect = v }"
      @update:filterStatus="(v: string) => { filterStatus = v }"
      @update:filterTheme="(v: string) => { filterTheme = v }"
      @update:sortBy="setMobileSortBy"
      @update:sortOrder="setMobileSortOrder"
      @save-entry="(entry: any) => (entry as any)._isNew ? saveNewEntry(entry) : saveEntryChanges(entry)"
      @cancel-entry="(entry: any) => cancelEdit(entry)"
      @duplicate-entry="(entry: any) => duplicateEntry(entry)"
      @delete-entry="(entry: any) => deleteEntry(entry)"
      @apply-saved-view="(view: any) => applySavedView(view)"
      @toggle-group-expanded="(key: string) => toggleGroupExpanded(key)"
      @save-current-view="openSaveCurrentViewModal"
      @manage-views="openManageViewsModal"
      @ai-definition="(entry: any) => generateAIDefinition(entry)"
      @ai-examples="(entry: any) => generateAIExamples(entry)"
      @ai-categorize="(entry: any) => generateAICategorization(entry)"
      @ai-register="(entry: any) => generateAIRegister(entry)"
      @accept-theme-ai="(entry: any) => acceptThemeAI(entry)"
      @dismiss-theme-ai="(entry: any) => dismissThemeAI(entry)"
      @accept-definition-ai="(entry: any) => acceptDefinitionAI(entry)"
      @dismiss-definition-ai="(entry: any) => dismissDefinitionAI(entry)"
      @accept-register-ai="(entry: any) => acceptRegisterAI(entry)"
      @dismiss-register-ai="(entry: any) => dismissRegisterAI(entry)"
      @apply-other-dialect="(entry: any, sourceId: string) => applyOtherDialectTemplate(entry, sourceId)"
      @apply-jyutjyu="(entry: any, sourceId: string) => applyJyutjyuTemplate(entry, sourceId)"
      @remove-morpheme-ref="(entry: any, idx: number) => removeMorphemeRef(entry, idx)"
      @open-unlinked-form="(entry: any) => openUnlinkedMorphemeForm(entry)"
      @confirm-unlinked-morpheme="(entry: any) => confirmUnlinkedMorphemeRefs(entry)"
      @add-morpheme-ref="(id: string, item: any) => addMorphemeRef(id, item)"
      @search-morphemes="(entry: any, q: string) => handleMobileMorphemeSearch(entry, q)"
      @morpheme-page-mounted="(entry: any) => handleMobileMorphemePageMounted(entry)"
      @make-new-lexeme="(entry: any) => makeEntryNewLexeme(entry)"
      @join-lexeme="(entry: any) => openMergeModalForEntry(entry)"
      @open-external-etymons="(entry: any) => openExternalEtymonsForGroup(String(entry.lexemeId || ''), entry.headword?.display || entry.text || '')"
      @accept-jyutdict="(entry: any) => { const s = getJyutdictSuggested(getEntryIdString(entry)); if (s) acceptJyutdict(entry, s) }"
      @batch-delete="(ids: string[]) => mobileBatchDelete(ids)"
      @batch-status-change="(ids: string[], status: string) => mobileBatchStatusChange(ids, status)"
      @toggle-rule="(id: string) => ruleOverlays.toggleRule(id)"
      @remove-rule="(id: string) => ruleOverlays.removeRule(id)"
    />
    </div>

  <EntriesSaveViewModal
    v-model:open="saveViewModalOpen"
    :state="saveViewModalState"
    :id="saveViewModalId"
    :initial-name="saveViewModalName"
    :initial-visibility="saveViewModalVisibility"
    :submitting="saveViewSubmitting"
    :error="saveViewError"
    @save="handleSaveView"
    @cancel="resetSaveViewModal"
  />

  <EntriesManageViewsModal
    v-model:open="manageViewsModalOpen"
    :views="savedViews.views.value"
    :current-user-id="user?.id || ''"
    :loading="savedViews.isLoading.value"
    :error="savedViews.error.value || manageViewsError"
    :deleting="manageViewDeleting"
    @apply="applySavedView"
    @edit="editSavedView"
    @delete="deleteSavedView"
    @copy-as-own="copySavedViewAsOwn"
    @close="manageViewsError = ''"
  />

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
      <UCard class="jc-modal-card w-full max-w-2xl rounded-none [&>*]:rounded-none">
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

  <!-- 批量刪除確認對話框 -->
  <UModal v-model:open="deleteConfirmOpen" class="max-w-md">
    <template #content>
      <UCard class="jc-modal-card w-full rounded-none [&>*]:rounded-none">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-500" />
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">確認批量刪除</h3>
          </div>
        </template>

        <p class="text-sm text-gray-600 dark:text-gray-400">
          確定要刪除所選的 <span class="font-semibold text-gray-900 dark:text-white">{{ selectedSavedEntries.length }}</span> 條詞條嗎？此操作不可撤銷。
        </p>

        <template #footer>
          <div class="flex justify-end gap-3 w-full">
            <UButton color="neutral" variant="ghost" @click="cancelBatchDelete">取消</UButton>
            <UButton color="error" @click="confirmBatchDelete" :loading="batchDeleting">確認刪除</UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>

  <!-- 手機端批量刪除確認彈出層 -->
  <USlideover
    v-if="isMobile"
    :open="mobileBatchDeleteSheetOpen"
    side="bottom"
    :ui="{ wrapper: 'max-h-[40vh]', base: 'bg-white dark:bg-slate-800 rounded-t-none' }"
    @update:open="(v: boolean) => { if (!v) { mobileBatchDeleteSheetOpen = false; mobileBatchDeletePendingIds = [] } }"
  >
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-500" />
        <div class="min-w-0">
          <DialogTitle class="text-sm font-semibold text-gray-900 dark:text-white">確認批量刪除</DialogTitle>
          <DialogDescription class="sr-only">確認是否刪除已選詞條</DialogDescription>
        </div>
      </div>
    </template>
    <template #body>
      <p class="text-sm text-gray-600 dark:text-gray-400 py-2">
        確定要刪除所選的 <span class="font-semibold text-gray-900 dark:text-white">{{ mobileBatchDeletePendingIds.length }}</span> 條詞條嗎？此操作不可撤銷。
      </p>
    </template>
    <template #footer>
      <div class="flex gap-2 w-full">
        <UButton color="neutral" variant="soft" size="sm" block @click="mobileBatchDeleteSheetOpen = false; mobileBatchDeletePendingIds = []">取消</UButton>
        <UButton color="error" size="sm" block @click="confirmMobileBatchDelete">確認刪除</UButton>
      </div>
    </template>
  </USlideover>
  </div>
</template>

<script setup lang="ts">
import { useAuth, useProfileUpdatedUser } from '~/composables/useAuth'
import { useMobileBreakpoint } from '~/composables/useMobileBreakpoint'
import { useSearchFilters } from '~/composables/useSearchFilters'
import { getThemeById, getThemeNameById, getFlatThemeList } from '~/composables/useThemeData'
import { dialectOptionsWithAll, DIALECT_OPTIONS_FOR_SELECT, getDialectLabel, getDialectLabelByRegionCode } from '~/utils/dialects'
import { getEntryKey, getEntryIdString } from '~/utils/entryKey'
import { ALL_FILTER_VALUE, SORTABLE_COLUMN_KEYS, STATUS_LABELS, ENTRY_TYPE_LABELS, ADVANCED_FILTER_FIELD_LABELS, ADVANCED_FILTER_FIELDS } from '~/utils/entriesTableConstants'
import { getGroupPhonetic, getGroupEntryType, getGroupTheme, getGroupRegister, getGroupStatus } from '~/composables/useEntryGroupDisplay'
import { useEntriesTableColumns } from '~/composables/useEntriesTableColumns'
import { useColumnResize } from '~/composables/useColumnResize'
import { deepCopy, getEntryIdKey, makeBaselineSnapshot, useEntryBaseline } from '~/composables/useEntryBaseline'
import { ensureSensesStructure, addSense, removeSense, addExample, removeExample, addSubSense, removeSubSense, addSubSenseExample, removeSubSenseExample } from '~/composables/useEntrySenses'
import { useEntriesList } from '~/composables/useEntriesList'
import { useEntriesAdvancedFilters } from '~/composables/useEntriesAdvancedFilters'
import { useEntriesRuleOverlays } from '~/composables/useEntriesRuleOverlays'
import type { EntriesRuleDraft } from '~/composables/useEntriesRuleOverlays'
import { useEntriesSelection } from '~/composables/useEntriesSelection'
import { useNewEntryDialect } from '~/composables/useNewEntryDialect'
import { useEntryMorphemeRefs } from '~/composables/useEntryMorphemeRefs'
import { useEntriesTableEdit } from '~/composables/useEntriesTableEdit'
import { useEntriesAISuggestions } from '~/composables/useEntriesAISuggestions'
import { useEntriesRowHints } from '~/composables/useEntriesRowHints'
import type { DialectId } from '~shared/dialects'
import { saveEntriesToLocalStorage, restoreEntriesFromLocalStorage, clearEntriesLocalStorage, removeEntryFromLocalStorage } from '~/composables/useEntriesLocalStorage'
import type { Entry, Register } from '~/types'
import type { AdvancedFilterFieldKey } from '~/utils/entriesAdvancedFilter'
import { DialogDescription, DialogTitle } from 'reka-ui'
import EntriesDesktopTable from '~/components/entries/EntriesDesktopTable.vue'
import EntriesMobileWorkbench from '~/components/entries/mobile/EntriesMobileWorkbench.vue'
import LexemeExternalEtymonsModal from '~/components/entries/LexemeExternalEtymonsModal.vue'
import LexemeMergeModal from '~/components/entries/LexemeMergeModal.vue'
import EntriesAdvancedFilterPanel from '~/components/entries/EntriesAdvancedFilterPanel.vue'
import EntriesRuleOverlayPanel from '~/components/entries/EntriesRuleOverlayPanel.vue'
import EntriesViewsDropdown from '~/components/entries/EntriesViewsDropdown.vue'
import EntriesSaveViewModal from '~/components/entries/EntriesSaveViewModal.vue'
import EntriesManageViewsModal from '~/components/entries/EntriesManageViewsModal.vue'
import EntriesSharedViewBanner from '~/components/entries/EntriesSharedViewBanner.vue'
import { useEntriesSavedViews, type SavedViewRecord, type SavedViewVisibility } from '~/composables/useEntriesSavedViews'
import {
  ENTRIES_SHARED_VIEW_QUERY_PARAM,
  ENTRIES_SHARED_VIEW_VERSION,
  decodeEntriesSharedView,
  summarizeEntriesSharedView,
  type EntriesSharedViewState
} from '~/utils/entriesSharedView'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
  name: 'entries-index'
})

useHead({
  link: [
    { rel: 'stylesheet', href: '/fonts/jyutcollab-headword-rare.css' }
  ]
})

const { isAuthenticated, user, refreshUser } = useAuth()
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

// 共用搜索/篩選狀態
const {
  searchQuery,
  filters,
  filterDialect,
  filterStatus,
  filterTheme,
  filterUser,
  dialectOptions,
  statusOptions,
  themeFilterOptions,
  userFilterOptions,
  fetchContributors,
  isReviewerOrAdmin
} = useSearchFilters()

const advancedFilterFieldOptions = computed(() =>
  Object.entries(ADVANCED_FILTER_FIELD_LABELS).map(([value, label]) => ({ value: value as AdvancedFilterFieldKey, label: `${label} (${value})` }))
)

function isAdvancedFilterFieldKey(field: string): field is AdvancedFilterFieldKey {
  return ADVANCED_FILTER_FIELDS.includes(field as AdvancedFilterFieldKey)
}

// State
// Mobile detection via matchMedia (responsive, updates on orientation change)
const { isMobile } = useMobileBreakpoint()

/** 詞條 baseline（用於「取消編輯」回滾，避免刷新整個頁面誤傷其他未保存內容）。key: entry.id */
const entryBaselineById = ref<Map<string, any>>(new Map())
const { setBaselineForEntry, restoreEntryFromBaseline, applyDraftOntoEntry } = useEntryBaseline(entryBaselineById)
/** 視圖模式：平鋪（一列一條）或聚合（一列一詞形，可展開多方言） */
const viewMode = ref<'flat' | 'aggregated' | 'lexeme'>('flat')
/** 當前視圖對應的實體標籤（詞條/詞形/詞語），用於標題與空狀態文案 */
const viewModeEntityLabel = computed(() => ({ flat: '詞條', aggregated: '詞形', lexeme: '詞語' }[viewMode.value] ?? '詞條'))
/** 聚合視圖下已展開的詞形（headwordNormalized），用 Set 便於切換 */
const expandedGroupKeys = ref<Set<string>>(new Set())
const savingAll = ref(false)
const savingEntryKeys = ref<Set<string>>(new Set())
const isAnyEntrySaving = computed(() => savingEntryKeys.value.size > 0)
const sortBy = ref('createdAt')
const sortOrder = ref<'asc' | 'desc'>('desc')
const { entries, aggregatedGroups, lexemeGroups, loading, isAllFetched, currentPage, pagination, fetchEntries, fetchAllEntries, handleSearch, handleSort, invalidateCache } = useEntriesList(viewMode, searchQuery, filters, sortBy, sortOrder, entryBaselineById, makeBaselineSnapshot, applyDraftOntoEntry)

// Handle URL parameters - will be processed in onMounted before fetchEntries
const route = useRoute()
const toast = useToast()

// 頁面跳轉輸入
const jumpToPageInput = ref<string>('')

function handleJumpToPage() {
  const pageNum = parseInt(jumpToPageInput.value, 10)
  const totalPages = pagination.totalPages || 1
  
  if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
    currentPage.value = pageNum
    jumpToPageInput.value = ''
  } else {
    alert(`請輸入有效頁碼（1-${totalPages}）`)
  }
}

/** API 僅支援以下欄位排序 */

// Inline editing state
const editingCell = ref<{ entryId: string; field: string } | null>(null)
const editValue = ref<any>('')
const inputRefs = ref<Map<string, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>>(new Map())

// 唯一焦點格：未編輯時表示「選中格」（方向鍵/Enter/Tab 目標），編輯時即正在編輯的格
const focusedCell = ref<{ rowIndex: number; colIndex: number } | null>(null)
const desktopTableRef = ref<InstanceType<typeof EntriesDesktopTable> | null>(null)
// 從 EntriesDesktopTable 的 exposed refs 取得真實 DOM 參考
const tableWrapperRef = computed(() => desktopTableRef.value?.tableWrapperRef ?? null)
const tableRef = computed(() => desktopTableRef.value?.tableRef ?? null)

// 方案 B：行展開編輯釋義詳情（多義項、例句、分義項）。值為當前展開的 entry id
const expandedEntryId = ref<string | null>(null)

// 詞素引用展開狀態
const expandedMorphemeRefsEntryId = ref<string | null>(null)

// 主題展開狀態
const expandedThemeEntryId = ref<string | null>(null)

function toggleGroupExpanded(headwordNormalized: string) {
  const next = new Set(expandedGroupKeys.value)
  if (next.has(headwordNormalized)) next.delete(headwordNormalized)
  else next.add(headwordNormalized)
  expandedGroupKeys.value = next
}

/** 計算某個新建詞條在聚合視圖中所屬組的 key，用於自動展開 */
function getGroupKeyForEntry(entry: any): string {
  if (viewMode.value === 'lexeme') {
    return entry.lexemeId || `__unassigned__:${String(getEntryKey(entry))}`
  }
  return entry.headword?.normalized || entry.headword?.display || entry.text || ''
}

function autoExpandGroupForEntry(entry: any) {
  if (viewMode.value !== 'aggregated' && viewMode.value !== 'lexeme') return
  const key = getGroupKeyForEntry(entry)
  const next = new Set(expandedGroupKeys.value)
  next.add(key)
  expandedGroupKeys.value = next
}

function createLocalEntryId(prefix: 'new' | 'dup'): string {
  if (typeof crypto?.randomUUID === 'function') return `${prefix}-${crypto.randomUUID()}`
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function setViewMode(v: string) {
  const mode = v === 'aggregated' ? 'aggregated' : (v === 'lexeme' ? 'lexeme' : 'flat')
  viewMode.value = mode
  currentPage.value = 1
  if (hasActiveAdvancedFilters.value) fetchAllEntries()
  else fetchEntries()
}

function setMobileSortBy(key: string) {
  if (!SORTABLE_COLUMN_KEYS.includes(key as any)) return
  if (sortBy.value === key) return
  sortBy.value = key
  sortOrder.value = 'asc'
  currentPage.value = 1
  if (isAllFetched.value) fetchAllEntries()
  else fetchEntries()
}

function setMobileSortOrder(order: 'asc' | 'desc') {
  if (sortOrder.value === order) return
  sortOrder.value = order
  currentPage.value = 1
  if (isAllFetched.value) fetchAllEntries()
  else fetchEntries()
}

const isEmpty = computed(() => {
  if (advancedEmptyStateActive.value) return true
  if (viewMode.value === 'flat') return filteredEntries.value.length === 0
  const base = viewMode.value === 'lexeme' ? filteredLexemeGroups.value : filteredAggregatedGroups.value
  return base.length === 0 && !filteredEntries.value.some(e => (e as any)._isNew)
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
/** 狀態值 → 中文標籤（用於表格顯示，與角色無關，避免貢獻者看到 approved/rejected 時顯示英文） */

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

const { editableColumns, themeColIndex, phoneticColIndex, headwordColIndex, registerColIndex } = useEntriesTableColumns(userDialectOptions, themeOptions, statusOptionsForTable)

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

const advancedFilters = useEntriesAdvancedFilters({
  entries,
  aggregatedGroups,
  lexemeGroups,
  viewMode,
  editableColumns,
  getCellDisplay: tableEdit.getCellDisplay
})
const filteredEntries = advancedFilters.filteredEntries
const filteredAggregatedGroups = advancedFilters.filteredAggregatedGroups
const filteredLexemeGroups = advancedFilters.filteredLexemeGroups
const hasActiveAdvancedFilters = advancedFilters.hasActiveAdvancedFilters
const advancedEmptyStateActive = advancedFilters.advancedEmptyStateActive
const visibleEntryCount = advancedFilters.visibleEntryCount
const loadedEntryCount = advancedFilters.loadedEntryCount

// 聚合視圖下用於展示的組列表（含新建未保存的「單條組」）— 須在 currentPageEntries 之前定義
const displayGroups = computed(() => {
  if (viewMode.value !== 'aggregated' && viewMode.value !== 'lexeme') return []
  const base = viewMode.value === 'lexeme' ? filteredLexemeGroups.value : filteredAggregatedGroups.value
  const groupedEntryKeys = new Set(base.flatMap(group => group.entries.map(entry => String(getEntryKey(entry)))))
  const newOnes = filteredEntries.value
    .filter(e => (e as any)._isNew && !groupedEntryKeys.has(String(getEntryKey(e))))
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
    return filteredEntries.value.map(entry => ({ type: 'entry' as const, entry, groupIndex: -1 }))
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
const visibleRuleOverlayEntries = computed(() => tableRows.value
  .filter((row): row is Extract<TableRow, { type: 'entry' }> => row.type === 'entry')
  .map(row => row.entry))

function getEntryAtTableRow(rowIndex: number): Entry | null {
  const row = tableRows.value[rowIndex]
  return row?.type === 'entry' ? row.entry : null
}

function findNextEntryTableRow(startIndex: number, direction: -1 | 1): number {
  let nextIndex = startIndex
  while (nextIndex + direction >= 0 && nextIndex + direction < tableRows.value.length) {
    nextIndex += direction
    if (tableRows.value[nextIndex]?.type === 'entry') return nextIndex
  }
  return startIndex
}

function findFirstEntryTableRow(): number {
  return tableRows.value.findIndex(row => row.type === 'entry')
}
const ruleOverlays = useEntriesRuleOverlays({
  visibleEntries: visibleRuleOverlayEntries,
  buildRowContext: advancedFilters.buildRowContext
})

function updateRuleOverlayDraft(nextDraft: EntriesRuleDraft) {
  Object.assign(ruleOverlays.draftRule, {
    ...nextDraft,
    targetFields: [...nextDraft.targetFields],
    condition: {
      kind: nextDraft.condition.kind,
      formula: nextDraft.condition.formula,
      regex: { ...nextDraft.condition.regex }
    },
    colorHex: nextDraft.colorHex
  })
}

const savedViews = useEntriesSavedViews()
const selectedViewId = ref<string | null>(null)
const lastAppliedSharedView = ref<string | null>(null)
const saveViewModalOpen = ref(false)
const saveViewModalId = ref<string | undefined>(undefined)
const saveViewModalName = ref('')
const saveViewModalVisibility = ref<SavedViewVisibility>('private')
const saveViewModalState = ref<EntriesSharedViewState>({
  version: ENTRIES_SHARED_VIEW_VERSION,
  viewMode: viewMode.value,
  filters: advancedFilters.exportAdvancedFilterState(),
  rules: ruleOverlays.exportRuleOverlayState()
})
const saveViewSubmitting = ref(false)
const saveViewError = ref<string | null>(null)
const manageViewsModalOpen = ref(false)
const manageViewsError = ref('')
const manageViewDeleting = ref(false)

type SharedViewBannerState =
  | { kind: 'named'; viewName: string; creatorName: string; state: EntriesSharedViewState }
  | { kind: 'anonymous'; state: EntriesSharedViewState }
  | { kind: 'not-found'; state?: undefined }

const sharedViewBanner = ref<SharedViewBannerState | null>(null)

const currentSharedViewState = computed<EntriesSharedViewState>(() => ({
  version: ENTRIES_SHARED_VIEW_VERSION,
  viewMode: viewMode.value,
  filters: advancedFilters.exportAdvancedFilterState(),
  rules: ruleOverlays.exportRuleOverlayState()
}))

const sharedViewSummary = computed(() => summarizeEntriesSharedView(currentSharedViewState.value))

function restoreSharedViewState(state: EntriesSharedViewState) {
  if (state.viewMode) setViewMode(state.viewMode)
  advancedFilters.restoreAdvancedFilterState(state.filters)
  ruleOverlays.replaceRuleOverlayState(state.rules)
  summarizeEntriesSharedView(state)
}

function resetSaveViewModal() {
  saveViewModalId.value = undefined
  saveViewModalName.value = ''
  saveViewModalVisibility.value = 'private'
  saveViewModalState.value = currentSharedViewState.value
  saveViewError.value = null
}

function openSaveCurrentViewModal() {
  resetSaveViewModal()
  saveViewModalState.value = currentSharedViewState.value
  saveViewModalOpen.value = true
}

function openManageViewsModal() {
  manageViewsError.value = ''
  manageViewsModalOpen.value = true
  savedViews.fetchViews().catch(() => {})
}

async function handleSaveView(payload: { id?: string; name: string; visibility: SavedViewVisibility; state: EntriesSharedViewState }) {
  saveViewSubmitting.value = true
  saveViewError.value = null
  try {
    const view = payload.id
      ? await savedViews.updateView({ id: payload.id, name: payload.name, visibility: payload.visibility, state: payload.state })
      : await savedViews.createView({ name: payload.name, visibility: payload.visibility, state: payload.state })
    selectedViewId.value = view.id
    saveViewModalOpen.value = false
    resetSaveViewModal()
  } catch (error: any) {
    saveViewError.value = error?.message || '儲存視圖失敗，請稍後再試'
  } finally {
    saveViewSubmitting.value = false
  }
}

async function applySavedView(view: SavedViewRecord) {
  restoreSharedViewState(view.state)
  selectedViewId.value = view.id
  sharedViewBanner.value = {
    kind: 'named',
    viewName: view.name,
    creatorName: view.creatorName || '未知用戶',
    state: view.state
  }
}

function editSavedView(view: SavedViewRecord) {
  saveViewModalId.value = view.id
  saveViewModalName.value = view.name
  saveViewModalVisibility.value = view.visibility
  saveViewModalState.value = view.state
  saveViewError.value = null
  saveViewModalOpen.value = true
}

async function deleteSavedView(view: SavedViewRecord) {
  manageViewDeleting.value = true
  manageViewsError.value = ''
  try {
    await savedViews.deleteView(view.id)
    if (selectedViewId.value === view.id) selectedViewId.value = null
  } catch (error: any) {
    manageViewsError.value = error?.message || '刪除視圖失敗，請稍後再試'
  } finally {
    manageViewDeleting.value = false
  }
}

function copySavedViewAsOwn(view: SavedViewRecord) {
  saveViewModalId.value = undefined
  saveViewModalName.value = view.name
  saveViewModalVisibility.value = 'private'
  saveViewModalState.value = view.state
  saveViewError.value = null
  saveViewModalOpen.value = true
}

async function shareSavedView(view: SavedViewRecord) {
  const url = import.meta.client
    ? new URL(window.location.href)
    : new URL('/entries', 'http://localhost')
  url.pathname = '/entries'
  url.searchParams.set(ENTRIES_SHARED_VIEW_QUERY_PARAM, view.id)
  const shareUrl = import.meta.client ? url.toString() : `/entries?${ENTRIES_SHARED_VIEW_QUERY_PARAM}=${view.id}`
  if (import.meta.client && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(shareUrl).catch(() => {})
  }
}

function applySharedViewBannerState() {
  if (!sharedViewBanner.value?.state) return
  restoreSharedViewState(sharedViewBanner.value.state)
}

function saveSharedViewBannerAsOwn() {
  if (!sharedViewBanner.value?.state) return
  saveViewModalId.value = undefined
  saveViewModalName.value = sharedViewBanner.value.kind === 'named' ? sharedViewBanner.value.viewName : ''
  saveViewModalVisibility.value = 'private'
  saveViewModalState.value = sharedViewBanner.value.state
  saveViewError.value = null
  saveViewModalOpen.value = true
}

async function applySharedViewQuery(): Promise<boolean> {
  const sharedViewParam = route.query[ENTRIES_SHARED_VIEW_QUERY_PARAM]
  if (typeof sharedViewParam !== 'string') {
    sharedViewBanner.value = null
    lastAppliedSharedView.value = null
    return false
  }
  if (lastAppliedSharedView.value === sharedViewParam) return false

  if (sharedViewParam.startsWith('eyJ')) {
    const result = decodeEntriesSharedView(sharedViewParam)
    if (!result.ok) {
      sharedViewBanner.value = { kind: 'not-found' }
      lastAppliedSharedView.value = sharedViewParam
      return false
    }
    restoreSharedViewState(result.data)
    sharedViewBanner.value = { kind: 'anonymous', state: result.data }
    selectedViewId.value = null
    lastAppliedSharedView.value = sharedViewParam
    return true
  }

  try {
    const view = await savedViews.getViewById(sharedViewParam)
    restoreSharedViewState(view.state)
    selectedViewId.value = view.id
    sharedViewBanner.value = {
      kind: 'named',
      viewName: view.name,
      creatorName: view.creatorName || '未知用戶',
      state: view.state
    }
    lastAppliedSharedView.value = sharedViewParam
    return true
  } catch {
    sharedViewBanner.value = { kind: 'not-found' }
    lastAppliedSharedView.value = sharedViewParam
    return false
  }
}

function clearSharedViewQuery() {
  const query = { ...route.query }
  delete query[ENTRIES_SHARED_VIEW_QUERY_PARAM]
  sharedViewBanner.value = null
  lastAppliedSharedView.value = null
  navigateTo({ path: route.path, query }, { replace: true })
}

/** 當前頁用於多選等可見列操作的條目列表（跟隨進階篩選）。 */
const currentPageEntries = computed(() => {
  if (viewMode.value === 'flat') return filteredEntries.value
  return displayGroups.value.flatMap(g => g.entries)
})

/** 保存狀態需覆蓋整個已載入頁面，避免進階篩選隱藏未保存修改。 */
const allLoadedPageEntries = computed(() => {
  if (viewMode.value === 'flat') return entries.value
  const groups = viewMode.value === 'lexeme' ? lexemeGroups.value : aggregatedGroups.value
  const seenKeys = new Set<string>()
  const loadedEntries: Entry[] = []
  for (const entry of [...entries.value.filter(e => (e as any)._isNew), ...groups.flatMap(group => group.entries)]) {
    const key = String(getEntryKey(entry))
    if (seenKeys.has(key)) continue
    seenKeys.add(key)
    loadedEntries.push(entry)
  }
  return loadedEntries
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
  deleteConfirmOpen,
  batchDeleteSelected,
  confirmBatchDelete,
  cancelBatchDelete,
  headerCheckboxRef
} = useEntriesSelection(currentPageEntries, fetchEntries, invalidateCache)

const {
  aiSuggestion,
  aiSuggestionId,
  aiSuggestionForField,
  pendingAISuggestions,
  themeAISuggestions,
  definitionAISuggestions,
  registerAISuggestions,
  aiLoadingFor,
  aiLoading,
  aiLoadingInlineFor,
  aiInlineError,
  formatThemeSuggestion,
  triggerAISuggestion,
  generateAIExamples,
  generateAIDefinition,
  generateAICategorization,
  generateAIRegister,
  clearPendingSuggestionForCurrentCell,
  retryInlineAISuggestion,
  acceptAISuggestion,
  dismissAISuggestion,
  acceptThemeAI,
  dismissThemeAI,
  formatRegisterSuggestion,
  acceptRegisterAI,
  dismissRegisterAI,
  clearThemeSuggestionForEntry,
  acceptDefinitionAI,
  dismissDefinitionAI,
  markModifiedAISuggestionsForEntry,
  clearAcceptedAITrackersForEntry,
  migrateAcceptedAITrackersEntryId,
  enqueueIgnoredAISuggestion,
  flushPendingIgnored,
  markUninteractedSuggestionsIgnored,
  extractInlineSuggestedValue
} = useEntriesAISuggestions({ editingCell, editValue, currentPageEntries })

/** 將 ThemeAISuggestion 的 alternatives 轉為 AISuggestionRow 需要的格式 */
function getThemeAlternativesForRow(entry: Entry) {
  const suggestion = themeAISuggestions.value.get(getEntryIdString(entry))
  if (!suggestion?.alternatives || suggestion.alternatives.length === 0) return undefined
  return suggestion.alternatives.map(alt => ({
    text: formatThemeSuggestion(alt),
    confidence: alt.confidence
  }))
}

/** 處理展開面板的 AI 接受事件（區分主建議與候選） */
function onThemeExpandAcceptAI(entry: Entry, suggestion: any) {
  const stored = themeAISuggestions.value.get(getEntryIdString(entry))
  if (!stored) return
  // 檢查是否為候選
  if (stored.alternatives) {
    const altIndex = stored.alternatives.findIndex(
      (alt: any) => alt.level3Id === suggestion.level3Id
    )
    if (altIndex >= 0) {
      acceptThemeAI(entry, altIndex)
      return
    }
  }
  // 預設：接受主建議
  acceptThemeAI(entry)
}

const {
  logReferenceHelperEvent,
  logReferenceHelperAction
} = useReferenceHelperTracking()

const rowHints = useEntriesRowHints({
  editableColumns,
  editingCell,
  editValue,
  onReferenceHelperEvent: logReferenceHelperEvent,
  onReferenceHelperAction: logReferenceHelperAction
})
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
const getReferenceSearchLoading = rowHints.getReferenceSearchLoading
const getReferenceSearchQuery = rowHints.getReferenceSearchQuery
const setReferenceSearchQuery = rowHints.setReferenceSearchQuery
const runReferenceSearchForEntry = rowHints.runReferenceSearchForEntry
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

const referenceHeadwordVisibleEntryId = ref<string | null>(null)

// --- Mobile: pre-computed maps for workbench Phase 4 ---
const duplicateCheckEntriesMap = computed(() => {
  const map = new Map<string, any[]>()
  for (const entry of currentPageEntries.value) {
    const id = getEntryIdString(entry)
    const formatted = getDuplicateCheckEntriesFormatted(id)
    if (formatted.length > 0) map.set(id, formatted)
  }
  return map
})

const otherDialectEntriesMap = computed(() => {
  const map = new Map<string, any[]>()
  for (const entry of currentPageEntries.value) {
    const id = getEntryIdString(entry)
    const formatted = getOtherDialectsFormatted(id)
    if (formatted.length > 0) map.set(id, formatted)
  }
  return map
})

const jyutjyuResultsMap = computed(() => {
  const map = new Map<string, any[]>()
  for (const entry of currentPageEntries.value) {
    const id = getEntryIdString(entry)
    const raw = jyutjyuRefResult.value.get(id)
    if (raw?.results?.length) map.set(id, formatJyutjyuResults(raw.results))
  }
  return map
})

const morphemeSearchQuery = ref('')

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
  if (colIndex === registerColIndex.value && registerAISuggestions.value.get(entryId)) {
    dismissRegisterAI(entry)
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
  // 參考詞頭輸入行：位於 DuplicateCheckRow 之後、其他參考提示之前
  if (referenceHeadwordVisibleEntryId.value === entryId) {
    referenceHeadwordVisibleEntryId.value = null
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
  return allLoadedPageEntries.value.some(e => e._isDirty || (e as any)._isNew)
})

// Helper functions
function isEditing(entryId: string | number, field: string) {
  return editingCell.value != null && String(editingCell.value.entryId) === String(entryId) && editingCell.value.field === field
}

function getEntrySavingKey(entry: Entry): string {
  return String((entry as any)._tempId || entry.id || getEntryKey(entry) || '')
}

function isEntrySaving(entry: Entry): boolean {
  const key = getEntrySavingKey(entry)
  return !!key && savingEntryKeys.value.has(key)
}

function setEntrySaving(entry: Entry, value: boolean) {
  const key = getEntrySavingKey(entry)
  if (!key) return
  const next = new Set(savingEntryKeys.value)
  if (value) next.add(key)
  else next.delete(key)
  savingEntryKeys.value = next
}

function setInputRef(el: any, entryId: string, field: string) {
  if (el) {
    inputRefs.value.set(`${entryId}-${field}`, el)
  }
}

function renameInputRefsEntryId(prevId: string, nextId: string) {
  const nextRefs = new Map<string, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>()
  inputRefs.value.forEach((el, key) => {
    if (key.startsWith(`${prevId}-`)) {
      nextRefs.set(`${nextId}-${key.slice(prevId.length + 1)}`, el)
    } else {
      nextRefs.set(key, el)
    }
  })
  inputRefs.value = nextRefs
}

function renamePendingAISuggestionsEntryId(prevId: string, nextId: string) {
  const nextPending = new Map<string, { entryId: string; field: string; text: string; suggestionId?: string }>()
  pendingAISuggestions.value.forEach((suggestion, key) => {
    if (key.startsWith(`${prevId}-`)) {
      nextPending.set(`${nextId}-${key.slice(prevId.length + 1)}`, { ...suggestion, entryId: nextId })
    } else {
      nextPending.set(key, suggestion)
    }
  })
  pendingAISuggestions.value = nextPending
}

function migrateSavedEntryTransientState(prevId: string, nextId: string) {
  if (editingCell.value?.entryId === prevId) editingCell.value = { ...editingCell.value, entryId: nextId }
  if (expandedEntryId.value === prevId) expandedEntryId.value = nextId
  if (expandedMorphemeRefsEntryId.value === prevId) expandedMorphemeRefsEntryId.value = nextId
  if (expandedThemeEntryId.value === prevId) expandedThemeEntryId.value = nextId
  if (referenceHeadwordVisibleEntryId.value === prevId) referenceHeadwordVisibleEntryId.value = nextId
  if (aiLoadingInlineFor.value?.entryId === prevId) aiLoadingInlineFor.value = { ...aiLoadingInlineFor.value, entryId: nextId }
  if (aiInlineError.value?.entryId === prevId) aiInlineError.value = { ...aiInlineError.value, entryId: nextId }

  renameInputRefsEntryId(prevId, nextId)
  renamePendingAISuggestionsEntryId(prevId, nextId)
  migrateAcceptedAITrackersEntryId(prevId, nextId)

  const themeSuggestion = themeAISuggestions.value.get(prevId)
  if (themeSuggestion) {
    themeAISuggestions.value.set(nextId, themeSuggestion)
    themeAISuggestions.value.delete(prevId)
    themeAISuggestions.value = new Map(themeAISuggestions.value)
  }

  const definitionSuggestion = definitionAISuggestions.value.get(prevId)
  if (definitionSuggestion) {
    definitionAISuggestions.value.set(nextId, definitionSuggestion)
    definitionAISuggestions.value.delete(prevId)
    definitionAISuggestions.value = new Map(definitionAISuggestions.value)
  }

  if (jyutdictHandled.value.has(prevId)) {
    jyutdictHandled.value.add(nextId)
    jyutdictHandled.value.delete(prevId)
    jyutdictHandled.value = new Set(jyutdictHandled.value)
  }

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

  const nextHandled = new Set<string>()
  jyutjyuRefHandled.value.forEach((key) => {
    if (key.startsWith(`${prevId}::`)) nextHandled.add(key.replace(`${prevId}::`, `${nextId}::`))
    else nextHandled.add(key)
  })
  jyutjyuRefHandled.value = nextHandled
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
  const arr = entry.phonetic?.jyutping?.map(s => (s || '').trim()).filter(Boolean)
  if (!Array.isArray(arr) || arr.length <= 1) return ''

  const othersCount = arr.length - 1
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
  searchMorphemes,
  addMorphemeRef,
  removeMorphemeRef
} = useEntryMorphemeRefs(getEntryIdString, {
  onReferenceHelperEvent: logReferenceHelperEvent
})

function handleMobileMorphemeSearch(entry: Entry, query: string) {
  morphemeSearchQuery.value = query
  morphemeSearchTargetEntry.value = entry
  searchMorphemes(entry, query)
}

function handleMobileMorphemePageMounted(entry: Entry) {
  morphemeSearchTargetEntry.value = entry
  searchMorphemes(entry)
}

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
  if (editingCell.value && editingCell.value.entryId === getEntryIdString(entry) && editingCell.value.field === 'theme') {
    editValue.value = theme.level3Id
  }
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
    aiSuggestionId.value = pending.suggestionId || null
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
      if (field === 'register' && registerAISuggestions.value.get(entryId)) {
        acceptRegisterAI(entry)
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
    pendingAISuggestions.value.set(key, { entryId: String(entryId), field: aiSuggestionForField.value, text: aiSuggestion.value, suggestionId: aiSuggestionId.value || undefined })
    pendingAISuggestions.value = new Map(pendingAISuggestions.value)
    // 標記為 ignored：用戶退出儲存格時未點接受或拒絕
    if (entry) {
      const suggestedValue = extractInlineSuggestedValue()
      const currentValue = editValue.value !== undefined ? String(editValue.value).trim() : ''
      const reason = suggestedValue && currentValue === suggestedValue
        ? 'cell_exited_value_matched'
        : 'cell_exited'
      enqueueIgnoredAISuggestion(aiSuggestionId.value, getEntryIdString(entry), entry.id || (entry as any)._tempId, aiSuggestionForField.value === 'definition' ? 'senses.0.definition' : aiSuggestionForField.value, reason)
    }
  }
  editingCell.value = null
  aiSuggestion.value = null
  aiSuggestionId.value = null
  aiSuggestionForField.value = null
  if ((field === 'headword' || field === 'dialect') && entry && entry.headword?.display?.trim() && entry.dialect?.name) {
    runDuplicateCheck(entry)
  }
  // 新建詞條：離開詞頭格且已填寫詞頭時，做一次 Jyutjyu 參考查詢
  if (field === 'headword' && entry && (entry as any)._isNew && entry.headword?.display?.trim()) {
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
      // 標記為 ignored：用戶取消編輯時未點接受或拒絕
      const entry = currentPageEntries.value.find(e => getEntryIdString(e) === String(entryId))
      if (entry) {
        enqueueIgnoredAISuggestion(aiSuggestionId.value, getEntryIdString(entry), entry.id || (entry as any)._tempId, aiSuggestionForField.value === 'definition' ? 'senses.0.definition' : aiSuggestionForField.value, 'cell_edit_cancelled')
      }
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
  // Phase 04: also guard when focus is inside toolbar, panels, popovers, alerts, color picker, or fallback URL controls
  const target = event.target as Node
  if (
    target &&
    (target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLButtonElement ||
      (target instanceof HTMLElement && target.isContentEditable) ||
      (target instanceof HTMLElement && (
        target.closest('#entries-advanced-filter-panel') ||
        target.closest('#entries-rule-overlay-panel') ||
        target.closest('[role="alert"]') ||
        target.closest('.popover-content') ||
        target.closest('[data-testid="color-picker"]')
      )))
  ) {
    return
  }
  if (editingCell.value) return
  const rows = tableRows.value.length
  const cols = editableColumns.value.length
  if (rows === 0 || cols === 0) return

  // 尚無焦點格時，用方向鍵/Enter/Tab 從第一個 entry 行開始
  if (!focusedCell.value) {
    if (event.key === 'Enter' || event.key.startsWith('Arrow') || event.key === 'Tab') {
      const firstEntryRow = findFirstEntryTableRow()
      if (firstEntryRow < 0) return
      focusedCell.value = { rowIndex: firstEntryRow, colIndex: 0 }
    } else {
      return
    }
  }

  const { rowIndex, colIndex } = focusedCell.value
  const currentEntry = getEntryAtTableRow(rowIndex)
  const currentEntryKey = currentEntry ? getEntryIdString(currentEntry) : ''
  let nextRow = rowIndex
  let nextCol = colIndex

  switch (event.key) {
    case 'ArrowUp':
      event.preventDefault()
      nextRow = findNextEntryTableRow(rowIndex, -1)
      break
    case 'ArrowDown':
      event.preventDefault()
      nextRow = findNextEntryTableRow(rowIndex, 1)
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
      // 若當前在分類或語域列且有待採納的 AI 建議，Tab 先採納再移動（與釋義列一致）
      if (colIndex === themeColIndex.value && currentEntry && themeAISuggestions.value.get(currentEntryKey)) {
        acceptThemeAI(currentEntry)
      }
      if (colIndex === registerColIndex.value && currentEntry && registerAISuggestions.value.get(currentEntryKey)) {
        acceptRegisterAI(currentEntry)
      }
      if (event.shiftKey) {
        nextCol = colIndex - 1
        if (nextCol < 0) {
          nextCol = cols - 1
          nextRow = findNextEntryTableRow(rowIndex, -1)
        }
      } else {
        nextCol = colIndex + 1
        if (nextCol >= cols) {
          nextCol = 0
          nextRow = findNextEntryTableRow(rowIndex, 1)
        }
      }
      const tabEntry = getEntryAtTableRow(nextRow)
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
      const entry = getEntryAtTableRow(rowIndex)
      const colDef = editableColumns.value[colIndex]
      if (entry && colDef) {
        handleCellClick(entry, colDef.key, event, rowIndex, colIndex, true)
      }
      return
    default:
      // Notion: 直接輸入字符激活當前選中格進入編輯，並把該字符填入
      if (focusedCell.value && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const typableEntry = getEntryAtTableRow(focusedCell.value.rowIndex)
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
  const tempId = createLocalEntryId('new')
  const newEntry: any = {
    _tempId: tempId,
    id: tempId,
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
  autoExpandGroupForEntry(newEntry)

  // 手機端：不自動進入單元格編輯，由 EntriesMobileWorkbench 開啟單行編輯頁
  if (isMobile.value) return

  // 桌面端：直接進入詞頭編輯（forceEdit: true）
  nextTick(() => {
    handleCellClick(newEntry, 'headword', new MouseEvent('click'), 0, 0, true)
  })
}

/** 複製詞條：複製所有內容，方言改為當前用戶的母語/默認方言，插入為新行（草稿） */
function duplicateEntry(entry: Entry) {
  const defaultDialect = getUserDefaultDialect()
  const tempId = createLocalEntryId('dup')
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
  autoExpandGroupForEntry(newEntry)

  // 手機端：不自動進入單元格編輯，由 EntriesMobileWorkbench 開啟單行編輯頁
  if (isMobile.value) return

  nextTick(() => {
    handleCellClick(newEntry, 'headword', new MouseEvent('click'), 0, 0, true)
  })
}

async function saveNewEntry(entry: Entry) {
  if (!entry.headword?.display && !entry.text) {
    alert('請輸入詞條文本')
    return
  }

  if (isEntrySaving(entry)) return
  setEntrySaving(entry, true)
  try {
    // 在 POST 之前送出所有 pending ignored 標記，確保服務端 auto-match 不會誤判
    markUninteractedSuggestionsIgnored(entry)
    await flushPendingIgnored()

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
      status: statusForNew,
      clientEntryKey: getEntryIdString(entry)
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
      // Replace temp entry with real one and migrate transient UI state from temp id to server id.
      const index = entries.value.findIndex(e => e.id === entry.id || (e as any)._tempId === (entry as any)._tempId)
      if (index !== -1) {
        const prev = entries.value[index] as any
        const saved = { ...response.data, createdBy: response.data.createdBy ?? (prev as any).createdBy, _isNew: false, _isDirty: false } as unknown as Entry
        const prevTempId = prev?._tempId ? String(prev._tempId) : ''
        const savedId = String(saved.id || '')
        if (prevTempId && savedId) {
          migrateSavedEntryTransientState(prevTempId, savedId)
        }
        entries.value[index] = saved
        // 從本地儲存中移除已保存嘅詞條
        removeEntryFromLocalStorage(prev?._tempId || entry.id || '')
        // 更新 baseline（之後「取消編輯」應回滾到最新已保存狀態）
        setBaselineForEntry(saved)
        // markModified 必須在 migrateTransientState 之後、clearTrackers 之前調用，
        // 以確保 modified 請求攜帶真實 entryId（而非 tempId）
        await markModifiedAISuggestionsForEntry(saved)
        clearAcceptedAITrackersForEntry(saved)
      }
      pagination.total++
      // 聚合／按詞語視圖下保存新條目後重新拉取，使新條目歸入對應詞形組或詞語組
      if (viewMode.value === 'aggregated' || viewMode.value === 'lexeme') {
        // 計算保存後該詞條所屬組的 key，以便拉取後自動展開
        const savedData = response.data as any
        const postSaveGroupKey = viewMode.value === 'lexeme'
          ? (savedData?.lexemeId || savedData?.headword?.normalized || savedData?.headword?.display || '')
          : (savedData?.headword?.normalized || savedData?.headword?.display || savedData?.text || '')
        await fetchEntries()
        if (postSaveGroupKey) {
          const next = new Set(expandedGroupKeys.value)
          next.add(postSaveGroupKey)
          expandedGroupKeys.value = next
        }
      }
    }
  } catch (error: any) {
    console.error('Failed to save entry:', error)
    const msg = error.data?.message || error.data?.statusMessage || error.statusMessage || error.message
    alert(msg || '保存失敗')
  } finally {
    setEntrySaving(entry, false)
  }
}

async function saveAllChanges() {
  if (savingAll.value || isAnyEntrySaving.value) return
  savingAll.value = true
  const dirtyEntries = allLoadedPageEntries.value.filter(e => e._isDirty && !(e as any)._isNew)

  try {
    // 先更新本地狀態（如審核員保存→已發佈），再發送請求，避免保存後仍顯示「有修改」
    dirtyEntries.forEach(entry => {
      entry.status = getStatusForSave(entry)
    })
    // 標記 modified + uninteracted ignored，並在 PUT 之前 flush
    await Promise.all(dirtyEntries.map(entry => markModifiedAISuggestionsForEntry(entry)))
    dirtyEntries.forEach(entry => markUninteractedSuggestionsIgnored(entry))
    await flushPendingIgnored()
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
      clearAcceptedAITrackersForEntry(entry)
    })
  } catch (error: any) {
    console.error('Failed to save changes:', error)
    alert(error?.data?.message || '保存失敗，請重試')
  } finally {
    savingAll.value = false
  }
}

/** 貢獻者保存：草稿/已拒絕 → 待審核。審核員/管理員保存：草稿/待審核 → 已發佈（無需再審）；已發佈/已拒絕按選擇保留。 */
function getStatusForSave(entry: Entry): Entry['status'] {
  const role = user.value?.role
  const status = entry.status || 'draft'
  // Reviewers/admins: keep original status when saving from entries table.
  // Only the review page approve/reject endpoints should change review status.
  if (role === 'reviewer' || role === 'admin') {
    return status
  }
  // Contributors: draft/rejected → pending_review (auto-submit on save)
  if (status === 'draft' || status === 'rejected') return 'pending_review'
  return status
}

async function saveEntryChanges(entry: Entry) {
  if (isEntrySaving(entry)) return
  setEntrySaving(entry, true)
  const statusToSave = getStatusForSave(entry)
  // 先更新本地狀態（如審核員保存→已發佈），再發送請求，避免保存後比對仍顯示「有修改」
  entry.status = statusToSave
  try {
    await markModifiedAISuggestionsForEntry(entry)
    markUninteractedSuggestionsIgnored(entry)
    // 在 PUT 之前送出所有 pending ignored 標記，避免服務端 auto-match 將它們誤判為 pending
    await flushPendingIgnored()
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
      clearAcceptedAITrackersForEntry(entry)
    }
  } catch (error: any) {
    console.error('Failed to save entry changes:', error)
    alert(error?.data?.message || '保存失敗')
  } finally {
    setEntrySaving(entry, false)
  }
}

async function cancelEdit(entry: Entry) {
  // 若正在編輯同一條詞條，先退出單元格編輯，避免把 editValue 寫返去
  if (editingCell.value && String(editingCell.value.entryId) === getEntryIdString(entry)) {
    cancelCellEdit()
  }

  if (entry._isNew) {
    // 標記所有未操作的 AI 建議為 ignored（詞條被取消，建議不再有用）
    markUninteractedSuggestionsIgnored(entry)
    // 內聯建議也一併標記
    if (aiSuggestion.value && aiSuggestionId.value) {
      enqueueIgnoredAISuggestion(aiSuggestionId.value, getEntryIdString(entry), entry.id || (entry as any)._tempId, 'senses.0.definition', 'entry_cancelled')
      aiSuggestion.value = null
      aiSuggestionId.value = null
      aiSuggestionForField.value = null
    }
    // fire-and-forget：不阻塞 UI，即使失敗也不影響取消流程
    void flushPendingIgnored()
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

/** 手機端詞條更新後觸發重複檢查、Jyutjyu 參考與 Jyutdict 建議（模擬桌面 handleBlur 行為） */
function onMobileEntryUpdate(entry: Entry) {
  if (entry.headword?.display?.trim() && entry.dialect?.name) {
    runDuplicateCheck(entry)
  }
  if (entry._isNew && entry.headword?.display?.trim()) {
    runJyutjyuRef(entry)
  }
  // 新建詞條：有詞頭和方言時觸發 Jyutdict 粵拼建議
  if (entry._isNew && entry.headword?.display?.trim() && entry.dialect?.name) {
    const entryIdStr = String(getEntryIdString(entry))
    if (!jyutdictHandled.value.has(entryIdStr)) {
      const existingData = rowHints.jyutdictData.value.get(entryIdStr)
      if (!existingData || existingData.length === 0) {
        queryJyutdictForEntry(entry)
      } else if (!jyutdictVisible.value.get(entryIdStr)) {
        jyutdictVisible.value.set(entryIdStr, true)
      }
    }
  }
}

/** 手機端批量刪除（確認流程由 mobileBatchDeleteSheetOpen 控制） */
const mobileBatchDeleteSheetOpen = ref(false)
const mobileBatchDeletePendingIds = ref<string[]>([])
const mobileResetSelectionTrigger = ref(0)

async function mobileBatchDelete(entryIds: string[]) {
  if (!entryIds.length) return
  const savedIds = entryIds.filter(id => !id.startsWith('new-') && !id.startsWith('dup-'))
  if (!savedIds.length) return
  mobileBatchDeletePendingIds.value = savedIds
  mobileBatchDeleteSheetOpen.value = true
}

async function confirmMobileBatchDelete() {
  const savedIds = mobileBatchDeletePendingIds.value
  if (!savedIds.length) return
  mobileBatchDeleteSheetOpen.value = false
  try {
    await Promise.all(savedIds.map(id => $fetch(`/api/entries/${id}`, { method: 'DELETE' })))
    savedIds.forEach(id => removeEntryFromLocalStorage(id))
    mobileResetSelectionTrigger.value++
    await fetchEntries()
  } catch (error: any) {
    console.error('Batch delete failed:', error)
    alert(error?.data?.message || '批量刪除失敗')
  } finally {
    mobileBatchDeletePendingIds.value = []
  }
}

/** 手機端批量修改狀態 */
async function mobileBatchStatusChange(entryIds: string[], status: string) {
  if (!entryIds.length || !status) return
  try {
    // 使用 allLoadedPageEntries 而非 entries.value，因為在聚合/詞語視圖下 entries.value 可能為空
    const validEntries = allLoadedPageEntries.value.filter(e => {
      const id = e.id || (e as any)._tempId || ''
      return entryIds.includes(id)
    })
    await Promise.all(
      validEntries.filter(e => !e._isNew).map(e => {
        e.status = status as Entry['status']
        e._isDirty = true
        return saveEntryChanges(e)
      })
    )
    validEntries.filter(e => e._isNew).forEach(e => {
      e.status = status as Entry['status']
      e._isDirty = true
    })
  } catch (error: any) {
    console.error('Batch status change failed:', error)
    alert(error?.data?.message || '批量修改狀態失敗')
  }
}

// Flag to skip watch during initialization
const isInitializing = ref(true)

// Extract URL parameter handling into a function
function applyUrlParams(): boolean {
  const query = route.query
  let changed = false

  // Handle search parameter
  const newSearch = typeof query.search === 'string' ? query.search : ''
  if (newSearch !== searchQuery.value) {
    searchQuery.value = newSearch
    changed = true
  }

  // Handle filter=mine parameter
  const shouldFilterMine = query.filter === 'mine' && user.value?.id
  const newCreatedBy = shouldFilterMine ? user.value.id : ''
  if (newCreatedBy !== filters.createdBy) {
    filters.createdBy = newCreatedBy
    changed = true
  }

  return changed
}

// Watch for page changes
watch(currentPage, () => {
  if (isInitializing.value || isAllFetched.value) return
  fetchEntries()
})

// Watch for filter changes (sidebar or page dropdowns) - reset to page 1 and fetch
watch([() => filters.dialect, () => filters.status, () => filters.theme, () => filters.createdBy], () => {
  if (isInitializing.value) return
  currentPage.value = 1
  if (hasActiveAdvancedFilters.value) fetchAllEntries()
  else fetchEntries()
})

watch(hasActiveAdvancedFilters, (active) => {
  if (isInitializing.value) return
  currentPage.value = 1
  if (active) fetchAllEntries()
  else fetchEntries()
})

// Watch for route.query changes (handles navigation from homepage with search/filter params)
watch(
  () => route.query,
  () => {
    if (isInitializing.value) return
    void applySharedViewQuery()
    const changed = applyUrlParams()
    if (changed) {
      currentPage.value = 1
      fetchEntries()
    }
  },
  { deep: true }
)

// Provide page context for AI agent
provide('agentPageContext', computed(() => ({
  route: route.fullPath,
  filters: {
    query: searchQuery.value || undefined,
    dialect: filters.dialect !== ALL_FILTER_VALUE ? filters.dialect : undefined,
    status: filters.status !== ALL_FILTER_VALUE ? filters.status : undefined,
    theme: filters.theme !== ALL_FILTER_VALUE ? filters.theme : undefined,
    createdBy: filters.createdBy || undefined
  },
  view: viewMode.value,
  selectedEntries: [...selectedEntryIds.value],
  visibleCount: visibleEntryCount.value,
  totalCount: pagination.total,
  currentPage: currentPage.value,
  hasAdvancedFilters: hasActiveAdvancedFilters.value
})))

// Watch for agent local actions (from AI assistant panel)
const agentFilterLabel = ref<string | null>(null)
const { pending: agentActions, dequeue: dequeueAgentAction } = useAgentActions()
watch(agentActions, async (queue) => {
  if (!queue.length || isInitializing.value) return
  const action = dequeueAgentAction()
  if (!action) return

  if (action.label) agentFilterLabel.value = action.label

  switch (action.kind) {
    case 'apply_filters':
      if (action.filters?.query !== undefined) searchQuery.value = action.filters.query
      if (action.filters?.dialect) filters.dialect = action.filters.dialect
      if (action.filters?.status) {
        const statusMap: Record<string, string> = {
          draft: 'draft', pending_review: 'pending_review', approved: 'approved', rejected: 'rejected'
        }
        filters.status = statusMap[action.filters.status] || action.filters.status
      }
      if (action.filters?.view) setViewMode(action.filters.view as 'flat' | 'aggregated' | 'lexeme')
      if (action.filters?.formula || action.filters?.regexRows?.length) {
        advancedFilters.formulaInput.value = action.filters.formula || ''
        if (action.filters.regexRows?.length) {
          advancedFilters.regexRows.value = action.filters.regexRows.map(row => ({
            id: crypto.randomUUID(),
            field: row.field as any,
            pattern: row.pattern,
            flags: row.flags || 'i'
          }))
        }
        if (action.filters.openAdvancedFilter) advancedFilters.advancedFilterExpanded.value = true
        advancedFilters.applyAdvancedFilters()
      }
      currentPage.value = 1
      await handleSearch()
      break

    case 'switch_view':
      if (action.view) setViewMode(action.view as 'flat' | 'aggregated' | 'lexeme')
      break

    case 'toggle_advanced_filter':
      advancedFilters.advancedFilterExpanded.value = action.open ?? true
      break

    case 'open_entry':
      if (action.entryId) {
        searchQuery.value = action.entryId
        currentPage.value = 1
        await handleSearch()
      }
      break
  }
}, { deep: true })

function dismissAgentFilterNotice() {
  agentFilterLabel.value = null
}

function clearAgentFilter() {
  agentFilterLabel.value = null
  searchQuery.value = ''
  filters.dialect = ALL_FILTER_VALUE
  filters.status = ALL_FILTER_VALUE
  filters.theme = ALL_FILTER_VALUE
  filters.createdBy = ''
  advancedFilters.clearAdvancedFilters()
  currentPage.value = 1
  fetchEntries()
}

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

// Initial fetch - process URL params first, then fetch
onMounted(async () => {
  // Google OAuth merge notification
  if (route.query.google_merged === '1') {
    toast.add({ title: '已連結 Google 帳號', description: '之後可以使用 Google 或密碼登錄', color: 'success', icon: 'i-heroicons-check-circle' })
  }

  // Apply URL parameters (search, filter=mine)
  await applySharedViewQuery()
  applyUrlParams()

  // 從 DB 刷新 dialectPermissions，避免使用登入時的 session snapshot
  await refreshUser()

  // 加載貢獻者列表（供提交者篩選下拉使用）
  await fetchContributors()

  // 預載儲存視圖列表（桌面下拉與手機視圖頁都需要）
  savedViews.fetchViews().catch(() => {})

  // 貢獻者若無方言權限 → 引導設定
  if (user.value?.role === 'contributor' && (!user.value.dialectPermissions || user.value.dialectPermissions.length === 0)) {
    await navigateTo('/setup')
    return
  }

  await fetchEntries()

  // Mark initialization complete so watches can trigger normally
  isInitializing.value = false

  // If advanced filters were restored from a saved view, switch to all-fetch
  if (hasActiveAdvancedFilters.value) {
    await fetchAllEntries()
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
