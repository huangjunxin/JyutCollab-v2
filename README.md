# JyutCollab v2

粵語多音節詞彙協作平台

## 簡介

JyutCollab v2 是一個網頁應用程式，專為協作式詞典編輯而設計，致力於收錄粵語多音節詞彙。平台支援廣東、廣西、香港、澳門及海外華人社區共 190 多個方言點。

## 功能特點

### 核心功能
- **類 Notion 內聯編輯**——點擊儲存格即可直接編輯，文字區域自動調整高度
- **鍵盤導航**——完整支援鍵盤操作（方向鍵、Enter、Tab、Escape）
- **多視圖詞條顯示**——平面視圖、按詞頭聚合、按詞位分組
- **欄寬調整**——拖曳調整欄寬，設定自動儲存至瀏覽器
- **即時儲存指示器**——視覺化顯示儲存狀態與編輯狀態

### AI 智能功能
- **主題分類**——AI 三層主題自動分類（共 439 個類別）
- **釋義生成**——自動生成香港繁體中文釋義建議
- **例句生成**——生成附帶解釋的情境例句

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
- **深色模式**——完整支援深色主題
- **響應式設計**——支援流動裝置
- **香港繁體中文**——所有文字自動轉換為香港繁體

## 技術棧

| 類別 | 技術 |
|------|------|
| 框架 | Nuxt 4、Vue 3（Composition API） |
| UI | @nuxt/ui、Tailwind CSS、Radix Vue |
| 數據庫 | MongoDB、Mongoose ODM |
| 認證 | nuxt-auth-utils、HttpOnly Cookie |
| AI | OpenRouter API（qwen/qwen3-235b） |
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

### 安裝步驟

1. 複製儲存庫：
```bash
git clone https://github.com/your-username/jyutcollab-v2.git
cd jyutcollab-v2
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

# OpenRouter API 金鑰
OPENROUTER_API_KEY=sk-or-your-api-key

# Cloudinary 設定
NUXT_CLOUDINARY_CLOUD_NAME=your_cloud_name
NUXT_CLOUDINARY_API_KEY=your_api_key
NUXT_CLOUDINARY_API_SECRET=your_api_secret
```

5. 啟動開發伺服器：
```bash
npm run dev
```

應用程式將在 `http://localhost:3100` 運行。

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
│       ├── ai.ts               # AI 服務
│       ├── auth.ts             # 認證工具
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

# 準備 Nuxt
npm run postinstall
```
