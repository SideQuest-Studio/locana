---
paths:
  - "src/app/**"
  - "src/components/**"
  - "src/hooks/**"
  - "src/lib/i18n/**"
  - "src/lib/validations/**"
---

# Frontend Rules (DIP)

Full detail: `AGENTS.md` §6. Condensed, load-on-touch version.

## Core Principles (§6.1)

- **Server Components by default.** Add `"use client"` only at leaf nodes needing browser APIs, local state, or event handlers — never on a whole page or layout to fetch data with `useEffect`.
- **Mobile-first**, test at 375px before scaling up. Partner/admin dashboards may be wider but must stay usable on tablet.
- **No mock data in production paths.** Legacy `src/lib/attractions.ts`, `src/data/attractions.ts`, and any `src/components/sections/*` mock UI are deleted during rebuild, not patched.
- **Thin pages, fat features.** `page.tsx` orchestrates data fetching + layout only (~80 line ceiling) — business UI lives in feature components under `src/components/{feature}/`.
- **One design system.** All UI from `src/components/ui/` primitives (Button, Input, Select, Card, Dialog, Badge, Skeleton, Toast). No one-off styled elements in feature code, no CSS-in-JS — Tailwind only.
- **Optimistic UI only where safe.** Wishlist toggle: yes. Booking or payment state: never.
- **Zero hardcoded strings.** Every user-facing string goes through `next-intl` (`en.json`/`fil.json`), both updated in the same PR.

## Server vs Client (§6.6)

| Server Component | Client Component |
|---|---|
| Supabase data fetching, SEO metadata, cookies/headers | Form inputs/submission, click/hover handlers |
| Static content, passing data to Client children | Browser APIs, `useState`/`useReducer`, maps, date pickers, modals, real-time subscriptions |

Wrap only the subtree that needs client context (e.g. `ToastProvider` inside `NextIntlClientProvider`, not around the whole app shell).

## State Management (§6.7)

| State | Tool |
|---|---|
| URL/shareable (filters, sort, dates, pagination) | `searchParams` |
| Server/remote (property data, bookings) | Server Components + Server Actions |
| Form-local | React Hook Form |
| UI-ephemeral (modal open, gallery index) | `useState` |
| Auth session | Supabase SSR cookies via server client |
| Wishlist | Server Action + revalidate — persisted in DB, never localStorage |

**Never use localStorage** for booking state, cart, or auth tokens.

## Forms

Stack: React Hook Form + `@hookform/resolvers/zod` + a Zod schema shared between client validation and the Server Action (`src/lib/validations/`) — one schema, not two copies that can drift.

## Routing Conventions (§6.4)

- Public routes are locale-prefixed: `/[locale]/(public)/...`. Route groups: `(public)`, `(auth)`, `(customer)`, `(partner)`, `(admin)`, each with its own `layout.tsx` + auth guard.
- Public URLs use DB slugs, never expose internal UUIDs (`/properties/bella-vista-resort`, not `/properties/{uuid}`).
- Account areas nest under `/account/` (customer) or `/dashboard/` (partner/admin).

## i18n (§6.13)

`next-intl` with `/[locale]/` prefix, `en` and `fil` message files kept in lockstep. A PR that adds UI copy without both files is incomplete — this is a Definition-of-Done gate, not a nice-to-have.

## MVP-Required Checklist (subset of §6.2 — do not skip silently)

Error boundaries per route group (`error.tsx`), Suspense/`loading.tsx` for slow sections, skeleton loading states (no layout-shifting spinners), dedicated empty states with CTA, role-based nav + route guards, `next/image` with explicit `width`/`height` or `fill`+`sizes` for every photo, dynamic `import()` for maps/heavy UI, WCAG 2.1 AA (semantic HTML, keyboard nav, visible focus rings).

## Anti-Patterns (§6.22) — Do NOT

- Mark entire pages `"use client"` for data fetching
- Hardcode English strings in JSX
- Store auth tokens in localStorage
- Use `any` for Supabase query results — use generated types + view-model mappers
- Build custom modals/toasts per feature instead of `ui/Dialog` / `ui/Toast`
- Optimistically update booking or payment state
- Render raw DB error messages in UI
- Import the entire `lucide-react` bundle — import individual icons
- Add a second navbar/footer — one layout system only