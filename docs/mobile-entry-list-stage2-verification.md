# 手機端詞條列表及全平台改造 — 階段二驗證

## 2026-06-27 更新結論

本輪修復重檢後，涉及桌面 `/entries` 詞條表格的 2 項改動已回退：`useMobileBreakpoint()` SSR 預設手機端、以及桌面 loading skeleton。原因是桌面詞條表格承載快捷鍵、欄寬、saved views、預設方言等既有工作流，不應為手機端優化改動桌面首屏分流或桌面 loading 界面。

其餘手機 / 跨頁修復方向仍符合階段二手機體驗目標：減少窄屏溢出、提高觸控目標、保留 entries 手機首頁凍結護欄，並改善 `/admin/users`、`review`、`histories` 等頁面的手機可用性。

已驗證證據：

- `npm run build`：通過；僅保留既有 chunk size warning 及 Tailwind sourcemap warning。
- `npx vitest run app/components/admin/__tests__/AdminUsersMobileScope.test.ts app/components/entries/__tests__/EntriesMobileStage2Scope.test.ts`：2 files / 9 tests passed。
- source review 確認 9 項非桌面 entries 修復仍有對應檔案改動；2 項涉及桌面 entries 的改動已回退。

目前結論：

- ✅ 可判定為「程式層面修復基本完成」。
- ✅ 未發現會破壞 entries 第二期手機首頁護欄的改動。
- ✅ 桌面 `/entries` 表格界面回復原有分流與 loading，不再引入 mobile-first SSR 或 skeleton 改動。
- ⚠️ 不應寫成「所有手機頁面已完成真機 / rendered 驗收」；登入態頁面、modal、桌面 hydration、實際手機截圖仍需補證據。
- ⚠️ 手機端首屏閃爍仍待另案處理，不能用改動桌面 `/entries` 初始分流的方式解決。
- ⚠️ histories diff 表格已移除非法 `w-3/8` 類，但目前三欄皆用 `w-1/4 sm:w-1/3`，如需保留「原值 / 新值」較寬比例，可再改為明確比例類。

## 總體方案（已確認）

### 一、三種頁面策略（已全部實現 ✅）

| 頁面 | 策略 | 狀態 |
|---|---|---|
| **entries** | JS 雙佈局：`useMobileBreakpoint()` + `EntriesMobileWorkbench` 完全替換桌面表格 | ✅ 已完成 |
| **review** | 響應式卡片佈局：桌面版卡片天然適合手機端，`sm:` / `md:` 斷點自適應 | ✅ 已完成 |
| **histories** | 響應式卡片佈局：同 review，`sm:hidden` / `hidden sm:flex` 切換變更欄位顯示 | ✅ 已完成 |
| **admin/users** | JS 雙佈局：`AdminUserTable` 內部 `hidden md:block` 表格 + `md:hidden` 卡片 | ✅ 已完成 |
| **login / register** | 響應式分欄：`hidden lg:flex` 裝飾面板 + `lg:hidden` 手機標題 | ✅ 已完成 |

### 二、手機端適配清單（源碼與構建檢查更新）

> 標記說明：✅ 已由源碼 / build / scope 測試確認 · 🔧 已修復 · ⚠️ 待補 rendered QA 證據

#### 共用元件

- ✅ **SharedSearchFilterBar**（`app/components/shared/SearchFilterBar.vue`）
  - 桌面版：`hidden sm:flex` 內聯篩選行
  - 手機端：`sm:hidden` 篩選按鈕 + 可折疊面板（含搜尋框 + 所有篩選器）
  - 三頁共用：entries、review、histories
- ✅ **AppSidebar**（`app/components/layout/AppSidebar.vue`）
  - 桌面版：`lg:` 斷點常駐側邊欄
  - 手機端：漢堡按鈕（`lg:hidden`）+ `USlideover` overlay 側邊欄

#### entries 頁面（`app/pages/entries/index.vue`）

- ✅ 頁面用 `useMobileBreakpoint()` 決定渲染 `EntriesDesktopTable` 或 `EntriesMobileWorkbench`
- ✅ 桌面專屬區塊（頁頭、AgentFilterBanner、SharedSearchFilterBar、AdvancedFilterHost、ViewsDropdown、空狀態）全部用 `v-if="!isMobile"` 控制
- ✅ 桌面 loading 維持原 spinner，不再改為 `USkeleton`；手機分支仍由 `EntriesMobileWorkbench` 自身狀態處理，未改手機首頁 grid

#### entries 手機端完整元件清單（`app/components/entries/mobile/`，共 11 個）

