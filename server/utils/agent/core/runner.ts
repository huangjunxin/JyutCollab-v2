import type OpenAI from 'openai'
import { getLLMModel, getOpenAIClient } from '../../ai'
import { isExecutableWithoutConfirmation } from '../policies/confirmation'
import type { AgentActor, AgentChannel, AgentToolResult, ToolRisk } from './contracts'
import type { AgentToolRegistry } from './registry'

type AgentChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam

export interface AgentRunnerToolCall {
  name: string
  risk: ToolRisk
  input: unknown
  result: AgentToolResult
}

export interface AgentRunnerResponse {
  content: string
  toolCalls: AgentRunnerToolCall[]
}

export interface RunAgentInput {
  message: string
  route?: string
  actor?: AgentActor
  channel: AgentChannel
  registry: AgentToolRegistry
  maxSteps?: number
  onProgress?: (label: string) => void | Promise<void>
  onTextStart?: () => void | Promise<void>
  onTextDelta?: (delta: string) => void | Promise<void>
  onToolCallDelta?: (delta: { index: number, id?: string, name?: string, argumentsDelta?: string, accumulatedArguments?: string }) => void | Promise<void>
  onToolCallStart?: (toolCall: { id: string, name: string, input: unknown }) => void | Promise<void>
  onToolResult?: (toolCall: AgentRunnerToolCall) => void | Promise<void>
}

function zodObjectToJsonSchema(schema: any): Record<string, unknown> {
  const shape = typeof schema.shape === 'object' ? schema.shape : {}
  const properties: Record<string, unknown> = {}
  const required: string[] = []

  for (const [key, value] of Object.entries<any>(shape)) {
    const json = zodTypeToJsonSchema(value)
    properties[key] = json.schema
    if (json.required) required.push(key)
  }

  return {
    type: 'object',
    properties,
    additionalProperties: false,
    ...(required.length ? { required } : {})
  }
}

function unwrapZodType(schema: any): { schema: any, required: boolean } {
  const typeName = schema?._def?.type
  if (typeName === 'optional') return { schema: schema._def.innerType, required: false }
  if (typeName === 'default') return { schema: schema._def.innerType, required: false }
  if (typeName === 'nullable') return { schema: schema._def.innerType, required: false }
  return { schema, required: true }
}

function zodTypeToJsonSchema(rawSchema: any): { schema: Record<string, unknown>, required: boolean } {
  const { schema, required } = unwrapZodType(rawSchema)
  const def = schema?._def
  const typeName = def?.type

  if (typeName === 'string') return { schema: { type: 'string' }, required }
  if (typeName === 'number') return { schema: { type: 'number' }, required }
  if (typeName === 'boolean') return { schema: { type: 'boolean' }, required }
  if (typeName === 'enum') return { schema: { type: 'string', enum: Object.values(def.entries) }, required }
  if (typeName === 'array') return { schema: { type: 'array', items: zodTypeToJsonSchema(def.element).schema }, required }
  if (typeName === 'object') return { schema: zodObjectToJsonSchema(schema), required }
  return { schema: { type: 'string' }, required }
}

function registryToolsToOpenAITools(registry: AgentToolRegistry): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return registry.list().map(tool => ({
    type: 'function',
    function: {
      name: tool.name.replaceAll('.', '__'),
      description: `${tool.description} Risk: ${tool.risk}.`,
      parameters: zodObjectToJsonSchema(tool.inputSchema)
    }
  }))
}

function fromOpenAIToolName(name: string) {
  return name.replaceAll('__', '.')
}

function safeJsonParse(value: string): unknown {
  try {
    return value ? JSON.parse(value) : {}
  } catch {
    return {}
  }
}

function buildSystemPrompt() {
  return `你是 JyutCollab AI 助手，協助用戶查詢粵語協作詞庫、檢查重複、查看詞條詳情和理解方言資料。

核心規則：
- 你應根據用戶自然語言意圖自主選擇合適工具，不要要求用戶使用固定命令格式。
- 用戶說「找」「查」「搵」「有哪些」「粵拼為」「讀音是」等查詢需求時，應優先調用搜尋或詳情工具。
- 如果用戶指定粵拼，例如「找一下粵拼為 ang1 的詞」，請調用 jyutcollab.search_entries 並填入 jyutping: "ang1"。
- 如果用戶指定詞頭，請填入 headword；如果只是泛查，才使用 query。
- 如果用戶說「分類」「類別」「主題」等，例如「分類 生活」、「有哪些生活類的詞」，請調用 jyutcollab.search_entries 並填入 category: "生活"，不要把「分類」放進 query。
- 只讀工具可以直接調用；寫入、送審、審核、刪除、管理等高風險操作不要自行聲稱已完成，服務端會要求確認。
- 工具返回無結果時，根據結果向用戶簡潔解釋並建議下一步，不要說「不支援」除非真的沒有相關能力。
- 工具返回 entries、dialects、sameDialect 或 otherDialects 等結構化資料時，不要在正文重複列出詞條表格或逐條清單；正文只總結數量、相關性和下一步，具體資料由介面卡片展示。
- 如需引用結果，只提 1–2 個代表例子，不要重建完整 Markdown 表格。
- 回答使用繁體中文，語氣像正式上線產品。不要提 MVP、demo、測試版或內部實作。`
}

