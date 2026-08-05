<template>
  <NuxtLink
    v-if="href"
    :to="href"
    class="faanjyut-source-badge"
    :aria-label="FAANJYUT_READONLY_HINT"
    @click.stop
    @mouseenter="showTip"
    @mouseleave="hideTip"
    @focus="showTip"
    @blur="hideTip"
  >
    <span class="jc-mono">泛</span>
  </NuxtLink>
  <span
    v-else
    class="faanjyut-source-badge"
    :aria-label="FAANJYUT_READONLY_HINT"
    tabindex="0"
    @click.stop
    @mouseenter="showTip"
    @mouseleave="hideTip"
    @focus="showTip"
    @blur="hideTip"
  >
    <span class="jc-mono">泛</span>
  </span>
  <Teleport to="body">
    <div
      v-if="tipVisible"
      class="faanjyut-source-badge-tip"
      :style="{ left: `${tipLeft}px`, top: `${tipTop}px` }"
      role="tooltip"
    >
      {{ FAANJYUT_READONLY_HINT }}
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * 「泛」來源小標（FaanjyutV1Design §9）：泛粵詞條在普通詞條列表／詳情中的
 * 唯讀放行標識，內聯在代表字後、不佔獨立列。
 * - 懸停顯示說明；`lexemeId` 非空時點擊跳轉泛粵詞條詳情頁，否則僅提示不跳轉。
 * - 提示用 fixed 定位 + Teleport 的自製 tooltip：原生 title 在小標貼近視窗左緣時
 *   會被裁切，且表格滾動容器會裁掉絕對定位氣泡；fixed + 視窗夾取兩種情況都安全。
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

const TIP_MAX_WIDTH = 260
const TIP_GAP = 6
const TIP_VIEWPORT_PADDING = 8

const tipVisible = ref(false)
const tipLeft = ref(0)
const tipTop = ref(0)

const showTip = (event: MouseEvent | FocusEvent) => {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const viewportWidth = window.innerWidth
  // 優先與小標左對齊；超出右緣時右對齊視窗，再不行就貼左緣
  tipLeft.value = Math.min(
    Math.max(rect.left, TIP_VIEWPORT_PADDING),
    Math.max(viewportWidth - TIP_MAX_WIDTH - TIP_VIEWPORT_PADDING, TIP_VIEWPORT_PADDING)
  )
  tipTop.value = rect.bottom + TIP_GAP
  tipVisible.value = true
}

const hideTip = () => {
  tipVisible.value = false
}

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

<!-- tooltip 掛在 body 下，不能用 scoped -->
<style>
.faanjyut-source-badge-tip {
  position: fixed;
  z-index: 9999;
  max-width: 260px;
  padding: 6px 10px;
  border-radius: 6px;
  background: var(--jc-ink);
  color: #f8fafc;
  font-size: 12px;
  line-height: 1.5;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.25);
  pointer-events: none;
  white-space: normal;
  word-break: break-word;
}

.dark .faanjyut-source-badge-tip {
  background: #e2e8f0;
  color: var(--jc-ink-strong);
}
</style>