- ✅ **EntriesMobileWorkbench** — 手機端主容器/路由
- ✅ **EntriesMobileGrid** — 手機端列表，支援水平滾動 + 首列固定 + 密度切換
- ✅ **EntriesMobileRowEditor** — 手機端行內編輯器（替代桌面 Notion 風格鍵盤導航）
- ✅ **EntriesMobileFieldRow** — 手機端欄位行元件
- ✅ **EntriesMobileSelectSheet** — 手機端下拉選擇 Bottom Sheet（替代桌面 USelectMenu）
- ✅ **EntriesMobileSensesPage** — 手機端義項編輯子頁面
- ✅ **EntriesMobileThemePage** — 手機端主題分類子頁面
- ✅ **EntriesMobileMorphemePage** — 手機端用字/詞連結子頁面
- ✅ **EntriesMobileRulesPage** — 手機端規則覆蓋層
- ✅ **EntriesMobileViewPage** — 手機端視圖管理（替代桌面 ViewsDropdown + AdvancedFilterPanel）
- ✅ **EntriesMobileViewChips** — 手機端視圖條件 Chips 條

#### entries 交互替換對照

| 桌面版交互 | 手機端替換 | 狀態 |
|---|---|---|
| `EntriesDesktopTable` Notion 鍵盤導航 | `EntriesMobileRowEditor` 原生表單觸控操作 | ✅ |
| `USelectMenu` 下拉選擇 | `EntriesMobileSelectSheet` Bottom Sheet | ✅ |
| `ViewsDropdown` + `AdvancedFilterPanel` | `EntriesMobileViewPage` 子頁面 | ✅ |
| 批量刪除 `UModal` 確認框 | `USlideover side="bottom" max-h-[40vh]` 底部滑動面板 | ✅ |
| `EntriesSaveViewModal` / `EntriesManageViewsModal` | 桌面手機共用（UModal 自適應） | ✅ |
| `LexemeExternalEtymonsModal` | 桌面手機共用（`grid-cols-1 md:grid-cols-2` 響應式表單） | ✅ |
| `LexemeMergeModal` | 桌面手機共用（`flex-wrap` + `min-w-0` 防溢出） | ✅ |
| 形態素搜索 Modal | 桌面手機共用（`max-w-2xl`） | ✅ |

#### review 頁面（`app/pages/review/index.vue`）

- ✅ 頁頭 `flex-col sm:flex-row` 響應式佈局
- ✅ 共用 `SharedSearchFilterBar`（內建手機版面板）
- ✅ `EntryDetailCard` 作為審核卡片（`flex-col md:flex-row` 頭部、`flex-wrap` badges）
- 🔧 通過/拒絕按鈕 `size="sm"` → `size="md"`，達到 44px 推薦觸控目標
- ✅ 拒絕原因 `UModal`（footer `flex-col sm:flex-row` 按鈕自適應）
- ✅ 分頁 `UPagination` 居中，無硬編碼寬度

#### histories 頁面（`app/pages/histories/index.vue`）

- ✅ 頁頭 `flex-col sm:flex-row` 響應式佈局
- ✅ 共用 `SharedSearchFilterBar`（內建手機版面板）
- ✅ 卡片式列表天然適合手機端（UCard 佈局）
- ✅ 變更欄位 badge：桌面 `hidden sm:flex` 行內顯示 / 手機 `sm:hidden` 換行顯示
- ✅ Diff Modal：分欄比較 `grid-cols-1 md:grid-cols-2` 自動堆疊
- 🔧 統一 diff 表格 `min-w-[20rem]` → `min-w-[16rem]`，減少窄屏水平滾動
- 🔧 `w-3/8` 非標準 Tailwind 類 → `w-1/4`，確保列寬生效
- ✅ 撤銷按鈕：footer `flex-col sm:flex-row` + `items-stretch` 全寬觸控
- ✅ 撤銷確認 Modal：`flex-col sm:flex-row` 按鈕自適應
- ✅ 分頁 `UPagination` 居中

#### admin/users 頁面

- ✅ 頁頭：`hidden md:block` 桌面版 + `md:hidden` 手機版（含篩選開關）
- ✅ 篩選面板：手機端 `grid grid-cols-2` 緊湊佈局
- ✅ `AdminUserTable`：`hidden md:block` 表格 + `md:hidden` 卡片佈局
- ✅ 手機卡片：`truncate` 用戶名/郵箱、`grid-cols-3` 統計行、方言 badge 限制 2 個 + "+N" 溢出
- 🔧 截斷文字加 `title` 屬性（`UserTable.vue` 用戶名/郵箱）
- ✅ `EditRoleModal`：`UModal max-w-md` + `size="lg"` 觸控友好
- ✅ `ManageDialectsModal`：`flex-col sm:flex-row` 權限項、`flex-1` 自適應新增行
- 🔧 `ManageDialectsModal` 角色選擇 `w-28` → `w-24 sm:w-28`，方言標籤加 `truncate` + `title`

#### login / register 頁面

- ✅ 分欄佈局：`hidden lg:flex lg:w-1/2` 裝飾面板 + `w-full lg:w-1/2` 表單面板
- ✅ 手機標題：`lg:hidden` 居中 logo + 標題
- ✅ 表單輸入：`size="lg"` + `w-full` 觸控友好
- ✅ 按鈕：`size="xl"` + `block` 全寬
- ✅ Google OAuth 按鈕：`block` + `size="xl"`

### 三、共用元件響應式狀態

