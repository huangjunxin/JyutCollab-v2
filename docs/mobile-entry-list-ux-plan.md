# 詞條列表手機端編輯體驗設計方案

## 定位

這是**響應式網頁改造**，而非移動端原生 APP。當瀏覽器寬度縮窄至手機尺寸（< 768px）時，詞條列表自動切換為手機適配的界面與交互模式。寬度恢復至桌面尺寸時，還原現有表格體驗。

核心原則：

- 桌面端與手機端**共用同一套 composables、API、權限、資料協議**。
- 手機端不做單獨的「手機版網站」，而是同一個頁面的響應式變體。
- 導航優先使用**全屏子頁面**，而非層層堆疊的底部彈出層。
- 瀏覽器返回鍵必須正確運作於手機端子頁面之間。

## 目標

目前 `app/pages/entries/index.vue` 的詞條列表以桌面表格為核心：可調欄寬、鍵盤格編輯、行內展開、批量操作、進階篩選、條件着色、AI 建議、已儲存視圖等能力都集中在同一張寬表格內。手機端現時只顯示「建議使用電腦端編輯」提示，實際編輯體驗未被設計。

本方案目標是為手機端新增一套可落地的詞條列表編輯體驗，參考 `docs/mobile-ux` 內飛書多維表格手機介面的資訊架構與交互模型，同時保留 JyutCollab 既有的方正、硬陰影、香港繁體中文詞庫工作台風格。

## 參考素材

- `docs/mobile-ux/多维表格首页1.PNG`
- `docs/mobile-ux/多维表格首页2.PNG`
- `docs/mobile-ux/多维表格首页（layout=card）.PNG`
- `docs/mobile-ux/多维表格切换不同view.PNG`
- `docs/mobile-ux/多维表格view settings-filter.PNG`
- `docs/mobile-ux/多维表格view settings-sort.PNG`
- `docs/mobile-ux/多维表格view settings-layout.PNG`
- `docs/mobile-ux/多维表格单行编辑页（不论是card还是grid）.PNG`
- `docs/mobile-ux/多维表格单行的单个单元格编辑页（文本单元格）.PNG`
- `docs/mobile-ux/多维表格单行的单个单元格编辑页（日期）.PNG`
- 目前詞條頁：`app/pages/entries/index.vue`
- 目前可編輯格：`app/components/entries/EntriesEditableCell.vue`
- 目前行操作：`app/components/entries/EntryRowActions.vue`
- 目前視圖下拉：`app/components/entries/EntriesViewsDropdown.vue`

## 現況診斷

### 手機端主要問題

1. 桌面表格需要同時顯示至少 8 個可編輯欄位，加上選取欄與操作欄，手機橫向空間不足。
2. 現有編輯模型依賴精準點擊單元格、方向鍵、Enter、Tab 和欄寬調整，這些都不是手機主要交互方式。
3. 行內展開區很多，包括釋義詳情、主題分類、詞素引用、AI 建議、重複檢測、其他方言參考、Jyutjyu 參考；在手機表格內直接展開會造成內容跳動與上下文丟失。
4. 桌面工具列將搜尋、基本篩選、進階篩選、條件着色、視圖、欄寬控制放在同一行，手機上需要重新分層。
5. 現有 `EntryModal.vue` 是完整表單，但與表格行內編輯沒有整合，亦未覆蓋目前表格的所有快速編輯與參考提示能力。
6. 手機端缺少「列表 → 單行編輯頁 → 單元格編輯頁」的穩定層級，因此很容易把列表、詳情、欄位編輯、AI 輔助混在同一層。

### 必須保留的產品能力

- 平鋪、按詞形聚合、按詞語聚合三種視圖。
- 搜尋、貢獻者、方言、主題分類、狀態篩選。
- 進階篩選、條件着色規則、已儲存視圖與分享視圖。
- 新建詞條、複製詞條、刪除詞條、批量刪除。
- 詞頭、方言、粵拼、類型、分類、釋義、語域、狀態的快速編輯。
- 釋義詳情、例句、分義項、圖片、主題分類搜尋、詞素引用。
- AI 釋義、AI 分類、AI 語域、AI 例句、泛粵典與 Jyutjyu 參考提示。
- 未儲存更改提示、單條儲存、全部儲存、取消回復。

## 飛書手機多維表格可借鑑模式

### 1. 頂部保持視圖心智

飛書手機端沒有把所有桌面工具壓縮成一排，而是保留：

- 頁面標題與目前基礎類型。
- 一排可橫向滑動的視圖 tabs。
- 右側菜單入口。

對 JyutCollab 的映射（注意：網頁端優先使用全屏子頁面，只在輕量操作使用底部彈出層）：

- 頁面標題改為「詞條列表」，副標顯示目前視圖與總數，例如「平鋪 · 2,341 詞條」。
- 視圖 chips：`平鋪`、`按詞形`、`按詞語`、使用者已儲存視圖，橫向滑動。
- 點擊右側列表圖示打開「視圖」子頁面（`/entries/views`），可切換、儲存、管理、分享。

### 2. 手機表格只承擔掃描，不承擔全部編輯

飛書 grid 模式仍保留表格欄列，但首屏只展示少量欄位，其他欄位靠橫向滾動或 layout 設定控制。手機上真正複雜的編輯通常進入單行編輯頁。

對 JyutCollab 的映射：

- 手機 grid 只展示核心欄位：詞頭、方言、粵拼、狀態。
- 釋義可作為第二行摘要，不放入橫向表格主列。
- 點擊 grid 某一行後進入單行編輯頁。
- 列表層不直接打開單元格編輯器，避免誤觸與狀態分裂。

### 3. Grid 是手機預設工作視圖

飛書 layout 設定提供 Card / Grid 切換，但 JyutCollab 這一輪不並行做 card。先把 grid 做到足夠穩定、足夠高效，因為詞條列表本身就是以欄位比較、批量掃描、快速定位為核心的工作台。

對 JyutCollab 的映射：

- 手機預設使用 grid / 表格佈局。
- 第一輪不提供 card / grid 佈局切換。
- 手機 grid 只展示經過設計的核心欄位，不嘗試照搬桌面全欄位。
- 點擊 grid 行後進入單行編輯頁。
- card 模式放到最後一個可選階段；只有當 grid 已經完成核心體驗、性能與高階操作優化後，才決定是否加入。

### 4. Filter / Sort / Layout 合併為視圖設定工作台

飛書將 Filter、Sort、Layout 放在同一個 bottom sheet，以 tab 切換。

對 JyutCollab 的映射（注意：視圖設定內容較多且包含多個 tab，不適合單一底部彈出層）：

- 建立「視圖設定」子頁面（`/entries/views/settings`），包含四個 tabs：`篩選`、`排序`、`佈局`、`規則`。
- `篩選` 包含現有基本篩選與進階篩選入口。
- `排序` 使用目前 `sortBy` / `sortOrder`，手機端先支援單一排序條件。
- `佈局` 只支援 grid 欄位、密度、首欄固定與載入方式；不提供 card / grid 切換。
- `規則` 管理現有條件着色 rules。

### 5. 新增使用浮動主按鈕

飛書以右下角浮動 `+` 作新增入口。手機上這比把「新建詞條」塞在頂部更穩定。

對 JyutCollab 的映射：

- 手機端固定右下新增按鈕。
- 如果有未儲存更改，底部再顯示儲存欄，而不是讓新增按鈕承擔儲存狀態。
- 新增後直接打開新建狀態的單行編輯頁，而不是在手機表格首行插入新 row。

### 6. 單行編輯頁是 grid 的下一層

飛書無論從 card 或 grid 進入同一條記錄，都使用同一個單行編輯頁。JyutCollab 前期只實作 grid 入口，但保留這個架構優勢：列表負責掃描，單行頁負責編輯整條記錄。頁面頂部保留返回、分享、更多操作，主標題使用記錄主欄位，下面以「欄位類型圖示 + 欄名 + 欄位值」逐行展示。

對 JyutCollab 的映射：

- grid 行點擊、聚合視圖內單條詞條點擊，都進入同一個單行編輯頁。
- 若最後決定加 card，card 也必須復用同一個單行編輯頁，不另起一套編輯模型。
- 單行頁標題使用詞頭；副資訊顯示方言、粵拼、狀態。
- 單行頁逐列展示詞頭、異形、方言、粵拼、類型、分類、釋義、語域、狀態、詞素引用、參考資料。
- 每個欄位列都可以點擊，根據欄位類型打開對應的單元格編輯頁。
- 分享、複製、刪除、加入詞語組等行級操作放在右上更多菜單。

### 7. 單元格編輯頁按欄位類型分工

飛書文字單元格使用底部編輯面板，保留原頁上下文；日期單元格則先高亮原欄位，再打開類型專屬 picker。

對 JyutCollab 的映射（網頁端優先使用單行頁內聯展開，避免鍵盤與底部彈出層互相擠壓）：

- 文字類：詞頭、異形、粵拼、釋義摘要、使用説明、備註，在單行編輯頁內點擊後**原地展開輸入區**，而非彈出獨立面板。
- 選擇類：方言、類型、語域、狀態，使用**底部彈出層**的選項 picker（內容簡單、操作短暫，適合底部彈出層）。
- 分類類：主題分類使用搜尋 + 三級瀏覽的專用子頁面，不塞進普通 select 或底部彈出層。
- 複雜類：義項、例句、分義項、圖片、詞素引用、參考資料，從單行頁進入專用子頁。
- 所有單元格編輯都先寫入本地 draft；真正提交仍由單行頁或底部儲存欄觸發。

底部彈出層的使用準則：

- ✅ 適合：選項 picker（方言/類型/語域/狀態）、確認刪除、簡短的臨時操作。
- ❌ 不適合：含搜尋/多級瀏覽的複雜內容、含大量文字的輸入、可能在鍵盤開啟時使用的編輯。

## 手機端資訊架構

### 第一層：列表工作台

手機 `/entries` 第一屏應該包含：

1. 頂部 compact header：
   - 標題：詞條列表。
   - 副標：目前視圖、總數、未儲存狀態。
   - 操作：搜尋、視圖設定、更多。
2. 視圖 chips：
   - 平鋪。
   - 按詞形。
   - 按詞語。
   - 已儲存視圖，橫向滑動。
3. 搜尋列：
   - 預設收合成一個搜尋框。
   - 有搜尋字時保留在頂部下方。
