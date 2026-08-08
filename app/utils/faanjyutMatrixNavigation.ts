export const FAANJYUT_MATRIX_RETURN_STATE_KEY = 'faanjyutMatrixReturnPath'

function isMatrixPath(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const pathname = value.split(/[?#]/, 1)[0]?.replace(/\/$/, '')
  return pathname === '/faanjyut'
}

export function getFaanjyutMatrixReturnPath(state: unknown): string | null {
  if (!state || typeof state !== 'object') return null
  const historyState = state as Record<string, unknown>
  const storedPath = historyState[FAANJYUT_MATRIX_RETURN_STATE_KEY]
  if (isMatrixPath(storedPath)) return storedPath
  return isMatrixPath(historyState.back) ? historyState.back : null
}
