/**
 * 詞條表格與篩選共用常數
 */

export const ALL_FILTER_VALUE = '__all__'

export const SORTABLE_COLUMN_KEYS = ['createdAt', 'updatedAt', 'viewCount', 'likeCount', 'headword'] as const

export const DEFINITION_SUMMARY_MAX_LEN = 50

export const MAX_TEXTAREA_HEIGHT_PX = 240

/** 狀態值 → 中文標籤（用於表格顯示） */
export const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  pending_review: '待審核',
  approved: '已發佈',
  rejected: '已拒絕'
}

/** 詞條類型 → 中文標籤 */
export const ENTRY_TYPE_LABELS: Record<string, string> = {
  character: '字',
  word: '詞',
  phrase: '短語'
}
