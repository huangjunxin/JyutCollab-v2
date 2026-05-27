import { AgentToolRegistry } from './core/registry'
import { createLocalUiTools } from './tools/localUi'
import { createReadOnlyJyutCollabTools } from './tools/readOnlyJyutCollab'

export function createDefaultAgentToolRegistry(): AgentToolRegistry {
  const registry = new AgentToolRegistry()
  for (const tool of createReadOnlyJyutCollabTools()) {
    registry.register(tool)
  }
  for (const tool of createLocalUiTools()) {
    registry.register(tool)
  }
  return registry
}

export * from './core/contracts'
export * from './core/registry'
export * from './core/runner'
export * from './policies/confirmation'
export * from './tools/localUi'
export * from './tools/readOnlyJyutCollab'
export * from './tools/serializers'
