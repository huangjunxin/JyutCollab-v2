import type { AgentToolDefinition, AgentToolResult } from './contracts'

export class AgentToolNotFoundError extends Error {
  constructor(name: string) {
    super(`Agent tool not found: ${name}`)
    this.name = 'AgentToolNotFoundError'
  }
}

export class AgentToolRegistry {
  private readonly tools = new Map<string, AgentToolDefinition<any, any>>()

  register<Input, Output>(tool: AgentToolDefinition<Input, Output>): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Agent tool already registered: ${tool.name}`)
    }
    this.tools.set(tool.name, tool)
  }

  get<Input = unknown, Output = unknown>(name: string): AgentToolDefinition<Input, Output> {
    const tool = this.tools.get(name)
    if (!tool) throw new AgentToolNotFoundError(name)
    return tool
  }

  has(name: string): boolean {
    return this.tools.has(name)
  }

  list(): AgentToolDefinition<any, any>[] {
    return [...this.tools.values()].sort((a, b) => a.name.localeCompare(b.name))
  }

  async execute(name: string, rawInput: unknown, ctx: Parameters<AgentToolDefinition['execute']>[1]): Promise<AgentToolResult> {
    const tool = this.get(name)
    const parsed = tool.inputSchema.safeParse(rawInput)
    if (!parsed.success) {
      return {
        ok: false,
        summary: '工具輸入格式無效。',
        warnings: parsed.error.issues.map(issue => `${issue.path.join('.') || 'input'}: ${issue.message}`),
        nextAction: '請修正工具輸入後重試。'
      }
    }
    return tool.execute(parsed.data, ctx)
  }
}
