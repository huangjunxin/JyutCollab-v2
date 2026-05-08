# Phase 05: Basic Saved Views - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-06
**Phase:** 05-basic-saved-views
**Areas discussed:** API Design, URL Strategy, UI Integration, Permissions

---

## API Design

| Option | Description | Selected |
|--------|-------------|----------|
| Mongoose model + full CRUD | New `server/utils/SavedView.ts`, `server/api/views/` endpoints matching Entry/EditHistory patterns | ✓ |
| Lightweight single endpoint | Single `POST /api/views` that stores/retrieves, minimal schema | |
| Extend entries API | Add view fields to existing entries endpoints | |

**Auto-selected:** Mongoose model + full CRUD — follows established patterns (`Entry`, `EditHistory`, `Lexeme`, `Notification`). Route files: `index.get.ts`, `index.post.ts`, `[id].put.ts`, `[id].delete.ts`.

---

## URL Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| View ID (`?view=view_abc123`) | Client fetches state from `GET /api/views/[id]`, URL stays short | ✓ |
| Embedded state only | Always embed full base64url `EntriesSharedViewState` in URL | |
| Both, explicit prefix | `?view=id:abc` vs `?view=data:eyJ...`, format selector in URL | |

**Auto-selected:** View ID with backward compat — `decodeEntriesSharedView()` discriminates by detecting base64url JSON prefix (`eyJ`). Allows view updates without changing share URLs. Phase 3 anonymous embedded payloads still work.

---

## UI Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Extend existing USelectMenu | Add saved views + actions to current "視圖" dropdown | ✓ |
| New separate dropdown | Two dropdowns: mode selector + saved views selector | |
| Replace dropdown with sidebar | Sidebar panel listing all views with preview | |

**Auto-selected:** Extend existing USelectMenu — minimal disruption. Mode options (flat/aggregated/lexeme) at top, divider, saved views with visibility badges, bottom actions.

---

## Permissions

| Option | Description | Selected |
|--------|-------------|----------|
| Server-side creatorId check | PUT/DELETE validates `view.creatorId === currentUser.id` | ✓ |
| Client-only hiding | Hide buttons in UI, no server enforcement | |
| Role-based gates | Separate permissions table with RBAC | |

**Auto-selected:** Server-side creatorId check + client conditional rendering — defense in depth, matches entry ownership pattern.

---

## Claude's Discretion

All decisions were auto-selected in `--auto` mode. Claude chose the recommended option for each gray area, following the patterns established in Phases 1-4 and the existing codebase conventions.

## Deferred Ideas

- Admin/reviewer delete of any public view — VIEW-06 scope
- View templates (TEMP-01) — v2
- View analytics — out of scope
- View folders/categories — out of scope
