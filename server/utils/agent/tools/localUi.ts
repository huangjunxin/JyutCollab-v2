import { z } from 'zod'
import type { AgentToolDefinition } from '../core/contracts'

// --- Navigate tool ---
const NavigateInput = z.object({
  destination: z.enum(['entries', 'review', 'docs', 'home', 'histories'])
})

const DESTINATIONS: Record<z.infer<typeof NavigateInput>['destination'], { label: string, to: string }> = {
  entries: { label: '前往詞條列表。', to: '/entries' },
  review: { label: '前往審核隊列。', to: '/review' },
  docs: { label: '前往使用指南。', to: '/docs' },
  home: { label: '前往首頁。', to: '/' },
  histories: { label: '前往編輯歷史。', to: '/histories' }
}

export const navigateTool: AgentToolDefinition<z.infer<typeof NavigateInput>, { action: { kind: 'navigate', label: string, to: string } }> = {
  name: 'jyutcollab.navigate',
  description: '在 JyutCollab Web 介面中產生本地導航動作，不修改伺服器資料。支援導航到 entries、review、docs、home、histories。',
  risk: 'local_ui',
  inputSchema: NavigateInput,
  async execute(input) {
    const target = DESTINATIONS[input.destination]
    return {
      ok: true,
      data: { action: { kind: 'navigate', ...target } },
      summary: target.label
    }
  }
}

// --- Open entry tool ---
const OpenEntryInput = z.object({
  entryId: z.string().trim().min(1).max(200)
})

export const openEntryTool: AgentToolDefinition<z.infer<typeof OpenEntryInput>> = {
  name: 'jyutcollab.open_entry',
  description: '在前端打開指定詞條的詳情面板或跳轉到詞條位置。',
  risk: 'local_ui',
  inputSchema: OpenEntryInput,
  async execute(input) {
    return {
      ok: true,
      data: {
        action: {
          kind: 'open_entry',
          label: `打開詞條詳情：${input.entryId}`,
          entryId: input.entryId
        }
      },
      summary: `已請求打開詞條 ${input.entryId} 的詳情。`
    }
  }
}

// --- Open history tool ---
const OpenHistoryInput = z.object({
  entryId: z.string().trim().max(200).optional(),
  headword: z.string().trim().max(200).optional()
})

export const openHistoryTool: AgentToolDefinition<z.infer<typeof OpenHistoryInput>> = {
  name: 'jyutcollab.open_history',
  description: '打開編輯歷史頁面，可指定詞條 ID 或詞頭。',
  risk: 'local_ui',
  inputSchema: OpenHistoryInput,
  async execute(input) {
    let to = '/histories'
    const searchParam = input.entryId || input.headword
    if (searchParam) to += `?entryId=${encodeURIComponent(searchParam)}`

    return {
      ok: true,
      data: {
        action: {
          kind: 'navigate',
          label: input.entryId || input.headword
            ? `查看「${input.headword || input.entryId}」的編輯歷史`
            : '前往編輯歷史頁面',
          to
        }
      },
      summary: `已打開編輯歷史頁面${input.headword ? `（${input.headword}）` : ''}。`
    }
  }
}

// --- Toggle advanced filter tool ---
const ToggleAdvancedFilterInput = z.object({
  open: z.boolean().default(true)
})

export const toggleAdvancedFilterTool: AgentToolDefinition<z.infer<typeof ToggleAdvancedFilterInput>> = {
  name: 'jyutcollab.toggle_advanced_filter',
  description: '打開或關閉前端進階篩選面板。',
  risk: 'local_ui',
  inputSchema: ToggleAdvancedFilterInput,
  async execute(input) {
    return {
      ok: true,
      data: {
        action: {
          kind: 'toggle_advanced_filter',
          label: input.open ? '打開進階篩選面板' : '關閉進階篩選面板',
          open: input.open
        }
      },
      summary: input.open ? '已打開進階篩選面板。' : '已關閉進階篩選面板。'
    }
  }
}

// --- Switch view tool ---
const SwitchViewInput = z.object({
  view: z.enum(['flat', 'aggregated', 'lexeme'])
})

const VIEW_LABELS: Record<string, string> = {
  flat: '平鋪視圖',
  aggregated: '詞頭聚合視圖',
  lexeme: '詞語組視圖'
}

export const switchViewTool: AgentToolDefinition<z.infer<typeof SwitchViewInput>> = {
  name: 'jyutcollab.switch_view',
  description: '切換詞條表格的視圖模式。',
  risk: 'local_ui',
  inputSchema: SwitchViewInput,
  async execute(input) {
    return {
      ok: true,
      data: {
        action: {
          kind: 'switch_view',
          label: `切換至${VIEW_LABELS[input.view]}`,
          view: input.view
        }
      },
      summary: `已切換至${VIEW_LABELS[input.view]}。`
    }
  }
}

export function createLocalUiTools() {
  return [navigateTool, openEntryTool, openHistoryTool, toggleAdvancedFilterTool, switchViewTool]
}
