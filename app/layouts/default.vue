<template>
  <div class="jc-paper-shell flex h-screen overflow-hidden">
    <div class="flex min-w-0 flex-1 flex-col">
      <LayoutAppHeader />
      <main class="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
        <slot />
      </main>
    </div>

    <!-- Desktop: sidebar panel -->
    <Transition v-if="!isMobile" name="agent-slide">
      <AgentPanel v-if="agentOpen" class="w-[420px] shrink-0" />
    </Transition>

    <!-- Mobile: full-screen overlay -->
    <Transition v-else name="agent-fade">
      <div
        v-if="agentOpen"
        class="fixed inset-0 z-[60] flex flex-col bg-white dark:bg-slate-900"
        :style="{ height: '100dvh', minHeight: '100vh' }"
      >
        <AgentPanel class="flex-1 min-h-0" />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { useAgentChat } from '../composables/useAgentChat'
import { useMobileBreakpoint } from '../composables/useMobileBreakpoint'

const { open: agentOpen } = useAgentChat()
const { isMobile } = useMobileBreakpoint()
</script>

<style scoped>
.agent-slide-enter-active,
.agent-slide-leave-active {
  transition: width 0.2s ease, opacity 0.2s ease, min-width 0.2s ease;
}
.agent-slide-enter-from,
.agent-slide-leave-to {
  width: 0;
  min-width: 0;
  opacity: 0;
  overflow: hidden;
}

.agent-fade-enter-active,
.agent-fade-leave-active {
  transition: opacity 0.15s ease;
}
.agent-fade-enter-from,
.agent-fade-leave-to {
  opacity: 0;
}
</style>
