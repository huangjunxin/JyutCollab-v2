import { defineStore } from 'pinia'

export const useSidebarStore = defineStore('sidebar', {
  state: () => ({
    collapsed: false
  }),

  getters: {
    width: (state) => state.collapsed ? 'w-0' : 'w-72',
    isOpen: (state) => !state.collapsed,
    isCollapsed: (state) => state.collapsed
  },

  actions: {
    toggle() {
      this.collapsed = !this.collapsed
      if (import.meta.client) {
        localStorage.setItem('sidebar-collapsed', String(this.collapsed))
      }
    },
    init() {
      if (import.meta.client) {
        const saved = localStorage.getItem('sidebar-collapsed')
        if (saved !== null) {
          this.collapsed = saved === 'true'
        }
      }
    }
  }
})
