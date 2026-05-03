# Technology Stack

**Analysis Date:** 2026-04-29

## Languages

**Primary:**
- TypeScript - Application source uses strict TypeScript in `nuxt.config.ts`, `server/**/*.ts`, `app/composables/*.ts`, `app/types/*.ts`, and `shared/dialects.ts`.
- Vue Single File Components - UI pages and components live under `app/pages/**/*.vue`, `app/components/**/*.vue`, `app/layouts/*.vue`, and `app/app.vue`.

**Secondary:**
- CSS - Global Tailwind/Nuxt UI imports and theme overrides live in `app/assets/css/main.css`.
- JSON - Package and lockfile metadata live in `package.json`, `package-lock.json`, and TypeScript references in `tsconfig.json`.
- Markdown - Project guidance and README live in `CLAUDE.md`, `AGENTS.md`, and `README.md`.

## Runtime

**Environment:**
- Node.js - Local runtime observed as `v24.14.1`; `package.json` does not declare an `engines` field; `README.md` documents Node.js 18+.
- npm - Local npm observed as `11.11.0`; scripts in `package.json` use npm-compatible commands.
- Nuxt/Nitro server runtime - API routes under `server/api/**/*.ts` run as Nitro/H3 event handlers; server middleware lives in `server/middleware/auth.ts`.

**Package Manager:**
- npm - `package-lock.json` lockfileVersion 3 is present and should be treated as the authoritative dependency lock.
- Lockfile: present at `package-lock.json`.

## Frameworks

**Core:**
- Nuxt `4.3.1` - Full-stack Vue framework configured in `nuxt.config.ts`; app source uses the Nuxt 4 `app/` directory convention.
- Vue `3.5.28` - Component framework used by `app/pages/**/*.vue` and `app/components/**/*.vue` with `<script setup lang="ts">` patterns.
- vue-router `4.6.4` - Provided through Nuxt file-based routing for pages under `app/pages/`.
- Nitro `2.13.1` - Nuxt server engine resolved in `package-lock.json`; H3 handlers are defined under `server/api/`.
- @nuxt/ui `4.4.0` - UI component system enabled in `nuxt.config.ts` modules and configured in `app/app.config.ts` with `primary: 'green'` and `neutral: 'slate'`.
- Tailwind CSS `4.1.18` - CSS framework imported through `app/assets/css/main.css` via `@import "tailwindcss";` and `@import "@nuxt/ui";`.
- Reka UI `2.7.0` - Transitive headless UI layer used by Nuxt UI, resolved in `package-lock.json`.

**Testing:**
- Not detected - No `vitest.config.*`, `jest.config.*`, `playwright.config.*`, `cypress.config.*`, `*.test.*`, or `*.spec.*` files were detected in the repository scan.

**Build/Dev:**
- Nuxt CLI `4.3.1` - `npm run dev` runs `nuxt dev --port 3100`; `npm run build` runs `nuxt build`; `npm run generate` runs `nuxt generate`; `npm run preview` runs `nuxt preview`; `npm run postinstall` runs `nuxt prepare` in `package.json`.
- Vite `7.3.1` - Nuxt build/dev bundler resolved in `package-lock.json`.
- TypeScript `5.9.3` - Transitive compiler resolved in `package-lock.json`; strict mode is enabled at `nuxt.config.ts` lines 59-62.
- Nuxt DevTools - Enabled for development in `nuxt.config.ts` lines 6-8.
- @iconify-json/heroicons `1.2.3` and @iconify-json/lucide `1.2.91` - Icon collections used by Nuxt UI components, declared in `package.json`.

## Key Dependencies

**Critical:**
- `mongoose` `9.2.1` - MongoDB ODM used by models in `server/utils/Entry.ts`, `server/utils/User.ts`, `server/utils/Theme.ts`, `server/utils/EditHistory.ts`, `server/utils/Lexeme.ts`, `server/utils/ExternalEtymon.ts`, `server/utils/Notification.ts`, and `server/utils/AISuggestion.ts`.
- `nuxt-auth-utils` `0.5.28` - Session auth provider enabled in `nuxt.config.ts` and used through `setUserSession()`, `getUserSession()`, `clearUserSession()`, and `useUserSession()` in `server/api/auth/*.ts`, `server/middleware/auth.ts`, and `app/composables/useAuth.ts`.
- `bcrypt` `6.0.0` - Password hashing and verification in `server/utils/auth.ts` with 12 salt rounds.
- `jose` `6.1.3` - JWT signing and verification helper in `server/utils/auth.ts`; current session flow primarily uses `nuxt-auth-utils`, but JWT helpers remain available.
- `zod` `4.3.6` - Request validation in API routes such as `server/api/auth/login.post.ts`, `server/api/auth/register.post.ts`, `server/api/entries/index.get.ts`, and `server/api/ai/*.post.ts`.
- `openai` `6.21.0` - OpenAI-compatible SDK used in `server/utils/ai.ts` against the OpenRouter base URL.
- `opencc-js` `1.0.5` - Hong Kong Traditional Chinese conversion in `server/utils/textConversion.ts`; AI output is normalized through this utility in `server/utils/ai.ts`.
- `cloudinary` `2.9.0` - Server-side image upload and URL generation in `server/utils/cloudinary.ts` and `server/api/upload/image.post.ts`.
- `heic2any` `0.0.4` - Client-only HEIC/HEIF conversion dynamically imported in `app/components/entries/EntrySensesExpand.vue`.
- `pinia` `3.0.4` and `@pinia/nuxt` `0.11.3` - State management module configured in `nuxt.config.ts`; no current `app/stores/` directory was detected.

