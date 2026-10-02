BEGIN;
\ir fixtures.psql
SELECT plan(2);

SELECT pg_temp.tests_login('a0000000-0000-0000-0000-0000000000c1');
SELECT is(auth.uid(), 'a0000000-0000-0000-0000-0000000000c1'::uuid, 'login sets auth.uid()');
SELECT pg_temp.tests_logout();

SELECT is((SELECT count(*)::int FROM public.room_types WHERE id::text LIKE 'e0000000%'), 3, 'fixtures seeded');

SELECT * FROM finish();
ROLLBACK;
