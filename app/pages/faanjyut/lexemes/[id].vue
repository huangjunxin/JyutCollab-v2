<script setup lang="ts">
import type { FaanJyutLexemeDetail } from '~/types/faanjyut'
import {
  faanJyutActionLabel,
  faanJyutDisplayValue,
  faanJyutTargetTypeLabel,
  formatFaanJyutDateTime,
  resolveFaanJyutFieldPath
} from '~/utils/faanjyutFormat'

definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

/** 泛粵導入程序的 system userId（EditHistory.userId 特殊值） */
const SYSTEM_IMPORT_USER = 'system:faanjyut_import'

const route = useRoute()
const { data, loading, errorMessage, writeEnabled, canEditComposite, fetchLexeme } = useFaanjyutLexemeDetail()

const lexemeId = computed(() => String(route.params.id ?? ''))

watch(lexemeId, () => {
  fetchLexeme(lexemeId.value)
})

onMounted(() => {
  fetchLexeme(lexemeId.value)
})

useHead(() => ({
  title: data.value
    ? `${data.value.header.representativeChar?.display ?? data.value.header.sourceKey ?? '詞條'} · 詞條詳情 · 泛粵字表`
    : '詞條詳情 · 泛粵字表'
}))

// ---- 區塊 1：詞條頭 ----

const header = computed(() => data.value?.header)
const repCharDisplay = computed(() => header.value?.representativeChar?.display ?? header.value?.representativeChar?.raw ?? '·')

const publication = computed(() => {
  const status = header.value?.publicationStatus
  if (status === 'published') return { tone: 'green' as const, label: '已發佈' }
  if (status === 'draft') return { tone: 'amber' as const, label: '草稿' }
  return { tone: 'gray' as const, label: status || '—' }
})

const compositePronunciation = computed(() => header.value?.compositePronunciation ?? null)
const hasMarkers = computed(() =>
  Boolean(compositePronunciation.value?.markers?.hasBang || compositePronunciation.value?.markers?.hasQuestion)
)

// ---- 綜合音編輯（2026-08-06 方案 A：admin 可改，即改即存 + 撤銷 toast） ----

const compositeEditing = ref(false)
const compositeSaving = ref(false)
const compositeDraft = ref('')
const compositeError = ref<string | null>(null)

function beginCompositeEdit() {
  compositeDraft.value = compositePronunciation.value?.raw ?? ''
  compositeError.value = null
  compositeEditing.value = true
}

function cancelCompositeEdit() {
  compositeEditing.value = false
  compositeError.value = null
}

async function saveCompositeEdit() {
  if (!data.value || compositeSaving.value) return
  const lexeme = data.value.header
  const before = lexeme.compositePronunciation ?? null
  const raw = compositeDraft.value
  compositeSaving.value = true
  compositeError.value = null
  try {
    const response = await $fetch<{ success: boolean; changed: boolean; data: { composite: any } }>(
      `/api/faanjyut/lexemes/${encodeURIComponent(lexeme.id)}/composite`,
      { method: 'PUT', body: { raw } }
    )
    lexeme.compositePronunciation = response.data.composite ?? undefined
    compositeEditing.value = false
    if (response.changed) {
      const toast = useToast()
      toast.add({
        title: '已儲存',
        description: `綜合音原值：${before?.raw ?? '（無）'}`,
        duration: 5000,
        actions: [
          {
            label: '撤銷',
            onClick: () => {
              void restoreComposite(before?.raw ?? '')
            }
          }
        ]
      })
    }
  } catch (error: any) {
    compositeError.value = error?.data?.message || error?.message || '儲存失敗'
  } finally {
    compositeSaving.value = false
  }
}

/** 撤銷：把綜合音恢復為編輯前原值（正常 PUT 寫入，同格編輯撤銷語義） */
async function restoreComposite(raw: string) {
  if (!data.value) return
  const lexeme = data.value.header
  try {
    const response = await $fetch<{ success: boolean; data: { composite: any } }>(
      `/api/faanjyut/lexemes/${encodeURIComponent(lexeme.id)}/composite`,
      { method: 'PUT', body: { raw } }
    )
    lexeme.compositePronunciation = response.data.composite ?? undefined
  } catch (error: any) {
    const toast = useToast()
    toast.add({
      title: '撤銷失敗',
      description: error?.data?.message || error?.message || '未知錯誤',
      color: 'error'
    })
  }
}

