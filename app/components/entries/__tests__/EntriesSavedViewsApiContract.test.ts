import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../../../..')
const readSource = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('saved views server API contract', () => {
  it('defines a SavedView model with custom id as the public identifier', () => {
    const source = readSource('server/utils/SavedView.ts')

    expect(source).toContain("collection: 'savedviews'")
    expect(source).toMatch(/id:\s*\{[\s\S]*?type:\s*String[\s\S]*?unique:\s*true/)
    expect(source).toMatch(/name:\s*\{[\s\S]*?required:\s*true/)
    expect(source).toMatch(/creatorId:\s*\{[\s\S]*?required:\s*true/)
    expect(source).toMatch(/visibility:\s*\{[\s\S]*?enum:\s*\['public',\s*'private'\][\s\S]*?default:\s*'private'/)
    expect(source).toMatch(/state:\s*\{[\s\S]*?mongoose\.Schema\.Types\.Mixed[\s\S]*?required:\s*true/)
    expect(source).toContain('timestamps: true')
    expect(source).toContain('SavedViewSchema.index({ creatorId: 1 })')
    expect(source).toContain('SavedViewSchema.index({ visibility: 1 })')
    expect(source).toContain('SavedViewSchema.index({ creatorId: 1, visibility: 1 })')
    expect(source).toContain('mongoose.models.SavedView || mongoose.model<ISavedView>')
    expect(source).toMatch(/export interface ISavedView[\s\S]*\b_id:\s*string[\s\S]*\bid:\s*string/)
  })

  it('creates view IDs, validates state, normalizes HK Traditional names, and never trusts client creator IDs', () => {
    const source = readSource('server/api/views/index.post.ts')

    expect(source).toContain('view_${nanoid(12)}')
    expect(source).toContain('convertToHongKongTraditional')
    expect(source).toContain('validateSavedViewState')
    expect(source).toContain('event.context.auth.id')
    expect(source).not.toMatch(/creatorId\s*:\s*(body|data|validated\.data)/)
    expect(source).toContain('SavedView.create')
  })

  it('lists only owned private views and public views for authenticated users', () => {
    const source = readSource('server/api/views/index.get.ts')

    expect(source).toContain('event.context.auth')
    expect(source).toContain('creatorId: userId')
    expect(source).toContain("visibility: 'public'")
    expect(source).toContain('$or')
  })

  it('exposes only public view IDs to unauthenticated callers and omits private creator ids', () => {
    const source = readSource('server/api/views/[id].get.ts')
    const responseSource = readSource('server/api/views/response.ts')

    expect(source).toContain("getRouterParam(event, 'id')")
    expect(source).toContain('SavedView.findOne({ id }')
    expect(source).toContain('getUserSession(event)')
    expect(source).toMatch(/const isPrivateView = view\.visibility !== 'public'/)
    expect(source).toMatch(/if \(isPrivateView && !canAccessPrivateView\)/)
    expect(source).toContain('視圖不存在或已被刪除')
    expect(source).toMatch(/data: isPrivateView \? toSavedViewDto\(view\) : toPublicSavedViewDto\(view\)/)
    expect(responseSource).toContain('export function toPublicSavedViewDto')
    expect(responseSource.match(/toPublicSavedViewDto[\s\S]*?\n}/)?.[0] ?? '').not.toContain('creatorId')
    expect(source).not.toMatch(/_id\s*:/)
    expect(source).not.toMatch(/email|token/i)
  })

  it('requires owner or admin authorization for updates and deletes', () => {
    const putSource = readSource('server/api/views/[id].put.ts')
    const deleteSource = readSource('server/api/views/[id].delete.ts')

    for (const source of [putSource, deleteSource]) {
      expect(source).toContain('event.context.auth.id')
      expect(source).toMatch(/view\.creatorId\s*===\s*userId/)
      expect(source).toMatch(/userRole\s*[!=]==\s*'admin'/)
      expect(source).not.toMatch(/userRole\s*===\s*'reviewer'/)
    }

    expect(putSource).toContain('無權編輯此視圖')
    expect(deleteSource).toContain('無權刪除此視圖')
  })

  it('allows only GET /api/views/:id publicly without making the list endpoint public', () => {
    const source = readSource('server/middleware/auth.ts')

    expect(source).toMatch(/path\.match\(\/\^\\\/api\\\/views\\\/\[\^\/\]\+\$\//)
    expect(source).toContain("method === 'GET'")
    expect(source).not.toContain("path.startsWith('/api/views')")
    expect(source).not.toMatch(/path\s*===\s*['"]\/api\/views['"][\s\S]*?return/)
  })
})
