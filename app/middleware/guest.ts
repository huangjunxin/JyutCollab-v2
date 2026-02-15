export default defineNuxtRouteMiddleware(async () => {
  const { fetch: fetchSession, loggedIn } = useUserSession()
  await fetchSession()
  if (loggedIn.value) {
    return navigateTo('/entries')
  }
})
