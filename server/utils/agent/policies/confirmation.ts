import type { ConfirmationRequest, ToolRisk } from '../core/contracts'

const CONFIRMATION_REQUIRED_RISKS = new Set<ToolRisk>(['draft_write', 'editorial', 'destructive', 'admin'])

export function requiresConfirmation(risk: ToolRisk): boolean {
  return CONFIRMATION_REQUIRED_RISKS.has(risk)
}

export function isExecutableWithoutConfirmation(risk: ToolRisk): boolean {
  return risk === 'safe' || risk === 'local_ui'
}

export function buildConfirmationRequest(input: Omit<ConfirmationRequest, 'id' | 'expiresAt'> & { ttlMs?: number }): ConfirmationRequest {
  return {
    ...input,
    id: crypto.randomUUID(),
    expiresAt: new Date(Date.now() + (input.ttlMs ?? 5 * 60 * 1000)).toISOString()
  }
}

export function confirmationMatches(request: ConfirmationRequest, actorId: string, echo?: string): boolean {
  if (request.actorId !== actorId) return false
  if (!request.requiredEcho) return true
  return echo === request.requiredEcho
}