4. 主內容：
   - 預設手機 grid / 表格列表。
   - 第一輪不提供 card 模式切換。
5. 底部狀態欄：
   - 無未儲存更改時顯示分頁 / 載入更多。
   - 有未儲存更改時顯示「N 項未儲存」「全部儲存」「放棄」。
6. 右下浮動新增按鈕。

### 第二層：視圖與設定

1. 「視圖」子頁面（`/entries/views`）：
   - 內建視圖：平鋪、按詞形、按詞語。
   - 我的視圖。
   - 公開視圖。
   - 底部操作：儲存目前視圖、管理視圖。
2. 「視圖設定」子頁面（`/entries/views/settings`）：
   - 篩選 tab。
   - 排序 tab。
   - 佈局 tab。
   - 規則 tab。
3. 「更多」底部彈出層（內容簡單，適合底部彈出層）：
   - 新建時方言。
   - 批量選擇入口。
   - 重新載入。

### 第三層：單行編輯頁

單行編輯頁是 grid 的共同下一層，應優先做成手機全屏頁或全屏 modal，而不是列表內展開區：

1. 頂部：
   - 返回、分享、更多。
   - 主標題：詞頭。
   - 副資訊：方言、粵拼、狀態、未儲存標記。
2. 欄位列表：
   - `基本`：詞頭、異形、方言、粵拼、類型、語域、狀態。
   - `分類`：主題分類、AI 分類入口。
   - `釋義`：第一義項摘要、義項詳情入口。
   - `參考`：重複檢測、其他方言、Jyutjyu、詞素引用入口。
3. 底部固定操作：
   - 有更改：取消、儲存。
   - 新建：儲存草稿、提交審核。
4. 行級更多操作：
   - 複製詞條。
   - 刪除詞條。
   - 拆出成新詞語。
   - 加入其他詞語組。
   - 編輯域外方音。

### 第四層：單元格編輯

單元格編輯由單行編輯頁內的欄位列進入。它只處理一個欄位，避免完整詞條表單被鍵盤、picker 或 AI 建議擠壓。

1. 文字欄位（詞頭、異形、粵拼、釋義摘要、使用説明、備註）：
   - 在單行編輯頁內**原地展開輸入區**，不彈出獨立面板。
   - 頁面自動滾動確保輸入區不被鍵盤遮擋。
   - 輔助：AI 釋義、AI 語域、泛粵典、Jyutjyu 參考按欄位需要出現在輸入區下方。
2. 選擇欄位（方言、類型、語域、狀態）：
   - 使用**底部彈出層** picker。
   - header：清除、欄名、完成。
   - 已選值在原單行頁高亮，降低使用者迷失感。
3. 分類欄位（主題分類）：
   - 進入專用**子頁面**，提供搜尋、三級分類瀏覽、AI 分類建議。
   - 選擇後返回單行編輯頁。
4. 複雜內容：
   - 義項、例句、分義項、圖片與詞素引用進入專用子頁。
   - 返回後仍停留在同一條詞條的單行編輯頁。

## 手機列表模式設計

### 手機 Grid 佈局（預設）

手機 grid 是第一輪唯一列表佈局。目標不是把桌面全表格縮小，而是保留表格心智，針對手機重新設計欄位密度、橫向滾動、行高、首欄固定與行點擊。

初始欄位：

- 詞頭，固定左欄。
- 方言。
- 粵拼。
- 狀態。

可選欄位：

- 類型。
- 分類。
- 釋義摘要。
- 語域。

交互規則：

- 首欄固定，右側可橫向滑動。
- 行高固定為可讀的 48 至 56px；釋義摘要最多 2 行。
- 點擊任一資料行進入單行編輯頁。
- 表格內不直接打開單元格編輯器；單元格編輯統一在單行編輯頁內觸發。
- Grid 模式不提供欄寬拖拽；欄寬由佈局設定管理。

聚合視圖 grid：

- 按詞形：一行代表一個詞形，首欄顯示詞形，右側顯示方言 badge、粵拼摘要、狀態摘要。
- 按詞語：一行代表一個 lexeme，顯示詞語組資訊，支援展開方言點列表。
- 聚合行點擊後先展開組內詞條，再點單條進入單行編輯頁。

### 最後可選：Card 佈局

Card 不進 MVP，不進前五期與第六期交付，也不作完成定義。只有當手機 grid 的掃描、編輯、設定、性能、批量流程與全站窄屏收口都達到可用標準後，才評估是否需要 card。

若未來加入 card，約束如下：

- card 只作另一種閲讀佈局，不承擔新的編輯模型。
- card 點擊必須進入同一套 `EntriesMobileRowEditor.vue`。
- card 不應削弱 grid 的欄位比較、批量操作與高密度掃描能力。
- card 是否實作需要單獨設決策門檻：是否有明確使用場景、是否比優化後 grid 更好、是否不增加維護負擔。

## 手機編輯流程

### 進入單行編輯頁

適用入口：

- grid / 表格列表中的任一資料行。
- 聚合視圖展開後的任一單條詞條。
- 新建詞條浮動按鈕。

流程：

1. 使用者點擊 grid 行。
2. 進入單行編輯頁（全屏子頁面），頁面載入該詞條的 draft。
3. 使用者瀏覽所有欄位，點擊某欄位觸發編輯。
4. 單行頁顯示未儲存標記與固定儲存操作。

### 單元格編輯

適用欄位類型與編輯方式：

- **文字類**（詞頭、異形、粵拼、釋義摘要、使用説明、備註）：在單行頁內點擊後**原地展開輸入區**，頁面自動滾動避免鍵盤遮擋。
- **選擇類**（方言、類型、語域、狀態）：打開**底部彈出層** picker。
- **分類類**（主題分類）：進入**專用子頁面**，提供搜尋與三級瀏覽。
- **複雜類**（義項、例句、分義項、圖片、詞素引用、參考資料）：從單行頁進入專用子頁。

流程（以文字類為例）：

1. 使用者在單行編輯頁點擊欄位列（如「詞頭」）。
2. 欄位列展開為輸入區，原欄位高亮，鍵盤彈出。
3. 使用者修改後點輸入區外的「完成」或點其他欄位，輸入區收起，值更新。
4. 單行頁更新 draft 並顯示未儲存狀態。
5. 使用者可繼續編輯其他欄位，最後統一儲存。

### 完整編輯

適用場景：

- 新建詞條。
- 維護義項、例句、分義項、圖片。
- 主題分類搜尋與三級瀏覽。
- 詞素引用、詞語組操作。
- AI 建議與參考資料需要上下文展示。

流程：

1. 從單行編輯頁點擊複雜欄位或專用入口。
2. 進入專用子頁或分段面板。
3. 完成後返回單行編輯頁。
4. 儲存後返回列表，或保留在單行頁繼續編輯。

## 視圖設定設計

### 篩選 tab

內容：

- 關鍵詞搜尋。
- 貢獻者。
- 方言。
- 主題分類。
- 狀態。
- 進階篩選入口。

手機改造：

- 基本篩選用表單列。
- 進階篩選用「條件卡片」，每條條件包含欄位、操作符、值。
- 公式輸入可放在進階區底部，不作首屏核心。
- 底部固定：清除、套用。

### 排序 tab

內容：

- 目前排序欄位。
- 升序 / 降序。
- 自動排序開關。

第一期先支援單一排序條件，與現有 API `sortBy` / `sortOrder` 對齊。

### 佈局 tab

內容：

- 顯示為：Grid（第一輪唯一模式）。
- Grid 顯示欄位：勾選欄位。
- Grid 密度：標準 / 緊湊。
- 首欄固定：開 / 關。
- 每頁數量或載入方式。

### 規則 tab

內容：

- 現有條件着色規則列表。
- 新增規則。
- 啟用 / 停用。
- 改色、排序、刪除。

手機上規則編輯沿用條件卡片，不在列表裏直接展開整個公式編輯器。

## 元件拆分建議

### 前置重構：桌面表格提取

在新增任何手機組件之前，必須先從 `app/pages/entries/index.vue`（目前 3116 行）提取桌面表格，避免檔案失控：

1. 建立 `app/components/entries/EntriesDesktopTable.vue`，將表格模板（`<table>` 及其所有內聯展開行）與鍵盤事件處理從 `index.vue` 移至該組件。
2. `index.vue` 只保留：資料加載、composable 初始化、事件處理協調、桌面/手機分流渲染。
3. 確保 `npm run build` 通過，桌面功能不受影響，然後才開始手機端開發。

### 共享欄位組件調查

在構建手機編輯器前，先評估能否從現有 `EntryModal.vue` 提取可共用的欄位組件，供桌面端 EntryModal、手機端 RowEditor 以及未來任何詞條編輯界面複用：

- `EntriesFieldHeadword.vue`
- `EntriesFieldDialect.vue`
- `EntriesFieldJyutping.vue`
- `EntriesFieldEntryType.vue`
- `EntriesFieldRegister.vue`
- `EntriesFieldTheme.vue`

若調查後發現提取成本過高（例如欄位邏輯與 EntryModal 的 form 耦合過深），可放棄共享，但必須在設計文件中記錄原因。

### 新增手機元件

- `app/components/entries/mobile/EntriesMobileWorkbench.vue` — 手機端頂層容器，接入 composables，分流列表/編輯頁視圖
- `app/components/entries/mobile/EntriesMobileGrid.vue` — 手機 grid 列表（平鋪/聚合，首欄固定+橫向滾動）
- `app/components/entries/mobile/EntriesMobileRowEditor.vue` — 單行編輯頁（全屏子頁面）
- `app/components/entries/mobile/EntriesMobileFieldRow.vue` — 單行頁內的欄位列（欄名 + 值 + 點擊行為）
- `app/components/entries/mobile/EntriesMobileSelectSheet.vue` — 選擇類欄位的底部彈出層 picker
- 單行編輯頁內嵌底部儲存操作列；第一輪暫不拆 `EntriesMobileSaveBar.vue`
- `app/components/entries/mobile/EntriesMobileViewPage.vue` — 視圖選擇與管理子頁面
- `app/components/entries/mobile/EntriesMobileSettingsPage.vue` — 視圖設定子頁面（篩選/排序/佈局/規則 tabs）

第四期新增：

