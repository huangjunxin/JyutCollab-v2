<template>
  <div class="space-y-6">
    <!-- Welcome Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="jc-serif text-2xl font-bold text-gray-900 dark:text-white">
          {{ welcomeTitle }}
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          這是您的 JyutCollab 儀表板
        </p>
      </div>
      <div class="flex gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-heroicons-arrow-path"
          :loading="isRefreshing"
          @click="refreshAll"
        >
          刷新
        </UButton>
        <UButton
          to="/entries"
          color="primary"
          size="lg"
          icon="i-heroicons-plus"
        >
          新建詞條
        </UButton>
      </div>
    </div>

    <!-- Quick Actions Grid -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <NuxtLink
        to="/entries"
        class="flex flex-col items-center gap-2 p-4 border border-[var(--jc-border)] bg-white dark:border-[var(--jc-dark-border)] dark:bg-slate-800 hover:bg-[var(--jc-accent-soft)] dark:hover:bg-slate-700/70 shadow-[var(--jc-shadow-hard)] transition-colors"
      >
        <UIcon name="i-heroicons-document-text" class="w-6 h-6 text-primary" />
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">瀏覽詞條</span>
      </NuxtLink>

      <NuxtLink
        to="/entries?filter=mine"
        class="flex flex-col items-center gap-2 p-4 border border-[var(--jc-border)] bg-white dark:border-[var(--jc-dark-border)] dark:bg-slate-800 hover:bg-[var(--jc-accent-soft)] dark:hover:bg-slate-700/70 shadow-[var(--jc-shadow-hard)] transition-colors"
      >
        <UIcon name="i-heroicons-user" class="w-6 h-6 text-primary" />
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">我的詞條</span>
      </NuxtLink>

      <NuxtLink
        v-if="canReview"
        to="/review"
        class="flex flex-col items-center gap-2 p-4 border border-[var(--jc-border)] bg-white dark:border-[var(--jc-dark-border)] dark:bg-slate-800 hover:bg-[var(--jc-accent-soft)] dark:hover:bg-slate-700/70 shadow-[var(--jc-shadow-hard)] transition-colors"
      >
        <UIcon name="i-heroicons-clipboard-document-check" class="w-6 h-6 text-amber-500" />
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">審核隊列</span>
      </NuxtLink>

      <NuxtLink
        to="/histories"
        class="flex flex-col items-center gap-2 p-4 border border-[var(--jc-border)] bg-white dark:border-[var(--jc-dark-border)] dark:bg-slate-800 hover:bg-[var(--jc-accent-soft)] dark:hover:bg-slate-700/70 shadow-[var(--jc-shadow-hard)] transition-colors"
      >
        <UIcon name="i-heroicons-clock" class="w-6 h-6 text-gray-500" />
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">編輯歷史</span>
      </NuxtLink>
    </div>

    <!-- Stats Cards Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- My Stats Card -->
      <UCard
        v-if="isAuthenticated"
        class="jc-card border border-[var(--jc-border)]"
      >
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-user" class="w-5 h-5 text-primary" />
            <span class="font-semibold text-gray-900 dark:text-white">我的詞條</span>
          </div>
        </template>
        <div v-if="statsLoading" class="space-y-3">
          <USkeleton class="h-6 w-full" />
          <USkeleton class="h-6 w-full" />
          <USkeleton class="h-6 w-full" />
          <USkeleton class="h-6 w-full" />
        </div>
        <div v-else class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <UIcon name="i-heroicons-document-text" class="w-4 h-4" />
              總詞條
            </span>
            <span class="text-lg font-bold text-gray-900 dark:text-white">{{ displayedUserStats.total }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <UIcon name="i-heroicons-clock" class="w-4 h-4" />
              待審核
            </span>
            <span class="text-lg font-bold text-amber-600 dark:text-amber-400">{{ displayedUserStats.pending }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <UIcon name="i-heroicons-check-circle" class="w-4 h-4" />
              已發佈
            </span>
            <span class="text-lg font-bold text-green-600 dark:text-green-400">{{ displayedUserStats.approved }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <UIcon name="i-heroicons-x-circle" class="w-4 h-4" />
              已拒絕
            </span>
            <span class="text-lg font-bold text-red-600 dark:text-red-400">{{ displayedUserStats.rejected }}</span>
          </div>
        </div>
      </UCard>

      <!-- Reviewer Stats Card -->
      <UCard
        v-if="canReview"
        class="jc-card border border-[var(--jc-border)]"
      >
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-clipboard-document-check" class="w-5 h-5 text-amber-500" />
            <span class="font-semibold text-gray-900 dark:text-white">審核數據</span>
          </div>
        </template>
        <div v-if="statsLoading" class="space-y-3">
          <USkeleton class="h-6 w-full" />
          <USkeleton class="h-6 w-full" />
        </div>
        <div v-else class="space-y-3">
          <NuxtLink
            to="/review"
            class="flex items-center justify-between hover:opacity-80 transition-opacity"
          >
            <span class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <UIcon name="i-heroicons-clock" class="w-4 h-4" />
              待審核
            </span>
            <span class="text-lg font-bold text-amber-600 dark:text-amber-400">{{ displayedReviewerStats.pending }}</span>
          </NuxtLink>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <UIcon name="i-heroicons-check-circle" class="w-4 h-4" />
              我已審核
            </span>
            <span class="text-lg font-bold text-gray-900 dark:text-white">{{ displayedReviewerStats.reviewedByMe }}</span>
          </div>
        </div>
      </UCard>

      <!-- Site Stats Card -->
      <UCard class="jc-card border border-[var(--jc-border)]">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-chart-bar" class="w-5 h-5 text-gray-500" />
            <span class="font-semibold text-gray-900 dark:text-white">全站數據</span>
          </div>
        </template>
        <div v-if="statsLoading" class="space-y-3">
          <USkeleton class="h-6 w-full" />
          <USkeleton class="h-6 w-full" />
          <USkeleton class="h-6 w-full" />
          <USkeleton class="h-6 w-full" />
        </div>
        <div v-else class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <UIcon name="i-heroicons-document-text" class="w-4 h-4" />
              總詞條
            </span>
            <span class="text-lg font-bold text-gray-900 dark:text-white">{{ siteStats.total }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <UIcon name="i-heroicons-check-circle" class="w-4 h-4" />
              已發佈
            </span>
            <span class="text-lg font-bold text-green-600 dark:text-green-400">{{ siteStats.approved }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <UIcon name="i-heroicons-clock" class="w-4 h-4" />
              待審核
            </span>
            <span class="text-lg font-bold text-amber-600 dark:text-amber-400">{{ siteStats.pending }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <UIcon name="i-heroicons-x-circle" class="w-4 h-4" />
              已拒絕
            </span>
            <span class="text-lg font-bold text-red-600 dark:text-red-400">{{ siteStats.rejected }}</span>
          </div>
        </div>
      </UCard>

      <!-- Contributor Activity Card -->
      <UCard class="jc-card border border-[var(--jc-border)]">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-users" class="w-5 h-5 text-gray-500" />
            <span class="font-semibold text-gray-900 dark:text-white">貢獻者活躍度</span>
          </div>
        </template>
        <div v-if="statsLoading" class="space-y-3">
          <USkeleton class="h-6 w-full" />
          <USkeleton class="h-6 w-full" />
          <USkeleton class="h-6 w-full" />
        </div>
        <div v-else class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <UIcon name="i-heroicons-user-group" class="w-4 h-4" />
              實際貢獻者
            </span>
            <span class="text-lg font-bold text-gray-900 dark:text-white">{{ siteStats.contributors }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <UIcon name="i-heroicons-bolt" class="w-4 h-4" />
              近7天活躍
            </span>
            <span class="text-lg font-bold text-primary">{{ siteStats.activeContributors }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <UIcon name="i-heroicons-pencil-square" class="w-4 h-4" />
              近7天貢獻
            </span>
            <span class="text-lg font-bold text-green-600 dark:text-green-400">{{ siteStats.recentContributions }}</span>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Enhanced Stats Section -->
    <div v-if="isAuthenticated" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- My Contribution Stats (Enhanced) -->
      <UCard
        class="jc-card border border-[var(--jc-border)]"
      >
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-chart-pie" class="w-5 h-5 text-primary" />
              <span class="font-semibold text-gray-900 dark:text-white">我的貢獻統計</span>
            </div>
          </div>
        </template>
        <div v-if="enhancedStatsLoading" class="space-y-3">
          <USkeleton class="h-6 w-full" />
          <USkeleton class="h-6 w-full" />
          <USkeleton class="h-6 w-full" />
        </div>
        <div v-else class="space-y-4">
          <!-- Streak Badge -->
          <div v-if="displayedEnhancedUserStats.streak.current > 0" class="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <UIcon name="i-heroicons-fire" class="w-5 h-5 text-amber-500" />
            <span class="text-sm font-medium text-amber-700 dark:text-amber-300">
              連續貢獻 {{ displayedEnhancedUserStats.streak.current }} 天
            </span>
          </div>

          <!-- Approval Rate -->
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400">審批通過率</span>
            <div class="flex items-center gap-2">
              <div class="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  class="h-full bg-green-500 rounded-full"
                  :style="{ width: `${displayedEnhancedUserStats.approvalRate * 100}%` }"
                />
              </div>
              <span class="text-sm font-bold text-gray-900 dark:text-white">
                {{ Math.round(displayedEnhancedUserStats.approvalRate * 100) }}%
              </span>
            </div>
          </div>

          <!-- Recent Activity (7 days) -->
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400">近7天新建</span>
            <span class="text-lg font-bold text-gray-900 dark:text-white">{{ displayedEnhancedUserStats.recentActivity.entriesCreated }}</span>
          </div>

          <!-- Top Dialects -->
          <div v-if="displayedEnhancedUserStats.byDialect.length > 0">
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">方言分布</p>
            <div class="flex flex-wrap gap-1">
              <UBadge
                v-for="d in displayedEnhancedUserStats.byDialect.slice(0, 3)"
                :key="d.dialect"
                color="primary"
                variant="subtle"
              >
                {{ getDialectLabel(d.dialect) }}: {{ d.count }}
              </UBadge>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Reviewer Progress Card (Enhanced) -->
      <UCard
        v-if="canReview"
        class="jc-card border border-[var(--jc-border)]"
      >
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-clock" class="w-5 h-5 text-amber-500" />
            <span class="font-semibold text-gray-900 dark:text-white">審核進度</span>
          </div>
        </template>
        <div v-if="enhancedStatsLoading" class="space-y-3">
          <USkeleton class="h-6 w-full" />
          <USkeleton class="h-6 w-full" />
          <USkeleton class="h-6 w-full" />
        </div>
        <div v-else class="space-y-4">
          <!-- Urgency Buckets -->
          <div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">待審核緊急度</p>
            <div class="space-y-2">
              <div
                v-for="bucket in displayedEnhancedReviewerStats.urgencyBuckets"
                :key="bucket.range"
                class="flex items-center justify-between text-sm"
              >
                <span class="text-gray-600 dark:text-gray-400">{{ bucket.range }}</span>
                <span
                  :class="[
                    'font-bold',
                    bucket.range === '24小時內' && bucket.count > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
                  ]"
                >
                  {{ bucket.count }}
                </span>
              </div>
            </div>
          </div>

          <!-- My Performance -->
          <div class="pt-2 border-t border-gray-100 dark:border-gray-800">
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">我的審核效率</p>
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-600 dark:text-gray-400">今日審核</span>
              <span class="font-bold text-gray-900 dark:text-white">{{ displayedEnhancedReviewerStats.myPerformance.todayReviewed }}</span>
            </div>
            <div class="flex items-center justify-between text-sm mt-1">
              <span class="text-gray-600 dark:text-gray-400">本週審核</span>
              <span class="font-bold text-gray-900 dark:text-white">{{ displayedEnhancedReviewerStats.myPerformance.thisWeekReviewed }}</span>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Filling Assistance Analytics Card -->
      <UCard
        v-if="canReview"
        class="jc-card border border-[var(--jc-border)]"
      >
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-sparkles" class="w-5 h-5 text-violet-500" />
              <span class="font-semibold text-gray-900 dark:text-white">填寫輔助成效</span>
            </div>
            <div class="inline-flex rounded-md border border-[var(--jc-border)] bg-white p-0.5 dark:bg-slate-900">
              <UButton
                :color="assistanceStatsTab === 'ai' ? 'primary' : 'neutral'"
                :variant="assistanceStatsTab === 'ai' ? 'solid' : 'ghost'"
                size="xs"
                @click="assistanceStatsTab = 'ai'"
              >
                AI 建議
              </UButton>
              <UButton
                :color="assistanceStatsTab === 'references' ? 'primary' : 'neutral'"
                :variant="assistanceStatsTab === 'references' ? 'solid' : 'ghost'"
                size="xs"
                @click="assistanceStatsTab = 'references'"
              >
                參考資料
              </UButton>
            </div>
          </div>
        </template>
        <div v-if="assistanceStatsTab === 'ai' && (aiSuggestionStatsLoading || !aiSuggestionStats)" class="space-y-3">
          <USkeleton class="h-6 w-full" />
          <USkeleton class="h-6 w-full" />
        </div>
        <div v-else-if="assistanceStatsTab === 'ai'" class="space-y-3">
          <div class="grid grid-cols-3 gap-3">
            <div>
              <p class="text-xs text-gray-500 dark:text-gray-400">總建議</p>
              <p class="text-xl font-bold text-gray-900 dark:text-white">{{ aiSuggestionStats.total }}</p>
            </div>
            <div>
              <p class="text-xs text-green-700 dark:text-green-300">採納率</p>
              <p class="text-xl font-bold text-green-700 dark:text-green-300">{{ formatPercent(aiAdoptionRate) }}</p>
            </div>
            <div>
              <p class="text-xs text-blue-700 dark:text-blue-300">待審閱</p>
              <p class="text-xl font-bold text-blue-700 dark:text-blue-300">{{ aiSuggestionStats.pending }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 dark:text-gray-400">互動率</p>
              <p class="text-xl font-bold text-gray-900 dark:text-white">{{ formatPercent(aiSuggestionStats.engagementRate) }}</p>
            </div>
          </div>

          <div class="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <div class="grid grid-cols-2 gap-x-4 gap-y-2">
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">直接採納</span>
                <span class="font-bold text-green-600 dark:text-green-400">{{ aiSuggestionStats.accepted }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">修改採納</span>
                <span class="font-bold text-blue-600 dark:text-blue-400">{{ aiSuggestionStats.modified }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">已拒絕</span>
                <span class="font-bold text-red-600 dark:text-red-400">{{ aiSuggestionStats.rejected }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">已忽略</span>
                <span class="font-bold text-gray-500 dark:text-gray-400">{{ aiSuggestionStats.ignored }}</span>
              </div>
              <div class="flex items-center justify-between text-sm col-span-2">
                <span class="text-gray-600 dark:text-gray-400">已決策（接受+修改+拒絕）</span>
                <span class="font-bold text-gray-900 dark:text-white">{{ aiReviewedCount }}</span>
              </div>
            </div>

            <div v-if="aiSuggestionStats.byType.length > 0">
              <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">按建議類型</p>
              <div class="space-y-2">
                <div
                  v-for="item in aiSuggestionStats.byType"
                  :key="item.type"
                  class="flex items-center justify-between text-sm"
                >
                  <span class="text-gray-600 dark:text-gray-400">{{ item.label }}</span>
                  <span class="font-medium text-gray-900 dark:text-white">
                    {{ item.total }} · 採納 {{ formatPercent(getTypeAdoptionRate(item)) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else-if="assistanceStatsTab === 'references' && (referenceHelperStatsLoading || !referenceHelperStats)" class="space-y-3">
          <USkeleton class="h-6 w-full" />
          <USkeleton class="h-6 w-full" />
        </div>
        <div v-else class="space-y-3">
          <div class="grid grid-cols-3 gap-3">
            <div>
              <p class="text-xs text-gray-500 dark:text-gray-400">總參考</p>
              <p class="text-xl font-bold text-gray-900 dark:text-white">{{ referenceHelperStats.total }}</p>
            </div>
            <div>
              <p class="text-xs text-green-700 dark:text-green-300">採用率</p>
              <p class="text-xl font-bold text-green-700 dark:text-green-300">{{ formatPercent(referenceAdoptionRate) }}</p>
            </div>
            <div>
              <p class="text-xs text-blue-700 dark:text-blue-300">待處理</p>
              <p class="text-xl font-bold text-blue-700 dark:text-blue-300">{{ referenceHelperStats.pending }}</p>
            </div>
          </div>

          <div class="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <div class="grid grid-cols-2 gap-x-4 gap-y-2">
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">直接採用</span>
                <span class="font-bold text-green-600 dark:text-green-400">{{ referenceHelperStats.accepted }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">修改採用</span>
                <span class="font-bold text-blue-600 dark:text-blue-400">{{ referenceHelperStats.modified }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">已略過</span>
                <span class="font-bold text-red-600 dark:text-red-400">{{ referenceHelperStats.rejected }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">已決策</span>
                <span class="font-bold text-gray-900 dark:text-white">{{ referenceReviewedCount }}</span>
              </div>
            </div>

            <div v-if="displayedReferenceHelperTypes.length > 0">
              <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">按參考類型</p>
              <div class="space-y-2">
                <div
                  v-for="item in displayedReferenceHelperTypes"
                  :key="item.type"
                  class="flex items-center justify-between text-sm"
                >
                  <span class="text-gray-600 dark:text-gray-400">{{ item.label }}</span>
                  <span class="font-medium text-gray-900 dark:text-white">
                    {{ item.total }} · 採用 {{ formatPercent(getReferenceTypeAdoptionRate(item)) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Dialect Coverage Card -->
      <UCard class="jc-card border border-[var(--jc-border)]">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-globe-alt" class="w-5 h-5 text-blue-500" />
            <span class="font-semibold text-gray-900 dark:text-white">方言覆蓋</span>
          </div>
        </template>
        <div v-if="dialectLoading || !dialectCoverage" class="space-y-3">
          <USkeleton class="h-6 w-full" />
          <USkeleton class="h-6 w-full" />
          <USkeleton class="h-6 w-full" />
        </div>
        <div v-else class="space-y-4">
          <!-- Coverage Rate -->
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400">覆蓋率</span>
            <div class="flex items-center gap-2">
              <span class="text-lg font-bold text-gray-900 dark:text-white">
                {{ dialectCoverage.coveredDialects }}/{{ dialectCoverage.totalDialects }}
              </span>
              <span class="text-sm text-gray-500">({{ Math.round(dialectCoverage.coverageRate * 100) }}%)</span>
            </div>
          </div>

          <!-- Top Dialects -->
          <div v-if="dialectCoverage.dialects.length > 0">
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">詞條最多的方言</p>
            <div class="space-y-1">
              <div
                v-for="d in dialectCoverage.dialects.slice(0, 5)"
                :key="d.id"
                class="flex items-center justify-between text-sm"
              >
                <span class="text-gray-600 dark:text-gray-400">{{ d.name }}</span>
                <span class="font-medium text-gray-900 dark:text-white">{{ d.entries }}</span>
              </div>
            </div>
          </div>

          <!-- No data -->
          <div v-else class="py-4 text-center text-gray-500 dark:text-gray-400 text-sm">
            暫無方言數據
          </div>
        </div>
      </UCard>
    </div>

    <!-- Recent Activities (Side by Side) -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- My Recent Activities -->
      <UCard
        v-if="isAuthenticated"
        class="jc-card border border-[var(--jc-border)]"
      >
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-user" class="w-5 h-5 text-primary" />
            <span class="font-semibold text-gray-900 dark:text-white">我的最近活動</span>
          </div>
        </template>

        <div v-if="myActivitiesLoading" class="space-y-3">
          <USkeleton class="h-12 w-full" />
          <USkeleton class="h-12 w-full" />
          <USkeleton class="h-12 w-full" />
        </div>

        <div v-else-if="myActivities.length === 0" class="py-8 text-center text-gray-500 dark:text-gray-400">
          暫無活動記錄
        </div>

        <div v-else class="divide-y divide-gray-100 dark:divide-gray-800">
          <div
            v-for="activity in myActivities"
            :key="activity.id"
            class="py-3 flex items-center justify-between gap-4"
          >
            <div class="flex items-center gap-3 min-w-0">
              <UIcon
                :name="getActionIcon(activity.action)"
                :class="['w-5 h-5 shrink-0', getActionIconColor(activity.action)]"
              />
              <div class="min-w-0">
                <p class="text-sm text-gray-900 dark:text-white truncate">
                  {{ getActionLabel(activity.action) }}
                  <span class="font-medium">{{ getHeadword(activity) }}</span>
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ formatTime(activity.createdAt) }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <UButton
                :to="`/entries?search=${encodeURIComponent(getHeadword(activity))}`"
                size="xs"
                color="primary"
                variant="ghost"
              >
                詞條
              </UButton>
              <UButton
                :to="`/histories?entryId=${activity.entryId}`"
                size="xs"
                color="neutral"
                variant="ghost"
              >
                歷史
              </UButton>
            </div>
          </div>
        </div>
      </UCard>

      <!-- All Recent Activities (reviewer/admin only) -->
      <UCard
        v-if="isAuthenticated && canReview"
        class="jc-card border border-[var(--jc-border)]"
      >
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-globe-alt" class="w-5 h-5 text-gray-500" />
            <span class="font-semibold text-gray-900 dark:text-white">全站最近活動</span>
          </div>
        </template>

        <div v-if="allActivitiesLoading" class="space-y-3">
          <USkeleton class="h-12 w-full" />
          <USkeleton class="h-12 w-full" />
          <USkeleton class="h-12 w-full" />
        </div>

        <div v-else-if="allActivities.length === 0" class="py-8 text-center text-gray-500 dark:text-gray-400">
          暫無活動記錄
        </div>

        <div v-else class="divide-y divide-gray-100 dark:divide-gray-800">
          <div
            v-for="activity in allActivities"
            :key="activity.id"
            class="py-3 flex items-center justify-between gap-4"
          >
            <div class="flex items-center gap-3 min-w-0">
              <UIcon
                :name="getActionIcon(activity.action)"
                :class="['w-5 h-5 shrink-0', getActionIconColor(activity.action)]"
              />
              <div class="min-w-0">
                <p class="text-sm text-gray-900 dark:text-white truncate">
                  {{ getActionLabel(activity.action) }}
                  <span class="font-medium">{{ getHeadword(activity) }}</span>
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ formatTime(activity.createdAt) }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <UButton
                :to="`/entries?search=${encodeURIComponent(getHeadword(activity))}`"
                size="xs"
                color="primary"
                variant="ghost"
              >
                詞條
              </UButton>
              <UButton
                :to="`/histories?entryId=${activity.entryId}`"
                size="xs"
                color="neutral"
                variant="ghost"
              >
                歷史
              </UButton>
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EditHistory, EditHistoryAction } from '~/types'
import { getDialectLabel } from '~shared/dialects'

definePageMeta({
  name: 'index',
  middleware: ['auth']
})

const { user, isAuthenticated, canReview } = useAuth()
const { siteStats, userStats, reviewerStats, loading: statsLoading, fetchStats } = useStats()
const {
  stats: aiSuggestionStats,
  loading: aiSuggestionStatsLoading,
  fetchStats: fetchAISuggestionStats
} = useAISuggestionStats()
const {
  stats: referenceHelperStats,
  loading: referenceHelperStatsLoading,
  fetchStats: fetchReferenceHelperStats
} = useReferenceHelperStats()

// 增強統計
const {
  userStats: enhancedUserStats,
  reviewerStats: enhancedReviewerStats,
  loading: enhancedStatsLoading,
  fetchStats: fetchEnhancedStats
} = useEnhancedStats()

// 方言覆蓋度
const {
  data: dialectCoverage,
  loading: dialectLoading,
  fetchCoverage
} = useDialectCoverage()

// 我的最近活動 - 所有登錄用戶可見
const {
  activities: myActivities,
  loading: myActivitiesLoading,
  fetchActivities: fetchMyActivities
} = useRecentActivities(5, 'mine')

// 全站最近活動 - 僅 reviewer/admin 可見
const {
  activities: allActivities,
  loading: allActivitiesLoading,
  fetchActivities: fetchAllActivities
} = useRecentActivities(5, 'all')

const welcomeTitle = computed(() => {
  const displayName = user.value?.displayName || user.value?.username
  return displayName ? `歡迎回來，${displayName}` : '歡迎回來'
})

const isRefreshing = ref(false)
const assistanceStatsTab = ref<'ai' | 'references'>('ai')
const fallbackUserStats = { total: 0, pending: 0, approved: 0, rejected: 0 }
const fallbackReviewerStats = { pending: 0, reviewedByMe: 0 }
const fallbackEnhancedUserStats = {
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  byDialect: [],
  byType: [],
  recentActivity: { entriesCreated: 0, entriesApproved: 0, entriesUpdated: 0 },
  streak: { current: 0, longest: 0 },
  approvalRate: 0,
  avgReviewTime: 0,
  dailyActivity: []
}
const fallbackEnhancedReviewerStats = {
  pending: 0,
  reviewedByMe: 0,
  urgencyBuckets: [],
  byDialect: [],
  myPerformance: {
    avgReviewTime: 0,
    approvalRate: 0,
    todayReviewed: 0,
    thisWeekReviewed: 0
  }
}

const displayedUserStats = computed(() => userStats.value || fallbackUserStats)
const displayedReviewerStats = computed(() => reviewerStats.value || fallbackReviewerStats)
const displayedEnhancedUserStats = computed(() => enhancedUserStats.value || fallbackEnhancedUserStats)
const displayedEnhancedReviewerStats = computed(() => enhancedReviewerStats.value || fallbackEnhancedReviewerStats)
const aiReviewedCount = computed(() => {
  const stats = aiSuggestionStats.value
  return stats ? stats.reviewedTotal : 0
})
const aiAdoptedCount = computed(() => {
  const stats = aiSuggestionStats.value
  return stats ? stats.accepted + stats.modified : 0
})
const aiAdoptionRate = computed(() => {
  const stats = aiSuggestionStats.value
  // 使用 API 回傳的 acceptanceRate（已正確以 reviewedTotal 為分母）
  return stats ? stats.acceptanceRate : 0
})
const referenceReviewedCount = computed(() => {
  const stats = referenceHelperStats.value
  return stats ? stats.accepted + stats.modified + stats.rejected : 0
})
const referenceAdoptedCount = computed(() => {
  const stats = referenceHelperStats.value
  return stats ? stats.accepted + stats.modified : 0
})
const referenceAdoptionRate = computed(() => referenceReviewedCount.value > 0 ? referenceAdoptedCount.value / referenceReviewedCount.value : 0)
const displayedReferenceHelperTypes = computed(() => referenceHelperStats.value?.byType || [])

async function refreshAll() {
  isRefreshing.value = true
  try {
    await Promise.all([
      fetchStats(),
      fetchCoverage(),
      fetchEnhancedStats(),
      fetchMyActivities(),
      canReview.value ? fetchAllActivities() : Promise.resolve(),
      canReview.value ? fetchAISuggestionStats() : Promise.resolve(),
      canReview.value ? fetchReferenceHelperStats() : Promise.resolve()
    ])
  } finally {
    isRefreshing.value = false
  }
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function getTypeAdoptionRate(item: { accepted: number; modified: number; rejected: number }): number {
  const reviewed = item.accepted + item.modified + item.rejected
  return reviewed > 0 ? (item.accepted + item.modified) / reviewed : 0
}

function getReferenceTypeAdoptionRate(item: { accepted: number; modified: number; rejected: number }): number {
  const reviewed = item.accepted + item.modified + item.rejected
  return reviewed > 0 ? (item.accepted + item.modified) / reviewed : 0
}

function getActionIcon(action: EditHistoryAction): string {
  const icons: Record<EditHistoryAction, string> = {
    create: 'i-heroicons-plus-circle',
    update: 'i-heroicons-pencil-square',
    delete: 'i-heroicons-trash',
    status_change: 'i-heroicons-arrow-path'
  }
  return icons[action] || 'i-heroicons-document'
}

function getActionIconColor(action: EditHistoryAction): string {
  const colors: Record<EditHistoryAction, string> = {
    create: 'text-green-500',
    update: 'text-blue-500',
    delete: 'text-red-500',
    status_change: 'text-amber-500'
  }
  return colors[action] || 'text-gray-500'
}

function getActionLabel(action: EditHistoryAction): string {
  const labels: Record<EditHistoryAction, string> = {
    create: '新建詞條',
    update: '更新詞條',
    delete: '刪除詞條',
    status_change: '狀態變更'
  }
  return labels[action] || '操作'
}

function getHeadword(activity: EditHistory): string {
  const snapshot = activity.afterSnapshot || activity.beforeSnapshot
  if (snapshot && typeof snapshot === 'object') {
    const headword = snapshot.headword as { display?: string } | undefined
    if (headword?.display) return headword.display
    const text = snapshot.text as string | undefined
    if (text) return text
  }
  return '未知詞條'
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '剛剛'
  if (diffMins < 60) return `${diffMins} 分鐘前`
  if (diffHours < 24) return `${diffHours} 小時前`
  if (diffDays < 7) return `${diffDays} 天前`

  return date.toLocaleDateString('zh-HK', {
    month: 'short',
    day: 'numeric'
  })
}

onMounted(() => {
  fetchStats()
  fetchCoverage()
  if (isAuthenticated.value) {
    fetchMyActivities()
    fetchEnhancedStats()
    if (canReview.value) {
      fetchAllActivities()
      fetchAISuggestionStats()
      fetchReferenceHelperStats()
    }
  }
})
</script>
