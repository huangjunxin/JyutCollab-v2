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
      class="w-full flex flex-col gap-4 border-t border-gray-200 dark:border-gray-700 pt-3 mt-2"
    >
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">新增規則</h3>
        <p id="entries-rule-readonly-helper" class="text-xs text-gray-500 dark:text-gray-400">
          此規則只會標示目前已載入的詞條，不會修改資料。
        </p>
      </div>

      <form class="flex flex-col gap-4" @submit.prevent="emit('apply')">
        <div class="grid gap-3 lg:grid-cols-3">
          <label class="flex flex-col gap-1 text-xs font-semibold text-gray-700 dark:text-gray-200">
            規則名稱
            <input
              v-model="draftName"
              class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              placeholder="新增規則"
              :aria-describedby="errors.name ? 'entries-rule-name-error' : undefined"
            >
            <span
              v-if="errors.name"
              id="entries-rule-name-error"
              role="alert"
              class="text-sm font-normal text-red-600 dark:text-red-400"
            >
              {{ errors.name }}
            </span>
          </label>

          <fieldset class="flex flex-col gap-2">
            <legend class="text-xs font-semibold text-gray-700 dark:text-gray-200">規則類型</legend>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                :class="draftKind === 'formatting' ? activeChoiceClass : inactiveChoiceClass"
                :aria-pressed="draftKind === 'formatting'"
                @click="draftKind = 'formatting'"
              >
                條件格式
              </button>
              <button
                type="button"
                :class="draftKind === 'validation' ? activeChoiceClass : inactiveChoiceClass"
                :aria-pressed="draftKind === 'validation'"
                @click="draftKind = 'validation'"
              >
                驗證警告
              </button>
            </div>
          </fieldset>

          <fieldset class="flex flex-col gap-2">
            <legend class="text-xs font-semibold text-gray-700 dark:text-gray-200">條件模式</legend>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                :class="draftConditionKind === 'formula' ? activeChoiceClass : inactiveChoiceClass"
                :aria-pressed="draftConditionKind === 'formula'"
                @click="draftConditionKind = 'formula'"
              >
                公式
              </button>
              <button
                type="button"
                :class="draftConditionKind === 'regex' ? activeChoiceClass : inactiveChoiceClass"
                :aria-pressed="draftConditionKind === 'regex'"
                @click="draftConditionKind = 'regex'"
              >
                正則表達式
              </button>
            </div>
          </fieldset>
        </div>

        <fieldset class="flex flex-col gap-2">
          <legend class="text-xs font-semibold text-gray-700 dark:text-gray-200">目標欄位</legend>
          <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <label
              v-for="option in normalizedFieldOptions"
              :key="option.value"
              class="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-200"
            >
              <input
                type="checkbox"
                :checked="draftRule.targetFields.includes(option.value)"
                @change="toggleTargetField(option.value)"
              >
              {{ option.label }}
            </label>
          </div>
          <p
            v-if="errors.targetFields"
            id="entries-rule-target-fields-error"
            role="alert"
            class="text-sm text-red-600 dark:text-red-400"
          >
            {{ errors.targetFields }}
          </p>
        </fieldset>

        <label
          v-if="draftConditionKind === 'formula'"
          class="flex flex-col gap-1 text-xs font-semibold text-gray-700 dark:text-gray-200"
        >
          公式
          <input
            v-model="draftFormula"
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            placeholder="例如：=AND(status = &quot;草稿&quot;, ISBLANK(definition))"
            :aria-describedby="errors.formula ? 'entries-rule-formula-error entries-rule-readonly-helper' : 'entries-rule-readonly-helper'"
          >
          <span
            v-if="errors.formula"
            id="entries-rule-formula-error"
            role="alert"
            class="text-sm font-normal text-red-600 dark:text-red-400"
          >
            {{ errors.formula.message }}
          </span>
        </label>

        <div v-else class="grid gap-3 lg:grid-cols-[14rem_1fr_8rem]">
          <label class="flex flex-col gap-1 text-xs font-semibold text-gray-700 dark:text-gray-200">
            正則表達式欄位
            <select v-model="draftRegexField" class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
              <option v-for="option in regexFieldOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <label class="flex flex-col gap-1 text-xs font-semibold text-gray-700 dark:text-gray-200">
            正則表達式
            <input
              v-model="draftRegexPattern"
              class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              placeholder="輸入正則表達式"
              :aria-describedby="errors.regex ? 'entries-rule-regex-error entries-rule-readonly-helper' : 'entries-rule-readonly-helper'"
            >
            <span
              v-if="errors.regex"
              id="entries-rule-regex-error"
              role="alert"
              class="text-sm font-normal text-red-600 dark:text-red-400"
            >
              {{ errors.regex.message }}
            </span>
          </label>
          <label class="flex flex-col gap-1 text-xs font-semibold text-gray-700 dark:text-gray-200">
            旗標
            <input
              v-model="draftRegexFlags"
              class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              placeholder="i"
            >
          </label>
        </div>

        <label class="flex flex-col gap-1 text-xs font-semibold text-gray-700 dark:text-gray-200 sm:w-56">
          格式樣式
          <select
            v-model="draftStylePreset"
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            :disabled="draftKind !== 'formatting'"
          >
            <option value="green">綠色</option>
            <option value="blue">藍色</option>
            <option value="purple">紫色</option>
            <option value="amber">琥珀色</option>
          </select>
        </label>

        <div class="flex flex-wrap items-center gap-2">
          <button type="submit" :class="primaryButtonClass">套用規則</button>
          <button type="button" :class="secondaryButtonClass" @click="emit('clear')">清除規則</button>
        </div>
      </form>

      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">已建立規則</h3>
          <span v-if="rules.length > 0" class="text-xs text-gray-500 dark:text-gray-400">{{ rules.length }} 項</span>
        </div>
        <p
          v-if="rules.length === 0"
          class="rounded-lg border border-dashed border-gray-300 p-3 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
        >
          尚未建立規則。
        </p>
        <div v-else class="grid gap-2">
          <article
            v-for="(rule, index) in rules"
            :key="rule.id"
            class="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0 space-y-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span v-if="rule.kind === 'validation'" class="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
                    <span class="i-heroicons-exclamation-triangle h-4 w-4" aria-hidden="true" />
                    <span class="sr-only">驗證警告</span>
                  </span>
                  <strong class="break-words text-sm text-gray-900 dark:text-gray-100">{{ rule.name }}</strong>
                  <span :class="rule.kind === 'validation' ? warningBadgeClass : neutralBadgeClass">{{ ruleKindLabel(rule.kind) }}</span>
                  <span :class="rule.enabled ? enabledBadgeClass : disabledBadgeClass">{{ rule.enabled ? '已啟用' : '已停用' }}</span>
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-300">目標欄位：{{ ruleTargetSummary(rule) }}</p>
                <p class="break-words text-sm text-gray-600 dark:text-gray-300">{{ conditionSummary(rule) }}</p>
              </div>
              <div class="flex flex-wrap gap-2 sm:justify-end">
                <button type="button" :class="secondaryButtonClass" @click="emit('toggle-rule', rule.id)">{{ rule.enabled ? '停用' : '啟用' }}</button>
                <button type="button" :class="secondaryButtonClass" :disabled="index === 0" @click="emit('move-rule', rule.id, -1)">上移</button>
                <button type="button" :class="secondaryButtonClass" :disabled="index === rules.length - 1" @click="emit('move-rule', rule.id, 1)">下移</button>
                <button type="button" :class="dangerButtonClass" @click="emit('remove-rule', rule.id)">移除</button>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  </Teleport>

  <div
    v-else-if="expanded"
    :id="panelId"
    class="w-full flex flex-col gap-4 border-t border-gray-200 dark:border-gray-700 pt-3 mt-2"
  >
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">新增規則</h3>
      <p id="entries-rule-readonly-helper" class="text-xs text-gray-500 dark:text-gray-400">
        此規則只會標示目前已載入的詞條，不會修改資料。
      </p>
    </div>

    <form class="flex flex-col gap-4" @submit.prevent="emit('apply')">
      <div class="grid gap-3 lg:grid-cols-3">
        <label class="flex flex-col gap-1 text-xs font-semibold text-gray-700 dark:text-gray-200">
          規則名稱
          <input
            v-model="draftName"
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            placeholder="新增規則"
            :aria-describedby="errors.name ? 'entries-rule-name-error' : undefined"
          >
          <span
            v-if="errors.name"
            id="entries-rule-name-error"
            role="alert"
            class="text-sm font-normal text-red-600 dark:text-red-400"
          >
            {{ errors.name }}
          </span>
        </label>

        <fieldset class="flex flex-col gap-2">
          <legend class="text-xs font-semibold text-gray-700 dark:text-gray-200">規則類型</legend>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              :class="draftKind === 'formatting' ? activeChoiceClass : inactiveChoiceClass"
              :aria-pressed="draftKind === 'formatting'"
              @click="draftKind = 'formatting'"
            >
              條件格式
            </button>
            <button
              type="button"
              :class="draftKind === 'validation' ? activeChoiceClass : inactiveChoiceClass"
              :aria-pressed="draftKind === 'validation'"
              @click="draftKind = 'validation'"
            >
              驗證警告
            </button>
          </div>
        </fieldset>

        <fieldset class="flex flex-col gap-2">
          <legend class="text-xs font-semibold text-gray-700 dark:text-gray-200">條件模式</legend>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              :class="draftConditionKind === 'formula' ? activeChoiceClass : inactiveChoiceClass"
              :aria-pressed="draftConditionKind === 'formula'"
              @click="draftConditionKind = 'formula'"
            >
              公式
            </button>
            <button
              type="button"
              :class="draftConditionKind === 'regex' ? activeChoiceClass : inactiveChoiceClass"
              :aria-pressed="draftConditionKind === 'regex'"
              @click="draftConditionKind = 'regex'"
            >
              正則表達式
            </button>
          </div>
        </fieldset>
      </div>

      <fieldset class="flex flex-col gap-2">
        <legend class="text-xs font-semibold text-gray-700 dark:text-gray-200">目標欄位</legend>
        <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <label
            v-for="option in normalizedFieldOptions"
            :key="option.value"
            class="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-200"
          >
            <input
              type="checkbox"
              :checked="draftRule.targetFields.includes(option.value)"
              @change="toggleTargetField(option.value)"
            >
            {{ option.label }}
          </label>
        </div>
        <p
          v-if="errors.targetFields"
          id="entries-rule-target-fields-error"
          role="alert"
          class="text-sm text-red-600 dark:text-red-400"
        >
          {{ errors.targetFields }}
        </p>
      </fieldset>

      <label
        v-if="draftConditionKind === 'formula'"
        class="flex flex-col gap-1 text-xs font-semibold text-gray-700 dark:text-gray-200"
      >
        公式
        <input
          v-model="draftFormula"
          class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          placeholder="例如：=AND(status = &quot;草稿&quot;, ISBLANK(definition))"
          :aria-describedby="errors.formula ? 'entries-rule-formula-error entries-rule-readonly-helper' : 'entries-rule-readonly-helper'"
        >
        <span
          v-if="errors.formula"
          id="entries-rule-formula-error"
          role="alert"
          class="text-sm font-normal text-red-600 dark:text-red-400"
        >
          {{ errors.formula.message }}
        </span>
      </label>

      <div v-else class="grid gap-3 lg:grid-cols-[14rem_1fr_8rem]">
        <label class="flex flex-col gap-1 text-xs font-semibold text-gray-700 dark:text-gray-200">
          正則表達式欄位
          <select v-model="draftRegexField" class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
            <option v-for="option in regexFieldOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <label class="flex flex-col gap-1 text-xs font-semibold text-gray-700 dark:text-gray-200">
          正則表達式
          <input
            v-model="draftRegexPattern"
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            placeholder="輸入正則表達式"
            :aria-describedby="errors.regex ? 'entries-rule-regex-error entries-rule-readonly-helper' : 'entries-rule-readonly-helper'"
          >
          <span
            v-if="errors.regex"
            id="entries-rule-regex-error"
            role="alert"
            class="text-sm font-normal text-red-600 dark:text-red-400"
          >
            {{ errors.regex.message }}
          </span>
        </label>
        <label class="flex flex-col gap-1 text-xs font-semibold text-gray-700 dark:text-gray-200">
          旗標
          <input
            v-model="draftRegexFlags"
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            placeholder="i"
          >
        </label>
      </div>

      <label class="flex flex-col gap-1 text-xs font-semibold text-gray-700 dark:text-gray-200 sm:w-56">
        格式樣式
        <select
          v-model="draftStylePreset"
          class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          :disabled="draftKind !== 'formatting'"
        >
          <option value="green">綠色</option>
          <option value="blue">藍色</option>
          <option value="purple">紫色</option>
          <option value="amber">琥珀色</option>
        </select>
      </label>

      <div class="flex flex-wrap items-center gap-2">
        <button type="submit" :class="primaryButtonClass">套用規則</button>
        <button type="button" :class="secondaryButtonClass" @click="emit('clear')">清除規則</button>
      </div>
    </form>

    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">已建立規則</h3>
        <span v-if="rules.length > 0" class="text-xs text-gray-500 dark:text-gray-400">{{ rules.length }} 項</span>
      </div>
      <p
        v-if="rules.length === 0"
        class="rounded-lg border border-dashed border-gray-300 p-3 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
      >
        尚未建立規則。
      </p>
      <div v-else class="grid gap-2">
        <article
          v-for="(rule, index) in rules"
          :key="rule.id"
          class="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0 space-y-1">
              <div class="flex flex-wrap items-center gap-2">
                <span v-if="rule.kind === 'validation'" class="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
                  <span class="i-heroicons-exclamation-triangle h-4 w-4" aria-hidden="true" />
                  <span class="sr-only">驗證警告</span>
                </span>
                <strong class="break-words text-sm text-gray-900 dark:text-gray-100">{{ rule.name }}</strong>
                <span :class="rule.kind === 'validation' ? warningBadgeClass : neutralBadgeClass">{{ ruleKindLabel(rule.kind) }}</span>
                <span :class="rule.enabled ? enabledBadgeClass : disabledBadgeClass">{{ rule.enabled ? '已啟用' : '已停用' }}</span>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-300">目標欄位：{{ ruleTargetSummary(rule) }}</p>
              <p class="break-words text-sm text-gray-600 dark:text-gray-300">{{ conditionSummary(rule) }}</p>
            </div>
            <div class="flex flex-wrap gap-2 sm:justify-end">
              <button type="button" :class="secondaryButtonClass" @click="emit('toggle-rule', rule.id)">{{ rule.enabled ? '停用' : '啟用' }}</button>
              <button type="button" :class="secondaryButtonClass" :disabled="index === 0" @click="emit('move-rule', rule.id, -1)">上移</button>
              <button type="button" :class="secondaryButtonClass" :disabled="index === rules.length - 1" @click="emit('move-rule', rule.id, 1)">下移</button>
              <button type="button" :class="dangerButtonClass" @click="emit('remove-rule', rule.id)">移除</button>
            </div>
          </div>
        </article>
      </div>
    </div>
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
import { ADVANCED_FILTER_FIELD_LABELS } from '~/utils/entriesTableConstants'

