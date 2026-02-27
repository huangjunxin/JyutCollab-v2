# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Chinese Text Standard

**All Chinese text in this project must use Hong Kong Traditional Chinese (香港繁體).**

This applies to:
- UI labels, buttons, placeholders
- Error messages and validation text
- Code comments in Chinese
- AI prompts and system messages
- Database enum values (e.g., `register` field: '口語', '書面', '粗俗', '文雅', '中性')

Use opencc-js for conversion:
```typescript
import { convertToHongKongTraditional } from '~/server/utils/textConversion'
const hkText = convertToHongKongTraditional('简体字或台灣繁體')
```

Key character differences from Simplified/Standard Traditional:
- 词 → 詞, 语 → 語, 义 → 義, 录 → 錄, 册 → 冊
- 审 → 審, 类 → 類, 态 → 態, 暂 → 暫, 无 → 無
- 条 → 條, 里 → 裏, 群 → 羣, 划 → 劃, 床 → 牀

## Project Overview

JyutCollab v2 is a collaborative platform for creating and managing Cantonese multi-syllable expression dictionary entries. It supports 190+ dialect points across Guangdong, Guangxi, Hong Kong, Macau, and overseas Chinese communities.

Key capabilities:
- Notion-style inline editing with keyboard navigation
- AI-powered theme classification, definition and example generation
- Multi-dialect entry management with cross-dialect linking
- Review workflow with approval/rejection system
- Full edit history with revert functionality
- Real-time duplicate checking

## Development Commands

```bash
npm run dev          # Start dev server on port 3100
npm run build        # Build for production
npm run preview      # Preview production build
npm run postinstall  # Nuxt prepare (runs automatically)
```

## Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
# MongoDB Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/jyutcollab

# Session (nuxt-auth-utils) - at least 32 characters
NUXT_SESSION_PASSWORD=your-session-password-at-least-32-chars-long

# OpenRouter API Key (for AI features)
OPENROUTER_API_KEY=sk-or-your-api-key

# Cloudinary (sense images)
NUXT_CLOUDINARY_CLOUD_NAME=your_cloud_name
NUXT_CLOUDINARY_API_KEY=your_api_key
NUXT_CLOUDINARY_API_SECRET=your_api_secret

# Site Configuration
NUXT_PORT=3100
NUXT_PUBLIC_SITE_URL=http://localhost:3100
NUXT_PUBLIC_SITE_NAME=JyutCollab v2
```

## Architecture

### Technology Stack
- **Framework**: Nuxt 4 with Vue 3 Composition API
- **UI**: @nuxt/ui (Tailwind CSS + Radix Vue components)
- **Database**: MongoDB with Mongoose ODM
- **Auth**: nuxt-auth-utils with HttpOnly cookie sessions
- **AI**: OpenRouter API (qwen/qwen3-235b-a22b-07-25 model)
- **State**: Pinia stores
- **Validation**: Zod schemas
- **Image**: Cloudinary for upload and optimization
- **Text**: opencc-js for Hong Kong Traditional Chinese conversion

### Directory Structure

```
app/
  pages/              # Vue pages (entries, review, histories, auth)
  components/         # Vue components
    layout/           # AppHeader, AppSidebar
    entries/          # EntryEditableCell, EntryDetailCard, EntryModal, etc.
    auth/             # LoginForm, RegisterForm
    review/           # Review-related components
    history/          # History-related components
  composables/        # Reusable composition functions
    useAuth.ts        # Authentication logic
    useEntriesAISuggestions.ts  # AI suggestions management
    useEntriesTableEdit.ts      # Table editing
    useColumnResize.ts          # Column resizing
    useThemeData.ts             # Theme hierarchy data
    useEntryDisplay.ts          # Entry display formatting
    ...               # Many more composables
  stores/             # Pinia stores (sidebar.ts)
  types/              # TypeScript interfaces (Entry, User, Theme, EditHistory)
  middleware/         # Route guards (auth, guest, reviewer, home-redirect)
  utils/              # Frontend utilities (dialects, entryKey, etc.)

server/
  api/                # REST endpoints
    auth/             # /api/auth/register, login, logout, me
    entries/          # /api/entries CRUD + check-duplicate, search-morphemes
    reviews/          # /api/reviews with approve/reject
    histories/        # /api/histories with revert
    ai/               # /api/ai/categorize, definitions, examples
    stats/            # /api/stats, /api/stats/mine, /api/stats/reviewer
    upload/           # /api/upload/image
    lexemes/          # /api/lexemes/[lexemeId]/external-etymons
    jyutdict/         # /api/jyutdict/general, sheet
    jyutjyu/          # /api/jyutjyu/search
  utils/              # Server utilities
    db.ts             # MongoDB connection with caching
    auth.ts           # Password hashing, JWT, permission checks
    ai.ts             # AI service (categorize, definitions, examples)
    textConversion.ts # Hong Kong Traditional Chinese conversion
    cloudinary.ts     # Image upload and optimization
    validation.ts     # Zod error formatting
    Entry.ts          # Entry model (complex nested schema)
    User.ts           # User model with roles and dialect permissions
    Theme.ts          # Theme model (3-level hierarchy)
    EditHistory.ts    # Edit history with snapshots
    Lexeme.ts         # Lexeme grouping model
    ExternalEtymon.ts # External etymology references
  middleware/         # Global auth middleware for API routes

shared/
  dialects.ts         # Single source of truth for 190+ dialects