function summarizeToolResult(name: string, result: AgentToolResult) {
  return JSON.stringify({
    tool: name,
    ok: result.ok,
    summary: result.summary,
    data: result.data,
    warnings: result.warnings,
    nextAction: result.nextAction,
    presentationInstruction: '如果 data 內有 entries、dialects、sameDialect 或 otherDialects，正文不要重複列出完整表格或清單；只做摘要和下一步建議，讓前端結構化卡片展示具體資料。'
  })
}

export async function runAgent(input: RunAgentInput): Promise<AgentRunnerResponse> {
  const client = getOpenAIClient()
  const tools = registryToolsToOpenAITools(input.registry)
  const toolNameByOpenAIName = new Map(input.registry.list().map(tool => [tool.name.replaceAll('.', '__'), tool.name]))
  const messages: AgentChatMessage[] = [
    { role: 'system', content: buildSystemPrompt() },
    {
      role: 'user',
      content: JSON.stringify({
        message: input.message,
        route: input.route,
        actor: input.actor ? { id: input.actor.id, role: input.actor.role, username: input.actor.username } : undefined
      })
    }
  ]
  const toolCalls: AgentRunnerToolCall[] = []
  const maxSteps = input.maxSteps ?? 4

  for (let step = 0; step < maxSteps; step++) {
    const completion = await client.chat.completions.create({
      model: getLLMModel(),
      messages,
      tools,
      tool_choice: 'auto',
      temperature: 0.1,
      stream: true
    })
    let streamedContent = ''
    let textStarted = false
    const streamedToolCalls = new Map<number, { id: string, name: string, arguments: string }>()

    for await (const chunk of completion) {
      const delta = chunk.choices[0]?.delta
      if (!delta) continue
      if (delta.content) {
        streamedContent += delta.content
        if (!textStarted) {
          textStarted = true
          await input.onTextStart?.()
        }
        await input.onTextDelta?.(delta.content)
      }
      for (const toolCall of delta.tool_calls || []) {
        const index = toolCall.index
        const existing = streamedToolCalls.get(index) || { id: toolCall.id || '', name: '', arguments: '' }
        const next = {
          id: toolCall.id || existing.id,
          name: toolCall.function?.name || existing.name,
          arguments: existing.arguments + (toolCall.function?.arguments || '')
        }
        streamedToolCalls.set(index, next)
        await input.onToolCallDelta?.({
          index,
          id: toolCall.id,
          name: toolCall.function?.name,
          argumentsDelta: toolCall.function?.arguments,
          accumulatedArguments: next.arguments
        })
      }
    }

    const choice = {
      role: 'assistant' as const,
      content: streamedContent || null,
      tool_calls: [...streamedToolCalls.values()].map(call => ({
        id: call.id,
        type: 'function' as const,
        function: { name: call.name, arguments: call.arguments }
      }))
    }
    messages.push(choice)

    if (!choice.tool_calls.length) {
      return {
        content: streamedContent || '我已完成處理。',
        toolCalls
      }
    }

    await input.onProgress?.(`調用 ${choice.tool_calls.map(call => fromOpenAIToolName(call.function.name)).join('、')}`)

    for (const call of choice.tool_calls) {
      if (call.type !== 'function') continue
      const toolInput = safeJsonParse(call.function.arguments)
      await input.onToolCallStart?.({ id: call.id, name: fromOpenAIToolName(call.function.name), input: toolInput })
      const name = toolNameByOpenAIName.get(call.function.name) || fromOpenAIToolName(call.function.name)
      if (!input.registry.has(name)) {
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify({ ok: false, summary: `未知工具：${name}` })
        })
        continue
      }

      const tool = input.registry.get(name)
      if (!isExecutableWithoutConfirmation(tool.risk)) {
        const result: AgentToolResult = {
          ok: false,
          summary: `「${tool.description}」需要先取得明確確認。`,
          warnings: ['高風險工具不可由 LLM 直接執行。'],
          nextAction: '請使用確認流程。'
        }
        toolCalls.push({ name, risk: tool.risk, input: safeJsonParse(call.function.arguments), result })
        await input.onToolResult?.(toolCalls.at(-1)!)
        messages.push({ role: 'tool', tool_call_id: call.id, content: summarizeToolResult(name, result) })
        continue
      }

      const result = await input.registry.execute(name, toolInput, {
        channel: input.channel,
        actor: input.actor
      })
      toolCalls.push({ name, risk: tool.risk, input: toolInput, result })
      await input.onToolResult?.(toolCalls.at(-1)!)
      messages.push({ role: 'tool', tool_call_id: call.id, content: summarizeToolResult(name, result) })
    }
  }

  return {
    content: toolCalls.at(-1)?.result.summary || '我暫時未能完成這個請求，請換個方式再試一次。',
    toolCalls
  }
}