**Infrastructure:**
- MongoDB Atlas or MongoDB-compatible database - Connection string is read from `MONGODB_URI` in `nuxt.config.ts` and consumed by `server/utils/db.ts`.
- OpenRouter - AI provider configured through `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` in `nuxt.config.ts`; implementation lives in `server/utils/ai.ts`.
- Cloudinary - Image storage and CDN configured through `NUXT_CLOUDINARY_CLOUD_NAME`, `NUXT_CLOUDINARY_API_KEY`, and `NUXT_CLOUDINARY_API_SECRET`; implementation lives in `server/utils/cloudinary.ts` and `app/composables/useSenseImageUrl.ts`.
- Jyutdict public API - Server proxies live in `server/api/jyutdict/general.get.ts` and `server/api/jyutdict/sheet.get.ts`.
- Jyutjyu public API - Server proxy lives in `server/api/jyutjyu/search.get.ts`.

## Configuration

**Environment:**
- Environment variables are defined by example in `.env.example`; `.env` is present and must not be committed or read because it contains local secrets/configuration.
- Server-only runtime config is defined in `nuxt.config.ts` under `runtimeConfig`: `mongodbUri`, `jwtSecret`, `openrouterApiKey`, `openrouterModel`, `cloudinaryCloudName`, `cloudinaryApiKey`, and `cloudinaryApiSecret`.
- Public runtime config is defined in `nuxt.config.ts` under `runtimeConfig.public`: `cloudinaryCloudName`, `siteUrl`, and `siteName`.
- Required local environment variables documented in `.env.example`: `MONGODB_URI`, `NUXT_SESSION_PASSWORD`, `JWT_SECRET`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `NUXT_CLOUDINARY_CLOUD_NAME`, `NUXT_CLOUDINARY_API_KEY`, `NUXT_CLOUDINARY_API_SECRET`, `NUXT_PORT`, `NUXT_PUBLIC_SITE_URL`, and `NUXT_PUBLIC_SITE_NAME`.
- Development defaults in `nuxt.config.ts`: `JWT_SECRET` falls back to `dev-jwt-secret-do-not-use-in-production` outside production, `OPENROUTER_MODEL` falls back to `qwen/qwen3-235b-a22b-07-25`, `NUXT_PUBLIC_SITE_URL` falls back to `http://localhost:3100`, and `NUXT_PUBLIC_SITE_NAME` falls back to `JyutCollab v2`.
- Chinese text must use Hong Kong Traditional Chinese per `CLAUDE.md`; conversion helpers live in `server/utils/textConversion.ts`.

**Build:**
- Nuxt configuration: `nuxt.config.ts` sets `compatibilityDate: '2025-07-15'`, enables DevTools, registers modules, configures runtime config, enables strict TypeScript, and defines app head metadata.
- TypeScript references: `tsconfig.json` references generated Nuxt tsconfigs under `.nuxt/`; run `npm run postinstall` or `npx nuxt prepare` when generated types are missing.
- UI theme configuration: `app/app.config.ts` sets Nuxt UI colors; `app/assets/css/main.css` imports Tailwind and Nuxt UI.
- Alias configuration: `nuxt.config.ts` maps `~shared` to `shared/`; source imports also use Nuxt aliases such as `~/types`, `~/utils/*`, and `~/server/utils/*`.
- Nitro dev storage: `nuxt.config.ts` configures development storage as in-memory under `nitro.devStorage.storage.driver = 'memory'`.

## Platform Requirements

**Development:**
- Install dependencies with `npm install` using `package-lock.json`.
- Start the local Nuxt server with `npm run dev`; the project expects port `3100` via `package.json` and `nuxt.config.ts`.
- Provide `.env` values based on `.env.example`; at minimum, `MONGODB_URI` is required for database-backed routes, `NUXT_SESSION_PASSWORD` is required by `nuxt-auth-utils`, `OPENROUTER_API_KEY` is required for AI routes, and Cloudinary variables are required for image upload.
- MongoDB must be reachable from the Nitro runtime; `server/utils/db.ts` caches the Mongoose connection globally.
- Browser features used by the entries UI include `localStorage`, `File`, `FormData`, `canvas`, dynamic imports, and image APIs in `app/composables/useEntriesLocalStorage.ts`, `app/composables/useColumnResize.ts`, `app/composables/useImageCompress.ts`, and `app/components/entries/EntrySensesExpand.vue`.

**Production:**
- Deployment target is not explicitly configured; no `Dockerfile`, `vercel.json`, `netlify.toml`, `wrangler.toml`, or `.github/workflows/` CI configuration was detected.
- Host as a Nuxt/Nitro server capable of running server routes in `server/api/` and persisting HttpOnly session cookies from `nuxt-auth-utils`.
- Set a production-safe `NUXT_SESSION_PASSWORD` and `JWT_SECRET`; `nuxt.config.ts` leaves `jwtSecret` undefined in production if `JWT_SECRET` is missing.
- Set `NUXT_PUBLIC_SITE_URL` and `NUXT_PUBLIC_SITE_NAME` because OpenRouter requests in `server/utils/ai.ts` send these values as `HTTP-Referer` and `X-Title` headers.
- Ensure outbound HTTPS access to MongoDB Atlas/MongoDB, `https://openrouter.ai/api/v1`, `https://res.cloudinary.com`, Cloudinary upload endpoints, `https://jyutdict.org/api/v0.9/*`, and `https://www.jyutjyu.com/api/search`.
- Provide secret environment variables through the hosting platform secret store; keep `.env` local-only.

---

*Stack analysis: 2026-04-29*