- `app/components/entries/mobile/EntriesMobileThemePage.vue` — 主題分類搜尋與三級瀏覽子頁面
- `app/components/entries/mobile/EntriesMobileSensesPage.vue` — 義項/例句/分義項編輯子頁面
- `app/components/entries/mobile/EntriesMobileMorphemePage.vue` — 詞素引用、未連結詞素與詞素搜尋子頁面

最後可選元件：

- `app/components/entries/mobile/EntriesMobileCard.vue`

可重用現有邏輯：

- `useEntriesList`
- `useEntriesTableColumns`
- `useEntriesTableEdit`
- `useEntriesAdvancedFilters`
- `useEntriesRuleOverlays`
- `useEntriesSelection`
- `useEntriesAISuggestions`
- `useEntriesRowHints`
- `useEntryBaseline`
- `useEntriesSavedViews`
- `useNewEntryDialect`

`app/pages/entries/index.vue` 在重構後的角色：

- 初始化所有 composables（`useEntriesList`、`useSearchFilters`、`useEntriesAISuggestions` 等）。
- 提供 `isMobile` 響應式斷點。
- 桌面端渲染 `<EntriesDesktopTable>`（已提取）。
- 手機端渲染 `<EntriesMobileWorkbench>`。
- 共用 composables，避免手機端另建一套資料協議。

## 實施階段

### 階段總覽

| 階段 | 狀態 | 目標 | 核心產出 | 不做事項 |
| --- | --- | --- | --- | --- |
| 前置 | 代碼完成 | 先拆桌面表格，降低風險 | `EntriesDesktopTable.vue`、`index.vue` 分流骨架 | 不新增手機 UI |
| 1a | 代碼完成 | 讓手機能穩定瀏覽與搜尋 | `EntriesMobileGrid`、基本搜尋、響應式斷點 | 不做聚合深度打磨、不做 saved views 管理 |
| 1b | 代碼完成 | 讓手機能完成核心欄位編輯 | `EntriesMobileRowEditor`、欄位列、選擇 picker、內嵌儲存操作列 | 不做高階釋義/詞素/AI |
| 1c | 代碼完成 | 補齊基本視圖與基本篩選 | 視圖 chips、視圖子頁、三種 viewMode grid、基本篩選 | 不做進階篩選與條件規則 |
| 第一輪手動驗收 | 待做 | 確認第一期可進入第二期 | 375px / 430px、淺色 / 暗色、返回鍵、桌面回歸 | 不新增功能 |
| 2 | 代碼完成 | 把 grid 體驗打磨到可長期使用 | 固定首欄、欄位顯示、密度、性能與暗色細節 | 不做 card |
| 3 | 代碼完成，待手動驗收 | 補齊視圖設定工作台 | 設定子頁、排序、欄位、密度、saved views | 不做高階編輯 |
| 4 | 代碼骨架完成，接線待修 | 補齊詞條深度編輯 | 義項、分類、詞素、參考、AI 輔助 | 不做批量效率 |
| 5 | 代碼完成，待手動驗收 | 補齊批量與效率能力 | 多選、批量刪除、批量狀態、條件着色規則管理與 grid 呈現 | 不做 card |
| 6 | 主體代碼完成，待修與待手動驗收 | 全站手機窄界面收口 | Agent 手機全屏面板、Header / 通知 / 使用者選單、Docs / Review / Histories / Admin / Profile / 通用彈窗窄屏修正 | 不做 card、不重設詞條首頁 UI |
| 7 | 未開始 | 最後才評估 card 是否值得做 | card prototype 或放棄決策 | 不影響 grid 預設地位 |

階段推進規則：

- 每一階段必須可獨立驗收，未通過不得進入下一階段。
- 前五期只允許改善 grid、單行編輯頁、單元格編輯、視圖設定與批量效率；第六期只做全站手機窄界面收口。
- Card 相關工作只能出現在第七期，且先做 prototype 與決策，不直接進核心流程。
- 每期都必須同時驗收 375px、430px、淺色模式、暗色模式、瀏覽器返回鍵與 `npm run build`。

### 目前實作同步（2026-06-25）

- 第一階段 1a / 1b / 1c 代碼完成，手動驗收待做。
- 第二期代碼完成（五項交付中四項完整、一項部分完成）。
- 第三期代碼完成，手動驗收待做。已完成視圖設定 tabs、基本篩選、排序、佈局、首欄固定、已儲存視圖套用 / 儲存 / 管理；進階篩選入口仍未做。
- 第三期檢查已修正三個代碼問題：內建視圖切換入口在手機設定頁遺失、手機排序欄位變更誤用桌面 toggle handler、清除篩選會額外清除搜尋 / 進階篩選。
- 第一輪手動驗收尚未進行；必須在第六期全站手機窄界面收口內完成，不得帶入第七期 card 探索。
- `npm run build` 已通過。
- 列表首頁 UI 不再修改（第二期 Scope Lock 繼續生效）。
- 第五期代碼檢查（2026-06-25 10:45）：review 提出的 10 個問題已修正，包括手機搜尋、手機詞素引用、長按 click suppression、批量狀態權限入口、手機 rule overlay 呈現、儲存視圖預載、桌面表格 refs、進階篩選下切換 viewMode 的 all-fetch、手機參考檢查觸發、批量刪除底部確認層。`npm run build` 通過；`npx vitest run app/components/entries/__tests__/EntriesMobileStage2Scope.test.ts app/components/entries/__tests__/EntriesPageRuleOverlayWiring.test.ts app/components/entries/__tests__/EntriesRuleOverlayPanel.test.ts` 通過（21 passed）。
- 第五期仍需手動驗收：375px / 430px、淺色 / 暗色、長按多選、批量刪除確認、批量狀態、條件着色 grid 呈現與規則管理。
- 第四期代碼檢查（2026-06-25 04:28）：`npm run build` 通過，`npx vitest run app/components/entries/__tests__/EntriesMobileStage2Scope.test.ts` 通過（6 passed）。義項子頁、主題分類子頁、詞素引用子頁、重複檢測 / 其他方言 / Jyutjyu 參考卡片、AI 釋義 / 分類 / 例句入口已成形。
- 第四期不能標記為完整完成：詞素引用手機流程仍未閉環，參考輔助資料在手機端主要依賴既有桌面觸發結果，圖片上傳與 AI 語域手機 UI 仍未搬入。
- 第六期主體代碼完成（2026-06-25 12:48 檢查）：Agent 全屏覆蓋層、Header 漢堡菜單導航抽屜、SearchFilterBar 手機收合篩選、Docs sidebar 可收合、Admin 卡片列表、Profile 確認彈出層、modal 手機化已落地。
- 第六期機械驗證：`npm run build` 通過（保留既有 chunk size / Tailwind sourcemap 警告）；第五期 / 詞條手機相關 Vitest 子集 `npx vitest run app/components/entries/__tests__/EntriesMobileStage2Scope.test.ts app/components/entries/__tests__/EntriesPageRuleOverlayWiring.test.ts app/components/entries/__tests__/EntriesRuleOverlayPanel.test.ts` 通過（21 passed）。
- 完整 Vitest 仍未通過：`npx vitest run` 結果為 124 passed / 1 failed；失敗在 `server/utils/agent/__tests__/phase0.test.ts`，原因是測試仍期望舊的 5 個 Agent tool，但 registry 目前返回 19 個 tool。這不是第六期窄屏 UI 的直接回退，但第六期完成門檻前需要修正測試期望或明確拆出非相關失敗。
- 第六期仍需收尾：修正手機導航抽屜遮罩點擊關閉、Profile 解除 Google 確認 modal footer 手機堆疊；完成 375px / 430px、淺色 / 暗色全站路由矩陣手動驗收。

### 前置步驟：桌面表格提取

**在手機端開發開始前完成。**

狀態：代碼完成，`npm run build` 已通過。仍需按第一輪手動驗收補桌面回歸確認。

交付：

- 建立 `EntriesDesktopTable.vue`，將 `index.vue` 中的表格模板、行內展開區、鍵盤事件移至該組件。
- `index.vue` 只保留 composable 初始化與桌面/手機分流渲染。
- 確保 `npm run build` 通過，桌面端所有功能不受影響。

驗收：

- 桌面表格的所有功能（編輯、排序、視圖切換、進階篩選、條件着色、AI 建議、批量操作）與提取前完全一致。
- `index.vue` 檔案從 3100+ 行降至合理規模（預計 < 1500 行）。

### 第一期：手機可用列表與核心編輯

分三個子階段交付，每個子階段獨立驗收。

#### 1a：唯讀 Grid + 搜尋

狀態：代碼完成。`EntriesMobileWorkbench`、`EntriesMobileGrid`、`useMobileBreakpoint` 已接入；後續 1b 已在 grid 行上加入進入單行編輯頁的點擊行為。

交付：

- 手機端移除「僅支援瀏覽」限制。
- 新增 `EntriesMobileWorkbench` + `EntriesMobileGrid`。
- 平鋪視圖 grid 列表，展示核心欄位（詞頭、方言、粵拼、狀態）。
- 頁面頂部保留基本搜尋框。
- `isMobile` 改用 `window.matchMedia` 實現響應式監聽（支援旋轉螢幕與視窗縮放）。

驗收：

- 375px 寬度可瀏覽詞條列表。
- 375px 寬度可搜尋詞條。
- 旋轉手機或縮放視窗時，桌面/手機界面正確切換。
- 手機端不再出現要求改用電腦的阻斷文案。
- 暗色模式下手機 grid 清晰可讀。

#### 1b：單行編輯與儲存

狀態：代碼完成。單行編輯頁、欄位列、底部 picker、頁內返回與瀏覽器返回鍵已接入；儲存操作目前內嵌於單行編輯頁底部與 workbench 頂部，未拆獨立 `EntriesMobileSaveBar.vue`。

交付：

- 新增 `EntriesMobileRowEditor`（全屏子頁面）。
- 新增 `EntriesMobileFieldRow`（欄位列渲染）。
- 文字欄位點擊後原地展開輸入區（不回彈獨立面板）。
- 選擇欄位使用底部彈出層 picker（`EntriesMobileSelectSheet`）。
- 新增單行編輯頁內嵌儲存操作列。
- 右下浮動新增按鈕。
- `addNewRow()` 在手機端改為打開新建狀態的單行編輯頁，不插入桌面 row 焦點。

驗收：

