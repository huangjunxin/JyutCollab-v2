<template>
  <NuxtLink
    v-if="href"
    :to="href"
    class="faanjyut-source-badge"
    :title="FAANJYUT_READONLY_HINT"
    :aria-label="FAANJYUT_READONLY_HINT"
    @click.stop
  >
    <span class="jc-mono">泛</span>
  </NuxtLink>
  <span
    v-else
    class="faanjyut-source-badge"
    :title="FAANJYUT_READONLY_HINT"
    :aria-label="FAANJYUT_READONLY_HINT"
    @click.stop
  >
    <span class="jc-mono">泛</span>
  </span>
</template>

<script setup lang="ts">
/**
 * 「泛」來源小標（FaanjyutV1Design §9）：泛粵詞條在普通詞條列表／詳情中的
 * 唯讀放行標識，內聯在代表字後、不佔獨立列。
 * - 懸停顯示說明；`lexemeId` 非空時點擊跳轉泛粵詞條詳情頁，否則僅提示不跳轉。
 * - 樣式照 entry-intercept 預覽稿：小號、圓角、淡藍底、等寬「泛」字。
 */
const props = withDefaults(defineProps<{
  /** 泛粵詞語組 ID；非空時小標可點擊跳轉 /faanjyut/lexemes/:id */
  lexemeId?: string | null
}>(), {
  lexemeId: null
})

/** 懸停說明（與詳情頁提示條文案一致） */
const FAANJYUT_READONLY_HINT = '此詞條來自泛粵字表，資料為唯讀。如需編輯，請前往泛粵模塊。'

const href = computed(() => {
  if (!props.lexemeId) return ''
  return `/faanjyut/lexemes/${props.lexemeId}`
})
</script>

<style scoped>
.faanjyut-source-badge {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  vertical-align: middle;
  border-radius: 9999px;
  padding: 1px 4px;
  font-size: 10px;
  line-height: 1.4;
  font-weight: 600;
  user-select: none;
  background: #eff6ff;
  border: 1px solid #93c5fd;
  color: #1d4ed8;
  text-decoration: none;
}

.faanjyut-source-badge:hover {
  text-decoration: underline;
}

.dark .faanjyut-source-badge {
  background: rgba(30, 58, 138, 0.4);
  border-color: #1e40af;
  color: #93c5fd;
}
</style>