const panelId = 'entries-rule-overlay-panel'

type FieldOption = { value: AdvancedFilterFieldKey; label?: string }
type RegexFieldOption = { value: AdvancedFilterFieldKey | 'any'; label: string }
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

const normalizedFieldOptions = computed(() => props.fieldOptions.map(option => ({
  value: option.value,
  label: option.label ?? ADVANCED_FILTER_FIELD_LABELS[option.value]
})))

const regexFieldOptions = computed<RegexFieldOption[]>(() => [
  { value: 'any', label: '任何欄位' },
  ...normalizedFieldOptions.value
])

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

const draftRegexField = computed({
  get: () => props.draftRule.condition.regex.field,
  set: value => updateDraftRegex({ field: value as AdvancedFilterFieldKey | 'any' })
})

const draftRegexPattern = computed({
  get: () => props.draftRule.condition.regex.pattern,
  set: value => updateDraftRegex({ pattern: value })
})

const draftRegexFlags = computed({
  get: () => props.draftRule.condition.regex.flags,
  set: value => updateDraftRegex({ flags: value })
})

const draftStylePreset = computed({
  get: () => props.draftRule.stylePreset,
  set: value => updateDraft({ stylePreset: value as OverlayStylePreset })
})

const activeChoiceClass = 'rounded-md bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700 ring-1 ring-primary-200 dark:bg-primary-950/40 dark:text-primary-200 dark:ring-primary-800'
const inactiveChoiceClass = 'rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-800'
const primaryButtonClass = 'rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/40'
const secondaryButtonClass = 'rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
const dangerButtonClass = 'rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/60'
const neutralBadgeClass = 'rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200'
const warningBadgeClass = 'rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-200'
const enabledBadgeClass = 'rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-950/50 dark:text-green-200'
const disabledBadgeClass = 'rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400'

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

