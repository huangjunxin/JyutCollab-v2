# 詞條表格電腦端 UX 回歸審查

日期：2026-06-28（最後更新同日）

## 基準

本審查以 `b2e30b2` 作為加手機端之前的電腦端 UX 基準。該提交是 `675d76a refactor: 提取桌面表格組件，新增手機端基礎架構` 的上一個提交，舊版電腦端表格主要集中在 `app/pages/entries/index.vue`。

目前審查對象為 `HEAD 6e62454`（含 3 個本地未推送修復 commit）。現版已將電腦端表格拆成 `app/components/entries/EntriesDesktopTable.vue`，並由 `app/pages/entries/index.vue` 透過 props / emits 保留原本的編輯、AI、提示列、展開列及快捷鍵邏輯。

## 已檢查範圍

- `app/pages/entries/index.vue`
- `app/components/entries/EntriesDesktopTable.vue`
- `app/components/entries/EntriesEditableCell.vue`
- `app/components/entries/AISuggestionRow.vue`
- `app/components/entries/EntryThemeExpand.vue`
- `app/composables/useEntriesTableColumns.ts`
- `app/composables/useEntriesTableEdit.ts`
- `app/composables/useEntriesAISuggestions.ts`
- `app/composables/useEntriesSelection.ts`
- `app/composables/useMobileBreakpoint.ts`
- `app/components/entries/__tests__/EntriesDesktopTableRegression.test.ts`

已執行：

```bash
npx vitest run app/components/entries/__tests__/EntriesDesktopTableRegression.test.ts
npm run build
```

結果：1 個測試檔、8 個測試全部通過；production build 完成，沒有型別或編譯錯誤。

## 已修復項目

### ✅ P1：表頭全選 checkbox 的半選狀態失效

**commit:** `1d19879`

舊版 `index.vue` 直接把表頭 checkbox 綁到 `headerCheckboxRef`，`useEntriesSelection.ts` 在 `selectAllIndeterminate` 變化時設定 `el.indeterminate`。refactor 後 `EntriesDesktopTable.vue` 內部 watch 為空殼。

修法：新增 `selectAllIndeterminate` prop 傳入 `EntriesDesktopTable.vue`，用 `watch([headerCheckboxEl, selectAllIndeterminate])` 設定 `el.indeterminate`。

### ✅ P2：AI 分類／語域建議因 prop 鏈響應式斷裂而不顯示

**commit:** `bdaa4be`

舊版 `focusedCell`、`themeAISuggestions`、`registerAISuggestions` 都是同組件內的 `ref`，模板直接解包。refactor 後變成跨組件 prop 傳遞，Vue 在 `<template v-for>` 內對 prop 的 patch flag 優化導致 `v-if` 條件不重新求值——資料在、Tab/Esc 能盲操作，但 AISuggestionRow 視覺不渲染。

修法：`index.vue` 用 `computed(() => ref.value)` 包裝後 `provide`；`EntriesDesktopTable.vue` 用 `inject` 接收，並以同名 `computed` 覆蓋 prop 名稱。`isSelected`、`getThemeSuggestion`、`getRegisterSuggestion`、`isTargetCellActive` 全部改讀 shadow computed，等效於 refactor 前同組件內直接讀 ref 的行為。

同時移除了後續多加的內嵌提示（`themeExpandHint`、`aiSuggestionHint`、`acceptCellAISuggestion`/`dismissCellAISuggestion` 模板綁定），只保留行下方 `AISuggestionRow` 作為唯一 AI 建議呈現位置——還原到舊版 UX。

### ✅ P2：AI 分類／語域建議雙重呈現（已解決）

由上述 `bdaa4be` 修復中一併處理：移除 `EntriesEditableCell.vue` 內所有格內 AI 建議提示的模板綁定，不再出現儲存格內與行下方同時顯示同一建議的情況。

### ✅ P3：父頁保留已遷移的死碼

**commit:** `6e62454`

清理了 `index.vue` 中已遷移到 `EntriesDesktopTable.vue` 本地實現的：
- `jumpToPageInput` / `handleJumpToPage`（分頁跳轉已在子組件）
- `headerCheckboxRef` 解構（已改用 `selectAllIndeterminate` prop）

## 保留不變（已確認非回歸）

### P2：手動 AI 釋義按鈕自動展開釋義詳情

現版桌面表格透過 `generateAIDefinitionFromDesktopCell(entry)` 先設定 `expandedEntryId`、確保 senses 結構，再呼叫 `generateAIDefinition(entry)`。這是為避免建議生成後因詳情列未展開而不可見的修補，非 refactor 引出的破壞。**接受為新行為。**

### P2：AI 分類／語域建議顯示依賴 rowIndex / colIndex 傳遞

當前 `@ai-theme` / `@ai-register` 已帶 row/col index，父頁先設定 `focusedCell` 再生成 AI。回歸測試已覆蓋。保留現有測試。

### 離開方言格時觸發 runDuplicateCheck

經 git bisect 確認是在 `1b74469`（"fix: allow duplicate headwords with soft warnings"）引入：把 `runDuplicateCheck` 條件從僅 `field === 'headword'` 擴展為 `field === 'headword' || field === 'dialect'`，並加上 `entry.dialect?.name` 檢查。這導致新建詞條時 Tab 離開詞頭和離開方言各觸發一次——第一次方言可能為空，第二次才是有效檢測。**非 refactor 回歸，是舊版設計。**

## 現存風險（已守住，需持續關注）

### Map 型 AI 建議 props 的響應式傳遞

雖然 `focusedCell`、`themeAISuggestions`、`registerAISuggestions` 已改用 provide/inject 繞過，但 `definitionAISuggestions`、`jyutjyuRefResult` 等其他 Map prop 仍走 props 傳遞。目前有 `withDefaults`、`getMapValue()` 和 helper function 包裝降低風險，回歸測試守住。

建議：

- 若未來其他 Map prop 也出現類似顯示問題，套用相同的 provide/inject 模式。
- AI 建議更新後繼續使用 `map.value = new Map(map.value)` 的模式確保新參考觸發響應式。

### rowIndex / colIndex emit 契約

日後若簡化 emit payload 只傳 entry，AI 建議仍會生成但行下方 block 不會出現。保留現有回歸測試守住。

## 快捷鍵檢查結果

靜態比對後，核心鍵盤邏輯仍大致保留：

- 非編輯狀態：方向鍵移動格、Enter 進入編輯、Tab 移動並進入下一格、直接輸入字元進入編輯。
- 編輯狀態：Enter 儲存、Shift+Enter 在文字／粵拼欄保留換行、Tab 採納 AI／泛粵典建議再移動、Esc 逐個關閉最上方提示後才取消編輯。
- 現版額外把 Enter 儲存後的焦點拉回桌面表格 wrapper，這有回歸測試覆蓋，屬於維持鍵盤連續操作的修補。

仍建議補渲染層測試或 Playwright smoke test，覆蓋：

- 點格一次只選中，再按 Enter 進入編輯。
- 編輯後 Enter 儲存，再按 ArrowDown 能繼續移動。
- Tab 在分類／語域建議上先採納，再移到下一格。
- Esc 在有多個 inline block 時逐個關閉，而不是一次取消整格編輯。