```

### Key Data Models

**Entry** (`server/utils/Entry.ts`):
- Complex nested structure with headword, phonetic, senses (with examples, sub-senses)
- Status workflow: draft → pending_review → approved/rejected
- Dialect-specific with lexemeId for cross-dialect linking
- Theme classification (3-level hierarchy, IDs 60-498)
- Morpheme references for character/word linking
- Unique index: (headword.display + dialect.name)

**User** (`server/utils/User.ts`):
- Role system: contributor, reviewer, admin
- Dialect permissions array: [{ dialectName, role }]
- Contribution and review counts

**Theme** (`server/utils/Theme.ts`):
- Three-level classification: Level 1 (11 categories) → Level 2 → Level 3 (439 themes)
- IDs range: 60-498

**EditHistory** (`server/utils/EditHistory.ts`):
- Full before/after snapshots
- Change field tracking
- Revert support

### Entry Table Architecture

The entries table (`app/pages/entries/index.vue`) is a 2000+ line component with:
- Three view modes: flat, aggregated (by headword), lexeme (by lexemeId)
- Notion-style inline editing with auto-resizing textareas
- Keyboard navigation: Arrow keys, Enter, Tab, Escape
- AI suggestions integrated inline (Tab to accept)
- Column resizing with localStorage persistence
- Real-time save indicator and dirty state tracking
- Batch selection with bulk delete
- Search by headword/variants/definition
- Filter by dialect, theme, status, entry type

### Authentication & Authorization Flow

1. **Auth Flow:**
   - `server/middleware/auth.ts` validates sessions on protected routes
   - `app/composables/useAuth.ts` provides client-side auth state
   - Route guards in `app/middleware/` enforce role requirements

2. **Permission System:**
   - Role hierarchy: contributor < reviewer < admin
   - Dialect permissions: Contributors restricted to their permitted dialects
   - `canContributeToDialect(user, dialectName)` checks permissions

3. **API Protection:**
   - Public: auth endpoints, GET /api/entries, GET /api/stats
   - Protected: All other routes require valid session
   - Reviewer-only: /api/reviews/*

### AI Integration (`server/utils/ai.ts`)

Uses OpenRouter with qwen/qwen3-235b-a22b-07-25 model:
- **Categorization** (temp 0.2): Returns themeId (60-498), confidence, explanation
- **Definitions** (temp 0.4): Returns definition, usageNotes, formalityLevel, frequency
- **Examples** (temp 0.6): Returns 3 examples with sentence, explanation, scenario

Frontend integration via `useEntriesAISuggestions.ts`:
- Debounced triggers on cell edit
- AbortController for cancellation
- Pending suggestions map for multi-cell workflow

### Dialect System

Defined in `shared/dialects.ts` with 190+ dialect points:
- Categories: Pearl River Delta, Wuyi, Western/Eastern/Northern Guangdong, Guangxi regions, Hong Kong, Macau, Overseas
- Each dialect: ID, display name (HK Traditional), region code, badge color
- Contributors restricted to their permitted dialects

## Code Patterns

### Server API Handlers
Use H3 event handlers with typed event context:
```typescript
export default defineEventHandler(async (event) => {
  const user = event.context.auth?.user
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  // ...
})
```

### MongoDB Connection
Use the cached connection from `server/utils/db.ts`:
```typescript
import { connectDB } from '~/server/utils/db'
await connectDB()
```

### Text Conversion
All Chinese text should be converted to HK Traditional:
```typescript
import { convertToHongKongTraditional } from '~/server/utils/textConversion'
const hkText = convertToHongKongTraditional('简体字')
```

### Zod Validation
All API routes use Zod for input validation:
```typescript
const schema = z.object({
  display: z.string().min(1, '詞條不能為空'),
  dialect: z.string().min(1, '請選擇方言點'),
})
const result = schema.safeParse(await readBody(event))
if (!result.success) {
  throw createError({ statusCode: 400, data: result.error.flatten() })
}
```

### Composables Pattern
Logic is extracted into focused composables:
- `useEntriesAISuggestions.ts` - AI suggestion state and triggers
- `useEntriesTableEdit.ts` - Cell editing coordination
- `useColumnResize.ts` - Column width management
- `useThemeData.ts` - Theme hierarchy fetching
- `useEntryDisplay.ts` - Entry to display transformation

### Component Organization
Components are organized by feature:
- `components/layout/` - AppHeader, AppSidebar
- `components/entries/` - Entry-related (EditableCell, DetailCard, Modal, etc.)
- Components use `<script setup lang="ts">` syntax

## Important Conventions

1. **Entry ID Generation**: Use `id` field (String, unique), not MongoDB `_id`
2. **Lexeme ID**: Use `lexemeId` to group entries across dialects
3. **Status Transitions**: draft → pending_review → approved/rejected
4. **Edit History**: Create EditHistory record for all CRUD operations
5. **Dialect Permissions**: Always check `canContributeToDialect()` before entry modifications
6. **Theme IDs**: Valid range is 60-498 (Level 3 IDs)
7. **Image Upload**: Use Cloudinary with auto-optimization (max 5MB)
8. **Column Widths**: Persist in localStorage as `jyutcollab-column-widths`
9. **Sidebar State**: Persist in localStorage as `sidebar-collapsed`

## Testing Considerations

When testing, consider:
- Dialect permission boundaries
- Status workflow transitions
- AI suggestion acceptance/rejection
- Edit history snapshot accuracy
- Revert functionality
- Concurrent edits
- Keyboard navigation in entry table
