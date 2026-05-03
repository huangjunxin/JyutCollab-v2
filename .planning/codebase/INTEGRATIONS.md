# External Integrations

**Analysis Date:** 2026-04-29

## APIs & External Services

**AI / LLM:**
- OpenRouter - AI-powered theme classification, definition generation, and example generation.
  - Implementation: `server/utils/ai.ts`.
  - API routes: `server/api/ai/categorize.post.ts`, `server/api/ai/definitions.post.ts`, and `server/api/ai/examples.post.ts`.
  - Frontend trigger/state: `app/composables/useEntriesAISuggestions.ts` and `app/components/entries/EntrySensesExpand.vue`.
  - SDK/Client: `openai` package configured with `baseURL: 'https://openrouter.ai/api/v1'`.
  - Auth: `OPENROUTER_API_KEY` through `runtimeConfig.openrouterApiKey`.
  - Model: `OPENROUTER_MODEL` through `runtimeConfig.openrouterModel`, defaulting to `qwen/qwen3-235b-a22b-07-25`.
  - Required headers: `server/utils/ai.ts` sends `HTTP-Referer` from `NUXT_PUBLIC_SITE_URL` and `X-Title` from `NUXT_PUBLIC_SITE_NAME`.
  - Output normalization: AI text is converted to Hong Kong Traditional Chinese via `server/utils/textConversion.ts`.
  - Temperatures: categorization uses `0.2`, definitions use `0.4`, and examples use `0.6` in `server/utils/ai.ts`.
  - Validation: AI JSON responses are parsed with Zod schemas in `server/utils/ai.ts`.

**Dictionary / Linguistic Data:**
- Jyutdict - Public Cantonese/dialect data source for character detail and sheet pronunciation suggestions.
  - General API proxy: `server/api/jyutdict/general.get.ts` proxies `https://jyutdict.org/api/v0.9/detail?chara=...`.
  - Sheet API proxy: `server/api/jyutdict/sheet.get.ts` proxies `https://jyutdict.org/api/v0.9/sheet?query=...` and `https://jyutdict.org/api/v0.9/sheet?query=...&header`.
  - Frontend consumer: `app/composables/useJyutdict.ts` fetches `/api/jyutdict/general` and `/api/jyutdict/sheet` and maps dialect names to Jyutdict city names.
  - SDK/Client: native `fetch`.
  - Auth: none detected.
  - Headers: `User-Agent: JyutCollab/2.0`.
- Jyutjyu - Public search API for Jyutjyu references.
  - Search API proxy: `server/api/jyutjyu/search.get.ts` proxies `https://www.jyutjyu.com/api/search?q=...`.
  - Frontend components: `app/components/entries/JyutjyuRefRow.vue` references Jyutjyu search result display.
  - SDK/Client: native `fetch`.
  - Auth: none detected.
  - Headers: `User-Agent: JyutCollab/2.0`.

**Image CDN / Upload:**
- Cloudinary - Sense image upload, storage, and optimized delivery.
  - Server utility: `server/utils/cloudinary.ts`.
  - Upload API route: `server/api/upload/image.post.ts`.
  - Frontend upload UI: `app/components/entries/EntrySensesExpand.vue`.
  - Frontend URL helper: `app/composables/useSenseImageUrl.ts`.
  - SDK/Client: `cloudinary` package (`v2` API) server-side; direct CDN URLs client-side.
  - Auth: `NUXT_CLOUDINARY_CLOUD_NAME`, `NUXT_CLOUDINARY_API_KEY`, and `NUXT_CLOUDINARY_API_SECRET` through `runtimeConfig`.
  - Public config: `NUXT_CLOUDINARY_CLOUD_NAME` is exposed as `runtimeConfig.public.cloudinaryCloudName` for image URL generation.
  - Upload folder: default `jyutcollab/sense-images` in `server/utils/cloudinary.ts`.
  - Delivery URL: `https://res.cloudinary.com/{cloudName}/image/upload/...` generated in `server/utils/cloudinary.ts` and `app/composables/useSenseImageUrl.ts`.
  - Transform defaults: `f_auto,q_auto`; upload response also returns an 800px width limited optimized URL from `server/api/upload/image.post.ts`.

**Browser APIs:**
- Browser localStorage - Client-side table preferences and draft persistence.
  - Entry drafts: `app/composables/useEntriesLocalStorage.ts` uses `jyutcollab-entries-draft`.
  - Column widths: `app/composables/useColumnResize.ts` uses `jyutcollab-column-widths`.
  - New-entry dialect default: `app/composables/useNewEntryDialect.ts` uses `jyutcollab_new_entry_dialect`.
- Browser canvas and image APIs - Client-side image compression before upload.
  - Implementation: `app/composables/useImageCompress.ts`.
  - HEIC/HEIF conversion: `app/components/entries/EntrySensesExpand.vue` dynamically imports `heic2any` on the client.

