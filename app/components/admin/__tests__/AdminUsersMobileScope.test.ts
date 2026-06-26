import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../../../..')
const readSource = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('admin users mobile scope guard', () => {
  const usersPageSource = readSource('app/pages/admin/users.vue')
  const userTableSource = readSource('app/components/admin/UserTable.vue')

  it('keeps the admin users page on a mobile workbench shell with collapsible filters', () => {
    expect(usersPageSource).toContain('md:hidden flex-shrink-0')
    expect(usersPageSource).toContain('mobileFiltersOpen')
    expect(usersPageSource).toContain('hasActiveFilters')
    expect(usersPageSource).toContain('activeFilterSummary')
    expect(usersPageSource).toContain('i-heroicons-funnel')
    expect(usersPageSource).toContain(':aria-label="mobileFiltersOpen ? \'隱藏搜尋篩選\' : \'顯示搜尋篩選\'"')
    expect(usersPageSource).toContain('v-if="mobileFiltersOpen || hasActiveFilters || searchQuery"')
    expect(usersPageSource).toContain('handleFilterChange')
    expect(usersPageSource).toContain('clearFilters')
    expect(usersPageSource).not.toMatch(/sm:hidden|hidden sm:block|sm:flex-row/)
  })

  it('keeps the mobile user list compact with one per-user action menu', () => {
    const mobileListStart = userTableSource.indexOf('class="flex min-h-0 flex-1 flex-col md:hidden"')
    const mobileListSource = userTableSource.slice(mobileListStart)

    expect(mobileListSource).toContain('overflow-y-auto')
    expect(mobileListSource).toContain('aria-label="用戶操作"')
    expect(mobileListSource).toContain(':items="getActionItems(user)"')
    expect(mobileListSource).toContain('grid grid-cols-3')
    expect(mobileListSource).toContain('user.dialectPermissions.slice(0, 2)')
    expect(mobileListSource).not.toContain('@click="emit(\'edit-role\', user)"')
    expect(mobileListSource).not.toContain('@click="emit(\'manage-dialects\', user)"')
    expect(mobileListSource).not.toContain('@click="emit(\'toggle-active\', user)"')
    expect(userTableSource).toContain('hidden overflow-x-auto md:block')
    expect(userTableSource).not.toMatch(/sm:hidden|hidden sm:block/)
  })
})
