# JyutCollab v2

粵方言詞語編纂協作平台

## 簡介

JyutCollab v2 是一個網頁應用程式，專為協作式詞典編輯而設計，致力於收錄粵方言詞語。平台支援廣東、廣西、香港、澳門及海外華人社區共 190 多個方言點。

## 功能特點

### 核心功能
- **類 Notion 內聯編輯**——點擊儲存格即可直接編輯，文字區域自動調整高度
- **鍵盤導航**——完整支援鍵盤操作（方向鍵、Enter、Tab、Escape）
- **多視圖詞條顯示**——平面視圖、按詞頭聚合、按詞位分組
- **欄寬調整**——拖曳調整欄寬，設定自動儲存至瀏覽器
- **即時儲存指示器**——視覺化顯示儲存狀態與編輯狀態

### AI 智能功能
- **主題分類（3 候選）**——AI 提供 3 個候選分類結果，附排名（🥇🥈🥉）與信心度，由人選擇最合適者
- **釋義生成**——自動生成香港繁體中文釋義建議
- **例句生成**——生成附帶解釋的情境例句，支援自動生成例句粵拼（逐字查泛粵典）
- **語域建議**——AI 自動判斷語域（口語、書面、粗俗、文雅、中性）
- **全站 AI 助手**——右側常駐面板可回答使用指南問題、查詢詞條、套用詞條表格篩選及切換視圖
- **對話歷史與審計**——保存 AI 對話、工具調用摘要、確認流程與審計事件，方便追蹤 AI 輔助操作
- **建議成效追蹤**——記錄 AI 建議的採納、拒絕、接受後修改、忽略與待處理狀態，計算參與率與接受率

### 儀表板與分析
- **全站統計**——顯示詞條總量、發佈狀態與審核狀態
- **貢獻者活躍度**——統計實際貢獻者、近 7 天活躍人數與近期貢獻數
- **方言覆蓋率**——追蹤已覆蓋方言點及詞條最多的方言
- **AI 輔助成效**——供審核者檢視 AI 建議接受率、拒絕率與修改率
- **活動時間軸**——顯示個人及全站最近編輯活動

### 詞典管理
- **190 多個方言點**——涵蓋珠江三角洲、五邑、廣西及海外地區
- **跨方言關聯**——透過詞位 ID 連結不同方言的詞條
- **語素參照**——連結詞條至字元級別資料
- **重複偵測**——建立詞條時即時檢查重複

### 審核流程
- **狀態管理**——草稿 → 待審核 → 已通過／已拒絕
- **角色權限**——貢獻者、審核者、管理員三種角色
- **方言權限**——精細的方言級別存取控制
- **審核佇列**——審核者專用的審核介面

### 歷史與稽核
- **完整編輯歷史**——記錄所有變更的前後快照
- **差異檢視器**——統一差異與並排比較兩種檢視模式
- **還原功能**——一鍵還原至歷史狀態
- **操作時間軸**——按時間順序檢視所有變更

### 其他功能
- **圖片上傳**——整合 Cloudinary，支援 HEIC 格式及自動優化
- **稀有漢字顯示**——支援為詞頭、審核與歷史頁載入稀有字體子集
- **深色模式**——完整支援深色主題
- **響應式設計**——支援流動裝置
- **香港繁體中文**——所有文字自動轉換為香港繁體
- **Google OAuth 登錄**——支援 Google 帳號登錄、帳號連結／解除連結、新用戶方言設定
- **Cloudflare Turnstile**——登錄／註冊頁面人機驗證防護

## 技術棧

| 類別 | 技術 |
|------|------|
| 框架 | Nuxt 4、Vue 3（Composition API） |
| UI | @nuxt/ui、Tailwind CSS、Radix Vue |
| 數據庫 | MongoDB、Mongoose ODM |
| 認證 | nuxt-auth-utils、HttpOnly Cookie、Google OAuth、Cloudflare Turnstile |
| AI | OpenRouter API（deepseek-v4-flash，可透過 `OPENROUTER_MODEL` 調整） |
| 狀態管理 | Pinia |
| 驗證 | Zod |
| 圖片儲存 | Cloudinary |
| 文字處理 | opencc-js |

## 快速開始

### 系統需求
- Node.js 18 或以上版本
- MongoDB（本機或 Atlas）
- OpenRouter API 金鑰（AI 功能所需）
- Cloudinary 帳戶（圖片上傳所需）
- Google OAuth 憑證（Google 登錄所需，可選）
- Cloudflare Turnstile 金鑰（人機驗證防護，可選）

### 安裝步驟

1. 複製儲存庫：
```bash
git clone https://github.com/huangjunxin/JyutCollab-v2.git
cd JyutCollab-v2
```

2. 安裝依賴項目：
```bash
npm install
```

3. 設定環境變數：
```bash
cp .env.example .env
```

