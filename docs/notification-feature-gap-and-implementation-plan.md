# 右上角通知功能缺口與實施方案

## 結論

右上角通知鈴鐺不是純裝飾。2026-06-25 複查時，第一階段審核結果通知已大致接通：專用 approve / reject API、`entries/[id].put.ts` 狀態旁路、通知 action URL、Header 刷新與 `/notifications` 死鏈移除都已完成。

目前仍有幾個需要跟進的質量點：通知建立失敗已不會阻斷主流程，但失敗結果未被記錄；`entries/[id].put.ts` 只要收到 `status` 就會當作狀態變更，可能產生重複通知；PUT 旁路拒絕沒有可靠拒絕原因；AI Agent 審核旁路尚未接通知；最小測試仍未補。

## 實施狀態更新（2026-06-25）

已完成：

- [x] `Notification.ts` 的審核通知 action URL 已改為 `/entries?search=${entryId}`。
- [x] 已新增 `getEntryNotificationRecipients()`，只取 `createdBy`、`updatedBy` 去重，並排除本次操作者。
- [x] `server/api/reviews/[id]/approve.post.ts` 已在審核通過後建立 `review_approved` 通知。
- [x] `server/api/reviews/[id]/reject.post.ts` 已在審核拒絕後建立 `review_rejected` 通知，並帶入拒絕原因與 `reviewedBy`。
- [x] `server/api/entries/[id].put.ts` 已補上審核員/管理員直接改為 `approved` / `rejected` 時的通知旁路。
- [x] Header 打開下拉時會刷新通知，已加入 60 秒輪詢、頁面恢復可見刷新，以及 unmount 清理。
- [x] Header 下拉仍只顯示最新 5 條，不提供刪除入口。
- [x] Header 下拉已不再顯示會跳到不存在 `/notifications` 的入口。
- [x] 用 fnm Node/npm 執行 `zsh -ic 'npm run build'` 已通過；只看到既有 chunk size 與 Tailwind sourcemap warning。

仍待修正或補強：

- [ ] 通知建立失敗目前被 `Promise.allSettled()` 隔離，但 rejected result 沒有被記錄；`createNotificationSafely()` 已存在但未被 approve / reject / PUT 旁路使用。
- [ ] `entries/[id].put.ts` 目前只要 body 帶 `status: 'approved' | 'rejected'` 就會建立通知，即使原狀態沒有真的改變。詞條列表保存 payload 會帶 `status`，所以審核員/管理員普通保存已通過或已拒絕詞條時有機會重複通知。
- [ ] PUT 旁路拒絕沒有可靠原因來源：`UpdateEntrySchema` 不接受 `reviewNotes`，拒絕通知只能使用既有 `existingEntry.reviewNotes || ''`，可能是空字串或舊原因。
- [ ] `server/api/agent/chat.post.ts` 的 `reviewEntry()` 也會把待審核詞條改為通過/拒絕，但尚未建立通知。
- [ ] 尚未新增通知相關單元測試或整合測試。

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
- 同一檔案已新增 `createNotificationSafely()` 與 `getEntryNotificationRecipients()`；前者尚未被審核流程實際使用。
- `server/api/notifications/index.get.ts` 可讀取當前用戶通知列表與未讀數。
- `server/api/notifications/[id]/read.put.ts` 可標記單一通知為已讀。
- `server/api/notifications/read-all.put.ts` 可標記當前用戶所有通知為已讀。
- `app/composables/useNotifications.ts` 已封裝前端讀取、標記已讀、全部已讀、圖標與顏色邏輯。
- `app/components/layout/AppHeader.vue` 已把通知鈴鐺接到 `useNotifications()`，並顯示最多 5 條通知。
- `server/api/reviews/[id]/approve.post.ts`、`server/api/reviews/[id]/reject.post.ts` 與 `server/api/entries/[id].put.ts` 已接入審核結果通知。

## 原始缺口與目前狀態

### 1. 通知沒有生產者（第一階段已補）

`Notification.ts` 裏的建立通知 helper 原本沒有被任何業務流程調用。現在第一階段核心生產者已補上：

- `server/api/reviews/[id]/approve.post.ts` 已在審核通過後通知詞條相關用戶。
- `server/api/reviews/[id]/reject.post.ts` 已在審核拒絕後通知詞條相關用戶。
- `server/api/entries/[id].put.ts` 已在審核員或管理員直接把狀態改為 `approved` / `rejected` 時建立通知。

仍保留的範圍外或待補項：