- 375px 寬度可從 grid 點擊進入單行編輯頁。
- 375px 寬度可修改詞頭、方言、粵拼、狀態並儲存。
- 新建詞條後自動返回 grid 列表。
- 有未儲存更改時，單行頁顯示當前詞條儲存 / 取消操作，workbench 頂部提供全部儲存入口。
- 儲存走現有 `saveNewEntry` / `saveEntryChanges` 流程，不繞過後端權限。

#### 1c：視圖切換與基本篩選

狀態：代碼完成。視圖 chips、`EntriesMobileViewPage`、基本篩選、聚合 / 詞語 group row、展開後 entry row 進單行編輯頁、視圖子頁 history 返回已接入。

交付：

- 視圖 chips 橫向滑動：平鋪、按詞形、按詞語。
- `EntriesMobileViewPage` 子頁面（視圖選擇與管理）。
- 基本篩選：方言、主題分類、狀態。
- 支援平鋪、按詞形聚合、按詞語聚合三種視圖的 grid 渲染。

驗收：

- 375px 寬度可切換平鋪/按詞形/按詞語。
- 375px 寬度可按方言、主題、狀態篩選。
- 篩選結果與桌面端一致。
- URL 參數在手機端與桌面端之間保持一致（`?search=`、`?view=`、`?dialect=`、`?theme=`、`?status=`）。

### 第二期：Grid 體驗打磨

狀態：代碼完成（2026-06-25）。五項交付中四項完整、一項（滾動性能）部分完成。手動驗收待做。

交付與實作狀態：

#### 1. 首欄固定與橫向滾動手感優化 ✅

- 詞頭欄使用 `sticky left-0 z-10` + `border-r-2` 雙層邊框分隔；表頭 sticky 欄使用 `z-30`。
- 觸控處理：監聽 `touchstart` / `touchmove`，水平位移 > 10px 時攔截 `click` 事件，防止橫向滾動誤觸行點擊。
- 表格容器使用 `contain: content` 啟用 CSS containment。
- `tableLayout: fixed` 避免瀏覽器重新計算欄寬。

#### 2. 欄位顯示設定 ✅

- 4 個固定欄位（詞頭、方言、粵拼、狀態）始終顯示。
- 4 個可選欄位（類型、分類、釋義、語域）可在 `EntriesMobileViewPage` 勾選開關。
- `mobileColumns` 為 `computed`，根據 `enabledOptionalKeys` 動態組合。
- 設定持久化到 `localStorage` key `jyutcollab-mobile-columns`。

#### 3. Grid 密度設定 ✅

- 兩種密度：標準（`py-2.5`，~48px 行高）和緊湊（`py-1.5`，~36px 行高，字號 `0.75rem`）。
- `EntriesMobileViewPage` 提供按鈕切換。
- 設定持久化到 `localStorage` key `jyutcollab-mobile-density`。

#### 4. 行高、截斷、摘要、空值、未儲存狀態的視覺規則 ✅

- 釋義欄使用 `line-clamp-2`；其餘文字欄使用 `truncate`（單行截斷）。
- 空值統一顯示 `—`。
- 未儲存詞條：amber 左邊框 + 琥珀背景 + headword 欄內 amber 圓點指示器。
- 新建詞條：blue 左邊框 + headword 欄內 blue 圓點指示器。
- 狀態 / 方言欄使用 badge 且 `whitespace-nowrap` 防止折行。

#### 5. 大量資料下的滾動性能與載入體驗 ⚠️ 部分完成

- 已完成：`contain: content`、`tableLayout: fixed`、分頁限制單頁行數。
- 未完成：無虛擬滾動（virtual scrolling）；無 skeleton loading；無無限滾動。
- 後續可引入 `@tanstack/vue-virtual` 或類似方案，但非當前阻塞項。

驗收：

- 375px 寬度可穩定掃描詞頭、方言、粵拼、狀態等核心欄位。
- 橫向滾動不誤觸行點擊。
- 固定首欄與右側欄位在明暗模式下分隔清楚。
- 大量資料下滾動順暢，列表不因內容長短產生明顯跳動。

### 第三期：手機視圖設定工作台

狀態：代碼完成（2026-06-25），手動驗收待做。代碼檢查後已補回內建視圖切換入口、修正手機排序接線、補上已儲存視圖管理入口，並避免「清除篩選」誤清搜尋或進階篩選。

交付與實作狀態：

#### 1. `EntriesMobileViewPage` 子頁面：篩選、排序、佈局、規則四個 tabs ✅

- 篩選 tab：方言、狀態、主題分類下拉 + 清除篩選按鈕。
- 排序 tab：排序欄位選擇（創建時間、更新時間、詞頭、瀏覽次數、收藏次數）+ 升序/降序切換。
- 佈局 tab：內建視圖切換、密度（標準/緊湊）、首欄固定開關、欄位顯示勾選。
- 規則 tab：佔位提示「條件着色規則將在後續階段支援」。

#### 2. ~~視圖 chips 增強~~ → 不改首頁，跳過

首頁不新增 chips 或設定 UI。內建視圖切換保留在設定子頁的佈局 tab，已儲存視圖在設定子頁底部展示，支援選擇、「儲存目前」和「管理」操作。

#### 3. ~~Grid 欄位顯示設定~~ → 已在第二期完成

#### 4. ~~Grid 密度設定~~ → 已在第二期完成

#### 5. 首欄固定開關 ✅

- `EntriesMobileGrid` 新增 `stickyFirstColumn` prop（boolean，預設 true）。
- false 時詞頭欄不 sticky，改為普通表格欄。
- 設定持久化到 `localStorage` key `jyutcollab-mobile-sticky-first`。

#### 6. 已儲存視圖選擇、儲存、管理 ✅

- 設定子頁底部顯示已儲存視圖列表，點擊套用。
- 「儲存目前」按鈕觸發 `save-current-view` 事件，由 `index.vue` 開啟現有 `EntriesSaveViewModal`。
- 「管理」按鈕觸發 `manage-views` 事件，由 `index.vue` 開啟現有 `EntriesManageViewsModal`，不另建手機端管理流程。

#### 7. 排序設定 ✅

- `sortBy` / `sortOrder` 由 `index.vue` 傳入 workbench → view page。
- 排序變更通過 `update:sortBy` / `update:sortOrder` 事件回傳 `index.vue`。手機端使用獨立 `setMobileSortBy` / `setMobileSortOrder`，避免誤用桌面表頭 `handleSort` 的切換排序方向行為。
- 與桌面端 `sortBy` / `sortOrder` 使用同一組 API 參數。

#### 8. 進階篩選入口 ⚠️ 未做

原計劃在篩選 tab 底部加入進階篩選入口（打開 `EntriesAdvancedFilterPanel` 的手機版）。目前未實作，留待後續。

驗收：

- 使用者可在手機調整 grid 顯示欄位與密度。
- 使用者可在手機套用已儲存視圖並儲存新視圖。
- 排序設定與桌面端 `sortBy` / `sortOrder` 一致。
- 進階篩選入口可從設定頁進入，並正確套用條件。（未做）
- `npx vitest run app/components/entries/__tests__/EntriesMobileStage2Scope.test.ts`：6 passed。
- `npm run build`：已通過（僅既有 chunk size / Tailwind sourcemap 警告）。

### 第四期：高階編輯與參考輔助

狀態：代碼骨架完成（2026-06-25），build 通過；詞素引用與參考輔助接線待修，手動驗收待做。

代碼檢查結論：

- 已完成主體骨架：`EntriesMobileSensesPage.vue`、`EntriesMobileThemePage.vue`、`EntriesMobileMorphemePage.vue` 已新增，`EntriesMobileWorkbench.vue` 已接入三個全屏子頁，`EntriesMobileRowEditor.vue` 已加入分類、釋義、參考區段與更多菜單。
- 已通過機械驗證：`npm run build` 成功；`npx vitest run app/components/entries/__tests__/EntriesMobileStage2Scope.test.ts` 成功（6 passed）。
- 仍需修正功能接線：手機詞素搜尋 / 添加 / 未連結詞素確認未完整接到 `useEntryMorphemeRefs`；手機參考卡片目前主要展示已存在的 row hint 結果，未在手機欄位編輯後主動觸發重複檢測或 Jyutjyu 查詢。
- 仍需補齊能力：圖片上傳未搬入手機義項頁；AI 語域在手機端未有明確觸發與採納 UI。

交付與實作狀態：

#### 1. 釋義詳情手機分段編輯 ✅

- 新增 `EntriesMobileSensesPage.vue`：全屏子頁，支援多義項、例句、分義項的增刪改。
- 復用 `useEntrySenses` 的 9 個純函數（`addSense`、`removeSense`、`addExample` 等）。
- AI 釋義建議卡片顯示在頂部，支援採納 / 忽略。
- 底部操作列：新增義項、AI 例句、AI 釋義。
- 未支援圖片上傳；`EntrySensesExpand` 內建的 Cloudinary 流程尚未搬入手機子頁。

#### 2. 主題分類搜尋與三級瀏覽手機化 ✅

- 新增 `EntriesMobileThemePage.vue`：全屏子頁，包含搜尋框、三級級聯瀏覽器（L1 → L2 → L3）。
- 復用 `useThemeData` 的 `searchThemes()`（模糊搜尋）和 `getLevel1Themes()` / `getLevel2ThemesByLevel1()` / `getThemesByLevel1()`。
- AI 分類建議卡片（含信心度、說明），支援採納 / 忽略 / AI 自動分類按鈕。
- 目前主題高亮顯示 + 清除分類功能。
- 待修：清除分類目前直接修改 `entry.theme`，未經 `update:theme` / `update:entry` 事件回傳；手動驗收時需確認 dirty state、儲存與 AI 建議清理是否一致。

#### 3. 詞素引用手機化 ⚠️ 接線待修

- 新增 `EntriesMobileMorphemePage.vue`：全屏子頁，包含目前引用列表、未連結詞素快速添加、數據庫搜尋。
- 復用 `useEntryMorphemeRefs` composable（`openMorphemeSearch`、`addMorphemeRef`、`removeMorphemeRef`、`openUnlinkedMorphemeForm`、`confirmUnlinkedMorphemeRefs`）。
- 搜尋結果顯示詞頭、粵拼、方言、釋義，點擊即可添加。
- 待修：`confirm-unlinked-morpheme` 在 `EntriesMobileWorkbench.vue` 未把 `activeEntry` 傳回 `index.vue`，目前會令 `confirmUnlinkedMorphemeRefs(entry)` 收到 `undefined`。
- 待修：手機 `search-morphemes` 事件目前只寫入 `morphemeSearchQuery`，沒有調用 `searchMorphemes(activeEntry)` 或等效 API 流程。
- 待修：手機點擊搜尋結果時調用 `addMorphemeRef(id, item)`，但 `morphemeSearchTargetEntry` 沒有在手機流程設置，添加可能無效。

