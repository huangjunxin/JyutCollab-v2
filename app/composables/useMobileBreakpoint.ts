import { ref, onMounted, onUnmounted } from 'vue'

/** Mobile breakpoint threshold in pixels (matches Tailwind `md` breakpoint). */
export const MOBILE_BREAKPOINT = 768

/**
 * Reactive mobile detection using `window.matchMedia`.
 * Updates automatically on viewport resize / orientation change.
 * Cleans up the listener on component unmount.
 *
 * SSR-safe: defaults to `true` (mobile-first) during SSR to avoid
 * a flash of desktop content on mobile devices.
 */
export function useMobileBreakpoint() {
  const isMobile = ref(import.meta.client ? window.innerWidth < MOBILE_BREAKPOINT : true)

  let mql: MediaQueryList | null = null

  function onChange(e: MediaQueryListEvent) {
    isMobile.value = e.matches
  }

  onMounted(() => {
    mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    isMobile.value = mql.matches
    mql.addEventListener('change', onChange)
  })

  onUnmounted(() => {
    mql?.removeEventListener('change', onChange)
    mql = null
  })

  return { isMobile }
}
