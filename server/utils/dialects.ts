/**
 * Server 端方言校驗：與 shared/dialects 保持一致，供註冊等 API 使用。
 */
import { DIALECT_IDS } from '../../shared/dialects'

export const VALID_DIALECTS: string[] = [...DIALECT_IDS]