- `server/api/entries/[id]/submit.post.ts` 提交審核後通知審核員仍按產品決策暫緩。
- 草稿提醒與系統公告仍不做。
- `server/api/agent/chat.post.ts` 的 AI Agent 審核旁路尚未建立通知。
- PUT 狀態旁路目前仍需補真實狀態變更判斷、失敗 log 與拒絕原因來源。

### 2. 「查看全部通知」入口與本期範圍不匹配（已修正）

Header 下拉原本有 `to="/notifications"` 的入口，但目前沒有 `app/pages/notifications.vue` 或等價頁面。第一階段已移除/隱藏這個入口，避免提供死鏈。

完整通知頁仍屬未來方案。

### 3. 通知 action URL 目前不可靠（已修正）

原本 helper 生成的 `actionUrl` 是 `/entries?id=${entryId}`，但詞條列表頁主要處理 `search`、`filter`、共享視圖等 query，沒有消化 `id` query 來定位或打開指定詞條。

現在審核通知與草稿提醒 helper 均使用 `/entries?search=${entryId}`，可沿用現有搜尋機制。

### 4. Header 只在掛載時拉取通知（已修正）

`AppHeader.vue` 原本只在 `onMounted()` 時呼叫 `fetchNotifications()`。現在已補：

- 打開鈴鐺時呼叫 `fetchNotifications(1, 20)`。
- 已登入掛載後每 60 秒輪詢一次。
- `visibilitychange` 回到可見時刷新一次。
- `onBeforeUnmount()` 清理 interval、`visibilitychange` listener 與 dropdown 外部點擊 listener。

## 建議優先級

### P0：補齊審核結果通知（大部分已完成）

這是最直接、最符合現有通知類型的價值點。

觸發點：

- [x] 審核通過：在 `server/api/reviews/[id]/approve.post.ts` 成功更新後，通知詞條 loop 內的相關用戶。
- [x] 審核拒絕：在 `server/api/reviews/[id]/reject.post.ts` 成功更新後，通知詞條 loop 內的相關用戶，包含拒絕原因。
- [x] 狀態旁路：在 `server/api/entries/[id].put.ts` 由審核員或管理員把狀態改為 `approved` 或 `rejected` 時，也建立同樣通知，避免繞過專用審核 API。
- [ ] AI Agent 審核旁路：`server/api/agent/chat.post.ts` 的 `reviewEntry()` 尚未建立通知。

注意事項：

- [x] 第一階段的 loop 接收者明確為 `createdBy`、`updatedBy` 去重後的集合，不查 `EditHistory`；未來如果新增留言、訂閱、協作者或 watchlist，再擴展 recipient resolver。
- [x] 如果接收者等於本次審核者 `user.id`，跳過該接收者，避免自己審核自己還收到通知。
- [ ] 通知失敗不要令審核操作失敗這點已做到，但目前沒有記錄 rejected result，需要補 `console.error` 或改用 `createNotificationSafely()`。
- [x] 拒絕通知的 `reviewedBy` metadata 已存 user id；通過通知目前未存 `reviewedBy`。
- [ ] PUT 旁路應只在真實狀態變更時建立通知，避免普通保存造成重複通知。
- [ ] PUT 旁路拒絕需要明確拒絕原因來源，避免空原因或舊原因。

### P1：修正 Header 下拉與刷新（已完成）

- [x] 打開鈴鐺時呼叫 `fetchNotifications(1, 20)`。
- [x] 登入後用 `setInterval` 每 60 秒刷新一次。
- [x] 監聽 `visibilitychange`，頁面從背景回到可見時刷新一次。
- [x] `onBeforeUnmount()` 清理 interval、`visibilitychange` listener、dropdown 外部點擊 listener。
- [x] 移除或隱藏「查看全部通知」入口，直到未來真的做 `/notifications` 頁。
- [x] 右上角下拉維持現有最多 5 條通知的呈現，不新增刪除入口。

### P1：修正通知跳轉（已完成）

建議先把 helper 裏的 action URL 改成可立即工作的格式：

- [x] 審核結果通知：`/entries?search=${entryId}`

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

保留現有 `server/utils/Notification.ts`。目前已新增通用 helper，但審核流程仍直接使用 `createApprovedNotification()` / `createRejectedNotification()` 配合 `Promise.allSettled()`；後續應統一到會記錄錯誤的 helper 或檢查 `allSettled` 結果：

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

