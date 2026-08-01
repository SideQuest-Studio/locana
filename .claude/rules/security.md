# Security Checklist (DIP)

Full detail: `AGENTS.md` §7.4-7.5. This loads every session — keep it short.

- [ ] RLS enabled on every public table, in the same PR that creates it
- [ ] Service role key is server-only — never in `NEXT_PUBLIC_*`, never in client-side code, never in a browser-reachable Edge Function
- [ ] Webhook signature verification before processing any payload (PayMongo: reject 401 on invalid HMAC)
- [ ] Rate limiting on auth endpoints
- [ ] Zod input validation on every Server Action and webhook payload
- [ ] Guest ID docs in a private bucket, signed URLs only, auto-expire post-checkout + 30 days
- [ ] Partner verification docs — admin + owning partner only
- [ ] Admin/partner mutations on properties, pricing, and approvals write an `audit_logs` row (actor_id, action, entity_type/entity_id, before/after) — distinct from `booking_status_history`
- [ ] Store only necessary PII; document purpose in the privacy policy
- [ ] Never expose raw `PostgrestError` messages to clients — map to i18n error keys centrally