export default defineNuxtRouteMiddleware(async (to) => {
  const { fetch: fetchSession, loggedIn } = useUserSession()
  await fetchSession()
  if (!loggedIn.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
})