// ---- 區塊 2：各方言點方音（僅域內列；域外列歸區塊 3） ----

const domesticPronunciations = computed(
  () => (data.value?.pronunciations ?? []).filter((item) => item.sourceRole !== 'external')
)

// ---- 區塊 3：域外材料 ----

const externalTotal = computed(() =>
  (data.value?.externalMaterials ?? []).reduce((sum, group) => sum + group.items.length, 0)
)

// ---- 區塊 4：DQ/DR 與 Link ----

function linkTypeLabel(type: string | null | undefined): string {
  switch (type) {
    case 'related': return '相關'
    case 'hint': return '提示'
    case 'twin_potential': return '孿生（潛在）'
    case 'same_entry': return '同詞條'
    default: return type || '—'
  }
}

function linkTargetRepChar(link: FaanJyutLexemeDetail['links'][number]): string {
  const target = link.targetLexeme
  const rep = target?.representativeChar
  return rep && typeof rep === 'object' && 'display' in rep
    ? String((rep as { display?: unknown }).display ?? '')
    : ''
}

// ---- 區塊 6：編輯歷史 diff ----

function historyDiff(h: FaanJyutLexemeDetail['editHistory'][number]) {
  return (h.changedFields ?? [])
    .map((field) => ({
      field,
      before: resolveFaanJyutFieldPath(h.beforeSnapshot, field),
      after: resolveFaanJyutFieldPath(h.afterSnapshot, field)
    }))
    .filter((pair) => pair.before !== undefined || pair.after !== undefined)
}

function userDisplay(userId: string): string {
  if (userId === SYSTEM_IMPORT_USER) return '泛粵導入程序'
  return userId || '—'
}

// ---- 批註頭像首字 ----

function authorInitial(author: string | null | undefined): string {
  return (author ?? '?').trim().charAt(0) || '?'
}
</script>

