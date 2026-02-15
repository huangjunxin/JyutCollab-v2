<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
import { useAuth } from './composables/useAuth'

const { initAuth } = useAuth()

// Initialize auth on app load
onMounted(() => {
  initAuth()
})
</script>
