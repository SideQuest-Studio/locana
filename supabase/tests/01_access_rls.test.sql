BEGIN;
\ir fixtures.psql
SELECT plan(3);

SELECT has_column('public', 'bookings', 'reference', 'bookings.reference exists');
SELECT col_is_unique('public', 'bookings', 'reference', 'reference unique');
SELECT has_column('public', 'bookings', 'rate_plan_id', 'bookings.rate_plan_id exists');

SELECT * FROM finish();
ROLLBACK;