#### 4. 重複檢測、其他方言、Jyutjyu 參考手機化 ⚠️ 展示已接，觸發待補

- 整合到 `EntriesMobileRowEditor` 的「參考」區段。
- 同方言重複：amber 卡片顯示重複詞條（最多 3 條）。
- 其他方言點已有：green 卡片顯示其他方言詞條 + 「套用」按鈕。
- Jyutjyu 參考：purple 卡片顯示 Jyutjyu 結果 + 「套用」按鈕。
- 資料由 `index.vue` 的 `duplicateCheckEntriesMap`、`otherDialectEntriesMap`、`jyutjyuResultsMap` computed 預先計算，通過 props 傳入 workbench。
- 待補：手機欄位編輯完成後未主動觸發 `runDuplicateCheck()` 或 `runJyutjyuRef()`；目前多數卡片只會顯示已有的桌面 row hint 結果。

#### 5. AI 釋義、AI 分類、AI 語域、AI 例句 ⚠️ 部分完成

- 行編輯頁「分類」區段：AI 分類建議卡片（藍色邊框），顯示建議分類 + 採納 / 忽略。
- 行編輯頁「釋義」區段：AI 釋義建議卡片，顯示建議釋義 + 採納 / 忽略。
- 義項子頁底部：AI 例句、AI 釋義按鈕（僅在詞頭已填時顯示）。
- 主題子頁底部：AI 自動分類按鈕。
- 復用 `index.vue` 的 `generateAIDefinition`、`generateAICategorization`、`generateAIExamples`、`acceptThemeAI`、`dismissThemeAI`、`acceptDefinitionAI`、`dismissDefinitionAI`。
- `aiLoadingFor` 狀態由 `index.vue` 傳入，用於控制按鈕 loading 動畫。
- 待補：AI 語域建議（`generateAIRegister`、`acceptRegisterAI` / `dismissRegisterAI`）未接入手機端觸發、展示與採納 UI。
- 待補：AI loading 判斷目前只按 action 類型顯示，應同時比對 `aiLoadingFor.entryKey`，避免其他詞條的 AI 任務令當前手機子頁顯示 loading。

#### 6. 行編輯頁增強 ✅

- `EntriesMobileRowEditor` 重寫，新增：
  - 更多菜單：複製、拆出成新詞語、加入其他詞語組、刪除。
  - 分類區段：點擊進入主題子頁 + AI 建議卡片。
  - 釋義區段：點擊進入義項子頁 + AI 建議卡片。
  - 參考區段：詞素引用入口、重複檢測卡片、其他方言卡片、Jyutjyu 卡片。
- 子頁導航使用 `history.pushState` + `popstate`，瀏覽器返回鍵正確運作。

驗收：

- [x] `npm run build` 通過。
- [x] `npx vitest run app/components/entries/__tests__/EntriesMobileStage2Scope.test.ts` 通過。
- [ ] 使用者可在手機完整維護義項、例句與分義項（待手動驗收）。
- [ ] 使用者可在手機維護義項圖片（未完成）。
- [ ] 使用者可在手機採納或忽略 AI 釋義 / 分類建議（待手動驗收）。
- [ ] 使用者可在手機觸發、採納或忽略 AI 語域建議（未完成）。
- [ ] 使用者可在手機套用其他方言或 Jyutjyu 參考（展示與按鈕已接，觸發來源待補）。
- [ ] 使用者可在手機管理詞素引用（子頁已建，搜尋 / 添加 / 未連結確認接線待修）。
- [ ] 高階編輯完成後回到同一條詞條的單行編輯頁，不丟失列表上下文（待手動驗收）。

### 第五期：批量與效率能力

狀態：代碼完成（2026-06-25 10:45 檢查），待手動驗收。

代碼檢查結論：

- 已完成主體接線：`EntriesMobileGrid.vue` 支援長按與 click suppression；`EntriesMobileWorkbench.vue` 支援選中模式、批量操作欄、批量狀態 picker 與 `canChangeStatus` gating；`app/pages/entries/index.vue` 已接入 `mobileBatchDelete()` / `mobileBatchStatusChange()`；`EntriesMobileRulesPage.vue` 已接入規則列表、啟用 / 停用與刪除。
- 已補齊 review 缺口：手機搜尋會先更新 `searchQuery`；手機詞素頁會傳回 `activeEntry`、設定 `morphemeSearchTargetEntry` 並執行搜尋；手機 grid 所有欄位（含固定詞頭欄、方言、狀態、釋義）接入 `ruleOverlays.getCellOverlayMeta()`；批量刪除改為手機底部確認層。
- 已通過機械驗證：`npm run build` 成功（僅既有 chunk size / Tailwind sourcemap 警告）；`npx vitest run app/components/entries/__tests__/EntriesMobileStage2Scope.test.ts app/components/entries/__tests__/EntriesPageRuleOverlayWiring.test.ts app/components/entries/__tests__/EntriesRuleOverlayPanel.test.ts` 成功（21 passed）。
- 仍需補手動驗收：長按多選、批量刪除底部確認層、批量狀態、條件着色 grid 呈現與規則管理。

交付與實作狀態：

#### 1. 長按多選 ✅

- `EntriesMobileGrid` 新增長按偵測（500ms），觸發 `long-press` 事件。
- 長按時提供觸覺回饋（`navigator.vibrate(30)`）。
- `EntriesMobileWorkbench` 收到 `long-press` 後進入 `selectMode`，將長按的詞條設為第一個選中項。
- 選中模式下，每行顯示 checkbox；點擊行切換選中（不打開行編輯頁）。
- 選中行顯示 `bg-primary-50/50` 高亮。

#### 2. 批量刪除 ✅

- 選中模式下，批量操作欄顯示「已選 N 項」+ 刪除 / 修改狀態 / 取消按鈕。
- 點擊「刪除」觸發 `batch-delete` 事件，`index.vue` 的 `mobileBatchDelete()` 逐條調用 `DELETE /api/entries/:id`。
- 刪除前使用手機端底部確認層（`USlideover`），不再使用瀏覽器 `confirm()`。
- 刪除後自動刷新列表。

#### 3. 批量狀態修改 ✅

- 選中模式下，點擊「修改狀態」打開底部彈出層（`USlideover`）。
- 提供四個狀態選項：草稿、待審核、已發佈、已拒絕。
- 選擇後觸發 `batch-status-change` 事件，`index.vue` 的 `mobileBatchStatusChange()` 逐條調用 `saveEntryChanges()`。
- 操作完成後自動退出選中模式。
- `EntriesMobileWorkbench` 使用 `canChangeStatus` 隱藏「修改狀態」入口，與單行編輯頁狀態欄權限一致。

#### 4. 條件着色規則手機管理 ✅

- 新增 `EntriesMobileRulesPage.vue`：全屏子頁，顯示現有規則列表。
- 每條規則顯示：顏色圓點、名稱、類型（格式化/驗證）、條件類型（公式/正則）、目標欄位、啟用/停用開關、刪除按鈕。
- 支援切換啟用/停用（`toggleRule`）和刪除規則（`removeRule`）。
- 規則管理入口在設定子頁（`EntriesMobileViewPage`）的「規則」tab。
- 建立和編輯規則仍需使用桌面端進階篩選面板。
- `EntriesMobileGrid` 已接入 `ruleOverlays.getCellOverlayMeta()`，固定詞頭欄與右側欄位均可呈現條件着色 / 驗證警告樣式與 tooltip。

#### 5. 手機 grid 欄位顯示設定 ✅

- 已在第二期完成（`EntriesMobileViewPage` 的佈局 tab）。

驗收：

- [x] `npm run build` 通過。
- [x] `npx vitest run app/components/entries/__tests__/EntriesMobileStage2Scope.test.ts app/components/entries/__tests__/EntriesPageRuleOverlayWiring.test.ts app/components/entries/__tests__/EntriesRuleOverlayPanel.test.ts` 通過。
- [ ] 手機端可長按進入多選，並可選取 / 取消選取多條已儲存詞條（待手動驗收）。
- [ ] 手機端可批量刪除多條已儲存詞條，且使用手機端確認底部彈出層（待手動驗收）。
- [ ] 手機端可批量修改狀態；普通貢獻者不會看到審核狀態操作（待手動驗收）。
- [ ] 條件着色規則可在手機端啟用 / 停用 / 刪除（待手動驗收）。
- [ ] 條件着色在 grid 模式有可理解的呈現（待手動驗收）。
- [ ] 大量資料下滾動穩定，列表不因行內展開產生明顯跳動（待手動驗收）。
- [ ] 視需要補第五期更細的互動測試：長按多選、批量事件、批量狀態權限 gating、規則頁入口與 toggle / remove 事件。

### 第六期：全站手機窄界面收口

狀態：主體代碼完成（2026-06-25 12:48 檢查），待修與待手動驗收。`npm run build` 通過；詞條手機相關 Vitest 子集 21 passed；完整 `npx vitest run` 目前 124 passed / 1 failed（Agent tool registry 測試期望落後於實作）。

定位：

- 這一期不再只看詞條列表，而是把整個 JyutCollab 在 375px / 430px 窄界面下仍明顯不適配的地方一次收口。
- 右上角 Agent 圖標（目前 `i-lucide-sparkles`）點開後的輔助工具是最高優先級，因為現有實作在手機端仍以桌面右側欄方式展開，會壓縮主內容並造成水平溢出。
- 此階段完成前不得進入 card 探索；card 仍不屬於手機改造完成定義。

代碼調查結果（2026-06-25）：

