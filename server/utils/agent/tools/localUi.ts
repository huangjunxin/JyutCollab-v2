import { z } from 'zod'
import type { AgentToolDefinition } from '../core/contracts'

const NavigateInput = z.object({
  destination: z.enum(['entries', 'review', 'docs', 'home'])
})

const DESTINATIONS: Record<z.infer<typeof NavigateInput>['destination'], { label: string, to: string }> = {
  entries: { label: '前往詞條列表。', to: '/entries' },
  review: { label: '前往審核隊列。', to: '/review' },
  docs: { label: '前往使用指南。', to: '/docs' },
  home: { label: '前往首頁。', to: '/' }
}

export const navigateTool: AgentToolDefinition<z.infer<typeof NavigateInput>, { action: { kind: 'navigate', label: string, to: string } }> = {
  name: 'jyutcollab.navigate',
  description: '在 JyutCollab Web 介面中產生本地導航動作，不修改伺服器資料。',
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

export function createLocalUiTools() {
  return [navigateTool]
}
