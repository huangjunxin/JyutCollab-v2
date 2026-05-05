<template>
  <div class="inline-flex items-center gap-2 flex-wrap">
    <UTooltip text="規則">
      <UButton
        size="sm"
        color="neutral"
        variant="soft"
        icon="i-heroicons-swatch"
        class="h-8 w-8 justify-center p-0"
        aria-label="規則"
        :aria-expanded="expanded"
        :aria-controls="panelId"
        @click="emit('update:expanded', !expanded)"
      />
    </UTooltip>
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
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">新增規則</h3>
        <p id="entries-rule-readonly-helper" class="text-xs text-gray-500 dark:text-gray-400">
          此規則只會標示目前已載入的詞條，不會修改資料。
        </p>
      </div>

      <form class="flex flex-col gap-3" @submit.prevent="emit('apply')">
        <div class="grid gap-3 lg:grid-cols-3">
          <label class="flex flex-col gap-1 text-xs font-semibold text-gray-700 dark:text-gray-200">
            規則名稱
            <UInput
              v-model="draftName"
              size="sm"
              class="w-full"
              placeholder="新增規則"
              :aria-describedby="errors.name ? 'entries-rule-name-error' : undefined"
            />
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
              <UButton
                type="button"
                size="sm"
                :color="draftKind === 'formatting' ? 'primary' : 'neutral'"
                :variant="draftKind === 'formatting' ? 'soft' : 'outline'"
                :aria-pressed="draftKind === 'formatting'"
                @click="draftKind = 'formatting'"
              >
                條件格式
              </UButton>
              <UButton
                type="button"
                size="sm"
                :color="draftKind === 'validation' ? 'primary' : 'neutral'"
                :variant="draftKind === 'validation' ? 'soft' : 'outline'"
                :aria-pressed="draftKind === 'validation'"
                @click="draftKind = 'validation'"
              >
                驗證警告
              </UButton>
            </div>
          </fieldset>

          <fieldset class="flex flex-col gap-2">
            <legend class="text-xs font-semibold text-gray-700 dark:text-gray-200">條件模式</legend>
            <div class="flex flex-wrap gap-2">
              <UButton
                type="button"
                size="sm"
                :color="draftConditionKind === 'formula' ? 'primary' : 'neutral'"
                :variant="draftConditionKind === 'formula' ? 'soft' : 'outline'"
                :aria-pressed="draftConditionKind === 'formula'"
                @click="draftConditionKind = 'formula'"
              >
                公式
              </UButton>
              <UButton
                type="button"
                size="sm"
                :color="draftConditionKind === 'regex' ? 'primary' : 'neutral'"
                :variant="draftConditionKind === 'regex' ? 'soft' : 'outline'"
                :aria-pressed="draftConditionKind === 'regex'"
                @click="draftConditionKind = 'regex'"
              >
                正則表達式
              </UButton>
            </div>
          </fieldset>
        </div>

        <fieldset class="flex flex-col gap-2">
          <legend class="text-xs font-semibold text-gray-700 dark:text-gray-200">目標欄位</legend>
          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="option in normalizedFieldOptions"
              :key="option.value"
              type="button"
              size="sm"
              :color="draftRule.targetFields.includes(option.value) ? 'primary' : 'neutral'"
              :variant="draftRule.targetFields.includes(option.value) ? 'soft' : 'outline'"
              :aria-pressed="draftRule.targetFields.includes(option.value)"
              @click="toggleTargetField(option.value)"
            >
              {{ option.label }}
            </UButton>
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
          <UInput
            v-model="draftFormula"
            size="sm"
            class="w-full"
            placeholder="例如：=AND(status = &quot;草稿&quot;, ISBLANK(definition))"
            :aria-describedby="errors.formula ? 'entries-rule-formula-error entries-rule-readonly-helper' : 'entries-rule-readonly-helper'"
          />
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
            <USelectMenu
              v-model="draftRegexField"
              :items="regexFieldOptions"
              value-key="value"
              size="sm"
              class="w-full"
              aria-label="正則表達式欄位"
            />
          </label>
          <label class="flex flex-col gap-1 text-xs font-semibold text-gray-700 dark:text-gray-200">
            正則表達式
            <UInput
              v-model="draftRegexPattern"
              size="sm"
              class="w-full"
              placeholder="輸入正則表達式"
              :aria-describedby="errors.regex ? 'entries-rule-regex-error entries-rule-readonly-helper' : 'entries-rule-readonly-helper'"
            />
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
            <UInput
              v-model="draftRegexFlags"
              size="sm"
              class="w-full"
              placeholder="i"
            />
          </label>
        </div>

        <div class="grid gap-3 sm:grid-cols-[14rem_1fr]">
          <label class="flex flex-col gap-1 text-xs font-semibold text-gray-700 dark:text-gray-200">
            格式樣式
            <USelectMenu
              v-model="draftStylePreset"
              :items="stylePresetOptions"
              value-key="value"
              size="sm"
              class="w-full"
              :disabled="draftKind !== 'formatting'"
              aria-label="格式樣式"
            />
          </label>
          <label class="flex flex-col gap-1 text-xs font-semibold text-gray-700 dark:text-gray-200">
            自訂顏色
            <p
              v-if="errors.colorHex"
              id="entries-rule-color-error"
              role="alert"
              class="text-sm font-normal text-red-600 dark:text-red-400"
            >
              規則顏色無效。請使用色彩選擇器重新選擇顏色。
            </p>
            <UPopover :content="{ side: 'bottom', sideOffset: 8 }">
              <UTooltip :text="draftKind !== 'formatting' ? '驗證警告規則不支援自訂顏色' : '選擇條件格式顏色'">
                <UButton
                  type="button"
                  color="neutral"
                  variant="outline"
                  size="sm"
                  class="justify-start"
                  :disabled="draftKind !== 'formatting'"
                >
                  <span class="h-4 w-4 rounded border border-gray-300" :style="{ backgroundColor: draftColorHex }" />
                  {{ draftColorHex }}
                </UButton>
              </UTooltip>
              <template #content>
                <div class="p-3">
                  <UColorPicker
                    v-model="draftColorHex"
                    format="hex"
                    size="sm"
                  />
                </div>
              </template>
            </UPopover>
          </label>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <UButton type="submit" color="primary" variant="solid" size="sm">套用規則</UButton>
          <UButton type="button" color="neutral" variant="soft" size="sm" @click="emit('clear')">清除規則</UButton>
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
                <UPopover v-if="rule.kind === 'formatting'" :content="{ side: 'bottom', sideOffset: 8 }">
                  <UButton
                    type="button"
                    color="neutral"
                    variant="outline"
                    size="sm"
                    class="mt-1 justify-start"
                  >
                    <span class="h-4 w-4 rounded border border-gray-300" :style="{ backgroundColor: rule.colorHex }" />
                    修改顏色
                  </UButton>
                  <template #content>
                    <div class="p-3">
                      <UColorPicker
                        :model-value="rule.colorHex"
                        format="hex"
                        size="sm"
                        @update:model-value="updateRuleColor(rule.id, $event)"
                      />
                    </div>
                  </template>
                </UPopover>
              </div>
              <div class="flex flex-wrap gap-2 sm:justify-end">
                <UButton type="button" color="neutral" variant="soft" size="sm" @click="emit('toggle-rule', rule.id)">{{ rule.enabled ? '停用' : '啟用' }}</UButton>
                <UButton type="button" color="neutral" variant="soft" size="sm" :disabled="index === 0" @click="emit('move-rule', rule.id, -1)">上移</UButton>
                <UButton type="button" color="neutral" variant="soft" size="sm" :disabled="index === rules.length - 1" @click="emit('move-rule', rule.id, 1)">下移</UButton>
                <UButton type="button" color="error" variant="soft" size="sm" @click="emit('remove-rule', rule.id)">移除</UButton>
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
    class="w-full flex flex-col gap-3 border-t border-gray-200 dark:border-gray-700 pt-3 mt-2"
  >
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">新增規則</h3>
      <p id="entries-rule-readonly-helper" class="text-xs text-gray-500 dark:text-gray-400">
        此規則只會標示目前已載入的詞條，不會修改資料。
      </p>
    </div>

    <form class="flex flex-col gap-3" @submit.prevent="emit('apply')">
      <div class="grid gap-3 lg:grid-cols-3">
        <label class="flex flex-col gap-1 text-xs font-semibold text-gray-700 dark:text-gray-200">
          規則名稱
          <UInput
            v-model="draftName"
            size="sm"
            class="w-full"
            placeholder="新增規則"
            :aria-describedby="errors.name ? 'entries-rule-name-error' : undefined"
          />
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
            <UButton
              type="button"
              size="sm"
              :color="draftKind === 'formatting' ? 'primary' : 'neutral'"
              :variant="draftKind === 'formatting' ? 'soft' : 'outline'"
              :aria-pressed="draftKind === 'formatting'"
              @click="draftKind = 'formatting'"
            >
              條件格式
            </UButton>
            <UButton
              type="button"
              size="sm"
              :color="draftKind === 'validation' ? 'primary' : 'neutral'"
              :variant="draftKind === 'validation' ? 'soft' : 'outline'"
              :aria-pressed="draftKind === 'validation'"
              @click="draftKind = 'validation'"
            >
              驗證警告
            </UButton>
          </div>
        </fieldset>

        <fieldset class="flex flex-col gap-2">
          <legend class="text-xs font-semibold text-gray-700 dark:text-gray-200">條件模式</legend>
          <div class="flex flex-wrap gap-2">
            <UButton
              type="button"
              size="sm"
              :color="draftConditionKind === 'formula' ? 'primary' : 'neutral'"
              :variant="draftConditionKind === 'formula' ? 'soft' : 'outline'"
              :aria-pressed="draftConditionKind === 'formula'"
              @click="draftConditionKind = 'formula'"
            >
              公式
            </UButton>
            <UButton
              type="button"
              size="sm"
              :color="draftConditionKind === 'regex' ? 'primary' : 'neutral'"
              :variant="draftConditionKind === 'regex' ? 'soft' : 'outline'"
              :aria-pressed="draftConditionKind === 'regex'"
              @click="draftConditionKind = 'regex'"
            >
              正則表達式
            </UButton>
          </div>
        </fieldset>
      </div>

      <fieldset class="flex flex-col gap-2">
        <legend class="text-xs font-semibold text-gray-700 dark:text-gray-200">目標欄位</legend>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="option in normalizedFieldOptions"
            :key="option.value"
            type="button"
            size="sm"
            :color="draftRule.targetFields.includes(option.value) ? 'primary' : 'neutral'"
            :variant="draftRule.targetFields.includes(option.value) ? 'soft' : 'outline'"
            :aria-pressed="draftRule.targetFields.includes(option.value)"
            @click="toggleTargetField(option.value)"
          >
            {{ option.label }}
          </UButton>
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
        <UInput
          v-model="draftFormula"
          size="sm"
          class="w-full"
          placeholder="例如：=AND(status = &quot;草稿&quot;, ISBLANK(definition))"
          :aria-describedby="errors.formula ? 'entries-rule-formula-error entries-rule-readonly-helper' : 'entries-rule-readonly-helper'"
        />
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
          <USelectMenu
            v-model="draftRegexField"
            :items="regexFieldOptions"
            value-key="value"
            size="sm"
            class="w-full"
            aria-label="正則表達式欄位"
          />
        </label>
        <label class="flex flex-col gap-1 text-xs font-semibold text-gray-700 dark:text-gray-200">
          正則表達式
          <UInput
            v-model="draftRegexPattern"
            size="sm"
            class="w-full"
            placeholder="輸入正則表達式"
            :aria-describedby="errors.regex ? 'entries-rule-regex-error entries-rule-readonly-helper' : 'entries-rule-readonly-helper'"
          />
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
          <UInput
            v-model="draftRegexFlags"
            size="sm"
            class="w-full"
            placeholder="i"
          />
        </label>
      </div>

      <div class="grid gap-3 sm:grid-cols-[14rem_1fr]">
        <label class="flex flex-col gap-1 text-xs font-semibold text-gray-700 dark:text-gray-200">
          格式樣式
          <USelectMenu
            v-model="draftStylePreset"
            :items="stylePresetOptions"
            value-key="value"
            size="sm"
            class="w-full"
            :disabled="draftKind !== 'formatting'"
            aria-label="格式樣式"
          />
        </label>
        <label class="flex flex-col gap-1 text-xs font-semibold text-gray-700 dark:text-gray-200">
          自訂顏色
          <UPopover :content="{ side: 'bottom', sideOffset: 8 }">
            <UButton
              type="button"
              color="neutral"
              variant="outline"
              size="sm"
              class="justify-start"
              :disabled="draftKind !== 'formatting'"
            >
              <span class="h-4 w-4 rounded border border-gray-300" :style="{ backgroundColor: draftColorHex }" />
              {{ draftColorHex }}
            </UButton>
            <template #content>
              <div class="p-3">
                <UColorPicker
                  v-model="draftColorHex"
                  format="hex"
                  size="sm"
                />
              </div>
            </template>
          </UPopover>
        </label>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <UButton type="submit" color="primary" variant="solid" size="sm">套用規則</UButton>
        <UButton type="button" color="neutral" variant="soft" size="sm" @click="emit('clear')">清除規則</UButton>
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
              <p
                v-if="rule.colorHex && !/^#[0-9a-fA-F]{6}$/.test(rule.colorHex)"
                id="entries-rule-existing-color-error"
                role="alert"
                class="text-sm text-red-600 dark:text-red-400"
              >
                規則顏色無效。請使用色彩選擇器重新選擇顏色。
              </p>
              <UPopover v-if="rule.kind === 'formatting'" :content="{ side: 'bottom', sideOffset: 8 }">
                <UButton
                  type="button"
                  color="neutral"
                  variant="outline"
                  size="sm"
                  class="mt-1 justify-start"
                >
                  <span class="h-4 w-4 rounded border border-gray-300" :style="{ backgroundColor: rule.colorHex }" />
                  修改顏色
                </UButton>
                <template #content>
                  <div class="p-3">
                    <UColorPicker
                      :model-value="rule.colorHex"
                      format="hex"
                      size="sm"
                      @update:model-value="updateRuleColor(rule.id, $event)"
                    />
                  </div>
                </template>
              </UPopover>
            </div>
            <div class="flex flex-wrap gap-2 sm:justify-end">
              <UButton type="button" color="neutral" variant="soft" size="sm" @click="emit('toggle-rule', rule.id)">{{ rule.enabled ? '停用' : '啟用' }}</UButton>
              <UButton type="button" color="neutral" variant="soft" size="sm" :disabled="index === 0" @click="emit('move-rule', rule.id, -1)">上移</UButton>
              <UButton type="button" color="neutral" variant="soft" size="sm" :disabled="index === rules.length - 1" @click="emit('move-rule', rule.id, 1)">下移</UButton>
              <UButton type="button" color="error" variant="soft" size="sm" @click="emit('remove-rule', rule.id)">移除</UButton>
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
type StylePresetOption = { value: OverlayStylePreset; label: string; colorHex: string }
type RuleMoveDirection = -1 | 1