1. `app/layouts/default.vue`：Agent 面板目前以 `<AgentPanel class="w-[420px] shrink-0" />` 插入全局 `h-screen overflow-hidden` 橫向 flex 容器。手機寬度小於 420px 時，面板會直接製造水平溢出，且主內容仍佔據同一 flex 行。
2. `app/components/agent/Panel.vue`：面板本身使用 `h-screen` 桌面側欄模型；header 同時放 tab、歷史對話 select、新對話、刪除、關閉，375px 下容易擠壓。輸入列為單行 `UInput + 發送`，需要處理鍵盤、安全區與長 prompt。
3. `app/components/layout/AppHeader.vue`：桌面 nav 在 `md` 以下隱藏，但沒有手機導航替代入口；通知與使用者選單使用 `absolute right-0` 與固定寬度，375px 下需要避免貼邊溢出；Agent 入口仍在右側工具列內。
4. `app/components/shared/SearchFilterBar.vue`：搜尋與篩選已會換行，但多個 `w-28` / `min-w-28` 控件在 375px 上仍可能形成擁擠的多列工具條。Review 與 Histories 都共用此元件。
5. `app/pages/admin/users.vue` 與 `app/components/admin/UserTable.vue`：用戶管理仍以寬表格 + `overflow-x-auto` 為主要手機策略。手機端可以橫滑，但不利於管理操作，應補卡片式列表或至少固定用戶主欄、壓縮次要欄位。
6. `app/components/admin/EditRoleModal.vue`、`app/components/admin/ManageDialectsModal.vue`：彈窗基本可縮，但方言權限行、角色 select、底部操作在 375px 下需要明確換行與全寬觸控區。
7. `app/components/docs/DocsPageShell.vue`、`DocsSidebar.vue`、`DocsSearch.vue`：Docs 在手機端會先顯示完整 sidebar，再顯示正文；文章卡片 `p-6` 與搜尋結果 dropdown 也需要手機密度調整。應改為手機可收合目錄或頂部章節選單。
8. `app/pages/review/index.vue`：審核卡片本身大致可縮，但依賴共用搜尋篩選列；通過 / 拒絕操作與拒絕 modal 需要在 375px 下確認不被 EntryDetailCard 內容擠壓。
9. `app/pages/histories/index.vue`：歷史列表已有部分手機處理，但差異詳情 modal 仍包含 split table 與 `max-w-3xl` 桌面模型；手機應改為全屏詳情頁 / 全屏 modal，預設 unified diff，split view 僅在寬屏可用。
10. `app/pages/profile.vue`：個人資料頁整體可縮，但 email、Google 連結區與統計卡在窄屏需檢查換行；解除 Google 仍使用瀏覽器 `confirm()`，手機端應改為專用確認彈出層。
11. `app/components/entries/EntryModal.vue`、`EntryDetailModal.vue`、`LexemeMergeModal.vue` 及已儲存視圖 modal：雖然詞條手機主流程已改用 mobile workbench，但這些通用 modal 仍可能被桌面入口或 Agent 動作打開；第六期需至少保證 375px 不溢出、不遮擋主要操作。

本次代碼檢查結論（2026-06-25 12:48）：

- 已完成主體接線：`app/layouts/default.vue` 已用 `useMobileBreakpoint` 將 Agent 手機端改為全屏覆蓋層；`AgentPanel` 已改為 `h-full`、緊湊 header、手機安全區 padding；`AppHeader` 已加入手機漢堡導航抽屜；`SearchFilterBar` 已加入手機篩選收合；Docs、Admin、Review、Histories、Profile 與詞條 modal 已有主要窄屏修正。
- 已通過 build：`npm run build` 成功；仍有既有 chunk size 與 Tailwind sourcemap 警告。
- 已通過相關 Vitest 子集：`EntriesMobileStage2Scope.test.ts`、`EntriesPageRuleOverlayWiring.test.ts`、`EntriesRuleOverlayPanel.test.ts` 共 21 passed。
- 完整 Vitest 未通過：`server/utils/agent/__tests__/phase0.test.ts` 的 registry 名單期望仍是舊版 5 個工具；實作目前返回 19 個工具。需更新測試或將該失敗明確排除在第六期 UI 驗收之外。
- 待修 1：`AppHeader` 手機導航抽屜目前以父層 `@click.self` 嘗試處理遮罩關閉，但遮罩是子元素，點擊遮罩時通常不會觸發 `.self` 關閉。需改為在遮罩元素本身加 `@click="mobileNavOpen = false"`，或調整 DOM 結構。
- 待修 2：`Profile` 的解除 Google 確認已改用 `UModal`，但 footer 仍是 `flex justify-end gap-2`，未做到文件原先描述的 `flex-col sm:flex-row` 手機堆疊。375px 可能仍能放下兩個短按鈕，但不能標成已完成堆疊。
- 待手動驗收：仍未用真機或瀏覽器矩陣確認 375px / 430px、淺色 / 暗色、全站路由、彈窗可關閉、鍵盤安全區與暗色可讀性。

交付：

#### 1. Agent 輔助工具手機適配（最高優先級） ✅

- `app/layouts/default.vue` 在 `< 768px` 時將 Agent 從右側欄改為全屏覆蓋層，不參與桌面 flex 佈局，不壓縮主內容。使用 `useMobileBreakpoint` 控制渲染分流。
- 手機 Agent 面板寬度為 `100vw`，高度使用 `100dvh`（保留 `100vh` fallback），z-index `[60]` 高於 header。
- `AgentPanel` header 改為 `py-2` 緊湊佈局；刪除對話按鈕在手機端隱藏（`hidden sm:inline-flex`），避免擠壓 tab 與 select。
- 對話 select 使用 `min-w-0 flex-1` 自適應寬度；關閉按鈕固定右側。
- 訊息列表的表格型 markdown 已有 `overflow-x: auto`，文字已設 `overflow-wrap: anywhere`。
- 輸入列底部加入 `pb-[max(0.75rem,env(safe-area-inset-bottom))]` 處理 iOS 安全區。
- 面板根節點從 `h-screen` 改為 `h-full`，適應全屏覆蓋層容器。
- 過渡動畫：桌面側欄使用原有 `agent-slide`（水平寬度），手機全屏使用 `agent-fade`（淡入淡出）。

#### 2. 全局 Header 與頂層導航窄屏修正 ✅

- 新增漢堡菜單按鈕（`i-heroicons-bars-3`），僅在 `md` 以下且已登入時顯示。
- 新增手機導航抽屜（`Teleport to body`），左側滑入（`w-72 max-w-[80vw]`），包含首頁、使用指南、詞條列表、審核隊列、編輯歷史、個人資料、用戶管理（管理員可見）。
- 導航抽屜使用 `z-[70]` 高於 header（`z-50`），帶半透明遮罩；點擊導航項目後自動關閉。
- 待修：目前遮罩是父層內的子元素，而關閉事件使用父層 `@click.self`，點擊遮罩未必會關閉抽屜。
- 路由變更時自動關閉抽屜（`watch $route.path`）。
- Header 高度從 `h-16` 改為 `h-14 sm:h-16`，logo 圖標縮小至 `w-8 h-8 sm:w-10 sm:h-10`，品牌文字在手機端隱藏（`hidden sm:flex`）。
- 通知 dropdown 加入 `max-w-[calc(100vw-2rem)]` 防止溢出。
- 使用者選單 dropdown 加入 `max-w-[calc(100vw-2rem)]` 防止溢出。
- Header 右側圖標間距從 `gap-3` 改為 `gap-1 sm:gap-3`。
- 導航抽屜帶 CSS 過渡動畫（`nav-slide` + `nav-fade`）。

#### 3. 共用搜尋篩選列手機化 ✅

- `SharedSearchFilterBar` 在 `< 640px` 下改為單欄佈局：搜尋框全寬，篩選控件收合在「篩選」按鈕後方。
- 手機端顯示「篩選」toggle 按鈕（帶活躍篩選數量 badge），點擊展開 / 收合篩選面板。
- 展開的篩選面板使用 `grid grid-cols-2` 兩列佈局，主題分類佔整行（`col-span-2`）。
- 桌面端（`sm:` 以上）保持原有 inline 佈局不變。
- Review、Histories、Entries 三頁共用此元件，改動自動生效。

#### 4. Docs 手機閱讀體驗 ✅

- `DocsSidebar` 在手機端（`lg` 以下）改為可收合目錄，預設收合。帶 toggle 按鈕（「展開目錄」/「收合目錄」），帶展開收合過渡動畫。
- `DocsPageShell` 手機 padding 降低至 `p-4 sm:p-6 lg:p-10`，文章標題縮小至 `text-2xl sm:text-3xl`。
- 桌面端（`lg:` 以上）sidebar 保持 sticky 側欄不變。
- `docs-prose` 表格加入 `display: block; overflow-x: auto;` 防止窄屏溢出。

#### 5. Admin 手機管理體驗 ✅

- `AdminUserTable` 手機端（`sm` 以下）提供卡片列表替代 9 列表格：顯示用戶頭像、用戶名、郵箱、角色 badge、狀態 badge、貢獻 / 審核 / 方言統計、操作按鈕。
- 桌面端（`sm:` 以上）保持原有表格佈局。
- `admin/users` 篩選列改為手機端單欄：搜尋框全寬，角色 / 狀態 select 並排（各 `flex-1`）。
- `ManageDialectsModal` 方言權限行在手機端改為堆疊佈局（label 上方、controls 下方），`sm:` 以上保持同行。

#### 6. Review、Histories、Profile 與通用 modal 收口 ✅

- Review 拒絕 modal footer 改為 `flex-col sm:flex-row` 手機端垂直堆疊。
- Histories 差異詳情 modal 加入 `w-full` 確保 375px 下佔滿寬度；diff 表格加入 `min-w-[20rem]` 配合容器橫向滾動。
- Histories diff modal footer 與 revert confirm modal footer 改為手機端堆疊佈局。
- Profile 的 `confirm('確定要解除...')` 改為 `UModal` 確認彈出層（`unlinkConfirmOpen`），帶取消 / 確認按鈕。待修：footer 目前未改成手機堆疊。
- `EntryModal` 兩處 `grid grid-cols-2`（方言 + 類型、使用説明 + 語域）改為 `grid-cols-1 sm:grid-cols-2`。
- 詞條相關通用 modal 已有 `w-full max-w-*` 約束，375px 下自動佔滿 viewport。

#### 7. 全站窄屏審計與修復清單

- 用 375px、430px、淺色、暗色跑完整路由矩陣：
  - `/`
  - `/entries`
  - `/review`
  - `/histories`
  - `/docs`
  - `/profile`
  - `/admin/users`
  - `/login`
  - `/register`
  - `/setup`