function updateDraftRegex(patch: Partial<EntriesRuleDraft['condition']['regex']>) {
  emit('update:draftRule', {
    ...props.draftRule,
    targetFields: [...props.draftRule.targetFields],
    condition: {
      ...props.draftRule.condition,
      regex: {
        ...props.draftRule.condition.regex,
        ...patch
      }
    }
  })
}

function toggleTargetField(field: AdvancedFilterFieldKey) {
  const targetFields = props.draftRule.targetFields.includes(field)
    ? props.draftRule.targetFields.filter(value => value !== field)
    : [...props.draftRule.targetFields, field]
  updateDraft({ targetFields })
}

function fieldLabel(field: AdvancedFilterFieldKey | 'any') {
  if (field === 'any') return '任何欄位'
  return ADVANCED_FILTER_FIELD_LABELS[field]
}

function ruleKindLabel(kind: OverlayRuleKind) {
  return kind === 'formatting' ? '條件格式' : '驗證警告'
}

function conditionSummary(rule: EntriesRuleOverlay) {
  if (rule.condition.kind === 'formula') return `公式：${rule.condition.formula || '未填寫'}`
  const field = fieldLabel(rule.condition.regex.field)
  return `正則表達式：${field} /${rule.condition.regex.pattern || '未填寫'}/${rule.condition.regex.flags}`
}

function ruleTargetSummary(rule: EntriesRuleOverlay) {
  return rule.targetFields.map(field => fieldLabel(field)).join('、')
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
