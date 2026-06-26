# JyutCollab v2

A collaborative platform for Cantonese dictionary compilation

**[中文版](./README.md)**

<!-- TODO: Add banner image -->
<!-- ![JyutCollab v2 Banner](.github/assets/banner.svg) -->

![Nuxt 4](https://img.shields.io/badge/Nuxt-4-00DC82?style=flat-square&logo=nuxt&logoColor=white)
![Vue 3](https://img.shields.io/badge/Vue-3-42B883?style=flat-square&logo=vuedotjs&logoColor=white)
![TypeScript strict](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vitest](https://img.shields.io/badge/tests-Vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

> **[Documentation](https://github.com/huangjunxin/JyutCollab-v2/tree/main/content/docs)** · [Issues](https://github.com/huangjunxin/JyutCollab-v2/issues)

<!-- TODO: Add screenshots -->
<!-- Suggested: dashboard, inline entry editing, AI suggestions -->
<!-- ![Dashboard screenshot](.github/assets/screenshot-dashboard.png) -->
<!-- ![Inline editing GIF](.github/assets/demo-inline-edit.gif) -->

## Introduction

JyutCollab v2 is a web application designed for collaborative dictionary editing, dedicated to documenting Cantonese (Yue) dialect vocabulary. The platform supports over 190 dialect points across Guangdong, Guangxi, Hong Kong, Macau, and overseas Chinese communities.

Collecting and organizing Cantonese dialect vocabulary has long faced challenges: scattered dialect points, lack of unified lexicographic tools, and cumbersome review workflows. JyutCollab v2 aims to provide a modern collaborative platform where contributors can conveniently record vocabulary, reviewers can efficiently maintain quality, and AI assistance reduces repetitive work.

## Table of Contents

- [Quick Start](#quick-start)
- [Key Pages](#key-pages)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Rare Character Font Subset](#rare-character-font-subset)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [User Roles](#user-roles)
- [Dialect Coverage](#dialect-coverage)
- [Development Notes](#development-notes)
- [Dev Commands](#dev-commands)
- [Contributing](#contributing)
- [Contact & Discussion](#contact--discussion)
- [License](#license)

## Quick Start

```bash
git clone https://github.com/huangjunxin/JyutCollab-v2.git && cd JyutCollab-v2
cp .env.example .env   # Edit .env — at minimum set MONGODB_URI and OPENROUTER_API_KEY
npm install && npm run dev
```

The app will be running at `http://localhost:3100`.

<details>
<summary>Detailed setup steps</summary>

### Environment Variables

Edit the `.env` file:

```bash
# MongoDB connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/jyutcollab

# Session secret (at least 32 characters)
NUXT_SESSION_PASSWORD=your-session-password-at-least-32-chars-long

# JWT secret (required in production, at least 32 characters)
JWT_SECRET=your-jwt-secret-at-least-32-chars-long

# OpenRouter API key and model
OPENROUTER_API_KEY=sk-or-your-api-key
OPENROUTER_MODEL=deepseek-v4-flash

# Cloudinary settings
NUXT_CLOUDINARY_CLOUD_NAME=your_cloud_name
NUXT_CLOUDINARY_API_KEY=your_api_key
NUXT_CLOUDINARY_API_SECRET=your_api_secret

# Google OAuth (optional)
NUXT_OAUTH_GOOGLE_CLIENT_ID=your-google-client-id
NUXT_OAUTH_GOOGLE_CLIENT_SECRET=your-google-client-secret

# Cloudflare Turnstile (optional)
NUXT_PUBLIC_TURNSTILE_SITE_KEY=your-turnstile-site-key
NUXT_TURNSTILE_SECRET_KEY=your-turnstile-secret-key

# Site settings
NUXT_PORT=3100
NUXT_PUBLIC_SITE_URL=http://localhost:3100
NUXT_PUBLIC_SITE_NAME=JyutCollab v2
```

</details>

## Key Pages

Once the dev server is running, access the main workspaces at:

| Path | Description |
|------|-------------|
| `/` | Dashboard and personal work overview |
| `/entries` | Entry list, inline editing, advanced filters, saved views |
| `/review` | Review queue |
| `/histories` | Edit history and revert |
| `/profile` | Profile, Google account linking, dialect settings |
| `/admin/users` | Admin user and permission management |
| `/docs` | Built-in user guide |

## Features

### Core
- **Notion-style inline editing** — click any cell to edit in place; textareas auto-resize
- **Keyboard navigation** — full keyboard support (arrow keys, Enter, Tab, Escape)
- **Multi-view entry display** — flat view, grouped by headword, grouped by lexeme
- **Saved & shareable views** — persist search, columns, sorting, and advanced filters as private or public views
- **Advanced filtering & rule overlay** — formula conditions, regex rules, and row-level hints for large-scale data cleanup
- **Column resizing** — drag to resize; widths saved to browser localStorage
- **Real-time save indicator** — visual display of save and edit state
- **Mobile entry workbench** — tabbed editing, field selection, density settings, and batch operations on mobile

### AI-Powered
- **Theme classification (3 candidates)** — AI provides 3 ranked candidates with confidence scores; the user picks the best match
- **Definition generation** — auto-generate definition suggestions in Hong Kong Traditional Chinese
- **Example sentence generation** — contextual examples with explanations; auto-generates Jyutping via character-by-character lookup from Jyutdict
- **Register suggestion** — AI determines register (colloquial, written, vulgar, formal, neutral)
- **Site-wide AI assistant** — persistent right-side panel that answers usage questions, queries entries, applies table filters, and switches views
- **Conversation history & audit** — stores AI conversations, tool call summaries, confirmation flows, and audit events
- **Suggestion tracking** — records adoption, rejection, post-acceptance edit, ignore, and pending states; computes participation and acceptance rates

### Dashboard & Analytics
- **Site-wide statistics** — total entries, publish status, and review status
- **Contributor activity** — active contributors, 7-day active count, recent contributions
- **Dialect coverage** — tracks covered dialect points and top dialects by entry count
- **AI assistance metrics** — reviewers can view AI suggestion acceptance, rejection, and modification rates
- **Activity timeline** — recent editing activity for individuals and the entire site

### Dictionary Management
- **190+ dialect points** — covering Pearl River Delta, Wuyi, Guangxi, and overseas regions
- **Cross-dialect linking** — entries across dialects linked via lexeme ID
- **Morpheme references** — link entries to character-level data
- **External etymon references** — record external etymological sources for lexemes
- **Duplicate detection** — real-time duplicate checking on entry creation

### Review Workflow
- **Status management** — draft → pending_review → approved / rejected
- **Role-based permissions** — contributor, reviewer, admin
- **Dialect-level access control** — fine-grained permissions per dialect
- **Review queue** — dedicated reviewer interface

### History & Audit
- **Full edit history** — before/after snapshots for every change
- **Diff viewer** — unified diff and side-by-side comparison
- **Revert** — one-click restore to any historical state
- **Activity timeline** — chronological view of all changes

### Additional
- **Image upload** — Cloudinary integration with HEIC support and auto-optimization
- **Rare character display** — loads font subsets for headwords, review queue, and edit history
- **Built-in documentation** — managed via Nuxt Content at `/docs`, with search and category sidebar
- **Dark mode** — full dark theme support
- **Responsive design** — mobile-friendly
- **Hong Kong Traditional Chinese** — all text auto-converted via opencc-js
- **Google OAuth login** — sign in with Google, link/unlink accounts, new user dialect setup
- **Cloudflare Turnstile** — CAPTCHA protection on login/registration

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Nuxt 4, Vue 3 (Composition API) |
| UI | @nuxt/ui, Tailwind CSS, Iconify icons |
| Database | MongoDB, Mongoose ODM |
| Auth | nuxt-auth-utils, HttpOnly cookies, Google OAuth, Cloudflare Turnstile |
| AI | OpenRouter API (deepseek-v4-flash, configurable via `OPENROUTER_MODEL`) |
| State management | Pinia |
| Validation | Zod |
| Image storage | Cloudinary |
| Documentation | @nuxt/content |
| Text processing | opencc-js |
| Testing | Vitest |

## Prerequisites

- Node.js 20.19+ (or 22.12+)
- MongoDB (local or Atlas)
- OpenRouter API key (for AI features)
- Cloudinary account (for image uploads)

Optional: Google OAuth credentials, Cloudflare Turnstile keys.

## Rare Character Font Subset

The headword, review queue, and edit history pages load rare character font subsets from `public/fonts/` to support Cantonese dialect characters missing from system fonts.

If the database later adds more CJK Extension characters, regenerate the subset:

```bash
npm run generate:headword-font
```

This scans actual headwords and variants in the database, regenerates `public/fonts/jyutcollab-headword-rare-*.woff2` and the corresponding CSS. Only characters actually in use are included, avoiding the overhead of loading a full CJK font.

## Architecture

```mermaid
flowchart LR
  Browser --> NuxtApp[Nuxt 4 / Vue 3 Frontend]
  NuxtApp --> Nitro[Nuxt Nitro API]
  Nitro --> Mongo[(MongoDB / Mongoose)]
  Nitro --> OpenRouter[OpenRouter AI]
  Nitro --> Cloudinary[Cloudinary Images]
  Nitro --> Google[Google OAuth]
  Nitro --> Turnstile[Cloudflare Turnstile]
  NuxtApp --> Content[Nuxt Content Docs]
```

## Project Structure

```
JyutCollab-v2/
├── app/                          # Frontend application
│   ├── components/               # Vue components
│   │   ├── admin/               # User and permission management
│   │   ├── agent/               # AI assistant components
│   │   ├── docs/                # Documentation page components
│   │   ├── entries/             # Entry-related components
│   │   ├── entries/mobile/      # Mobile entry workbench
│   │   ├── layout/              # Layout components
│   │   └── shared/              # Shared UI components
│   ├── assets/                  # CSS and frontend assets
│   ├── composables/             # Reusable composition functions
│   ├── middleware/              # Route middleware
│   ├── pages/                   # File-based routing
│   ├── types/                   # TypeScript type definitions
│   └── utils/                   # Frontend utilities
├── server/                       # Backend server
│   ├── api/                     # REST API endpoints
│   │   ├── auth/               # Authentication routes
│   │   ├── entries/            # Entry CRUD
│   │   ├── reviews/            # Review workflow
│   │   ├── histories/          # Edit history
│   │   ├── ai/                 # AI integration
│   │   ├── agent/              # AI assistant conversations, tools & audit
│   │   ├── stats/              # Statistics
│   │   ├── upload/             # File upload
│   │   ├── lexemes/            # Lexeme management
│   │   ├── external-etymons/   # External etymon references
│   │   ├── views/              # Saved views
│   │   ├── notifications/      # Notifications
│   │   ├── users/              # Admin user management
│   │   ├── reference-helpers/  # Reference fill-assist events
│   │   ├── jyutdict/           # Jyutdict integration
│   │   └── jyutjyu/            # Jyutjyu integration
│   ├── middleware/              # Server middleware
│   └── utils/                   # Server utilities
│       ├── Entry.ts            # Entry model
│       ├── User.ts             # User model
│       ├── Theme.ts            # Theme model
│       ├── EditHistory.ts      # History model
│       ├── AISuggestion.ts     # AI suggestion tracking
│       ├── SavedView.ts        # Saved view model
│       ├── Lexeme.ts           # Lexeme grouping model
│       ├── ExternalEtymon.ts   # External etymon model
│       ├── Notification.ts     # Notification model
│       ├── AgentConversation.ts # AI assistant conversation model
│       ├── AgentMessage.ts     # AI assistant message model
│       ├── AgentAuditEvent.ts  # AI assistant audit event model
│       ├── ai.ts               # AI service
│       ├── auth.ts             # Auth utilities
│       ├── cloudinary.ts       # Image upload utilities
│       ├── db.ts               # Database connection
│       └── textConversion.ts   # Chinese text conversion
├── content/                       # Nuxt Content user guide
│   └── docs/                     # Documentation Markdown
├── scripts/                       # Maintenance scripts
│   └── generate-headword-rare-font.mjs
├── shared/                       # Shared code
│   └── dialects.ts              # Dialect definitions
└── public/                       # Static assets
```

## API Endpoints

| Category | Key Endpoints | Description |
|----------|---------------|-------------|
| Auth | POST `/api/auth/login`, POST `/api/auth/register` | Login, registration |
| Entries | GET/POST `/api/entries`, PUT `/api/entries/:id` | CRUD operations |
| Reviews | POST `/api/reviews/:id/approve`, POST `/api/reviews/:id/reject` | Approve, reject |
| AI | POST `/api/ai/categorize`, POST `/api/ai/definitions` | Classification, definitions |
| Stats | GET `/api/stats`, GET `/api/stats/mine` | Site-wide and personal stats |
| History | GET `/api/histories`, POST `/api/histories/:id/revert` | View, revert |
| Views | GET/POST `/api/views` | Saved views |

<details>
<summary>Full API endpoint list</summary>

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | User login |
| POST | /api/auth/logout | User logout |
| GET | /api/auth/me | Get current user profile |
| PATCH | /api/auth/me | Update profile |
| GET | /api/auth/google | Google OAuth login |
| POST | /api/auth/setup | New user dialect setup |
| POST | /api/auth/me/unlink-google | Unlink Google account |

### Entries
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/entries | List entries (paginated, filterable) |
| POST | /api/entries | Create entry |
| GET | /api/entries/:id | Get single entry |
| PUT | /api/entries/:id | Update entry |
| DELETE | /api/entries/:id | Delete entry |
| POST | /api/entries/:id/submit | Submit for review |
| GET | /api/entries/check-duplicate | Check duplicates |
| GET | /api/entries/contributors | List entry contributors |

### Reviews
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/reviews | Get review queue |
| POST | /api/reviews/:id/approve | Approve entry |
| POST | /api/reviews/:id/reject | Reject entry |

### AI
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/ai/categorize | Theme classification |
| POST | /api/ai/definitions | Generate definitions |
| POST | /api/ai/examples | Generate example sentences |
| POST | /api/ai/register | Register suggestion |
| POST | /api/ai/suggestions/:id/action | Record AI suggestion action (adopt, reject, edit, ignore) |
| POST | /api/agent/chat | AI assistant non-streaming chat |
| POST | /api/agent/chat.stream | AI assistant streaming chat with tool calls |
| GET | /api/agent/conversations | List AI assistant conversations |
| POST | /api/agent/conversations | Create AI assistant conversation |
| GET | /api/agent/conversations/:id | Get single conversation |
| GET | /api/agent/conversations/:id/messages | Get conversation messages |
| POST | /api/agent/conversations/:id/archive | Archive conversation |
| GET | /api/agent/audit-events | Query AI assistant audit events |

### Statistics & Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/stats | Site-wide entry and contributor stats |
| GET | /api/stats/mine | My entry stats |
| GET | /api/stats/mine/enhanced | My enhanced contribution stats |
| GET | /api/stats/reviewer | Reviewer stats |
| GET | /api/stats/reviewer/enhanced | Review progress and efficiency stats |
| GET | /api/stats/ai-suggestions | AI suggestion effectiveness stats |
| GET | /api/stats/dialects | Dialect coverage stats |
| GET | /api/stats/reference-helpers | Reference helper stats |

### History, Views & Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/histories | Edit history list |
| GET | /api/histories/:entryId | Single entry edit history |
| POST | /api/histories/:id/revert | Revert to historical version |
| GET | /api/views | List saved views |
| POST | /api/views | Create saved view |
| GET | /api/views/:id | Get saved view |
| PUT | /api/views/:id | Update saved view |
| DELETE | /api/views/:id | Delete saved view |
| GET | /api/notifications | Notification list |
| PUT | /api/notifications/:id/read | Mark single notification as read |
| PUT | /api/notifications/read-all | Mark all notifications as read |

### User Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/users | Admin query user list |
| PATCH | /api/users/:id/role | Update user role |
| PATCH | /api/users/:id/dialect-permissions | Update user dialect permissions |
| PATCH | /api/users/:id/toggle-active | Enable or disable user |

### Other Integrations
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/upload/image | Upload definition illustration |
| GET | /api/entries/search-morphemes | Search morpheme references |
| PATCH | /api/entries/:id/lexeme | Update lexeme association |
| GET | /api/lexemes/:lexemeId/external-etymons | Get external etymon references |
| POST | /api/lexemes/:lexemeId/external-etymons | Add external etymon reference |
| PUT | /api/external-etymons/:id | Update external etymon reference |
| DELETE | /api/external-etymons/:id | Delete external etymon reference |
| GET | /api/jyutdict/general | Query Jyutdict general data |
| GET | /api/jyutdict/sheet | Query Jyutdict sheet data |
| GET | /api/jyutjyu/search | Search Jyutjyu data |
| POST | /api/reference-helpers/events | Record reference fill-assist event |
| POST | /api/reference-helpers/events/:id/action | Record reference fill-assist follow-up action |

</details>

## User Roles

| Role | Permissions |
|------|-------------|
| Contributor | Create/edit entries within authorized dialects |
| Reviewer | All contributor permissions + review entries |
| Admin | Full access to all features |

## Dialect Coverage

The platform supports over 190 dialect points, distributed across the following regions:

- **Pearl River Delta** — Guangzhou, Foshan, Dongguan, etc.
- **Wuyi region** — Taishan, Kaiping, Enping, etc.
- **Western Guangdong** — Zhanjiang, Maoming, etc.
- **Eastern Guangxi** — Nanning, Wuzhou, etc.
- **Southern Guangxi** — Beihai, Qinzhou, etc.
- **Hong Kong**
- **Macau**
- **Overseas** — Americas, Australia, UK, Southeast Asia

## Development Notes

- All Chinese UI text, error messages, and documentation use Hong Kong Traditional Chinese; use `convertToHongKongTraditional()` when text conversion is needed.
- TypeScript strict mode is enabled; run `npm run build` before committing, and `npx vitest run` when tests are relevant.
- Entries use a custom `id` field for public identification, not MongoDB `_id`; cross-dialect grouping uses `lexemeId`.
- Theme IDs must be Level 3 IDs in the range 60–498.
- Check `canContributeToDialect()` before modifying entries; CRUD operations must create an `EditHistory` record.
- No blanket commenting convention; avoid descriptive comments unless they clarify genuinely complex logic.

## Dev Commands

```bash
# Dev server
npm run dev

# Production build
npm run build

# Static generation
npm run generate

# Preview production build
npm run preview

# Run Vitest tests (no npm script configured yet)
npx vitest run

# Generate rare headword font subset
npm run generate:headword-font

# Prepare Nuxt
npm run postinstall
```

## Contributing

Contributions to JyutCollab v2 are welcome.

### Reporting Issues
- Use [GitHub Issues](https://github.com/huangjunxin/JyutCollab-v2/issues) to submit bug reports or feature requests
- Provide as much detail as possible: reproduction steps, environment info

### Submitting Pull Requests
1. Fork the repository and create your branch (`git checkout -b feature/your-feature`)
2. Make your changes and ensure `npm run build` passes
3. Open a pull request describing what you changed and why

### Development Guidelines
- See [CLAUDE.md](./CLAUDE.md) for detailed development conventions
- All Chinese text must use Hong Kong Traditional Chinese
- TypeScript strict mode — pass the build before submitting

## Contact & Discussion

- [GitHub Issues](https://github.com/huangjunxin/JyutCollab-v2/issues) — Bug reports and feature requests
- [GitHub Discussions](https://github.com/huangjunxin/JyutCollab-v2/discussions) — General discussion and Q&A

## License

Code and documentation in this repository are licensed under the [MIT License](./LICENSE). This repository does not currently contain dictionary data, so no separate data license is declared.
