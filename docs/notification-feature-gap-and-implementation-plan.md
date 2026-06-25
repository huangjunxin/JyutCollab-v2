# 右上角通知功能缺口與實施方案

## 結論

右上角通知鈴鐺不是純裝飾，但目前只完成了「讀取已有通知」的外殼。在正常業務流程中，系統幾乎不會產生通知，所以用戶看到的效果大多是「暫無通知」。這是一個真實功能缺口，建議按審核回饋通知優先補齊。

## 產品決策紀錄

本節記錄 2026-06-25 已確認的產品取捨，後續開發以此為準。

- 第一階段聚焦右上角通知下拉，不做 `/notifications` 全部通知頁。
- 第一階段必做審核通過與審核拒絕通知。
- 提交審核後通知審核員暫緩，因為目前已有審核專用頁承接待審核工作。
- 審核結果通知需要發給詞條協作 loop 內的人。第一階段的 loop 明確只包括 `createdBy` 與 `updatedBy`，去重後發送；不從 `EditHistory` 追溯所有曾經編輯者。
- 審核員或管理員審核自己的詞條時，不需要通知自己。
- 如果審核者自己也是 `createdBy`，但 `updatedBy` 是另一位用戶，仍然通知該 `updatedBy` 用戶。
- 每次真實審核狀態變更都發通知。例如第一次拒絕發一次，用戶修訂後再次提交並通過時，再發一次通過通知。
- 通知點擊後先跳到 `/entries?search=${entryId}`，沿用現有搜尋能力；暫不做詞條詳情頁或自動打開詳情。
- 通知寫入失敗不能影響審核主流程，審核仍然成功，只記錄通知錯誤。
- 拒絕通知建議直接包含拒絕原因；右上角下拉自然以兩行截斷，完整原因保存在 `metadata.reviewNotes`。
- 右上角下拉第一階段最多顯示最新 5 條通知，沿用現有 UI。
- 第一階段不做刪除通知功能，只做單條已讀與全部已讀。
- 不做草稿提醒。
- 不做系統公告。
- 通知永久保留，暫不設自動清理期限；第一階段雖然只在右上角看到最新幾條，但舊通知仍留在資料庫。

## 依賴選型調研結論

第一階段不引入新的通知基礎設施或大型通知庫。理由是目前需求是已登入用戶的站內持久通知，專案已經有 MongoDB、`Notification` model、通知 API、`useNotifications()` 與 Header 下拉，缺口主要是業務事件接線與輕量刷新。

已調研方向：

- `@nuxt/ui` 已在專案中使用，並提供 toast 能力；適合操作成功/失敗的瞬時提示，不適合替代有未讀數、持久保存、審核結果回看需求的站內通知 inbox。
- Notivue、Vue Toastification、nuxt-toast 等 Vue/Nuxt toast 類庫成熟但主要解決前端浮層提示，不能替代後端通知存儲、接收者解析、未讀狀態與 action URL。
- Novu、Knock、Courier 等通知基礎設施能處理 in-app、email、push、SMS、偏好與工作流，但對第一階段過重，會引入外部服務或自架服務、用戶同步、工作流配置與額外 SDK。
- `web-push`、Socket.IO、SSE 等更偏即時投遞通道。第一階段已決定用 60 秒輪詢、打開下拉刷新與頁面恢復可見刷新，所以不需要 Web Push 權限、service worker、WebSocket/SSE 連線管理或額外部署考慮。
- Python 方案如 Django notifications 或 Celery 與本專案 Nuxt/Nitro/Mongoose 架構不匹配；除非未來整體後端改為 Python 或需要跨服務任務隊列，否則不應加入 Python sidecar。

推薦做法：

- 後端沿用現有 `server/utils/Notification.ts`、MongoDB 與 Nuxt server API，只補接收者解析、action URL、審核事件接線與錯誤隔離。
- 前端沿用現有 Header 下拉與 `useNotifications()`，加上 native `setInterval`、`document.visibilityState`、打開下拉即時刷新；不為兩個瀏覽器 API 額外引入 VueUse。
- 若未來要做跨渠道通知、通知偏好、digest、email/push，才重新評估 Novu 或 Knock 這類通知基礎設施。

