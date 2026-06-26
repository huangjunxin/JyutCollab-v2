# 手機詞條列表第二期非首頁驗收矩陣

## 範圍鎖定

第二期後續不再修改詞條列表首頁可見 UI。驗收、測試、性能量測與設定子頁工作可以繼續，但不得改動首頁列表版面、欄寬、行高、badge、表頭、固定首欄視覺、首頁篩選列、新增入口或儲存入口。

凍結範圍：

- `app/components/entries/mobile/EntriesMobileGrid.vue`
- `app/components/entries/mobile/EntriesMobileWorkbench.vue` 的列表首頁 template
- `app/pages/entries/index.vue` 的桌面 / 手機首頁分流呈現

可繼續範圍：

- `app/components/entries/mobile/EntriesMobileViewPage.vue`
- 未來設定子頁
- 文檔與驗收記錄
- 測試與性能量測
- 不改首頁視覺輸出的狀態邏輯整理

## 跨頁對照發現

2026-06-26 根據使用者提供的手機截圖，`/admin/users` 的手機界面未達到詞條手機工作台同級別的窄屏優化，判斷成立。

對照證據：

- `app/pages/admin/users.vue` 在手機寬度仍使用一般頁面容器、完整頁面標題、置頂搜尋和兩個篩選器，沒有專用 compact header、收合控制或手機工作台分層。
- `app/components/admin/UserTable.vue` 只有 `sm:hidden` 卡片列表分支；每筆資料同時擺放頭像、用戶名、電郵、角色、狀態、統計、日期和三個文字操作按鈕。在 390px 左右視口下，資訊密度、橫向空間和操作列都比詞條手機版更緊。
- `app/components/entries/mobile/EntriesMobileWorkbench.vue` 和 `app/components/entries/mobile/EntriesMobileGrid.vue` 則有獨立手機工作台：compact header、可收合搜尋篩選、專用 grid、固定首欄、密度設定、分頁、批量操作列和子頁導航。

結論：

- 這是全站手機體驗不一致問題，不是 `EntriesMobileGrid.vue` 第二期首頁回退。
- 本文件的第二期凍結範圍維持不變，不因用戶管理頁問題重新打開詞條列表首頁 UI。
- 已於 2026-06-26 納入「用戶管理手機 UX」修復，重點處理 compact header、篩選收合、列表資訊層級、操作入口收斂，以及分頁在手機底部的可用性。

## 用戶管理手機 UX 修復記錄

2026-06-26 已完成 `/admin/users` 手機版修復。

改動範圍：

- `app/pages/admin/users.vue`：手機端改為工作台式頁面骨架，加入 compact header、篩選按鈕、重新載入按鈕、收合式搜尋 / 角色 / 狀態篩選、已篩選摘要與清除入口；桌面搜尋區維持桌面呈現。
- `app/components/admin/UserTable.vue`：手機端改為可獨立滾動的緊湊列表；每筆用戶只保留一個「用戶操作」更多選單，統計資料改為固定三欄掃描區，方言權限只顯示前兩個 chip 加剩餘數量。
- `app/components/admin/__tests__/AdminUsersMobileScope.test.ts`：新增 source contract 測試，防止手機篩選常駐、`sm` 斷點回退、三個文字操作按鈕重新出現在手機列表。

驗證結果：

- `npx vitest run app/components/admin/__tests__/AdminUsersMobileScope.test.ts app/components/entries/__tests__/EntriesMobileStage2Scope.test.ts`：2 files / 9 tests passed。
- `npm run build`：通過；只保留既有 chunk size warning 及 Tailwind sourcemap warning。
- Browser plugin 嘗試失敗：`Browser is not available: iab`，因此改用 Playwright + Microsoft Edge channel。
- Playwright 390×844 開啟 `http://localhost:3000/admin/users`：未登入狀態按中介層轉到 `http://localhost:3000/login?redirect=/entries`，頁面非空，無 Nuxt / Vite / framework error overlay。因缺少管理員登入 session，未能直接截取真實 `/admin/users` 資料列表畫面。
- Playwright console：只有一條開發工具注入 `VueElement` 的 style attribute warning，與本次 `/admin/users` 手機 UI 改動無關。

## 驗收矩陣