## Data Storage

**Databases:**
- MongoDB / MongoDB Atlas-compatible database.
  - Connection: `MONGODB_URI` through `runtimeConfig.mongodbUri`.
  - Client: `mongoose` package.
  - Connection utility: `server/utils/db.ts` exports `connectDB()` and `disconnectDB()`.
  - Connection caching: `server/utils/db.ts` stores `global.mongoose = { conn, promise }` and sets `bufferCommands: false`.
  - Primary collections/models:
    - `entries` via `server/utils/Entry.ts`.
    - `users` via `server/utils/User.ts`.
    - `themes` via `server/utils/Theme.ts`.
    - `edit_histories` via `server/utils/EditHistory.ts`.
    - `lexemes` via `server/utils/Lexeme.ts`.
    - `external_etymons` via `server/utils/ExternalEtymon.ts`.
    - `notifications` via `server/utils/Notification.ts`.
    - `ai_suggestions` via `server/utils/AISuggestion.ts`.
  - Key indexes:
    - Unique `id` and unique compound `headword.display + dialect.name` in `server/utils/Entry.ts`.
    - Status, creator, theme IDs, dialect, entry type, and created date indexes in `server/utils/Entry.ts`.
    - Unique `email` and `username` in `server/utils/User.ts`.
    - `entryId + createdAt` and `userId` in `server/utils/EditHistory.ts`.
    - `userId + createdAt` and `userId + isRead` in `server/utils/Notification.ts`.

**File Storage:**
- Cloudinary for sense images.
  - Entry image references are Cloudinary `public_id` strings stored in `senses[].images` in `server/utils/Entry.ts`.
  - Upload endpoint accepts multipart form data in `server/api/upload/image.post.ts`.
  - Max upload size: 5MB in `server/api/upload/image.post.ts`.
  - Accepted MIME types: JPEG, PNG, GIF, WebP, HEIC, and HEIF in `server/api/upload/image.post.ts`.
  - Client-side per-sense limit: 3 images in `app/components/entries/EntrySensesExpand.vue`.
- Local filesystem only for static committed assets under `public/` (`public/favicon.ico`, `public/robots.txt`).

**Caching:**
- Mongoose connection cache - `server/utils/db.ts` caches connection/promise globally for reuse across Nitro invocations.
- Nuxt payload cache with TTL - `app/composables/useDataCache.ts` implements `useCachedAsyncData()` and TTLs for stats, entries, review data, histories, and dialects.
- Jyutdict column cache - `app/composables/useJyutdict.ts` stores `cachedColumns` in module scope after the first sheet header request.
- Browser localStorage cache - `app/composables/useEntriesLocalStorage.ts`, `app/composables/useColumnResize.ts`, and `app/composables/useNewEntryDialect.ts` persist user-local UI/draft state.
- Nitro development storage - `nuxt.config.ts` configures `nitro.devStorage.storage.driver = 'memory'`.
- External caching services: none detected (no Redis/Memcached/CDN cache config beyond Cloudinary image CDN URLs).

## Authentication & Identity

**Auth Provider:**
- Custom email/password auth backed by MongoDB users plus `nuxt-auth-utils` HttpOnly cookie sessions.
  - Session setup: `server/api/auth/login.post.ts` and `server/api/auth/register.post.ts` call `setUserSession()`.
  - Session clearing: `server/api/auth/logout.post.ts` calls `clearUserSession()`.
  - Session fetch/client state: `app/composables/useAuth.ts` uses `useUserSession()`.
  - API session enforcement: `server/middleware/auth.ts` calls `getUserSession()` and sets `event.context.auth`.
  - User model: `server/utils/User.ts` stores `email`, `username`, `passwordHash`, `role`, `dialectPermissions`, contribution counts, and active state.
  - Password hashing: `server/utils/auth.ts` uses `bcrypt` with `SALT_ROUNDS = 12`.
  - Authorization roles: `contributor`, `reviewer`, and `admin` in `server/utils/User.ts` and `server/utils/auth.ts`.
  - Dialect permissions: `canContributeToDialect()` in `server/utils/auth.ts` allows reviewers/admins globally and restricts contributors to listed dialects.
  - Auth type augmentation: `app/auth.d.ts` extends `#auth-utils` with `app/types/auth.ts`.
  - JWT helpers: `server/utils/auth.ts` includes `generateToken()` and `verifyToken()` using `jose` and `JWT_SECRET`; session cookie auth is the active route flow.

**Public/Protected API Boundary:**
- Public routes in `server/middleware/auth.ts`: non-`/api` paths, `/api/_auth/*`, `/api/_nuxt*`, `/api/auth/*`, `GET /api/entries`, `GET /api/entries/:id`, and `GET /api/stats`.
- All other `/api/*` routes require an authenticated `nuxt-auth-utils` session in `server/middleware/auth.ts`.
- AI routes require auth through `event.context.auth` checks in `server/api/ai/categorize.post.ts`, `server/api/ai/definitions.post.ts`, and `server/api/ai/examples.post.ts`.
- Upload route requires auth through `event.context.auth` in `server/api/upload/image.post.ts`.

