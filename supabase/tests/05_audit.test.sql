BEGIN;
\ir fixtures.psql
SELECT plan(3);

SELECT pg_temp.tests_login('a0000000-0000-0000-0000-00000000000a');
UPDATE public.rate_plans SET price_modifier = 700 WHERE id = 'f0000000-0000-0000-0000-0000000000a1';
UPDATE public.rate_plans SET price_modifier = 700 WHERE id = 'f0000000-0000-0000-0000-0000000000a1';
SELECT pg_temp.tests_logout();

SELECT is((SELECT count(*)::int FROM public.audit_logs WHERE entity_id = 'f0000000-0000-0000-0000-0000000000a1'),
  1, 'one row; no-op update skipped');
SELECT is((SELECT actor_id FROM public.audit_logs WHERE entity_id = 'f0000000-0000-0000-0000-0000000000a1'),
  'a0000000-0000-0000-0000-00000000000a'::uuid, 'actor recorded');
SELECT is((SELECT (before->>'price_modifier')::numeric FROM public.audit_logs WHERE entity_id = 'f0000000-0000-0000-0000-0000000000a1'),
  500.00, 'before captured');

SELECT * FROM finish();
ROLLBACK;
