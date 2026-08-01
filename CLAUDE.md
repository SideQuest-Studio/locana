# DIP — Claude Code Instructions

Instant-book resort & hotel platform for **Quezon Province, Philippines**. Brand: **DIP** (never "locana"/"devpulse" — legacy names, delete on sight). 1-week MVP for presentation; architecture must survive post-MVP scale.

**Full architecture reference:** `AGENTS.md` (backend §5, frontend §6, cross-cutting §7 — read the relevant section before touching that area for the first time).
**Schema of record:** `dip_schema_v3.dbml` — import into dbdiagram.io to view. Generate migrations from this file, not from prose in AGENTS.md §5.7 (deprecated).
**Detailed backend/frontend rules** auto-load from `.claude/rules/` when you touch matching files — you don't need to read them proactively.

When this file conflicts with anything else, this file wins. When this file is silent, defer to `AGENTS.md`.

---

## Locked Decisions (do not re-litigate without updating this file)

| Area | Decision |
|------|----------|
| Framework | Next.js App Router — rebuild, don't patch legacy mock UI |
| Database & Auth | Supabase (PostgreSQL + Supabase Auth) |
| Booking model | Instant book (no request-to-book in MVP) |
| Account required | Yes — no guest checkout |
| Partner model | Self-register → `pending` → `approved`; admin may `reject`/`suspend` (`partners.status`) |
| Partner scope | One partner account = one property |
| Partner staff | `partner_id`/`staff_role` live directly on `profiles` — no separate table |
| Room model | Both room-type quantity AND individual room units |
| Pricing precedence | `room_type_availability.price_override` > `pricing_rules` (by priority) > `rate_plans.price_modifier` > `room_types.base_price` — same order for minimum-stay |
| Early/late fees | On `properties.early_checkin_fee` / `late_checkout_fee` — not in `pricing_rules` |
| Packages | `rate_plans.includes_breakfast` = bundled/free; `package_items(item_type='breakfast')` = paid add-on — both exist, never collapse |
| Commission | Lives on `partners.commission_rate` (not `properties`) |
| Promo scope | Platform-wide and partner-specific codes both supported (`promo_codes.partner_id` nullable) |
| Payments | PayMongo (GCash, Cards, GrabPay); downpayment default 30% (TBD-01 fallback) |
| Payouts | Manual/export for MVP; automate post-MVP |
| Reviews | Only after `checked_out`; overall + cleanliness/staff/location/value sub-ratings |
| i18n | English + Filipino from day one; DB columns use `_en`/`_fil` pairs; slugs are not translated |
| PWA | Mobile-first installable; offline shell only, not offline booking |
| OTA/channel managers | Post-MVP — schema hooks only, no sync |

Open items agents must not silently decide: full TBD registry in `AGENTS.md` §3.

---

## Non-Negotiable Rules

1. **RLS is the security boundary.** Every table with user-scoped data has RLS enabled in the same PR it's created — not a follow-up task.
2. **All writes go through Server Actions or Route Handlers.** Never mutate Supabase from the browser with the service role key. Anon key is read-only client-side.
3. **Booking-critical paths are transactional.** Availability lock, decrement, booking insert, and status-history insert happen inside one `create_booking()` RPC using `SELECT ... FOR UPDATE`. Partial success is a bug, not an edge case.
4. **Payments are idempotent.** Every transaction has a unique `transaction_reference`. Duplicate webhook delivery is a no-op, never a double-charge — go through `payment_events` first.
5. **Never expose raw DB errors to clients.** Map `PostgrestError` codes to i18n keys centrally.
6. **UUID PKs everywhere**, `gen_random_uuid()`. Timestamps (`created_at`/`updated_at`) on every table.
7. **Zod validates every Server Action input and webhook payload** before it touches the database.
8. **Server Actions/Route Handlers return `ActionResult<T>`** (`src/lib/api/response.ts`) — never a bare value or thrown error to the client.
9. **Zero hardcoded user-facing strings.** Every UI string goes through `en.json`/`fil.json`, added together in the same PR.
10. **Never optimistically update booking or payment state.** Wishlist toggles are fine; money and inventory are not.
11. **Admin/partner mutations on properties, pricing, and approvals write an `audit_logs` row** (actor_id, action, entity_type/entity_id, before/after) — this is separate from `booking_status_history`, which only covers booking transitions.
12. **Migrations are one concern each, never edited after being applied.** Regenerate `database.types.ts` after any schema change.

---

## Week Sprint Priority

| Day | Focus |
|-----|-------|
| 1 | Schema + Auth + RLS — migrations applied, roles work, areas seeded |
| 2 | Public browse — search, filters, property detail, map pin |
| 3 | Booking + PayMongo — instant book, downpayment, webhook, emails |
| 4 | Partner portal — property/room/availability/rates CRUD |
| 5 | Customer account — bookings list, wishlist, promo codes |
| 6 | Admin + reviews + partner approval |
| 7 | PWA + SEO + polish — manifest, i18n pass, Playwright smoke, demo seed |

Ship a demoable vertical slice each day. Don't start a later phase until the current day's blocker is done.

---

## Naming Quick Reference

DB tables/columns: `snake_case`. TypeScript: `camelCase`. React components: `PascalCase` file + export. Server actions: camelCase verb (`createBooking`). i18n DB columns: `_en`/`_fil` suffix pair. Enums (TS): PascalCase type, snake_case values. Full table in `AGENTS.md` §7.1.

---

## Definition of Done (every task)

- [ ] Zod validation on inputs; RLS covers any new table; migration + RLS + indexes in the same PR
- [ ] `database.types.ts` regenerated if schema changed
- [ ] EN + FIL strings added for any new UI copy
- [ ] Lint + build pass; no `console.log` in production paths; no secrets committed
- [ ] Unresolved product decisions documented in `AGENTS.md` §3 TBD Registry, not silently assumed

Full Definition of Done (frontend/backend specifics): `AGENTS.md` §9.