import type { ISavedView } from '../../utils/SavedView'

export function toSavedViewDto(view: ISavedView) {
  return {
    id: view.id,
    name: view.name,
    creatorId: view.creatorId,
    creatorName: view.creatorName,
    visibility: view.visibility,
    state: view.state,
    createdAt: view.createdAt,
    updatedAt: view.updatedAt
  }
}

export function toPublicSavedViewDto(view: ISavedView) {
  return {
    id: view.id,
    name: view.name,
    creatorName: view.creatorName,
    visibility: view.visibility,
    state: view.state,
    createdAt: view.createdAt,
    updatedAt: view.updatedAt
  }
}
