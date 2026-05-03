<template>
  <div class="inline-flex items-center gap-2 flex-wrap">
    <UButton
      size="sm"
      color="neutral"
      variant="soft"
      icon="i-heroicons-swatch"
      aria-label="規則"
      :aria-expanded="expanded"
      :aria-controls="panelId"
      @click="emit('update:expanded', !expanded)"
    >
      規則
    </UButton>
    <UBadge
      v-if="activeRuleCount > 0"
      color="primary"
      variant="soft"
      class="self-center"
    >
      {{ activeRuleCount }} 項規則
    </UBadge>
  </div>

  <Teleport v-if="expanded && teleportTo && canTeleport" :to="teleportTo">
    <div
      :id="panelId"
      class="w-full flex flex-col gap-3 border-t border-gray-200 dark:border-gray-700 pt-3 mt-2"
    >
      <p class="text-sm text-gray-600 dark:text-gray-300">規則面板</p>
    </div>
  </Teleport>

  <div
    v-else-if="expanded"
    :id="panelId"
    class="w-full flex flex-col gap-3 border-t border-gray-200 dark:border-gray-700 pt-3 mt-2"
  >
    <p class="text-sm text-gray-600 dark:text-gray-300">規則面板</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type {
  EntriesRuleDraft,
  EntriesRuleOverlay,
  EntriesRuleOverlayErrors,
  OverlayConditionKind,
  OverlayRuleKind,
  OverlayStylePreset
} from '~/composables/useEntriesRuleOverlays'
import type { AdvancedFilterFieldKey } from '~/utils/entriesAdvancedFilter'

const panelId = 'entries-rule-overlay-panel'

type FieldOption = { value: AdvancedFilterFieldKey; label?: string }
type RuleMoveDirection = -1 | 1

const emit = defineEmits<{
  'update:expanded': [value: boolean]
  'update:draftRule': [value: EntriesRuleDraft]
  apply: []
  clear: []
  'toggle-rule': [ruleId: string]
  'remove-rule': [ruleId: string]
  'move-rule': [ruleId: string, direction: RuleMoveDirection]
}>()

const props = defineProps<{
  expanded: boolean
  draftRule: EntriesRuleDraft
  rules: EntriesRuleOverlay[]
  errors: EntriesRuleOverlayErrors
  activeRuleCount: number
  fieldOptions: FieldOption[]
  teleportTo?: string
}>()

const canTeleport = ref(false)

const draftName = computed({
  get: () => props.draftRule.name,
  set: value => updateDraft({ name: value })
})

const draftKind = computed({
  get: () => props.draftRule.kind,
  set: value => updateDraft({ kind: value as OverlayRuleKind })
})

const draftConditionKind = computed({
  get: () => props.draftRule.condition.kind,
  set: value => updateDraftCondition({ kind: value as OverlayConditionKind })
})

const draftFormula = computed({
  get: () => props.draftRule.condition.formula,
  set: value => updateDraftCondition({ formula: value })
})

const draftStylePreset = computed({
  get: () => props.draftRule.stylePreset,
  set: value => updateDraft({ stylePreset: value as OverlayStylePreset })
})

void draftName
void draftKind
void draftConditionKind
void draftFormula
void draftStylePreset

function updateDraft(patch: Partial<EntriesRuleDraft>) {
  emit('update:draftRule', {
    ...props.draftRule,
    ...patch,
    targetFields: [...props.draftRule.targetFields],
    condition: {
      kind: props.draftRule.condition.kind,
      formula: props.draftRule.condition.formula,
      regex: { ...props.draftRule.condition.regex }
    }
  })
}

function updateDraftCondition(patch: Partial<EntriesRuleDraft['condition']>) {
  emit('update:draftRule', {
    ...props.draftRule,
    targetFields: [...props.draftRule.targetFields],
    condition: {
      ...props.draftRule.condition,
      ...patch,
      regex: { ...props.draftRule.condition.regex }
    }
  })
}

onMounted(() => {
  if (!props.teleportTo) return
  try {
    canTeleport.value = !!document.querySelector(props.teleportTo)
  } catch {
    canTeleport.value = false
  }
})
</script>