4. 編輯 `.env` 檔案：
```bash
# MongoDB 連線
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/jyutcollab

# Session 密鑰（至少 32 個字元）
NUXT_SESSION_PASSWORD=your-session-password-at-least-32-chars-long

# OpenRouter API 金鑰與模型
OPENROUTER_API_KEY=sk-or-your-api-key
OPENROUTER_MODEL=deepseek-v4-flash

# Cloudinary 設定
NUXT_CLOUDINARY_CLOUD_NAME=your_cloud_name
NUXT_CLOUDINARY_API_KEY=your_api_key
NUXT_CLOUDINARY_API_SECRET=your_api_secret

# Google OAuth（可選）
NUXT_OAUTH_GOOGLE_CLIENT_ID=your-google-client-id
NUXT_OAUTH_GOOGLE_CLIENT_SECRET=your-google-client-secret

# Cloudflare Turnstile（可選）
NUXT_TURNSTILE_SITE_KEY=your-turnstile-site-key
NUXT_TURNSTILE_SECRET_KEY=your-turnstile-secret-key
```

5. 啟動開發伺服器：
```bash
npm run dev
```

應用程式將在 `http://localhost:3100` 運行。

## 稀有漢字字體子集

詞頭、審核佇列及編輯歷史會載入 `public/fonts/` 內的稀有漢字字體子集，以支援部分系統字體缺字的粵方言用字。

如果資料庫日後新增更多擴展區漢字，可重新生成字體子集：

```bash
npm run generate:headword-font
```

此指令會掃描資料庫中實際出現的詞頭與異形詞，重新產生 `public/fonts/jyutcollab-headword-rare-*.woff2` 及對應 CSS。只會打包實際用到的字，避免載入完整 CJK 字體造成前端體積過大。

## 專案結構

```
JyutCollab-v2/
├── app/                          # 前端應用程式
│   ├── components/               # Vue 元件
│   │   ├── entries/             # 詞條相關元件
│   │   ├── layout/              # 佈局元件
│   │   ├── auth/                # 認證元件
│   │   ├── review/              # 審核元件
│   │   └── history/             # 歷史元件
│   ├── composables/             # 可重用的組合式函數
│   ├── middleware/              # 路由中介軟體
│   ├── pages/                   # 檔案式路由
│   ├── stores/                  # Pinia 狀態儲存
│   ├── types/                   # TypeScript 型別定義
│   └── utils/                   # 前端工具函數
├── server/                       # 後端伺服器
│   ├── api/                     # REST API 端點
│   │   ├── auth/               # 認證路由
│   │   ├── entries/            # 詞條 CRUD 操作
│   │   ├── reviews/            # 審核流程
│   │   ├── histories/          # 編輯歷史
│   │   ├── ai/                 # AI 整合
│   │   ├── agent/              # 全站 AI 助手對話、工具與審計
│   │   ├── stats/              # 統計數據
│   │   ├── upload/             # 檔案上傳
│   │   ├── lexemes/            # 詞位管理
│   │   ├── jyutdict/           # 粵典整合
│   │   └── jyutjyu/            # 粵語整合
│   ├── middleware/              # 伺服器中介軟體
│   └── utils/                   # 伺服器工具函數
│       ├── Entry.ts            # 詞條模型
│       ├── User.ts             # 用戶模型
│       ├── Theme.ts            # 主題模型
│       ├── EditHistory.ts      # 歷史模型
│       ├── AISuggestion.ts     # AI 建議成效記錄
│       ├── SavedView.ts        # 已儲存視圖模型
│       ├── Lexeme.ts           # 詞位分組模型
│       ├── ExternalEtymon.ts   # 外部詞源參照模型
│       ├── Notification.ts     # 通知模型
│       ├── AgentConversation.ts # AI 助手對話模型
│       ├── AgentMessage.ts     # AI 助手訊息模型
│       ├── AgentAuditEvent.ts  # AI 助手審計事件模型
│       ├── ai.ts               # AI 服務
│       ├── auth.ts             # 認證工具
│       ├── cloudinary.ts       # 圖片上傳工具
│       ├── db.ts               # 數據庫連線
│       └── textConversion.ts   # 中文文字轉換
├── shared/                       # 共用程式碼
│   └── dialects.ts              # 方言定義
└── public/                       # 靜態資源
```

## API 端點

### 認證
| 方法 | 端點 | 說明 |
|------|------|------|
| POST | /api/auth/register | 註冊新用戶 |
| POST | /api/auth/login | 用戶登入 |
| POST | /api/auth/logout | 用戶登出 |
| GET | /api/auth/me | 取得當前用戶資料 |
| PATCH | /api/auth/me | 更新個人資料 |
| GET | /api/auth/google | Google OAuth 登錄 |
| POST | /api/auth/setup | 新用戶設定方言點 |
| POST | /api/auth/me/unlink-google | 解除 Google 帳號連結 |

