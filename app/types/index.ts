// Re-export from auth types
export * from './auth'

// Entry types - 根據 PRD 要求設計
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
  /** 主詞頭顯示文本（港式繁體） */
  display: string
  /** 推薦標準寫法（通常等同 display） */
  normalized: string
  /** 是否包含開天窗字 □ */
  isPlaceholder: boolean
  /** 異形／其他詞形列表（不經字形轉換，按用戶輸入儲存） */
  variants?: string[]
}

export interface Dialect {
  name: string
  regionCode?: string
}

export interface Example {
  text: string
  jyutping?: string
  translation?: string
  explanation?: string
  scenario?: string
  source?: 'user_generated' | 'ai_generated' | 'literature' | 'media'
  isFeatured?: boolean
  // 兼容舊格式
  sentence?: string
}

export interface SubSense {
  label: string
  definition: string
  examples?: Example[]
}

export interface Sense {
  definition: string
  label?: string
  examples?: Example[]
  subSenses?: SubSense[]
}

export interface EntryRef {
  type: 'word' | 'section'
  target: string
  url?: string
}

export interface ThemeClassification {
  level1?: string
  level2?: string
  level3?: string
  level1Id?: number
  level2Id?: number
  level3Id?: number
}

export interface EntryMeta {
  category?: string
  pos?: string
  etymology?: string
  register?: Register
  region?: string
  usage?: string
  notes?: string
  [key: string]: any
}

export interface Entry {
  id: string
  _tempId?: string // For new entries before save
  _isNew?: boolean // Flag for new entries
  _isDirty?: boolean // Flag for unsaved changes
  dialect: Dialect
  headword: Headword
  phonetic: Phonetic
  entryType: EntryType
  senses: Sense[]
  refs?: EntryRef[]
  theme: ThemeClassification
  meta: EntryMeta
  status: EntryStatus
  createdBy: string
  updatedBy?: string
  reviewedBy?: string
  reviewedAt?: string
  reviewNotes?: string
  viewCount: number
  likeCount: number
  createdAt: string
  updatedAt: string
  // 兼容舊格式字段
  text?: string
  textNormalized?: string
  region?: string
  themeIdL1?: number
  themeIdL2?: number
  themeIdL3?: number
  definition?: string
  usageNotes?: string
  formalityLevel?: string
  examples?: Example[]
  phoneticNotation?: string
  contributorId?: string
}

// Edit History types
export type EditHistoryAction = 'create' | 'update' | 'delete' | 'status_change'

export interface EditHistory {
  id: string
  entryId: string
  userId: string
  beforeSnapshot: Record<string, unknown>
  afterSnapshot: Record<string, unknown>
  changedFields: string[]
  action: EditHistoryAction
  comment?: string
  createdAt: string
  isReverted: boolean
  revertedAt?: string
  revertedBy?: string
  user?: {
    id: string
    username: string
    displayName?: string
  }
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

// Form types
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

// API Response types
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

// Re-export jyutdict types
export * from './jyutdict'