## 目前已存在的部分

- `server/utils/Notification.ts` 已有通知資料模型，支援 `review_approved`、`review_rejected`、`draft_reminder`、`system` 四種通知類型。
- 同一檔案已定義 `createApprovedNotification()`、`createRejectedNotification()`、`createDraftReminderNotification()`、`createSystemNotification()` helper。
- `server/api/notifications/index.get.ts` 可讀取當前用戶通知列表與未讀數。
- `server/api/notifications/[id]/read.put.ts` 可標記單一通知為已讀。
- `server/api/notifications/read-all.put.ts` 可標記當前用戶所有通知為已讀。
- `app/composables/useNotifications.ts` 已封裝前端讀取、標記已讀、全部已讀、圖標與顏色邏輯。
- `app/components/layout/AppHeader.vue` 已把通知鈴鐺接到 `useNotifications()`，並顯示最多 5 條通知。

## 已確認的缺口

### 1. 通知沒有生產者

`Notification.ts` 裏的建立通知 helper 目前沒有被任何業務流程調用。審核通過、審核拒絕、提交審核、建立草稿、系統公告等流程都不會寫入 `notifications` collection。

具體例子：

- `server/api/reviews/[id]/approve.post.ts` 只更新詞條狀態、寫入 `EditHistory`，沒有通知詞條建立者。
- `server/api/reviews/[id]/reject.post.ts` 只更新詞條狀態、寫入拒絕原因與 `EditHistory`，沒有通知詞條建立者。
- `server/api/entries/[id]/submit.post.ts` 只把詞條轉為 `pending_review` 並寫入 `EditHistory`，沒有通知有關審核員。
- `server/api/entries/[id].put.ts` 可直接把狀態改為 `approved` 或 `rejected`，但這條旁路也沒有通知。

所以除非資料庫被手動插入通知，否則 Header 鈴鐺正常情況下沒有可顯示內容。

### 2. 「查看全部通知」入口與本期範圍不匹配

Header 下拉底部有 `to="/notifications"` 的入口，但目前沒有 `app/pages/notifications.vue` 或等價頁面。當通知真的存在時，用戶點「查看全部通知」會進入不存在的頁面。

因為第一階段已確認不做完整通知頁，所以應在本期移除或隱藏這個入口，避免提供死鏈。

### 3. 通知 action URL 目前不可靠

現有 helper 生成的 `actionUrl` 是 `/entries?id=${entryId}`，但詞條列表頁目前主要處理 `search`、`filter`、共享視圖等 query，沒有消化 `id` query 來定位或打開指定詞條。

第一階段直接把通知 action URL 改為 `/entries?search=${entryId}`，沿用現有搜尋機制即可。

### 4. Header 只在掛載時拉取通知

`AppHeader.vue` 只在 `onMounted()` 時呼叫 `fetchNotifications()`。即使日後後端開始產生通知，已登入用戶在同一個 session 內不一定會即時看到未讀數更新。

建議第一階段使用簡單輪詢：登入後每 60 秒刷新一次通知，打開鈴鐺時立即刷新一次，頁面重新變為可見時再刷新一次。這比 SSE 或 WebSocket 簡單，足夠支撐目前的通知量。

## 建議優先級

### P0：補齊審核結果通知

這是最直接、最符合現有通知類型的價值點。

觸發點：

- 審核通過：在 `server/api/reviews/[id]/approve.post.ts` 成功更新後，通知詞條 loop 內的相關用戶。
- 審核拒絕：在 `server/api/reviews/[id]/reject.post.ts` 成功更新後，通知詞條 loop 內的相關用戶，包含拒絕原因。
- 狀態旁路：在 `server/api/entries/[id].put.ts` 由審核員或管理員把狀態改為 `approved` 或 `rejected` 時，也應建立同樣通知，避免繞過專用審核 API。

注意事項：

