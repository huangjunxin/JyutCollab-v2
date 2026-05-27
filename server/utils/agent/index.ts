import { AgentToolRegistry } from './core/registry'
import type { AgentToolDefinition } from './core/contracts'
import { createAuditTools } from './tools/auditTools'
import { createDocsTools } from './tools/docsTools'
import { createFilterTools } from './tools/filterTools'
import { createHistoryTools } from './tools/historyTools'
import { createLocalUiTools } from './tools/localUi'
import { createPageContextTools } from './tools/pageContextTools'
import { createReadOnlyJyutCollabTools } from './tools/readOnlyJyutCollab'
import { createWriteWorkflowTools } from './tools/writeWorkflowTools'

export function createDefaultAgentToolRegistry(): AgentToolRegistry {
  const registry = new AgentToolRegistry()
  const allTools: AgentToolDefinition[] = [
    ...createReadOnlyJyutCollabTools(),
    ...createDocsTools(),
    ...createHistoryTools(),
    ...createFilterTools(),
    ...createPageContextTools(),
    ...createAuditTools(),
    ...createWriteWorkflowTools(),
    ...createLocalUiTools()
  ]
  for (const tool of allTools) {
    registry.register(tool)
  }
  return registry
}

export * from './core/contracts'
export * from './core/registry'
export * from './core/runner'
export * from './policies/confirmation'
export * from './tools/auditTools'
export * from './tools/docsTools'
export * from './tools/filterTools'
export * from './tools/historyTools'
export * from './tools/localUi'
export * from './tools/pageContextTools'
export * from './tools/readOnlyJyutCollab'
export * from './tools/serializers'
export * from './tools/writeWorkflowTools'