### 詞條
| 方法 | 端點 | 說明 |
|------|------|------|
| GET | /api/entries | 詞條列表（分頁、篩選） |
| POST | /api/entries | 建立詞條 |
| GET | /api/entries/:id | 取得單一詞條 |
| PUT | /api/entries/:id | 更新詞條 |
| DELETE | /api/entries/:id | 刪除詞條 |
| POST | /api/entries/:id/submit | 提交審核 |
| GET | /api/entries/check-duplicate | 檢查重複 |

### 審核
| 方法 | 端點 | 說明 |
|------|------|------|
| GET | /api/reviews | 取得審核佇列 |
| POST | /api/reviews/:id/approve | 通過詞條 |
| POST | /api/reviews/:id/reject | 拒絕詞條 |

### AI
| 方法 | 端點 | 說明 |
|------|------|------|
| POST | /api/ai/categorize | 主題分類 |
| POST | /api/ai/definitions | 生成釋義 |
| POST | /api/ai/examples | 生成例句 |
| POST | /api/ai/register | 語域建議 |
| POST | /api/ai/suggestions/:id/action | 記錄 AI 建議採納、拒絕、修改或忽略 |
| POST | /api/agent/chat | AI 助手非串流對話與確認回覆 |
| POST | /api/agent/chat.stream | AI 助手串流對話、工具調用與本地頁面操作 |
| GET | /api/agent/conversations | 取得 AI 助手對話列表 |
| POST | /api/agent/conversations | 建立 AI 助手對話 |
| GET | /api/agent/conversations/:id | 取得單一 AI 助手對話 |
| GET | /api/agent/conversations/:id/messages | 取得 AI 助手對話訊息 |
| POST | /api/agent/conversations/:id/archive | 封存 AI 助手對話 |
| GET | /api/agent/audit-events | 查詢 AI 助手審計事件 |

### 統計與儀表板
| 方法 | 端點 | 說明 |
|------|------|------|
| GET | /api/stats | 全站詞條與貢獻者統計 |
| GET | /api/stats/mine | 我的詞條統計 |
| GET | /api/stats/mine/enhanced | 我的進階貢獻統計 |
| GET | /api/stats/reviewer | 審核者統計 |
| GET | /api/stats/reviewer/enhanced | 審核進度與效率統計 |
| GET | /api/stats/ai-suggestions | AI 建議成效統計 |
| GET | /api/stats/dialects | 方言覆蓋統計 |

### 歷史、視圖與通知
| 方法 | 端點 | 說明 |
|------|------|------|
| GET | /api/histories | 編輯歷史列表 |
| GET | /api/histories/:entryId | 單一詞條編輯歷史 |
| POST | /api/histories/:id/revert | 還原歷史版本 |
| GET | /api/views | 已儲存視圖列表 |
| POST | /api/views | 建立已儲存視圖 |
| GET | /api/views/:id | 取得已儲存視圖 |
| PUT | /api/views/:id | 更新已儲存視圖 |
| DELETE | /api/views/:id | 刪除已儲存視圖 |
| GET | /api/notifications | 通知列表 |
| PUT | /api/notifications/:id/read | 標記單一通知為已讀 |
| PUT | /api/notifications/read-all | 標記所有通知為已讀 |

### 其他整合
| 方法 | 端點 | 說明 |
|------|------|------|
| POST | /api/upload/image | 上傳釋義配圖 |
| GET | /api/entries/search-morphemes | 搜尋語素參照 |
| PATCH | /api/entries/:id/lexeme | 更新詞位關聯 |
| GET | /api/lexemes/:lexemeId/external-etymons | 取得外部詞源參照 |
| POST | /api/lexemes/:lexemeId/external-etymons | 新增外部詞源參照 |
| PUT | /api/external-etymons/:id | 更新外部詞源參照 |
| DELETE | /api/external-etymons/:id | 刪除外部詞源參照 |
| GET | /api/jyutdict/general | 查詢粵典 general 資料 |
| GET | /api/jyutdict/sheet | 查詢粵典 sheet 資料 |
| GET | /api/jyutjyu/search | 搜尋粵語資料 |

## 用戶角色

| 角色 | 權限 |
|------|------|
| 貢獻者 | 在獲授權的方言範圍內建立／編輯詞條 |
| 審核者 | 貢獻者所有權限＋審核詞條 |
| 管理員 | 完整存取所有功能 |

## 方言覆蓋範圍

平台支援 190 多個方言點，按地區分佈如下：

- **珠江三角洲**——廣州、佛山、東莞等
- **五邑地區**——台山、開平、恩平等
- **粵西地區**——湛江、茂名等
- **廣西東部**——南寧、梧州等
- **廣西南部**——北海、欽州等
- **香港**
- **澳門**
- **海外**——美洲、澳洲、英國、東南亞

## 開發文件

詳細開發文件請參閱 [CLAUDE.md](./CLAUDE.md)。

## 開發命令

```bash
# 開發伺服器
npm run dev

# 生產環境建置
npm run build

# 預覽生產建置
npm run preview

# 生成詞頭稀有字體子集
npm run generate:headword-font

# 準備 Nuxt
npm run postinstall
```
