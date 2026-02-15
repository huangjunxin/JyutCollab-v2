// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

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
    'nuxt-auth-utils'
  ],

  // Global CSS (Nuxt UI + Tailwind)
  css: [
    '~/assets/css/main.css'
  ],

  runtimeConfig: {
    // Server-side only
    mongodbUri: process.env.MONGODB_URI || '',
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    openrouterApiKey: process.env.OPENROUTER_API_KEY || '',

    // Public
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3100',
      siteName: process.env.NUXT_PUBLIC_SITE_NAME || 'JyutCollab v2'
    }
  },

  // Nitro configuration
  nitro: {
    // 開發模式下 API 服務端口配置
    devStorage: {
      storage: {
        driver: 'memory'
      }
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
        { name: 'description', content: '粵語多音節表達詞條協作編寫平台' }
      ]
    }
  },

  // Pinia configuration
  pinia: {
    storesDirs: ['./app/stores/**']
  }
})
