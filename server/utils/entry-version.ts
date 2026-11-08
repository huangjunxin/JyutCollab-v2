export const ENTRY_VERSION_CONFLICT_MESSAGE = '此詞條已被他人修改，請刷新後再套用你的修改'

export function entryVersion(entry: unknown): number {
  const version = (entry as { __v?: unknown } | null)?.__v
  return typeof version === 'number' ? version : 0
}

export function isEntryVersionConflict(error: unknown): boolean {
  return (error as { name?: unknown } | null)?.name === 'VersionError'
}
