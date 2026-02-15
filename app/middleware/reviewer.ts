import { useAuth } from '../composables/useAuth'

export default defineNuxtRouteMiddleware(async () => {
  const { initAuth, canReview } = useAuth()
  await initAuth()

  if (!canReview.value) {
    return navigateTo('/entries')
  }
})