- [x] 打開通知下拉時呼叫 `fetchNotifications(1, 20)`，確保未讀數與列表刷新。
- [x] 用 `setInterval` 每 60 秒刷新一次；登出或組件卸載時清理。
- [x] 頁面從背景回到可見時刷新一次，減少用戶切回頁面時看到舊未讀數。
- [x] 移除或隱藏「查看全部通知」入口。
- [x] 右上角下拉維持最多 5 條通知的呈現，不新增刪除入口。
- [x] `onBeforeUnmount()` 應同時移除通知 dropdown 的 document click listener。

### 完整通知頁

第一階段不做完整通知頁。本節作為未來方案保留。

頁面布局建議：

- 頂部：標題「通知」、未讀數、全部已讀按鈕。
- 篩選：全部 / 未讀 segmented control。
- 列表：通知圖標、標題、摘要、時間、未讀標記。
- 底部：分頁或載入更多。

不需要做成行銷式頁面，應保持工具型、可掃描的列表界面。

## 測試與驗收

目前專案沒有固定測試框架要求，但已有 Vitest 設定與部分測試。2026-06-25 已用 fnm Node/npm 執行 `zsh -ic 'npm run build'`，build 通過；尚未新增通知測試。

- [x] 後端：審核通過後建立 `review_approved` 通知給 `createdBy` 與 `updatedBy` 去重後且不包含審核者本人的接收者集合。
- [x] 後端：審核拒絕後建立 `review_rejected` 通知給同一接收者集合，metadata 包含 `entryId`、`headword`、`dialect`、`reviewNotes`、`reviewedBy`。
- [x] 後端：接收者解析不查 `EditHistory`；如果審核者等於其中一個接收者，只排除審核者本人，其他接收者照常收到。
- [ ] 後端：每次詞條從待審核進入通過或拒絕狀態時都建立對應通知。部分完成：專用審核 API 與 PUT 旁路已覆蓋；AI Agent 審核旁路未覆蓋。
- [ ] 後端：通知建立失敗不影響審核 API 成功返回。部分完成：主流程已隔離，但失敗沒有記錄。
- [x] 前端：Header 有未讀通知時顯示 badge，點擊通知會呼叫標記已讀。
- [x] 前端：Header 下拉最多顯示最新 5 條通知，不提供刪除通知功能。
- [x] 前端：Header 打開下拉時刷新，登入後 60 秒輪詢刷新，頁面恢復可見時刷新。
- [x] 前端：不再顯示會跳到不存在 `/notifications` 的入口。
- [x] 路由：通知 action URL 使用 `/entries?search=${entryId}`，能把用戶帶到可找到該詞條的搜尋結果。
- [ ] 測試：尚未新增通知接收者、通知失敗隔離、Header 刷新或重複通知防護測試。

最少回歸命令：

```bash
zsh -ic 'npm run build'
```

如果新增測試，建議：

```bash
npx vitest run
```

## 建議實施順序

1. [x] 修正 `Notification.ts` action URL 為 `/entries?search=${entryId}`。
2. [x] 建立接收者解析函式：只取 `createdBy`、`updatedBy` 去重，並排除本次審核者。
3. [x] 在 approve / reject 專用 API 接入審核結果通知。
4. [x] 在 `entries/[id].put.ts` 補狀態旁路通知。
5. [x] Header 打開下拉時刷新，加入 60 秒輪詢與頁面可見性刷新，並清理 unmount listener。
6. [x] 移除或隱藏「查看全部通知」入口。
7. [ ] 補後端與前端最小測試。
8. [ ] 補通知失敗 log、PUT 真實狀態變更判斷、PUT 拒絕原因來源與 AI Agent 審核旁路通知。
9. [ ] 後續如有需要，再做完整通知頁、提交審核通知審核員、草稿提醒與系統公告。

## 最小可交付版本

若只想先把右上角通知變成有用功能，建議最小版本包含：

- [x] 審核通過通知建立，接收者為詞條 loop 內相關用戶。
- [x] 審核拒絕通知建立，接收者為詞條 loop 內相關用戶，內容包含拒絕原因。
- [x] 詞條 loop 第一階段只包括 `createdBy` 與 `updatedBy`，不追溯歷史編輯者。
- [x] 通知 action URL 能跳到詞條列表搜尋結果。
- [x] Header 打開下拉時刷新，並每 60 秒刷新一次。
- [x] Header 下拉最多顯示最新 5 條，不做刪除。
- [x] 不顯示 `/notifications` 死鏈。
- [ ] 補齊重複通知防護、通知失敗 log、PUT 拒絕原因與 AI Agent 審核旁路後，第一階段才算更穩。

這樣就能覆蓋貢獻者最需要的閉環：提交詞條後，可以從右上角知道審核結果，並直接回到相關詞條。