| 編號 | 項目 | 視口 / 模式 | 預期結果 | 證據 | 狀態 |
| --- | --- | --- | --- | --- | --- |
| S2-01 | 核心欄位掃描 | 375px 淺色 | 詞頭、方言、粵拼、狀態可讀；狀態欄右側沒有空欄 | 待補截圖或錄屏 | 待驗收 |
| S2-02 | 核心欄位掃描 | 375px 暗色 | 詞頭、方言、粵拼、狀態可讀；固定首欄分隔清楚 | 待補截圖或錄屏 | 待驗收 |
| S2-03 | 核心欄位掃描 | 430px 淺色 | 「廣州」「待審核」「已發佈」不超出格線 | 待補截圖或錄屏 | 待驗收 |
| S2-04 | 核心欄位掃描 | 430px 暗色 | badge 不撐破格線，長粵拼以省略號截斷 | 待補截圖或錄屏 | 待驗收 |
| S2-05 | 橫向滑動 | 375px / 430px | 橫向滑動不誤觸進入單行編輯頁 | 待補錄屏 | 待驗收 |
| S2-06 | 視圖子頁 | 375px / 430px | 進入視圖與設定子頁後可切換視圖、密度、可選欄位 | 待補錄屏 | 待驗收 |
| S2-07 | 返回鍵 | 375px / 430px | 列表 → 視圖子頁 → 返回列表；列表 → 單行編輯頁 → 返回列表 | 待補錄屏 | 待驗收 |
| S2-08 | 桌面回歸 | 桌面寬度 | 搜尋、排序、視圖切換、進階篩選、行內編輯、批量操作不回退 | 待補手動記錄 | 待驗收 |
| S2-09 | 大量資料性能 | 375px / 430px | 垂直滾動與橫向滑動沒有明顯卡頓或布局跳動 | 待補量測記錄 | 待驗收 |
| S2-10 | Build | 本地命令 | `npm run build` 通過，僅允許既有 warning | 2026-06-25 `npm run build` 通過；僅有既有 chunk size / sourcemap warnings | 已通過 |
| S2-11 | 第二期範圍護欄 | source contract | 設定 UI 留在視圖子頁；首頁 grid 不承載第二期設定 UI | `npx vitest run app/components/entries/__tests__/EntriesMobileStage2Scope.test.ts`：6 passed | 已通過 |
| S2-12 | 視圖子頁可訪問性 | source contract | 返回、視圖切換、密度切換、已儲存視圖和欄位 checkbox 有明確 label / pressed state；欄位 checkbox 有穩定 label/input 關聯；設定區塊有 section heading 關聯 | `npx vitest run app/components/entries/__tests__/EntriesMobileStage2Scope.test.ts`：6 passed | 已通過 |
| S2-13 | 首頁 grid 凍結護欄 | source contract | 已修復的 `colgroup`、核心欄寬、無 indicator 空欄、group colspan 不回退 | `npx vitest run app/components/entries/__tests__/EntriesMobileStage2Scope.test.ts`：6 passed | 已通過 |
| S2-14 | 跨頁手機對照 | 390px 左右手機截圖 + source review | 用戶管理頁手機版問題成立，但屬於全站 admin 手機 UX backlog；不改動詞條列表第二期首頁凍結範圍 | 2026-06-26 使用者截圖；`app/pages/admin/users.vue`；`app/components/admin/UserTable.vue`；`app/components/entries/mobile/EntriesMobileWorkbench.vue`；`app/components/entries/mobile/EntriesMobileGrid.vue` | 已記錄 |
| S2-15 | 用戶管理手機 UX 修復 | source contract + build + auth-redirect render check | `/admin/users` 手機端有 compact header、收合篩選、單一更多操作入口、緊湊統計區；詞條列表第二期首頁凍結範圍不受影響 | 2026-06-26 `AdminUsersMobileScope.test.ts` + `EntriesMobileStage2Scope.test.ts`：9 passed；`npm run build` 通過；Playwright 390×844 確認未登入會被中介層轉去 login，無 framework overlay | 已通過 |

## 性能量測記錄

| 日期 | 資料量 | 視口 | 操作 | 結果 | 備註 |
| --- | --- | --- | --- | --- | --- |
| 待補 | 待補 | 375px | 垂直滾動列表 | 待補 | 不改首頁 UI，只記錄 |
| 待補 | 待補 | 375px | 橫向滑動欄位 | 待補 | 不改首頁 UI，只記錄 |
| 待補 | 待補 | 430px | 進入單行編輯頁 | 待補 | 不改首頁 UI，只記錄 |

## 第二期後續准入

可以繼續：

- 補本文件的驗收證據。
- 在設定 / 視圖子頁補缺口。
- 補設定狀態的測試。
- 補性能量測方法與結果。
- 維護 `EntriesMobileStage2Scope.test.ts`，防止第二期設定 UI 回流到首頁 grid。
- 繼續處理其他全站手機 UX 頁面，但不得把該工作混入詞條列表第二期首頁凍結範圍。

暫停：

- 修改詞條列表首頁 UI。
- 修改手機 grid 的可見樣式。
- 為第二期新增 card 模式。