## Monitoring & Observability

**Error Tracking:**
- None detected - No Sentry, Datadog, Logtail, New Relic, OpenTelemetry, or similar error tracking integration was detected.

**Logs:**
- Server logs use `console.error()` and `console.warn()` in files such as `server/utils/ai.ts`, `server/utils/auth.ts`, `server/api/entries/index.get.ts`, `server/api/jyutdict/general.get.ts`, `server/api/jyutdict/sheet.get.ts`, `server/api/jyutjyu/search.get.ts`, and `server/api/upload/image.post.ts`.
- Client logs use `console.error()`, `console.warn()`, and alerts in files such as `app/composables/useEntriesAISuggestions.ts`, `app/composables/useEntriesLocalStorage.ts`, `app/composables/useJyutdict.ts`, and `app/components/entries/EntrySensesExpand.vue`.
- Structured log shipping, log correlation IDs, and request tracing are not detected.

## CI/CD & Deployment

**Hosting:**
- Not detected - No hosting-specific config files such as `Dockerfile`, `vercel.json`, `netlify.toml`, `wrangler.toml`, or platform adapter configuration were detected.
- Operational assumption: deploy as a Nuxt/Nitro Node server that can run `server/api/**/*.ts`, access environment variables, maintain secure cookies, and connect outbound to MongoDB, OpenRouter, Cloudinary, Jyutdict, and Jyutjyu.

**CI Pipeline:**
- None detected - No `.github/workflows/` directory or other CI configuration was detected.
- Available build commands are defined in `package.json`: `npm run build`, `npm run generate`, `npm run preview`, and `npm run postinstall`.
- No repository-level lint, typecheck, or test scripts are defined in `package.json`.

## Environment Configuration

**Required env vars:**
- `MONGODB_URI` - MongoDB connection string consumed by `nuxt.config.ts` and `server/utils/db.ts`.
- `NUXT_SESSION_PASSWORD` - Required by `nuxt-auth-utils` for encrypted/signed HttpOnly session cookies; documented in `.env.example`.
- `JWT_SECRET` - Used by JWT helper functions in `server/utils/auth.ts`; `nuxt.config.ts` requires this in production if JWT helpers are used.
- `OPENROUTER_API_KEY` - Required by `server/utils/ai.ts` for OpenRouter requests.
- `OPENROUTER_MODEL` - Optional model override consumed by `server/utils/ai.ts`; defaults to `qwen/qwen3-235b-a22b-07-25`.
- `NUXT_CLOUDINARY_CLOUD_NAME` - Required for Cloudinary upload and public image URL generation in `server/utils/cloudinary.ts` and `app/composables/useSenseImageUrl.ts`.
- `NUXT_CLOUDINARY_API_KEY` - Required for Cloudinary upload in `server/utils/cloudinary.ts`.
- `NUXT_CLOUDINARY_API_SECRET` - Required for Cloudinary upload in `server/utils/cloudinary.ts`.
- `NUXT_PUBLIC_SITE_URL` - Public site URL used by OpenRouter request headers in `server/utils/ai.ts` and defaults to `http://localhost:3100` in `nuxt.config.ts`.
- `NUXT_PUBLIC_SITE_NAME` - Public site title used by OpenRouter request headers in `server/utils/ai.ts` and defaults to `JyutCollab v2` in `nuxt.config.ts`.
- `NUXT_PORT` - Documented in `.env.example`; dev server is explicitly configured to port `3100` in `package.json` and `nuxt.config.ts`.

**Secrets location:**
- Local development: `.env` is present in the repository root and should contain local secrets; contents were not read.
- Template: `.env.example` documents required keys with placeholder values.
- Production: store secrets in the hosting platform environment/secret manager; do not expose server-only values through `runtimeConfig.public`.

## Webhooks & Callbacks

**Incoming:**
- None detected - No webhook-specific inbound endpoints were detected under `server/api/`.

**Outgoing:**
- OpenRouter chat completions from `server/utils/ai.ts` to `https://openrouter.ai/api/v1`.
- Cloudinary image uploads from `server/utils/cloudinary.ts` through the Cloudinary SDK.
- Cloudinary image delivery URLs from `server/utils/cloudinary.ts` and `app/composables/useSenseImageUrl.ts` to `https://res.cloudinary.com/{cloudName}/image/upload/...`.
- Jyutdict proxy requests from `server/api/jyutdict/general.get.ts` and `server/api/jyutdict/sheet.get.ts` to `https://jyutdict.org/api/v0.9/*`.
- Jyutjyu proxy requests from `server/api/jyutjyu/search.get.ts` to `https://www.jyutjyu.com/api/search`.

---

*Integration audit: 2026-04-29*
