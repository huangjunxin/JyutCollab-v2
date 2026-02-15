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

JyutCollab v2 is a collaborative platform for creating and managing Cantonese multi-syllable expression entries. It's a full-stack Nuxt.js application with TypeScript, MongoDB, and AI integration for suggesting definitions and categorizations.

## Development Commands

```bash
npm run dev          # Start dev server on port 3100
npm run build        # Build for production
npm run preview      # Preview production build
```

## Environment Setup

Copy `.env.example` to `.env` and configure:
- `MONGODB_URI` - MongoDB connection string
- `NUXT_SESSION_PASSWORD` - Session secret (32+ chars)
- `OPENROUTER_API_KEY` - For AI features

## Architecture

### Technology Stack
- **Framework**: Nuxt 4 with Vue 3 Composition API
- **UI**: @nuxt/ui (Tailwind CSS + Radix Vue components)
- **Database**: MongoDB with Mongoose ODM
- **Auth**: nuxt-auth-utils with HttpOnly cookie sessions
- **AI**: OpenRouter API (qwen/qwen3-235b-a22b-07-25 model)
- **State**: Pinia stores
- **Validation**: Zod schemas

### Directory Structure

```
app/
  pages/           # Vue pages (entries, review, histories, auth)
  components/      # Vue components (layout/, entries/, auth/, review/, history/)
  composables/     # useAuth.ts for authentication logic
  stores/          # Pinia stores (sidebar.ts)
  types/           # TypeScript interfaces (Entry, User, Theme, EditHistory)
  middleware/      # Route guards (auth, guest, reviewer)

server/
  api/             # REST endpoints (auth, entries, reviews, ai, histories)
  utils/           # Database models (Entry.ts, User.ts, Theme.ts, etc.)
                   # AI service (ai.ts), text conversion (textConversion.ts)
  middleware/      # Global auth middleware for API routes
```

### Key Data Models

**Entry** (`server/utils/Entry.ts`):
- Complex nested structure: headword, phonetic, senses (with examples, sub-senses)
- Status workflow: draft → pending → approved/rejected
- Tracks contributor and reviewer

**User** (`server/utils/User.ts`):
- Role system: contributor, reviewer, admin
- Dialect permissions array for per-dialect access

**Theme** (`server/utils/Theme.ts`):
- Three-level classification: Level 1 (broad) → Level 2 → Level 3 (specific)
- 60-498 theme IDs for classification

### Entry Table Architecture

The entries table (`app/pages/entries/index.vue`) uses Notion-style inline editing:
- Keyboard navigation: Arrow keys, Enter, Tab, Escape
- Auto-resizing textareas for long content
- AI suggestions integrated inline (Tab to accept)
- Dirty state tracking with real-time save indication

### Authentication Flow

1. `server/middleware/auth.ts` validates sessions on protected routes
2. `app/composables/useAuth.ts` provides client-side auth state and methods
3. Route guards in `app/middleware/` enforce role requirements

### AI Integration (`server/utils/ai.ts`)

- Theme classification with confidence scores
- Definition generation in HK Traditional Chinese
- Example sentence generation
- Uses opencc-js for text conversion to Hong Kong Traditional

### API Route Protection

`server/middleware/auth.ts` defines:
- Public routes: auth endpoints, GET requests to /api/entries
- Protected: All other API routes require valid session
- Admin routes: Require admin role

## Code Patterns

### Server API Handlers
Use H3 event handlers with typed event context:
```typescript
export default defineEventHandler(async (event) => {
  const user = event.context.auth?.user
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
All Chinese text should be converted to HK Traditional using:
```typescript
import { convertToHongKongTraditional } from '~/server/utils/textConversion'
```
