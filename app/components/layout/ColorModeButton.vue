<script setup lang="ts">
const colorMode = useColorMode()

const modes = ['light', 'dark', 'system'] as const

const icons = {
  light: 'i-heroicons-sun',
  dark: 'i-heroicons-moon',
  system: 'i-heroicons-computer-desktop'
}

const labels = {
  light: '淺色模式',
  dark: '深色模式',
  system: '跟隨系統'
}

const cycleMode = () => {
  const currentIndex = modes.indexOf(colorMode.preference as typeof modes[number])
  const nextIndex = (currentIndex + 1) % modes.length
  colorMode.preference = modes[nextIndex]
}

const currentIcon = computed(() => icons[colorMode.preference as keyof typeof icons] || icons.system)
const currentLabel = computed(() => labels[colorMode.preference as keyof typeof labels] || labels.system)
</script>

<template>
  <UTooltip :text="currentLabel">
    <UButton
      :icon="currentIcon"
      color="neutral"
      variant="ghost"
      @click="cycleMode"
    />
  </UTooltip>
</template>
