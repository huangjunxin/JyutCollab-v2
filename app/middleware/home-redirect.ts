export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/') {
    const { loggedIn } = useUserSession()
    if (!loggedIn.value) {
      return navigateTo('/login')
    }
  }
})
