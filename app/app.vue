<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage :keepalive="{ include: cacheablePages }" />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
import { useAuth } from './composables/useAuth'

const { initAuth } = useAuth()

const cacheablePages = [
  'index',
  'entries-index',
  'review-index',
  'histories-index'
]

onMounted(() => {
  initAuth()
})
</script>