- 第一階段的 loop 接收者明確為 `createdBy`、`updatedBy` 去重後的集合，不查 `EditHistory`；未來如果新增留言、訂閱、協作者或 watchlist，再擴展 recipient resolver。
- 如果接收者等於本次審核者 `user.id`，跳過該接收者，避免自己審核自己還收到通知。
- 建議通知失敗不要令審核操作失敗；可捕捉錯誤並記錄 `console.error`。
- `reviewedBy` metadata 建議存 user id，顯示層如需名稱再額外查詢或冗餘保存 username。

### P1：修正 Header 下拉與刷新

- 打開鈴鐺時呼叫 `fetchNotifications(1, 20)`。
- 登入後用 `setInterval` 每 60 秒刷新一次。
- 監聽 `visibilitychange`，頁面從背景回到可見時刷新一次。
- `onBeforeUnmount()` 清理 interval、`visibilitychange` listener、dropdown 外部點擊 listener。
- 移除或隱藏「查看全部通知」入口，直到未來真的做 `/notifications` 頁。
- 右上角下拉維持現有最多 5 條通知的呈現，不新增刪除入口。

### P1：修正通知跳轉

建議先把 helper 裏的 action URL 改成可立即工作的格式：

- 審核結果通知：`/entries?search=${entryId}`

之後若要更精準，可新增 `entryId` query 並在詞條頁自動打開詳情或定位行。

### P2：提交審核通知審核員暫緩

雖然提交審核後通知審核員有產品價值，但第一階段暫緩，原因是審核員已經有審核專用頁承接待處理隊列。後續若要做，再定義接收者規則，例如只通知有該方言點 reviewer 權限的人與管理員。

### P2：草稿提醒

現有 `draft_reminder` 類型尚未有觸發規則，第一階段不做。可以保留資料模型類型，避免現在增加排程、通知噪音與額外 UI。

若未來重新啟用，可再討論以下規則：

- 草稿建立後 7 天仍未提交。
- 被拒絕後 7 天未修改或未重新提交。
- 每位用戶每天最多 1 條草稿提醒摘要，避免通知噪音。

### P3：即時性與通知偏好

第一期用 60 秒輪詢、打開下拉時刷新、頁面恢復可見時刷新即可。之後再考慮：

- SSE 推送未讀數。
- 用戶通知偏好，例如只收審核結果、不收草稿提醒。

## 建議後端設計

### 通知服務層

保留現有 `server/utils/Notification.ts`，但建議新增通用 helper，避免不同流程重複處理錯誤與去重：

```ts
async function createNotificationSafely(payload) {
  try {
    return await Notification.create(payload)
  } catch (error) {
    console.error('[Notification]', error)
    return null
  }
}
```

如果要防止重複通知，可加入 `dedupeKey` 欄位或用 metadata 組合查詢，例如 `type + userId + entryId + reviewedAt`。第一期可暫不加，因為審核 API 已有狀態並發保護。

### 審核結果通知接線

先建立接收者解析函式，避免 approve、reject、狀態旁路三處重複處理：

```ts
function getEntryNotificationRecipients(entry, actorUserId: string) {
  return [...new Set([entry.createdBy, entry.updatedBy].filter(Boolean))]
    .filter(userId => userId !== actorUserId)
}
```

審核通過後：

```ts
await Promise.allSettled(
  getEntryNotificationRecipients(updatedEntry, user.id).map(userId =>
    createApprovedNotification(
      userId,
      updatedEntry.id,
      updatedEntry.headword?.display || '',
      updatedEntry.dialect?.name || ''
    )
  )
)
```

審核拒絕後：

```ts
await Promise.allSettled(
  getEntryNotificationRecipients(updatedEntry, user.id).map(userId =>
    createRejectedNotification(
      userId,
      updatedEntry.id,
      updatedEntry.headword?.display || '',
      updatedEntry.dialect?.name || '',
      validated.data.reason,
      user.id
    )
  )
)
```

實作時建議用 `Promise.allSettled()` 或 `try/catch` 包住通知建立，避免通知資料庫問題影響審核主流程。拒絕通知的 message 可包含完整拒絕原因，Header 下拉用現有 `line-clamp-2` 自然截斷即可。

### 系統公告通知

現有 helper 只支援單一 `userId`。若要做全站公告，應新增管理員 API：