<template>
  <div class="mx-auto max-w-[1400px] p-4 sm:p-6">
    <!-- 返回行 + 唯讀 chip -->
    <div class="flex items-center justify-between gap-2 mb-4">
      <NuxtLink
        to="/faanjyut"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-[var(--jc-border)] bg-white dark:bg-[var(--jc-dark-surface)] text-[var(--jc-body)] dark:text-slate-300 hover:bg-black/5 dark:hover:bg-black/20 shadow-[var(--jc-shadow-hard)]"
      >
        <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
        返回矩陣
      </NuxtLink>
      <FaanjyutToneChip tone="slate" label="唯讀 · v1">
        <UIcon name="i-heroicons-lock-closed" class="w-3 h-3" />
        唯讀 · v1
      </FaanjyutToneChip>
    </div>

    <!-- 載入中 -->
    <div v-if="loading" class="space-y-4">
      <USkeleton class="h-40 w-full" />
      <USkeleton class="h-24 w-full" />
      <USkeleton class="h-64 w-full" />
    </div>

    <!-- 錯誤 -->
    <div v-else-if="errorMessage" class="jc-card p-6 text-center">
      <p class="text-sm font-semibold text-red-600 dark:text-red-400">{{ errorMessage }}</p>
      <p class="text-xs text-[var(--jc-muted)] mt-1">詞條可能不存在，或你未有查看權限。</p>
      <NuxtLink to="/faanjyut" class="inline-block mt-4 text-sm text-blue-600 underline">
        返回矩陣
      </NuxtLink>
    </div>

    <template v-else-if="data">
      <!-- ============ 區塊 1：詞條頭卡 ============ -->
      <section class="jc-card-lg p-5 sm:p-6 mb-6">
        <div class="flex flex-col lg:flex-row gap-6">
          <!-- 左：代表字 -->
          <div class="flex lg:flex-col items-center lg:items-start gap-4 lg:w-44 shrink-0">
            <div
              class="w-28 h-28 lg:w-36 lg:h-36 flex items-center justify-center border border-[var(--jc-border)] bg-[#FAFAF6] dark:bg-[var(--jc-dark-surface)] shadow-[var(--jc-shadow-hard)]"
            >
              <span class="jc-headword-rare-font font-bold text-6xl lg:text-7xl text-[var(--jc-ink-strong)] dark:text-white">
                {{ repCharDisplay }}
              </span>
            </div>
            <div class="flex flex-col gap-1.5 items-center lg:items-start">
              <FaanjyutToneChip :tone="publication.tone" :label="publication.label" />
            </div>
          </div>

          <!-- 右：字段兩列 -->
          <div class="flex-1 min-w-0">
            <div class="grid sm:grid-cols-2 gap-x-6 gap-y-4">
              <!-- 詞條鍵 -->
              <div>
                <div class="text-xs font-semibold text-[var(--jc-muted)] mb-1">詞條鍵</div>
                <FaanjyutCopyText v-if="header?.sourceKey" :value="header.sourceKey" />
                <span v-else class="text-sm text-[var(--jc-muted)]">—</span>
              </div>
              <!-- 綜合音 -->
              <div>
                <div class="flex items-center gap-2">
                  <div class="text-xs font-semibold text-[var(--jc-muted)] mb-1">綜合音</div>
                  <UButton
                    v-if="canEditComposite && !compositeEditing"
                    size="2xs"
                    color="gray"
                    variant="ghost"
                    icon="i-heroicons-pencil-square"
                    aria-label="編輯綜合音"
                    class="-mt-1"
                    @click="beginCompositeEdit"
                  />
                </div>
                <template v-if="compositeEditing">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <UInput
                      v-model="compositeDraft"
                      size="sm"
                      class="w-40 jc-mono"
                      placeholder="綜合音（可含 ! ?）"
                      :disabled="compositeSaving"
                      @keydown.enter="saveCompositeEdit"
                      @keydown.esc="cancelCompositeEdit"
                    />
                    <UButton
                      size="xs"
                      color="primary"
                      :loading="compositeSaving"
                      :disabled="compositeSaving"
                      @click="saveCompositeEdit"
                    >
                      儲存
                    </UButton>
                    <UButton size="xs" color="gray" variant="ghost" :disabled="compositeSaving" @click="cancelCompositeEdit">
                      取消
                    </UButton>
                  </div>
                  <p v-if="compositeError" class="text-xs text-red-500 mt-1">{{ compositeError }}</p>
                </template>
                <template v-else>
                  <div v-if="compositePronunciation" class="flex items-baseline gap-2 flex-wrap">
                    <span class="jc-mono text-blue-600 dark:text-blue-400 font-semibold text-lg">
                      {{ compositePronunciation.display || compositePronunciation.raw || '—' }}
                    </span>
                    <span
                      v-if="compositePronunciation.raw && compositePronunciation.raw !== compositePronunciation.display"
                      class="text-xs text-[var(--jc-muted)]"
                    >
                      （原文：<code class="jc-mono">{{ compositePronunciation.raw }}</code>）
                    </span>
                  </div>
                  <span v-else class="text-sm text-[var(--jc-muted)]">—</span>
                </template>
              </div>
              <!-- 標記 -->
              <div>
                <div class="text-xs font-semibold text-[var(--jc-muted)] mb-1">標記</div>
                <div class="flex items-center gap-1.5 flex-wrap">
                  <template v-if="hasMarkers">
                    <FaanjyutToneChip
                      v-if="compositePronunciation?.markers?.hasBang"
                      tone="red"
                      label="!"
                      title="hasBang：讀音帶 ! 驚嘆標記"
                    />
                    <FaanjyutToneChip
                      v-if="compositePronunciation?.markers?.hasQuestion"
                      tone="amber"
                      label="?"
                      title="hasQuestion：讀音帶 ? 存疑標記"
                    />
                  </template>
                  <span v-else class="text-sm text-[var(--jc-muted)]">本詞條無標記</span>
                </div>
              </div>
              <!-- 常用字候選 -->
              <div>
                <div class="text-xs font-semibold text-[var(--jc-muted)] mb-1">常用字候選</div>
                <div
                  class="text-sm"
                  :class="header?.commonCharCandidates
                    ? 'text-[var(--jc-ink-strong)] dark:text-slate-100 jc-headword-rare-font'
                    : 'text-[var(--jc-muted)]'"
                >
                  {{ header?.commonCharCandidates || '—（原表無候選字）' }}
                </div>
              </div>
            </div>

            <!-- 釋義（原表整段） -->
            <div class="mt-5">
              <div class="text-xs font-semibold text-[var(--jc-muted)] mb-1">釋義（原表整段）</div>
              <div
                class="border border-[var(--jc-border)] bg-[#FAFAF6] dark:bg-[var(--jc-dark-surface)] dark:text-slate-200 px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap"
              >
                {{ header?.definitionRaw || '—' }}
              </div>
            </div>

            <!-- 義項卡 -->
            <div class="mt-4">
              <div class="text-xs font-semibold text-[var(--jc-muted)] mb-2">
                義項<template v-if="data.senses.length">（{{ data.senses.length }} 條）</template>
              </div>
              <div v-if="data.senses.length" class="grid sm:grid-cols-3 gap-3">
                <div
                  v-for="(sense, index) in data.senses"
                  :key="index"
                  class="border border-[var(--jc-border)] bg-white dark:bg-[var(--jc-dark-surface)] p-3 shadow-[var(--jc-shadow-hard)]"
                >
                  <div class="flex items-center gap-2 mb-1.5">
                    <span class="w-5 h-5 shrink-0 flex items-center justify-center text-[11px] font-bold text-white bg-[var(--jc-accent)]">
                      {{ sense.label || index + 1 }}
                    </span>
                    <span class="text-sm font-semibold text-[var(--jc-ink-strong)] dark:text-slate-100 leading-relaxed">
                      {{ sense.definition }}
                    </span>
                  </div>
                </div>
              </div>
              <p v-else class="text-[11px] text-[var(--jc-muted)]">原表釋義未分段，無獨立義項。</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ============ 區塊 2：各方言點方音 ============ -->
      <section class="mb-6">
        <FaanjyutSectionHeader
          icon="i-heroicons-building-library"
          title="各方言點方音"
          :subtitle="`共 <strong>${domesticPronunciations.length}</strong> 個方言列視圖 · 本區全部唯讀，編輯請回<a href='/faanjyut' class='underline text-blue-600'>矩陣頁</a>`"
        />

        <!-- 四態圖例 -->
        <div class="jc-card px-3 py-2 mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--jc-body)] dark:text-slate-300">
          <span class="font-semibold text-[var(--jc-muted)]">圖例：</span>
          <span class="inline-flex items-center gap-1.5">
            <span class="inline-flex items-center justify-center w-10 h-6 border border-gray-300 jc-mono text-[11px] bg-white">mai1</span>
            normal（有值）
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="inline-flex items-center justify-center w-10 h-6 border border-gray-300 jc-mono text-[11px] bg-slate-100 text-gray-400">_</span>
            <code class="jc-mono">_</code>（確定沒有）
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="inline-flex items-center justify-center w-10 h-6 border border-gray-300 jc-mono text-[11px] bg-amber-50 text-gray-400 line-through">mai1</span>
            已清空（曾有內容）
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="inline-flex items-center justify-center w-10 h-6 border border-gray-300"></span>
            空白（原表無記錄）
          </span>
        </div>

        <div v-if="domesticPronunciations.length" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <FaanjyutPronunciationCard
            v-for="item in domesticPronunciations"
            :key="item.columnId"
            :item="item"
          />
        </div>
        <p v-else class="text-sm text-[var(--jc-muted)]">本詞條無方言點方音記錄。</p>
      </section>

      <!-- ============ 區塊 3：域外材料 ============ -->
      <section class="mb-6">
        <FaanjyutSectionHeader
          icon="i-heroicons-globe-alt"
          title="域外材料"
          :subtitle="`按 46 個域外 languageCode 權威集合分組 · 共 <strong>${externalTotal}</strong> 條 · 全部唯讀`"
        />

        <div v-if="data.externalMaterials.length" class="jc-card divide-y divide-gray-200 dark:divide-slate-700">
          <div
            v-for="group in data.externalMaterials"
            :key="group.languageCode"
            class="p-3 flex flex-col sm:flex-row sm:items-start gap-3"
          >
            <div class="sm:w-32 shrink-0">
              <span class="inline-flex items-center px-2 py-0.5 text-xs font-semibold border border-[var(--jc-border)] bg-[var(--jc-accent-soft)] text-[var(--jc-ink-strong)] dark:text-slate-200">
                {{ group.languageLabel }}
              </span>
              <span class="block text-[11px] text-[var(--jc-muted)] jc-mono mt-0.5">{{ group.languageCode }}</span>
            </div>
            <div class="flex-1 min-w-0 space-y-2.5">
              <div
                v-for="item in group.items"
                :key="item.id"
                class="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-sm"
              >
                <div>
                  <span class="text-xs text-[var(--jc-muted)]">原文</span><br>
                  <code class="jc-mono text-blue-600 dark:text-blue-400 font-semibold">{{ item.raw || '—' }}</code>
                </div>
                <div>
                  <span class="text-xs text-[var(--jc-muted)]">讀音</span><br>
                  <code class="jc-mono">{{ item.phonetic || '—' }}</code>
                </div>
                <div>
                  <span class="text-xs text-[var(--jc-muted)]">文字形式</span><br>
                  <span class="jc-headword-rare-font">{{ item.scriptForm || '—' }}</span>
                </div>
                <div>
                  <span class="text-xs text-[var(--jc-muted)]">對譯</span><br>
                  {{ item.gloss || '—' }}
                </div>
                <div>
                  <span class="text-xs text-[var(--jc-muted)]">語言點</span><br>
                  {{ item.sourceDetail || '—' }}
                </div>
                <div>
                  <span class="text-xs text-[var(--jc-muted)]">備註</span><br>
                  {{ item.note || '—' }}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="jc-card p-4 text-sm text-[var(--jc-muted)]">本詞條無域外記錄。</div>
      </section>

      <!-- ============ 區塊 4：DQ／DR 與 Link ============ -->
      <section class="mb-6">
        <FaanjyutSectionHeader
          icon="i-heroicons-link"
          title="DQ／DR 與 Link"
          subtitle="從本詞條出發的關係記錄；未解析／斷裂條目灰化"
        />

        <div v-if="data.links.length" class="grid md:grid-cols-2 gap-3">
          <div
            v-for="link in data.links"
            :key="link.id"
            class="jc-card p-4"
            :class="{ 'opacity-60': link.unresolved || link.broken }"
            :title="(link.unresolved || link.broken) ? '未解析：目標未能解析為任何詞條' : undefined"
          >
            <div class="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <div class="flex items-center gap-2 flex-wrap">
                <FaanjyutToneChip tone="blue" :label="linkTypeLabel(link.type)" />
                <FaanjyutToneChip tone="gray" :label="link.rawSource || '—'" />
              </div>
              <FaanjyutToneChip v-if="link.unresolved || link.broken" tone="gray" label="未解析" />
            </div>

            <div class="flex items-center gap-3 my-3">
              <div class="text-center min-w-0">
                <div class="jc-headword-rare-font font-bold text-2xl text-[var(--jc-ink-strong)] dark:text-slate-100">{{ repCharDisplay }}</div>
                <div class="jc-mono text-[11px] text-[var(--jc-muted)]">{{ compositePronunciation?.display || '—' }}</div>
              </div>
              <UIcon name="i-heroicons-arrow-right" class="w-6 h-6 shrink-0 text-[var(--jc-accent)]" />
              <div class="text-center min-w-0">
                <template v-if="link.targetLexeme">
                  <NuxtLink :to="`/faanjyut/lexemes/${link.targetLexeme.id}`" class="group inline-block">
                    <div class="jc-headword-rare-font font-bold text-2xl group-hover:text-[var(--jc-accent)] dark:text-slate-100">
                      {{ linkTargetRepChar(link) || link.targetRaw || '？' }}
                    </div>
                    <div class="jc-mono text-[11px] text-blue-600 group-hover:underline">
                      {{ link.targetLexeme.sourceKey || link.targetLexeme.id }}
                    </div>
                  </NuxtLink>
                </template>
                <template v-else>
                  <div class="jc-headword-rare-font font-bold text-2xl text-gray-400">{{ link.targetRaw || '？' }}</div>
                  <div class="jc-mono text-[11px] text-gray-400">{{ link.targetKey || '—' }}</div>
                </template>
              </div>
            </div>

            <div
              v-if="link.rawLabel || link.rawValue || link.targetRaw"
              class="text-xs text-[var(--jc-muted)]"
            >
              DQ／DR 原文：
              <code class="jc-mono bg-[var(--jc-canvas-soft)] dark:bg-[var(--jc-dark-surface-muted)] border border-[var(--jc-border)] px-1.5 py-0.5">
                {{ link.rawLabel || link.rawValue || link.targetRaw }}
              </code>
            </div>
          </div>
        </div>
        <div v-else class="jc-card p-4 text-sm text-[var(--jc-muted)]">本詞條無關係記錄。</div>
      </section>

      <!-- ============ 區塊 5：原表批註 ============ -->
      <section class="mb-6">
        <FaanjyutSectionHeader
          icon="i-heroicons-chat-bubble-left-right"
          title="原表批註"
          subtitle="<strong>Excel／Google Sheet 原表批註，唯讀</strong> · 已依《備注過濾規則》脫敏 · 按格掛載"
        />

        <div v-if="data.comments.length" class="space-y-3">
          <div
            v-for="comment in data.comments"
            :key="comment.id"
            class="jc-card p-3"
            :class="{ 'ml-8 pl-4 border-l-2': comment.threadedPlaceholder }"
          >
            <div class="flex items-start gap-2.5">
              <span
                class="w-6 h-6 rounded-full bg-slate-500 text-white text-[11px] flex items-center justify-center shrink-0 mt-0.5"
              >{{ authorInitial(comment.author) }}</span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 text-xs text-[var(--jc-muted)] mb-1 flex-wrap">
                  <span class="font-medium text-[var(--jc-body)] dark:text-slate-300">{{ comment.author || '原表用戶' }}</span>
                  <span>·</span>
                  <span class="jc-mono">{{ formatFaanJyutDateTime(comment.originalTimestamp) }}</span>
                  <FaanjyutToneChip tone="slate" :label="`${faanJyutTargetTypeLabel(comment.targetType)}批註`" />
                  <FaanjyutToneChip
                    v-if="comment.threadedPlaceholder"
                    tone="gray"
                    label="舊版線程佔位"
                    title="舊版線程關係佔位，回覆縮排表示"
                  />
                </div>
                <p class="text-sm leading-relaxed dark:text-slate-200">{{ comment.content }}</p>
                <p v-if="comment.sourceCell" class="text-[11px] text-[var(--jc-muted)] mt-1">
                  源表座標：<code class="jc-mono">{{ comment.sourceCell }}</code>
                </p>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="jc-card p-4 text-sm text-[var(--jc-muted)]">本詞條無原表批註。</div>

        <!-- 平台評論 Post-launch 灰條 -->
        <div class="bg-[#F1F5F9] dark:bg-slate-800/60 border border-[var(--jc-border)] p-4 mt-3 flex items-start gap-3 shadow-[var(--jc-shadow-hard)]">
          <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
          <div>
            <p class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              平台評論（寫入）功能降級 Post-launch。v1 期間協作討論請使用表外渠道；原表批註已在上方完整保留、唯讀展示。
            </p>
            <p class="text-[11px] text-slate-400 dark:text-slate-500 mt-1">本頁不提供評論輸入框。</p>
          </div>
        </div>
      </section>

      <!-- ============ 區塊 6：編輯歷史 ============ -->
      <section class="mb-6">
        <FaanjyutSectionHeader
          icon="i-heroicons-clock"
          title="編輯歷史"
          subtitle="歷史按組內 Entry 聚合；被覆蓋的值可人工恢復"
        />

        <div class="bg-[#EFF6FF] dark:bg-slate-800/60 border border-[#93C5FD] dark:border-slate-700 px-3 py-2 mb-3 text-xs text-[#1E40AF] dark:text-blue-300">
          使用説明：本區復用平台 EditHistory（entryId）；v1 採 last-write-wins，每次寫入（包括撤銷）都留歷史快照，被覆蓋的值可人工恢復。
        </div>

        <div v-if="data.editHistory.length" class="jc-card p-4">
          <div class="space-y-5">
            <div
              v-for="h in data.editHistory"
              :key="h.id"
              class="relative pl-4 border-l-2 border-gray-200 dark:border-slate-700"
            >
              <span
                class="absolute -left-[5px] top-1 w-2 h-2 rounded-full"
                :class="h.userId === SYSTEM_IMPORT_USER
                  ? 'bg-[var(--jc-accent)]'
                  : 'bg-slate-400 dark:bg-slate-500'"
              />
              <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--jc-muted)] mb-1">
                <span class="jc-mono">{{ formatFaanJyutDateTime(h.createdAt) }}</span>
                <span>·</span>
                <span class="font-bold text-[var(--jc-ink-strong)] dark:text-slate-100">{{ userDisplay(h.userId) }}</span>
                <span v-if="h.userId === SYSTEM_IMPORT_USER" class="jc-mono text-[10px]">（system:faanjyut_import）</span>
                <FaanjyutToneChip tone="gray" :label="faanJyutActionLabel(h.action)" />
                <FaanjyutToneChip v-if="h.isReverted" tone="amber" label="已撤銷" />
              </div>
              <p v-if="h.changedFields?.length" class="text-xs text-[var(--jc-muted)] mb-1">
                變更欄位：<code class="jc-mono">{{ h.changedFields.join('、') }}</code>
              </p>
              <div v-if="historyDiff(h).length" class="jc-mono text-sm flex items-center gap-2 flex-wrap">
                <template v-for="pair in historyDiff(h)" :key="pair.field">
                  <span class="px-2 py-0.5 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300 border border-red-200 dark:border-red-500/30 line-through">
                    {{ faanJyutDisplayValue(pair.before) }}
                  </span>
                  <UIcon name="i-heroicons-arrow-right" class="w-4 h-4 text-[var(--jc-muted)]" />
                  <span class="px-2 py-0.5 bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300 border border-green-200 dark:border-green-500/30">
                    {{ faanJyutDisplayValue(pair.after) }}
                  </span>
                </template>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="jc-card p-4 text-sm text-[var(--jc-muted)]">本詞條尚無編輯歷史。</div>
      </section>

      <!-- ============ 區塊 7：導入追溯（摺疊） ============ -->
      <section class="mb-6">
        <details class="jc-card group">
          <summary class="px-4 py-3 flex items-center gap-2 cursor-pointer hover:bg-black/[.02] dark:hover:bg-black/20 select-none">
            <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-[var(--jc-muted)] transition-transform group-open:rotate-90" />
            <span class="text-sm font-semibold text-[var(--jc-ink-strong)] dark:text-slate-100">導入追溯</span>
            <span class="text-[11px] text-[var(--jc-muted)]">來源工作簿 · 來源分頁 · 源表行 · 導入批次 · 穩定 ID</span>
          </summary>
          <div class="border-t border-gray-200 dark:border-slate-700 p-4">
            <dl class="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt class="text-xs font-semibold text-[var(--jc-muted)] mb-0.5">來源工作簿</dt>
                <dd class="jc-mono">{{ data.importTrace.sourceWorkbook || '—' }}</dd>
              </div>
              <div>
                <dt class="text-xs font-semibold text-[var(--jc-muted)] mb-0.5">來源分頁</dt>
                <dd class="jc-mono">{{ data.importTrace.sourceSheet || '—' }}</dd>
              </div>
              <div>
                <dt class="text-xs font-semibold text-[var(--jc-muted)] mb-0.5">源表行</dt>
                <dd class="jc-mono">{{ data.importTrace.sourceRow ?? '—' }}</dd>
              </div>
              <div>
                <dt class="text-xs font-semibold text-[var(--jc-muted)] mb-0.5">導入批次</dt>
                <dd>
                  <NuxtLink
                    v-if="data.importTrace.importBatchId"
                    :to="`/faanjyut/import-batches/${data.importTrace.importBatchId}`"
                    class="jc-mono text-blue-600 underline"
                  >{{ data.importTrace.importBatchId }}</NuxtLink>
                  <span v-else class="text-[var(--jc-muted)]">—</span>
                </dd>
              </div>
              <div>
                <dt class="text-xs font-semibold text-[var(--jc-muted)] mb-0.5">矩陣序</dt>
                <dd class="jc-mono">{{ header?.matrixOrder ?? '—' }}</dd>
              </div>
              <div class="sm:col-span-2 lg:col-span-3">
                <dt class="text-xs font-semibold text-[var(--jc-muted)] mb-0.5">穩定 ID（lexeme）</dt>
                <dd>
                  <FaanjyutCopyText :value="data.importTrace.stableId" />
                </dd>
              </div>
            </dl>
            <p class="text-[11px] text-[var(--jc-muted)] mt-3">
              檔名、工作表名與批次 ID 前綴形態（<code class="jc-mono">fjb_</code> + 16 位）取自契約；點擊批次 ID 前往<a href="/faanjyut/import-batches" class="underline text-blue-600">導入批次報告</a>。
            </p>
          </div>
        </details>
      </section>

      <!-- ============ 區塊 8：本頁不放的東西（頁尾灰條） ============ -->
      <section class="mb-6">
        <div class="bg-[#F1F5F9] dark:bg-slate-800/60 border border-[var(--jc-border)] px-4 py-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          本頁沒有：審核狀態流轉、提交／通過／退回按鈕、發佈動作——皆為有意省略（v1 設計 §3）。詞條資料唯讀展示，編輯一律回
          <NuxtLink to="/faanjyut" class="underline text-blue-600">矩陣頁</NuxtLink>進行。
        </div>
      </section>
    </template>
  </div>
</template>