- 每個頁面檢查：水平溢出、header 重疊、彈窗可關閉、底部操作可觸達、輸入框不被鍵盤遮擋、暗色模式邊框 / 文字可讀。
- 使用 Playwright 或瀏覽器手動驗收記錄截圖；若建立專用驗收文件，命名為 `docs/mobile-global-narrow-verification.md`。

驗收：

- [x] Agent 面板在 375px / 430px 下以全屏覆蓋層展開，不再出現 420px 右側欄造成的水平溢出。
- [x] Agent 對話、審計、確認卡片、markdown 表格、輸入列在淺色 / 暗色模式都可正常使用。
- [ ] Header 在手機端有可用導航入口（漢堡菜單 + 抽屜），通知、使用者選單、Agent 入口不重疊、不溢出。（主體已接；遮罩點擊關閉待修，仍待手動驗收。）
- [x] Review / Histories 的共用搜尋篩選列在 375px 下單欄排列，控件收合在篩選按鈕後方。
- [x] Docs 手機端先看到正文，sidebar 可收合。
- [x] Admin 用戶管理在手機端使用卡片列表，可完成查看、編輯角色、管理方言、啟用 / 停用。
- [x] Histories 差異詳情 modal 在手機端全寬，表格可橫向滾動。
- [ ] Profile 手機端可完成資料修改與 Google 連結 / 解除流程，已改用 UModal 確認彈出層。（Google 解除 footer 手機堆疊待修，流程仍待手動驗收。）
- [x] 通用 modal 在手機端可滾動、可關閉、footer 操作可觸達。
- [ ] 全站路由矩陣在 375px / 430px、淺色 / 暗色通過（待手動驗收）。
- [x] `npm run build` 通過。
- [x] 詞條手機相關 Vitest 子集 21 passed。
- [ ] 完整 `npx vitest run` 通過。（目前 124 passed / 1 failed，Agent registry 測試待更新。）

### 第七期：Card 可選探索

交付：

- 只在前五期與第六期全站手機窄界面收口完成後評估是否需要 card。
- 若需要，先做 prototype，不直接併入核心流程。
- card 必須復用單行編輯頁與單元格編輯頁。
- card 不替代 grid，不影響 grid 作為預設模式。

驗收：

- 有明確場景證明 card 比優化後 grid 更合適。
- card 不引入第二套資料、編輯、儲存或權限邏輯。
- card 不影響 grid 性能與可維護性。

## 設計細節規範

### 視覺

- 不照搬飛書深色圓角品牌視覺。
- 沿用 JyutCollab 現有紙色背景、紅色主色、方正邊框與硬陰影。
- 手機底部彈出層可保留方正語言，但需要足夠觸控間距。
- Grid 行、欄、子頁面遵循現有系統，不新增大圓角容器風格。
- 狀態與方言用 badge，但需避免一屏過多彩色標籤。

### 暗色模式

- 所有手機組件從第一期 1a 開始就必須同時支援淺色與暗色模式。
- 使用現有 CSS 變量（`var(--jc-*)`）與 Tailwind `dark:` 前綴，與桌面端一致。
- 每期驗收必須在淺色與暗色兩種模式下各通過一次。

### 響應式斷點

- `isMobile` 必須使用 `window.matchMedia('(max-width: 767px)')` 監聽，而非 `onMounted` 中的一次性 `window.innerWidth` 檢查。
- 斷點值定義為常數：`MOBILE_BREAKPOINT = 768`。
- 斷點變更時（旋轉手機、縮放桌面瀏覽器），界面自動切換，不需要手動刷新。
- 組件卸載時移除 `matchMedia` 監聽器。

### URL 狀態一致性

- 手機端與桌面端讀取並寫入相同的 URL 查詢參數：
  - `?search=` — 關鍵詞搜尋
  - `?view=` — flat / aggregated / lexeme
  - `?dialect=` / `?theme=` / `?status=` — 篩選
  - `?sharedView=` — 已儲存視圖 ID
  - `?filter=mine` — 我的詞條
- 手機端子頁面（單行編輯頁、視圖設定頁等）使用 Vue Router 導航，不修改列表 URL。
- 瀏覽器返回鍵在手機端子頁面之間正確運作：從子頁面返回列表、從列表返回上一頁。

### 觸控

- 主要可點擊區至少 44px 高。
- 行動端不使用 hover-only 操作。
- 所有桌面 tooltip 內容在手機改為可點擊資訊入口。
- 危險操作使用確認底部彈出層，不使用瀏覽器 `confirm()` 作主要體驗。
- 列表中的 grid 行使用整行點擊區；欄位級精準點擊只出現在單行編輯頁內。
- 橫向滾動不應觸發行點擊（兩者互斥）。

### 文案

- 全部中文使用香港繁體。
- 手機端不再使用「手機端目前僅支援瀏覽」。
- 用「儲存」統一手機主要操作文案，後續可再統一桌面的「保存」文案。

### 資料安全

- 所有手機修改仍走現有 `saveNewEntry`、`saveEntryChanges`、`saveAllChanges` 流程或其抽出的共用 action。
- 不繞過 `canEditEntry()` 與後端 `canContributeToDialect()` 權限檢查。
- 新建與修改仍必須建立 EditHistory，沿用現有 API。
- 未儲存 draft 仍應保留 localStorage 保護。

## 風險與處理

### 風險 1：桌面頁面過大，直接在 `index.vue` 追加手機 UI 會失控

處理：**強制前置步驟**——先在手機開發前將桌面表格提取為 `EntriesDesktopTable.vue`。資料狀態留在頁面，UI 必須拆分。

### 風險 2：手機完整編輯與現有行內編輯狀態重疊

處理：手機端使用同一份 entry draft 與 baseline，但不要共用桌面的 `editingCell` 焦點模型。手機以單行編輯頁內的欄位展開作為編輯狀態。

### 風險 3：功能一次搬完會拖慢交付

處理：第一期拆分為 1a（唯讀 grid）/ 1b（編輯）/ 1c（視圖與篩選）。每個子階段可獨立驗收。進階篩選、條件規則、AI 參考分期交付。

### 風險 4：過早做 card 會分散 grid 優化

處理：card 延後到最後可選階段。前五期先把 grid 的掃描、行編輯、欄位設定、進階能力、批量效率做到穩定；第六期完成全站手機窄界面收口後，才進入第七期 card 可選探索。

### 風險 5：底部彈出層在網頁端容易出現滾動衝突與鍵盤擠壓

處理：只有輕量操作（選項 picker、確認刪除）使用底部彈出層。視圖選擇、視圖設定等內容較多的操作使用全屏子頁面。文字編輯在單行頁內原地展開，避免與鍵盤同時出現。

### 風險 6：手機端與桌面端 URL 狀態不同步

處理：手機端和桌面端必須讀取並寫入相同的 URL 查詢參數。`viewMode`、`searchQuery`、篩選條件等在所有設備上使用相同的 URL 編碼。手機端子頁面（單行編輯頁）不修改列表 URL。

### 風險 7：手機端暗色模式被遺漏

處理：所有手機端驗收條件必須同時在淺色與暗色模式下通過。手機組件從第一期 1a 就必須處理 `dark:` 樣式。

## 建議的第一個開發切入點

### 步驟 0：桌面表格提取（前置，不可跳過，已完成）

1. 建立 `EntriesDesktopTable.vue`，將 `index.vue` 中的 `<table>` 模板及相關事件處理移至該組件。
2. 確保 `npm run build` 通過，桌面端所有功能不受影響。
3. 此時才開始手機端開發。

### 步驟 1：手機唯讀 Grid（第一期 1a，已完成）

4. 在 `index.vue` 中將 `isMobile` 改為 `matchMedia` 響應式監聽。
5. 將手機 warning 改為渲染 `EntriesMobileWorkbench`。
6. 新增 `EntriesMobileWorkbench.vue`，先接入 `entries`、`tableRows`、`editableColumns`、`pagination`、`viewMode` 等核心資料。
7. 新增 `EntriesMobileGrid.vue`，先支援平鋪詞條 grid。1b 後已加入行點擊進單行編輯頁。
8. 新增基本搜尋框。
9. 完成 375px 與 430px 視口手動驗收（含暗色模式）。

### 步驟 2：手機編輯能力（第一期 1b，已完成）

10. 新增 `EntriesMobileRowEditor.vue`，讓 grid 行點擊進入單行編輯頁。
11. 新增 `EntriesMobileFieldRow.vue`，文字欄位點擊後原地展開輸入區。
12. 新增 `EntriesMobileSelectSheet.vue`，選擇欄位使用底部彈出層 picker。
13. 在單行編輯頁內新增底部儲存操作列；暫不拆獨立 `EntriesMobileSaveBar.vue`。
14. 把 `addNewRow()` 在手機端改為打開新建單行編輯頁。
15. 驗收新建、編輯、儲存、取消流程。

### 步驟 3：視圖與篩選（第一期 1c，已完成）

16. 新增視圖 chips 與 `EntriesMobileViewPage.vue`。
17. 新增基本篩選入口。
18. 支援聚合視圖的 grid 渲染。
19. 驗收 URL 參數在桌面端與手機端之間的一致性。

### 步驟 4：第一輪手動驗收（下一步，必做）

20. 以 375px 與 430px 視口各跑一次 1a / 1b / 1c 核心流程。
21. 每個視口同時驗收淺色與暗色模式。
22. 驗收瀏覽器返回鍵：grid → 單行編輯頁 → grid、grid → 視圖子頁 → grid。
23. 桌面端回歸：搜尋、排序、視圖切換、進階篩選、行內編輯、批量操作不能回退。
24. `npm run build` 通過後，才進入第二期 Grid 體驗打磨。

## 第一輪開工檢查清單

以下清單只覆蓋第一期 1a/1b/1c。完成前不得開始第二期，也不得加入 card。

### Scope Lock

- [x] 不新增 `EntriesMobileCard.vue`。
- [x] 不加入 card / grid 切換。
- [x] 不重寫 `useEntriesList`、`useEntriesTableColumns`、`useEntriesTableEdit` 等共用 composables。
- [x] 不改後端 API 契約。
- [x] 不改桌面端互動模型，除非是為了提取 `EntriesDesktopTable.vue` 並保持行為一致。
- [x] 不在手機 grid 裏直接編輯單元格；欄位編輯只能從單行編輯頁觸發。

