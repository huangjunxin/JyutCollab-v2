import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  AgentToolNotFoundError,
  AgentToolRegistry,
  checkDuplicateTool,
  confirmationMatches,
  createDefaultAgentToolRegistry,
  listDialectsTool,
  normalizeDialectName,
  redactAgentPayload,
  requiresConfirmation,
  searchEntriesTool,
  type AgentToolDefinition,
  type ConfirmationRequest,
  type ToolRisk
} from '../index'

const risks: ToolRisk[] = ['safe', 'local_ui', 'draft_write', 'editorial', 'destructive', 'admin']

describe('agent tool registry', () => {
  it('registers and lists current JyutCollab agent tools', () => {
    const registry = createDefaultAgentToolRegistry()
    const tools = registry.list()

    expect(tools.map(tool => tool.name)).toEqual([
      'jyutcollab.apply_entry_filters',
      'jyutcollab.check_duplicate',
      'jyutcollab.get_entry_detail',
      'jyutcollab.get_entry_history',
      'jyutcollab.get_page_context',
      'jyutcollab.list_dialects',
      'jyutcollab.navigate',
      'jyutcollab.open_entry',
      'jyutcollab.open_history',
      'jyutcollab.plan_advanced_filter',
      'jyutcollab.prepare_entry_draft',
      'jyutcollab.read_doc',
      'jyutcollab.search_agent_audit',
      'jyutcollab.search_docs',
      'jyutcollab.search_entries',
      'jyutcollab.search_histories',
      'jyutcollab.submit_or_review_entry',
      'jyutcollab.switch_view',
      'jyutcollab.toggle_advanced_filter'
    ])
    expect(tools.filter(tool => tool.risk === 'local_ui').map(tool => tool.name)).toEqual([
      'jyutcollab.apply_entry_filters',
      'jyutcollab.navigate',
      'jyutcollab.open_entry',
      'jyutcollab.open_history',
      'jyutcollab.switch_view',
      'jyutcollab.toggle_advanced_filter'
    ])
    expect(tools.filter(tool => tool.risk !== 'local_ui').every(tool => tool.risk === 'safe')).toBe(true)
  })

  it('rejects unknown tools instead of executing arbitrary names', () => {
    const registry = createDefaultAgentToolRegistry()

    expect(() => registry.get('jyutcollab.delete_everything')).toThrow(AgentToolNotFoundError)
  })

  it('rejects duplicate tool registration', () => {
    const registry = new AgentToolRegistry()
    registry.register(listDialectsTool)

    expect(() => registry.register(listDialectsTool)).toThrow('Agent tool already registered')
  })

  it('validates input before executing a tool', async () => {
    const registry = new AgentToolRegistry()
    const tool: AgentToolDefinition<{ value: string }, { echoed: string }> = {
      name: 'test.echo',
      description: 'Echo input.',
      risk: 'safe',
      inputSchema: z.object({ value: z.string().min(2) }),
      async execute(input) {
        return {
          ok: true,
          data: { echoed: input.value },
          summary: 'ok'
        }
      }
    }
    registry.register(tool)

    const result = await registry.execute('test.echo', { value: 'x' }, { channel: 'web' })

    expect(result.ok).toBe(false)
    expect(result.summary).toBe('工具輸入格式無效。')
    expect(result.warnings?.[0]).toContain('Too small')
  })
})

describe('agent confirmation policy', () => {
  it('requires confirmation for mutating and privileged risks only', () => {
    const results = Object.fromEntries(risks.map(risk => [risk, requiresConfirmation(risk)]))

    expect(results).toEqual({
      safe: false,
      local_ui: false,
      draft_write: true,
      editorial: true,
      destructive: true,
      admin: true
    })
  })

  it('binds confirmation decisions to actor and required echo', () => {
    const request: ConfirmationRequest = {
      id: 'confirmation-1',
      action: 'approve_review_entry',
      risk: 'editorial',
      actorId: 'user-1',
      channel: 'web',
      target: { entryId: 'entry-1', headword: '食飯', label: '食飯 / hongkong' },
      requiredEcho: '食飯',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      summary: '確認審核操作',
      consequences: ['詞條狀態將改變。']
    }

    expect(confirmationMatches(request, 'user-2', '食飯')).toBe(false)
    expect(confirmationMatches(request, 'user-1', '飲茶')).toBe(false)
    expect(confirmationMatches(request, 'user-1', '食飯')).toBe(true)
  })
})

describe('read-only JyutCollab agent tools', () => {
  it('keeps Phase 0 tools safe and read-only', () => {
    expect(listDialectsTool.risk).toBe('safe')
    expect(searchEntriesTool.risk).toBe('safe')
    expect(checkDuplicateTool.risk).toBe('safe')
  })

  it('lists current dialect ids without hard-coded old dialect sets', async () => {
    const result = await listDialectsTool.execute({}, { channel: 'web' })

    expect(result.ok).toBe(true)
    expect(result.summary).toContain('方言點')
    expect((result.data as any).dialects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'hongkong' }),
        expect.objectContaining({ id: 'macau' }),
        expect.objectContaining({ id: 'taishan_taicheng' }),
        expect.objectContaining({ id: 'usa_san_francisco' }),
        expect.objectContaining({ id: 'other' })
      ])
    )
  })

  it('normalizes dialect labels before searching entries', () => {
    expect(normalizeDialectName('容縣')).toBe('rongxian')
    expect(normalizeDialectName('容縣 石頭')).toBe('rongxian_shitou')
    expect(normalizeDialectName('rongxian')).toBe('rongxian')
  })

  it('redacts token-bearing and raw backend fields from tool payloads', () => {
    const redacted = redactAgentPayload({
      id: 'entry-1',
      auth_token: 'SECRET_TOKEN_SHOULD_NOT_LEAK',
      headers: { Authorization: 'Bearer SECRET_TOKEN_SHOULD_NOT_LEAK' },
      raw: { token: 'SECRET_TOKEN_SHOULD_NOT_LEAK' },
      request: { cookie: 'SECRET_TOKEN_SHOULD_NOT_LEAK' },
      nested: {
        passwordHash: 'SECRET_TOKEN_SHOULD_NOT_LEAK',
        Authorization: 'Bearer SECRET_TOKEN_SHOULD_NOT_LEAK',
        safe: 'ok'
      }
    })

    const serialized = JSON.stringify(redacted)
    expect(serialized).toContain('entry-1')
    expect(serialized).toContain('ok')
    expect(serialized).not.toContain('SECRET_TOKEN_SHOULD_NOT_LEAK')
    expect(serialized).not.toContain('headers')
    expect(serialized).not.toContain('raw')
    expect(serialized).not.toContain('request')
    expect(serialized).not.toContain('passwordHash')
    expect(serialized).not.toContain('Authorization')
  })
})
