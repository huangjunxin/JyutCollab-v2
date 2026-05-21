<template>
  <DocsPageShell :slug="slug" />
</template>

<script setup lang="ts">
const route = useRoute()

const slug = computed(() => {
  const value = route.params.slug
  return Array.isArray(value) ? value.join('/') : value
})

definePageMeta({
  layout: 'default',
  name: 'docs-slug'
})
</script>