### 1a 檢查清單：唯讀 Grid + 搜尋

文件與元件：

- [x] `app/components/entries/EntriesDesktopTable.vue`
- [x] `app/components/entries/mobile/EntriesMobileWorkbench.vue`
- [x] `app/components/entries/mobile/EntriesMobileGrid.vue`
- [x] `app/pages/entries/index.vue` 負責資料狀態、桌面/手機分流、事件協調。

行為：

- [x] `isMobile` 使用 `window.matchMedia('(max-width: 767px)')`，支援 resize / rotate。
- [x] 手機端不再顯示「建議使用電腦端編輯」阻斷文案。
- [x] 手機 grid 平鋪視圖可顯示詞頭、方言、粵拼、狀態。
- [x] 手機端搜尋使用現有 `searchQuery` / `handleSearch`。
- [x] 1a 階段手機 grid 只讀；1b 後行點擊改為進入單行編輯頁。

驗收：

- [ ] 375px 淺色模式可瀏覽與搜尋（待手動驗收）。
- [ ] 375px 暗色模式可瀏覽與搜尋（待手動驗收）。
- [ ] 430px 淺色模式可瀏覽與搜尋（待手動驗收）。
- [ ] 430px 暗色模式可瀏覽與搜尋（待手動驗收）。
- [ ] 桌面端表格行為與重構前一致（待手動回歸）。
- [x] `npm run build` 通過。

### 1b 檢查清單：單行編輯與儲存

文件與元件：

- [x] `app/components/entries/mobile/EntriesMobileRowEditor.vue`
- [x] `app/components/entries/mobile/EntriesMobileFieldRow.vue`
- [x] `app/components/entries/mobile/EntriesMobileSelectSheet.vue`
- [x] 單行編輯頁內嵌底部儲存操作列；第一輪不拆 `EntriesMobileSaveBar.vue`。

行為：

- [x] 點擊手機 grid 行進入單行編輯頁。
- [x] 單行編輯頁可返回 grid，瀏覽器返回鍵也可返回 grid。
- [x] 文字欄位在單行頁內原地展開輸入，不另開文字編輯彈出層。
- [x] 方言、類型、語域、狀態使用底部 picker。
- [x] 修改後只更新本地 draft，顯示未儲存狀態。
- [x] 單行頁底部支援當前詞條儲存 / 取消；workbench 頂部支援全部儲存。
- [x] `addNewRow()` 在手機端打開新建單行編輯頁，不插入桌面 row 焦點。
- [x] 儲存走現有 `saveNewEntry` / `saveEntryChanges` / `saveAllChanges` 流程。
- [x] 權限仍使用現有 `canEditEntry()` 與後端權限檢查。

驗收：

- [ ] 375px 可修改詞頭、方言、粵拼、狀態並儲存（待手動驗收）。
- [ ] 430px 可修改詞頭、方言、粵拼、狀態並儲存（待手動驗收）。
- [ ] 新建詞條可儲存並返回 grid（待手動驗收）。
- [ ] 放棄更改可回復到 baseline（待手動驗收）。
- [ ] 未儲存更改在返回列表前有清楚提示或保留狀態（待手動驗收）。
- [ ] 淺色與暗色模式都可完成同一流程（待手動驗收）。
- [x] `npm run build` 通過。

### 1c 檢查清單：視圖切換與基本篩選

文件與元件：

- [x] `app/components/entries/mobile/EntriesMobileViewPage.vue`
- [x] 視圖 chips 內建：平鋪、按詞形、按詞語。
- [x] 基本篩選入口：方言、主題分類、狀態。

行為：

- [x] 手機端可切換 `flat` / `aggregated` / `lexeme`。
- [x] 聚合視圖以 grid 呈現，先顯示聚合行，再展開單條詞條。
- [x] 聚合內單條詞條點擊後進入同一套單行編輯頁。
- [x] 基本篩選結果使用與桌面端相同的 filter state。
- [x] URL 查詢參數與桌面端一致：`search`、`view`、`dialect`、`theme`、`status`。
- [x] 手機子頁面不污染列表 URL；返回鍵可正常從子頁返回列表。

驗收：

- [ ] 375px 可切換三種視圖（待手動驗收）。
- [ ] 375px 可按方言、主題、狀態篩選（待手動驗收）。
- [ ] 430px 可切換三種視圖（待手動驗收）。
- [ ] 430px 可按方言、主題、狀態篩選（待手動驗收）。
- [ ] 淺色與暗色模式都通過（待手動驗收）。
- [x] `npm run build` 通過。

### 第一輪完成門檻

第一期 1a/1b/1c 全部完成後，才進入第二期 Grid 體驗打磨。門檻如下：

- [x] 手機端代碼已支援瀏覽、搜尋、切換三種視圖、做基本篩選。
- [x] 手機端代碼已支援新建詞條，並可編輯核心欄位後儲存。
- [x] 手機端不再有阻斷式電腦端提示。
- [ ] 桌面端所有既有表格能力不回退（待手動回歸）。
- [ ] 所有第一輪流程在 375px / 430px、淺色 / 暗色模式下通過（待手動驗收）。
- [x] `npm run build` 通過。
- [x] 未加入 card 相關 UI 或切換入口。

## 下一步

### 第六期收尾：修正待修項、補手動驗收，再決定是否進第七期

第五期 review 問題已修正；第六期主體窄屏代碼已完成，但仍不可直接進入第七期 card 探索。進入第七期前，必須先完成第一至第五期手動驗收、第四期仍未納入完成範圍的項目，以及第六期收尾：

1. 補 AI 語域手機 UI，或明確把 AI 語域移出第四期完成範圍。
2. 明確圖片上傳是否納入手機義項頁；若暫不做，完成定義中不要把圖片列為第四期必過項。
3. 375px 淺色 / 暗色：瀏覽、搜尋、新建、編輯、儲存、取消、三種視圖、基本篩選、返回鍵、高階義項 / 分類 / 詞素 / 參考流程，以及第五期長按多選 / 批量操作 / 規則管理。
4. 430px 淺色 / 暗色：同一套流程。
5. 桌面端回歸：搜尋、排序、視圖切換、進階篩選、行內編輯、批量操作、義項、主題、詞素、參考輔助。
6. 檢查第二期已修復的 grid 版面：狀態欄右側不再有空欄，方言 / 狀態 badge 不超出格線，粵拼長值以省略號截斷。
7. 檢查第三期設定頁：四個 tabs、內建視圖切換、基本篩選、排序欄位 / 方向、密度、首欄固定、欄位顯示、已儲存視圖套用 / 儲存 / 管理。
8. 修正 Header 手機導航抽屜遮罩點擊關閉。
9. 修正 Profile 解除 Google 確認 modal footer 手機堆疊。
10. 更新或修正 `server/utils/agent/__tests__/phase0.test.ts`，讓完整 `npx vitest run` 回到全綠；若該測試屬於 Agent 非第六期範圍，需在驗收記錄中明確標註排除原因。
11. 依第六期路由矩陣檢查 Header、通知、使用者選單、Agent、Docs、Review、Histories、Admin、Profile 與通用 modal。
12. 建議新增 `docs/mobile-global-narrow-verification.md` 記錄截圖、視口、淺色 / 暗色、仍未修項與通過證據。
13. 再跑一次 `npm run build`、完整 `npx vitest run` 與目前相關 Vitest；若新增第五期 / 第六期互動測試，需一併執行。

### 第二期後續工作隊列（不改首頁 UI）

第二期後續繼續推進時，不再改詞條列表首頁 UI。可做工作改為以下非首頁事項：

1. 補手動驗收矩陣：375px / 430px、淺色 / 暗色、返回鍵、桌面回歸、已修復 grid 版面。
2. 補性能量測記錄：大量資料下列表滾動、橫向滑動、進入單行編輯頁的響應時間；先記錄，不改首頁 UI。
3. 強化視圖 / 設定子頁：只可改 `EntriesMobileViewPage.vue` 或未來設定子頁，不改首頁列表呈現。
4. 補狀態持久化與設定邏輯測試：欄位顯示、密度、已儲存視圖套用；測試可覆蓋現有邏輯，不要求改 UI。
5. 整理第二期完成證據：build 結果、手動驗收截圖或記錄、桌面回歸結果、仍未完成事項。

驗收矩陣已拆到 `docs/mobile-entry-list-stage2-verification.md`，後續第二期驗收以該文件補證據，不以修改首頁 UI 作為默認修復方式。

明確暫停：

- 首頁 grid 欄寬、行高、padding、badge、表頭、固定首欄視覺、首頁篩選列、首頁新增 / 儲存入口。
- Card 模式（已順延至第七期）。
- 進階篩選入口與條件規則建立 / 編輯；手機規則啟停 / 刪除已在第五期主線接入，grid 呈現仍作第五期收尾，不混入第二期首頁 UI。

## 完成定義

手機端改造可視為完成，需同時滿足：

- iPhone 寬度可瀏覽、搜尋、篩選詞條。
- iPhone 寬度下，grid 行可進入單行編輯頁。
- iPhone 寬度下，單行頁可直接編輯文字欄位（原地展開），選擇欄位可通過底部彈出層編輯。
- iPhone 寬度下，分類與複雜欄位可通過子頁面編輯。
- iPhone 寬度可新建詞條、編輯核心欄位、儲存、取消、刪除、複製。
- iPhone 寬度可切換視圖，並調整 grid 欄位與密度。
- 手機端能進入釋義、分類、參考、AI 輔助等完整編輯能力。
- 右上角 Agent 輔助工具在 iPhone 寬度下以全屏覆蓋層或手機抽屜使用，不造成主內容壓縮或水平溢出。
- 手機 Header 有可用導航入口，通知、使用者選單、Agent 入口不重疊、不超出 viewport。
- Docs、Review、Histories、Admin、Profile 與通用 modal 在 375px / 430px 下無阻塞級窄屏問題。
- 所有功能在淺色模式與暗色模式下均可正常使用。
- URL 查詢參數在手機端與桌面端之間保持一致。
- 瀏覽器返回鍵在手機端子頁面之間正確運作。
- 旋轉手機或縮放桌面瀏覽器時，界面自動切換，無需手動刷新。
- Card 不屬於完成必要條件，只作第七期最後可選探索。
- 桌面端現有表格能力不回退。
- `npm run build` 通過。