const emit = defineEmits<{
  'update:expanded': [value: boolean]
  'update:draftRule': [value: EntriesRuleDraft]
  apply: []
  clear: []
  'toggle-rule': [ruleId: string]
  'remove-rule': [ruleId: string]
  'move-rule': [ruleId: string, direction: RuleMoveDirection]
  'update-rule-color': [ruleId: string, colorHex: string]
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

const stylePresetOptions: StylePresetOption[] = [
  { value: 'green', label: '綠色', colorHex: '#22c55e' },
  { value: 'blue', label: '藍色', colorHex: '#3b82f6' },
  { value: 'purple', label: '紫色', colorHex: '#a855f7' },
  { value: 'amber', label: '琥珀色', colorHex: '#f59e0b' }
]

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
  set: value => {
    const stylePreset = value as OverlayStylePreset
    updateDraft({
      stylePreset,
      colorHex: stylePresetOptions.find(option => option.value === stylePreset)?.colorHex ?? props.draftRule.colorHex
    })
  }
})

const draftColorHex = computed({
  get: () => props.draftRule.colorHex,
  set: value => updateDraft({ colorHex: value })
})

const neutralBadgeClass = 'rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200'
const warningBadgeClass = 'rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-200'
const enabledBadgeClass = 'rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-950/50 dark:text-green-200'
const disabledBadgeClass = 'rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400'

function updateDraft(patch: Partial<EntriesRuleDraft>) {
  const condition = patch.condition
    ? { ...patch.condition, regex: { ...patch.condition.regex } }
    : {
        kind: props.draftRule.condition.kind,
        formula: props.draftRule.condition.formula,
        regex: { ...props.draftRule.condition.regex }
      }

  emit('update:draftRule', {
    ...props.draftRule,
    ...patch,
    targetFields: [...(patch.targetFields ?? props.draftRule.targetFields)],
    condition
  })
}

function updateRuleColor(ruleId: string, colorHex: string | undefined) {
  if (!colorHex) return
  emit('update-rule-color', ruleId, colorHex)
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
