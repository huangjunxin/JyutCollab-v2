<template>
  <div class="jc-paper-shell flex h-screen overflow-hidden">
    <div class="flex min-w-0 flex-1 flex-col">
      <LayoutAppHeader />
      <main class="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
        <slot />
      </main>
    </div>
    <Transition name="agent-slide">
      <AgentPanel v-if="agentOpen" class="w-[420px] shrink-0" />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { useAgentChat } from '../composables/useAgentChat'

const { open: agentOpen } = useAgentChat()
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
</style>