- `POST /api/admin/notifications/system`
- body：`title`、`message`、`actionUrl?`、`audience`
- audience 可先支援 `all`、`role`、指定 `userIds`

這不是修復右上角缺口的必要項，第一階段不做。

## 建議前端設計

### Header 下拉

短期修正：

- 打開通知下拉時呼叫 `fetchNotifications(1, 20)`，確保未讀數與列表刷新。
- 用 `setInterval` 每 60 秒刷新一次；登出或組件卸載時清理。
- 頁面從背景回到可見時刷新一次，減少用戶切回頁面時看到舊未讀數。
- 移除或隱藏「查看全部通知」入口。
- 右上角下拉維持最多 5 條通知的呈現，不新增刪除入口。
- `onBeforeUnmount()` 應同時移除通知 dropdown 的 document click listener。

### 完整通知頁

第一階段不做完整通知頁。本節作為未來方案保留。

頁面布局建議：

- 頂部：標題「通知」、未讀數、全部已讀按鈕。
- 篩選：全部 / 未讀 segmented control。
- 列表：通知圖標、標題、摘要、時間、未讀標記。
- 底部：分頁或載入更多。

不需要做成行銷式頁面，應保持工具型、可掃描的列表界面。

## 測試與驗收

目前專案沒有固定測試框架要求，但已有 Vitest 設定與部分測試。建議新增以下驗收：

- 後端：審核通過後建立 `review_approved` 通知給 `createdBy` 與 `updatedBy` 去重後且不包含審核者本人的接收者集合。
- 後端：審核拒絕後建立 `review_rejected` 通知給同一接收者集合，metadata 包含 `entryId`、`headword`、`dialect`、`reviewNotes`、`reviewedBy`。
- 後端：接收者解析不查 `EditHistory`；如果審核者等於其中一個接收者，只排除審核者本人，其他接收者照常收到。
- 後端：每次詞條從待審核進入通過或拒絕狀態時都建立對應通知。
- 後端：通知建立失敗不影響審核 API 成功返回。
- 前端：Header 有未讀通知時顯示 badge，點擊通知會呼叫標記已讀。
- 前端：Header 下拉最多顯示最新 5 條通知，不提供刪除通知功能。
- 前端：Header 打開下拉時刷新，登入後 60 秒輪詢刷新，頁面恢復可見時刷新。
- 前端：不再顯示會跳到不存在 `/notifications` 的入口。
- 路由：通知 action URL 使用 `/entries?search=${entryId}`，能把用戶帶到可找到該詞條的搜尋結果。

最少回歸命令：

```bash
npm run build
```

如果新增測試，建議：

```bash
npx vitest run
```

## 建議實施順序

1. 修正 `Notification.ts` action URL 為 `/entries?search=${entryId}`。
2. 建立接收者解析函式：只取 `createdBy`、`updatedBy` 去重，並排除本次審核者。
3. 在 approve / reject 專用 API 接入審核結果通知。
4. 在 `entries/[id].put.ts` 補狀態旁路通知。
5. Header 打開下拉時刷新，加入 60 秒輪詢與頁面可見性刷新，並清理 unmount listener。
6. 移除或隱藏「查看全部通知」入口。
7. 補後端與前端最小測試。
8. 後續如有需要，再做完整通知頁、提交審核通知審核員、草稿提醒與系統公告。

## 最小可交付版本

若只想先把右上角通知變成有用功能，建議最小版本包含：

- 審核通過通知建立，接收者為詞條 loop 內相關用戶。
- 審核拒絕通知建立，接收者為詞條 loop 內相關用戶，內容包含拒絕原因。
- 詞條 loop 第一階段只包括 `createdBy` 與 `updatedBy`，不追溯歷史編輯者。
- 通知 action URL 能跳到詞條列表搜尋結果。
- Header 打開下拉時刷新，並每 60 秒刷新一次。
- Header 下拉最多顯示最新 5 條，不做刪除。
- 不顯示 `/notifications` 死鏈。

這樣就能覆蓋貢獻者最需要的閉環：提交詞條後，可以從右上角知道審核結果，並直接回到相關詞條。
