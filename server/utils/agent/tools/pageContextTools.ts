import { z } from 'zod'
import type { AgentToolDefinition } from '../core/contracts'

const GetPageContextInput = z.object({})

export const getPageContextTool: AgentToolDefinition<z.infer<typeof GetPageContextInput>> = {
  name: 'jyutcollab.get_page_context',
  description: '獲取用戶當前頁面的上下文資訊，包括所在頁面、篩選條件、選中詞條和可見列表摘要。需要前端傳入 pageContext。',
  risk: 'safe',
  inputSchema: GetPageContextInput,
  async execute(_input, ctx) {
    const pageContext = ctx.pageContext as Record<string, any> | undefined
    if (!pageContext) {
      return {
        ok: true,
        data: { available: false },
        summary: '目前無法取得頁面上下文。請用戶描述當前頁面狀態。',
        nextAction: '請用戶說明他們正在哪個頁面、使用了哪些篩選條件。'
      }
    }

    const parts: string[] = []
    if (pageContext.route) parts.push(`頁面：${pageContext.route}`)
    if (pageContext.filters?.query) parts.push(`搜尋：${pageContext.filters.query}`)
    if (pageContext.filters?.dialect) parts.push(`方言：${pageContext.filters.dialect}`)
    if (pageContext.filters?.status) parts.push(`狀態：${pageContext.filters.status}`)
    if (pageContext.view) parts.push(`視圖：${pageContext.view}`)
    if (pageContext.selectedEntries?.length) parts.push(`選中：${pageContext.selectedEntries.length} 條`)
    if (pageContext.visibleCount !== undefined) parts.push(`可見：${pageContext.visibleCount} 條`)

    return {
      ok: true,
      data: {
        available: true,
        context: pageContext,
        summary: parts.join('；')
      },
      summary: parts.length > 0 ? `當前頁面：${parts.join('；')}` : '頁面上下文為空。',
      nextAction: '基於當前頁面狀態回答用戶問題或建議下一步操作。'
    }
  }
}

export function createPageContextTools() {
  return [getPageContextTool]
}
