# AGENTS.md

Guidelines for agentic coding agents working on JyutCollab v2.

## Build & Development Commands

```bash
npm run dev          # Start dev server on port 3100
npm run build        # Build for production (includes type checking)
npm run preview      # Preview production build
```

**No test framework configured.** When adding tests, prefer Vitest with Vue Test Utils.

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

- `app/` - Vue frontend (pages, components, composables, types, middleware)
- `server/` - Backend (api routes, utils, middleware)
- `shared/` - Code shared between frontend and backend

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
- `MONGODB_URI`, `NUXT_SESSION_PASSWORD` (32+ chars)
- `OPENROUTER_API_KEY` (AI features)
- `NUXT_CLOUDINARY_CLOUD_NAME`, `NUXT_CLOUDINARY_API_KEY`, `NUXT_CLOUDINARY_API_SECRET` (images)
