import { useAuth } from '../composables/useAuth'

export default defineNuxtRouteMiddleware(async () => {
  const { initAuth, isAdmin } = useAuth()
  await initAuth()

  if (!isAdmin.value) {
    return navigateTo('/entries')
  }
})
