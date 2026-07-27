# AGENTS.md

Guidelines for agentic coding agents working on JyutCollab v2.

## Build & Development Commands

```bash
npm run dev          # Start dev server on port 3100
npm run build        # Build for production (includes type checking)
npm run preview      # Preview production build
npm run generate     # Static generation
npm run generate:headword-font  # Generate rare character font subsets
```

**Testing:** Vitest installed but not wired to an npm script. Run `npx vitest run` directly. Prefer Vitest with Vue Test Utils when adding tests.

**Linting:** No ESLint/Prettier config. TypeScript strict mode enabled. Run `npm run build` to catch type errors.

## Chinese Text Standard

**All Chinese text must use Hong Kong Traditional Chinese (香港繁體).**

```typescript
import { convertToHongKongTraditional } from '~/server/utils/textConversion'
const hkText = convertToHongKongTraditional('简体字或台灣繁體')
```

Key conversions: 词→詞, 语→語, 义→義, 录→錄, 类→類, 态→態, 无→無, 条→條

## Code Style Guidelines

### Imports

```typescript
// Server-side
import { connectDB } from '~/server/utils/db'
// Client-side (auto-imported composables)
import { useAuth } from '#imports'
// Shared code
import { dialects } from '~shared/dialects'
```

### File Organization

- `app/` - Vue frontend
  - `app.vue` - Root component (UApp + NuxtLayout)
  - `app.config.ts` - App-level UI config (primary: red, neutral: slate)
  - `auth.d.ts` - Auth type augmentation
  - `assets/css/` - Tailwind + custom CSS variables (jc-* design system)
  - `components/` - Vue components (admin, agent, docs, entries, layout, shared)
  - `composables/` - Vue composables (useAuth, useEntriesList, useAgentChat, etc.)
  - `layouts/` - Page layouts (default, blank)
  - `middleware/` - Route middleware (auth, guest, admin, reviewer, home-redirect)
  - `pages/` - File-based routes
  - `types/` - TypeScript type definitions (index, auth, agent, jyutdict)
  - `utils/` - Frontend utilities (dialects, advanced filter, shared views, table constants, entry key)
- `server/` - Backend (Nitro server)
  - `api/` - REST API endpoints (auth, entries, reviews, ai, agent, stats, histories, views, users, upload, notifications, lexemes, external-etymons, reference-helpers, jyutdict, jyutjyu)
  - `middleware/` - Server middleware (auth, rateLimit)
  - `routes/` - Non-API routes (auth/google OAuth callback)
  - `utils/` - Server utilities and models
    - `agent/` - AI agent framework (index, persistence, core/, policies/, tools/)
    - Mongoose models: Entry, User, Lexeme, EditHistory, Notification, SavedView, AISuggestion, ExternalEtymon, ReferenceHelperEvent, Theme, AgentConversation, AgentMessage, AgentAuditEvent
    - Services: db, auth, ai, cloudinary, textConversion, validation, turnstile, themeMapping, dialects
- `shared/` - Code shared between frontend and backend
  - `dialects.ts` - 160 dialect definitions (IDs, labels, region codes)
- `content/` - Nuxt Content documentation (13 docs pages)
- `scripts/` - Maintenance scripts (generate-headword-rare-font.mjs)
- `public/` - Static assets (fonts, favicon, robots.txt)

### Vue Components

```vue
<script setup lang="ts">
const props = defineProps<{ entry: Entry; canEdit: boolean }>()
const emit = defineEmits<{ click: [MouseEvent]; save: [EntryFormData] }>()
const { user, isAuthenticated } = useAuth()
</script>
```

### Server API Handlers

```typescript
import { z } from 'zod'
import { formatZodErrorToMessage } from '~/server/utils/validation'

const Schema = z.object({ display: z.string().min(1, '詞條不能為空') })

export default defineEventHandler(async (event) => {
  if (!event.context.auth) throw createError({ statusCode: 401, message: '請先登錄' })
  await connectDB()
  
  const result = Schema.safeParse(await readBody(event))
  if (!result.success) throw createError({ statusCode: 400, message: formatZodErrorToMessage(result.error) })
  
  if (!canContributeToDialect(event.context.auth, dialectName)) {
    throw createError({ statusCode: 403, message: '無權操作此方言' })
  }
  return { success: true, data: entry }
})
```

### Error Handling

```typescript
try {
  // ...
} catch (error: any) {
  console.error('Operation error:', error)
  if (error.statusCode) throw error
  throw createError({ statusCode: 500, message: '操作失敗' })
}
```

### TypeScript Types

- Shared types: `app/types/index.ts` and `server/utils/types.ts`
- Use `interface` for objects, `type` for unions
- Mongoose interfaces use `I` prefix: `IEntry`, `ISense`

### Naming Conventions

- **Files:** `kebab-case.ts` / `PascalCase.vue`
- **Components:** `PascalCase` (e.g., `EntryDetailCard.vue`)
- **Composables:** `useCamelCase.ts` (e.g., `useAuth.ts`)
- **API routes:** RESTful (`index.get.ts`, `[id].put.ts`)
- **Variables:** `camelCase`
- **Types/Interfaces:** `PascalCase` with `I` prefix for Mongoose

