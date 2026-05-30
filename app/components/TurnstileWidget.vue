<template>
  <div v-if="siteKey" ref="containerRef" class="cf-turnstile-wrapper min-h-[65px] flex justify-center"></div>
</template>

<script setup lang="ts">
/**
 * Cloudflare Turnstile widget — managed mode.
 *
 * Usage: <TurnstileWidget @token="onToken" ref="turnstileRef" />
 * The widget auto-renders on mount. Call turnstileRef.reset() to reset.
 */

const props = defineProps<{
  resetOnError?: boolean
}>()

const emit = defineEmits<{
  token: [token: string]
  error: []
}>()

const containerRef = ref<HTMLElement>()
let widgetId: string | null = null
let scriptLoaded = false

const config = useRuntimeConfig()
const siteKey = config.public.turnstileSiteKey

// Load the Turnstile script once globally
function loadScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve()
  if (document.querySelector('script[src*="turnstile"]')) {
    scriptLoaded = true
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__turnstileOnLoad'
    script.async = true
    script.defer = true
    ;(window as any).__turnstileOnLoad = () => {
      scriptLoaded = true
      resolve()
    }
    document.head.appendChild(script)
  })
}

// Render the widget
function render() {
  if (!containerRef.value || !siteKey) return
  const turnstile = (window as any).turnstile
  if (!turnstile) return

  widgetId = turnstile.render(containerRef.value, {
    sitekey: siteKey,
    theme: 'auto',
    size: 'normal',
    callback: (token: string) => {
      emit('token', token)
    },
    'error-callback': () => {
      emit('error')
    },
    'expired-callback': () => {
      emit('error')
    }
  })
}

// Expose reset method for parent to call on failed submission
function reset() {
  const turnstile = (window as any).turnstile
  if (turnstile && widgetId) {
    turnstile.reset(widgetId)
  }
}

defineExpose({ reset })

onMounted(async () => {
  await loadScript()
  // Small delay to ensure turnstile object is ready
  await nextTick()
  render()
})

onUnmounted(() => {
  const turnstile = (window as any).turnstile
  if (turnstile && widgetId) {
    try { turnstile.remove(widgetId) } catch (_) {}
  }
  widgetId = null
})
</script>
