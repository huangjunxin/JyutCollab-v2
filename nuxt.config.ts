// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  ignore: [
    '.claude/**',
    '.planning/**',
    '.output/**'
  ],

  alias: {
    '~shared': join(__dirname, 'shared')
  },

  // Dev server configuration - 前端端口
  devServer: {
    port: 3100
  },

  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
    'nuxt-auth-utils',
    '@nuxt/content'
  ],

  // Global CSS (Nuxt UI + Tailwind)
  css: [
    '~/assets/css/main.css'
  ],

  runtimeConfig: {
    // Server-side only
    mongodbUri: process.env.MONGODB_URI || '',
    // JWT Secret: 生产环境必须设置，开发环境使用默认值
    jwtSecret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? undefined : 'dev-jwt-secret-do-not-use-in-production'),
    openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
    openrouterModel: process.env.OPENROUTER_MODEL || 'deepseek-v4-flash',
    cloudinaryCloudName: process.env.NUXT_CLOUDINARY_CLOUD_NAME || '',
    cloudinaryApiKey: process.env.NUXT_CLOUDINARY_API_KEY || '',
    cloudinaryApiSecret: process.env.NUXT_CLOUDINARY_API_SECRET || '',

    // Public (e.g. for building image URLs with transforms)
    public: {
      cloudinaryCloudName: process.env.NUXT_CLOUDINARY_CLOUD_NAME || '',
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3100',
      siteName: process.env.NUXT_PUBLIC_SITE_NAME || 'JyutCollab v2'
    }
  },

  vite: {
    server: {
      watch: {
        ignored: [
          '**/.claude/**',
          '**/.planning/**',
          '**/.output/**',
          '**/node_modules/**'
        ]
      }
    }
  },

  // Nitro configuration
  nitro: {
    prerender: {
      routes: [
        '/docs',
        '/docs/quick-start',
        '/docs/account-and-permissions',
        '/docs/entries-table',
        '/docs/entry-fields',
        '/docs/workflows',
        '/docs/ai-assistance',
        '/docs/dialect-and-lexeme',
        '/docs/review-workflow',
        '/docs/history-and-revert',
        '/docs/views-filters-and-labels',
        '/docs/images-senses-and-examples',
        '/docs/keyboard-shortcuts',
        '/docs/faq'
      ]
    },
    // 開發模式下 API 服務端口配置
    devStorage: {
      storage: {
        driver: 'memory'
      }
    },
    watchOptions: {
      ignored: [
        '**/.claude/**',
        '**/.planning/**',
        '**/.output/**',
        '**/node_modules/**'
      ]
    }
  },

  // Enable TypeScript strict mode
  typescript: {
    strict: true
  },

  // App configuration
  app: {
    head: {
      title: 'JyutCollab v2',
      meta: [
        { name: 'description', content: '粵方言詞語編纂協作平台' }
      ]
    }
  },

  // Pinia configuration
  pinia: {
    storesDirs: ['./app/stores/**']
  }
})
