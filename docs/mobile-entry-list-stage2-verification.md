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

暫停：

- 修改詞條列表首頁 UI。
- 修改手機 grid 的可見樣式。
- 為第二期新增 card 模式。
