<script setup lang="ts">
import { FaanjyutToneChip } from '#components'

/**
 * 導入批次狀態徽章（FaanjyutV1Design §10.1）：
 * completed 綠 / failed 紅 / rolled_back 灰 / running 藍；未知狀態灰。
 * dry-run 批次（batchId 以 fjdr_ 開頭）在調用方另行標註「未寫入」。
 */
const props = defineProps<{
  status: string
}>()

const toneByStatus: Record<string, 'green' | 'red' | 'gray' | 'blue'> = {
  completed: 'green',
  failed: 'red',
  rolled_back: 'gray',
  running: 'blue'
}

const labelByStatus: Record<string, string> = {
  completed: '已完成',
  failed: '失敗',
  rolled_back: '已回滾',
  running: '進行中'
}
</script>

<template>
  <FaanjyutToneChip
    :tone="toneByStatus[props.status] ?? 'gray'"
    :label="labelByStatus[props.status] ?? props.status"
    :title="`status: ${props.status}`"
  />
</template>