| 元件 | 狀態 | 說明 |
|---|---|---|
| `AppHeader` | ✅ | `lg:hidden` 漢堡按鈕 + `hidden lg:flex` 桌面導航 |
| `AppSidebar` | ✅ | `lg:` 常駐 + `USlideover` overlay |
| `SharedSearchFilterBar` | ✅ | `hidden sm:flex` 桌面 + `sm:hidden` 手機面板 |
| `EntryDetailCard` | 🔧 | 已修復：padding `px-4 sm:px-6`、詞頭 `text-xl sm:text-2xl`、粵拼 `overflow-x-auto max-w-full` |
| `EntryDetailModal` | ✅ | `max-w-2xl max-h-[90vh]` + `overflow-y-auto` |
| `EntryModal` | ✅ | `max-w-2xl max-h-[90vh]` + `grid-cols-1 sm:grid-cols-2` 表單 |
| `AdminUserTable` | 🔧 | 已修復：手機卡片截斷文字加 `title` 屬性 |
| `EditRoleModal` | ✅ | `max-w-md` + `size="lg"` 觸控友好 |
| `ManageDialectsModal` | 🔧 | 已修復：`w-24 sm:w-28` + 方言標籤 `truncate` + `title` |
| `LexemeExternalEtymonsModal` | ✅ | `grid-cols-1 md:grid-cols-2` + `break-all` 防溢出 |
| `LexemeMergeModal` | ✅ | `flex-wrap` + `min-w-0` 防溢出 |

### 四、核心原則遵守情況

- ✅ **JS 雙佈局方案**（entries + admin）：`useMobileBreakpoint()` + 完全分離的手機端元件，手機端不依賴桌面版鍵盤導航
- ✅ **響應式卡片方案**（review + histories）：桌面版卡片佈局天然適合手機端，用 `sm:` / `md:` 斷點微調
- ✅ **共用元件響應式適配**：SharedSearchFilterBar、AppSidebar、EntryDetailCard 等已內建手機端處理
- ✅ **交互替換完整**：所有桌面版交互（Notion 鍵盤導航、USelectMenu、ViewsDropdown、批量操作 Modal）都有手機端對應方案

### 五、已修復問題記錄

| # | 問題 | 位置 | 修復內容 |
|---|---|---|---|
| 1 | 審核按鈕觸控目標太小 | `review/index.vue` 73, 85 行 | `size="sm"` → `size="md"` |
| 2 | 粵拼 `whitespace-nowrap` 溢出 | `EntryDetailCard.vue` 21 行 | → `overflow-x-auto max-w-full` |
| 3 | EntryDetailCard padding 過大 | `EntryDetailCard.vue` 4, 81 行 | `px-6` → `px-4 sm:px-6` |
| 4 | 詞頭文字太大 | `EntryDetailCard.vue` 9 行 | `text-2xl` → `text-xl sm:text-2xl` |
| 5 | ManageDialectsModal 角色選擇固定寬度 | `ManageDialectsModal.vue` 44 行 | `w-28` → `w-24 sm:w-28`，方言標籤加 `truncate` + `title` |
| 6 | 歷史頁 diff 表格最小寬度 | `histories/index.vue` 259 行 | `min-w-[20rem]` → `min-w-[16rem]` |
| 7 | `w-3/8` 非標準 Tailwind 類 | `histories/index.vue` 263-264 行 | → `w-1/4` |
| 8 | UserTable 截斷文字缺 `title` | `UserTable.vue` 130-131 行 | 加 `:title="user.username"` / `:title="user.email"` |
| 9 | SSR 閃爍 | `useMobileBreakpoint.ts` | 不採用 mobile-first SSR；保留 `ref(false)`，避免桌面 `/entries` 首屏先渲染手機分支並干擾表格初始化 |
| 10 | 歷史頁操作標籤時態不一致 | `histories/index.vue` 681-684, 820-823 行 | `創建/更新/刪除/狀態變更` → `已建立/已更新/已刪除/已變更狀態`，統一過去時 |
| 11 | entries 桌面 loading 缺少 Skeleton 佔位元件 | `entries/index.vue` 183-190 行 | 不採用桌面 skeleton；桌面 loading 維持原 spinner，避免改動詞條表格桌面界面；手機首頁 grid 未改動 |

### 六、剩餘已知問題

程式層面暫無新增阻塞；以下屬於待補驗收證據或需後續確認的風險，不應標為已完成真機驗收：

- 待補登入態 rendered QA：`/entries`、`/review`、`/histories`、`/admin/users` 在 375px / 390px / 430px 視口的截圖或錄屏。
- 待補 modal 實測：拒絕原因、diff、撤銷確認、管理方言權限等窄屏彈窗是否仍無溢出、遮擋或按鈕過小。
- 待另案處理手機端首屏閃爍；方案不得影響桌面 `/entries` 表格初始化、快捷鍵、欄寬、saved views 或預設方言邏輯。
- 待確認 histories diff 表格三欄比例是否符合閱讀預期；如需保留比較欄較寬，應再調整欄寬類。