### Composables Pattern

```typescript
export const useExample = () => {
  const state = useState('example', () => null)
  const doSomething = async () => { /* ... */ }
  return { state, doSomething }
}
```

### Database Operations

```typescript
await connectDB()
const entry = await Entry.findOne({ id: 'entry-123' })  // Use custom `id`, not `_id`

await EditHistory.create({
  entryId: entry._id.toString(),
  userId: event.context.auth.id,
  beforeSnapshot, afterSnapshot,
  changedFields: ['headword'],
  action: 'update'
})
```

### Comments

**Do NOT add comments unless explicitly requested.**

## Key Business Rules

1. **Entry ID:** Use `id` field (String, unique), not MongoDB `_id`
2. **Lexeme ID:** Use `lexemeId` to group entries across dialects
3. **Status:** draft → pending_review → approved/rejected
4. **Theme IDs:** Valid range is 60-498 (Level 3 IDs only)
5. **Dialect Permissions:** Always check `canContributeToDialect()` before modifications
6. **Edit History:** Create EditHistory record for all CRUD operations

## Environment Variables

Required in `.env`:
- `MONGODB_URI` - MongoDB connection string
- `NUXT_SESSION_PASSWORD` (32+ chars) - Session encryption
- `OPENROUTER_API_KEY` - AI features via OpenRouter
- `NUXT_CLOUDINARY_CLOUD_NAME`, `NUXT_CLOUDINARY_API_KEY`, `NUXT_CLOUDINARY_API_SECRET` - Image uploads

Optional:
- `JWT_SECRET` (32+ chars) - JWT signing (production)
- `OPENROUTER_MODEL` - AI model (default: `deepseek-v4-flash`)
- `NUXT_OAUTH_GOOGLE_CLIENT_ID`, `NUXT_OAUTH_GOOGLE_CLIENT_SECRET` - Google login
- `NUXT_PUBLIC_TURNSTILE_SITE_KEY`, `NUXT_TURNSTILE_SECRET_KEY` - CAPTCHA
- `NUXT_PUBLIC_SITE_URL` - Site URL (default: `http://localhost:3100`)
- `NUXT_PUBLIC_SITE_NAME` - Site name (default: `JyutCollab v2`)
- `NUXT_PORT` - Server port (default: `3100`)

## API Routes Overview

| Category | Endpoints |
|----------|-----------|
| Auth | login, register, logout, me (GET/PATCH), setup, unlink-google, google OAuth |
| Entries | CRUD, submit, check-duplicate, contributors, search-morphemes, lexeme (PATCH) |
| Reviews | queue (GET), approve, reject |
| AI | categorize, definitions, examples, register, suggestions/action |
| Agent | chat, chat.stream, conversations (CRUD), audit-events |
| Stats | index, mine, mine/enhanced, reviewer, reviewer/enhanced, ai-suggestions, dialects, reference-helpers |
| Histories | list, entry history, revert |
| Views | CRUD (saved table views) |
| Users | list, role, dialect-permissions, toggle-active |
| Upload | image (Cloudinary) |
| Notifications | list, read, read-all |
| Lexemes | external-etymons (GET/POST) |
| External Etymon | update, delete |
| Reference Helpers | events (POST), events/action |
| Jyutdict | general, sheet |
| Jyutjyu | search |

## Pages / Routes

| Route | Purpose | Auth |
|-------|---------|------|
| `/` | Dashboard (stats, activities, coverage) | Required |
| `/entries` | Main entry table | Required |
| `/review` | Review queue | Reviewer+ |
| `/histories` | Edit history browser | Required |
| `/admin/users` | User management | Admin |
| `/login` | Login page | Guest only |
| `/register` | Registration page | Guest only |
| `/setup` | Post-registration dialect setup | Required |
| `/profile` | User profile management | Required |
| `/docs` | Documentation viewer (index + slug) | Public |

## Database Models

| Model | Collection | Key Fields |
|-------|-----------|------------|
| Entry | entries | id, lexemeId, dialect, headword, phonetic, senses[], theme, meta, status |
| User | users | username, email, passwordHash, googleId, role, dialectPermissions[], isActive |
| Lexeme | lexemes | id, notes |
| EditHistory | edit_histories | entryId, userId, beforeSnapshot, afterSnapshot, changedFields[], action |
| Notification | notifications | userId, type, title, message, isRead |
| SavedView | savedviews | name, creatorId, visibility, state |
| AISuggestion | ai_suggestions | entryId, suggestionType, field, suggestedContent, userAction, confidenceScore |
| ExternalEtymon | external_etymons | lexemeId, languageCode, scriptForm, phonetic, gloss, sourceType |
| ReferenceHelperEvent | reference_helper_events | entryId, helperType, sourceProvider, suggestedContent, userAction |
| Theme | themes | id (60-498 L3), name, parentId, level, sortOrder |
| AgentConversation | agent_conversations | Conversation metadata |
| AgentMessage | agent_messages | Chat messages with tool calls |
| AgentAuditEvent | agent_audit_events | Agent action audit trail |
