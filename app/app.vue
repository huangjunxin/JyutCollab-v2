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
  'histories-index',
  // 審計 M53：泛粵矩陣頁緩存（返回時恢復頁碼與列集）
  'faanjyut-matrix'
]

onMounted(() => {
  initAuth()
})
</script>
