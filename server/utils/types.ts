// User types
export interface User {
  id: string
  email: string
  username: string
  displayName?: string
  avatarUrl?: string
  location?: string
  nativeDialect?: string
  role: 'contributor' | 'reviewer' | 'admin'
  bio?: string
  dialectPermissions: DialectPermission[]
  contributionCount: number
  reviewCount: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface DialectPermission {
  dialectName: string
  role: 'contributor' | 'reviewer'
}

// Entry types - 根據 PRD 要求重新設計
export type Region = 'guangzhou' | 'hongkong' | 'taishan' | 'overseas'
export type EntryStatus = 'draft' | 'pending_review' | 'approved' | 'rejected'
export type EntryType = 'character' | 'word' | 'phrase'
export type Register = '口語' | '書面' | '粗俗' | '文雅' | '中性'

export interface Phonetic {
  original?: string | string[]
  jyutping?: string[]
  toneSandhi?: string[]
}

export interface Headword {
  display: string           // 原書寫法（展示用，港式繁體）
  normalized: string        // 推薦標準寫法（通常等同 display）
  isPlaceholder: boolean    // 是否包含開天窗字 □
  variants?: string[]       // 異形／其他詞形列表（原樣，不經字形轉換）
}

export interface Dialect {
  name: string              // 廣州 | 香港 | 台山 | 海外
  regionCode?: string       // 可選地區代碼
}

export interface Example {
  text: string              // 例句內容
  jyutping?: string         // 例句拼音
  translation?: string      // 翻譯
  explanation?: string      // 解釋
  scenario?: string         // 使用場景
  source?: 'user_generated' | 'ai_generated' | 'literature' | 'media'
  isFeatured?: boolean
}

export interface SubSense {
  label: string             // A, B, C 等
  definition: string
  examples?: Example[]
}

export interface Sense {
  definition: string        // 釋義內容
  label?: string            // 詞性/分類標籤
  examples?: Example[]
  subSenses?: SubSense[]
}

export interface EntryRef {
  type: 'word' | 'section'
  target: string
  url?: string
}

export interface ThemeClassification {
  level1?: string           // 一級分類名
  level2?: string           // 二級分類名
  level3?: string           // 三級分類名
  level1Id?: number
  level2Id?: number
  level3Id?: number
}

export interface EntryMeta {
  category?: string         // 分類
  pos?: string              // 詞性
  etymology?: string        // 詞源
  register?: Register       // 語域
  region?: string           // 地域變體
  usage?: string            // 用法説明
  notes?: string            // 備註
  [key: string]: any        // 允許擴展
}

export interface Entry {
  id: string

  // 方言維度
  dialect: Dialect

  // 詞頭信息
  headword: Headword

  // 標音信息
  phonetic: Phonetic

  // 詞條類型
  entryType: EntryType

  // 釋義（多義項支持）
  senses: Sense[]

  // 參見系統
  refs?: EntryRef[]

  // 分類系統
  theme: ThemeClassification

  // 元數據
  meta: EntryMeta

  // 狀態與審核
  status: EntryStatus

  // 所有權與編輯
  createdBy: string
  updatedBy?: string
  reviewedBy?: string

  // 審核信息
  reviewedAt?: string
  reviewNotes?: string

  // 統計
  viewCount: number
  likeCount: number

  // 時間戳
  createdAt: string
  updatedAt: string
}

// Theme types
export interface Theme {
  id: number
  name: string
  nameEn?: string
  parentId?: number
  level: 1 | 2 | 3
  description?: string
  sortOrder: number
  icon?: string
  color?: string
  isActive: boolean
  expressionCount: number
  children?: Theme[]
}

// Edit History types
export interface EditChange {
  field: string             // 字段路徑 (如 "senses.0.definition")
  oldValue: any
  newValue: any
}

export interface EditHistory {
  id: string
  entryId: string
  editedBy: string
  editedAt: string

  // 變更內容
  changes: EditChange[]

  // 快照（用於完整恢復）
  snapshot?: Entry

  // 變更説明
  comment?: string

  // 是否已撤銷
  isReverted: boolean
  revertedAt?: string
  revertedBy?: string

  // 用户信息
  user?: User
}

// AI Suggestion types
export type SuggestionType = 'theme_classification' | 'definition' | 'example' | 'polish' | 'register'
export type UserAction = 'accepted' | 'rejected' | 'modified' | 'pending'

export interface AISuggestion {
  id: string
  entryId?: string

  // 建議字段
  field: string              // 如 "theme.level3", "senses.0.examples"

  // 建議內容
  suggestion: any

  // AI 信息
  model: string
  prompt?: string

  // 狀態
  status: 'pending' | 'accepted' | 'rejected' | 'expired'

  // 時間戳
  createdAt: string
  acceptedAt?: string
  rejectedAt?: string

  // 用户
  suggestedTo: string
  actionBy?: string
}

// API types
export interface APIResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

// Form types - 簡化版用於表單
export interface EntryFormData {
  headword: {
    display: string
    normalized?: string
  }
  dialect: {
    name: string
  }
  phonetic?: {
    jyutping?: string[]
  }
  entryType?: EntryType
  senses: {
    definition: string
    examples?: Omit<Example, 'source' | 'isFeatured'>[]
  }[]
  theme?: {
    level1Id?: number
    level2Id?: number
    level3Id?: number
  }
  meta?: {
    register?: Register
    usage?: string
    notes?: string
  }
  status?: EntryStatus
}

// Auth types
export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  username: string
  password: string
  displayName?: string
  location?: string
  nativeDialect?: string
  dialect?: string
}

export interface AuthUserDialectPermission {
  dialectName: string
  role: 'contributor' | 'reviewer'
}

export interface AuthUser {
  id: string
  email: string
  username: string
  displayName?: string
  role: 'contributor' | 'reviewer' | 'admin'
  dialectPermissions: AuthUserDialectPermission[]
}

// Search/Filter types
export interface EntryFilters {
  query?: string
  themeLevel1?: string
  themeLevel2?: string
  themeLevel3?: string
  dialectName?: string
  status?: EntryStatus
  entryType?: EntryType
  register?: Register
  createdBy?: string
  sortBy?: 'createdAt' | 'updatedAt' | 'viewCount' | 'likeCount' | 'headword'
  sortOrder?: 'asc' | 'desc'
}

// AI Response types
export interface CategorizationResult {
  level1: string
  level2: string
  level3: string
  level1Id: number
  level2Id: number
  level3Id: number
  explanation: string
  confidence: number
}

export interface DefinitionResult {
  definition: string
  usageNotes: string
  register?: Register
}

export interface ExampleResult {
  text: string
  jyutping?: string
  translation?: string
  scenario?: string
}

export interface PolishResult {
  polished: string
  changes: string[]
}

// 保留舊類型兼容
export type FormalityLevel = 'formal' | 'neutral' | 'informal' | 'slang' | 'vulgar'
export type Frequency = 'common' | 'uncommon' | 'rare' | 'obsolete'
