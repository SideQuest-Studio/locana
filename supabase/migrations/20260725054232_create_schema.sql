-- Enable UUID generation
create extension if not exists pgcrypto;

------------------------------------------------------------
-- ENUMS
------------------------------------------------------------

create type user_role as enum (
    'customer',
    'admin',
    'vendor'
);

create type destination_type as enum (
    'restaurant',
    'resort',
    'nature'
);

create type activity_type as enum (
    'tour',
    'adventure',
    'cultural',
    'food',
    'other'
);

create type booking_status as enum (
    'pending',
    'confirmed',
    'cancelled',
    'completed'
);

create type payment_method as enum (
    'card',
    'paypal',
    'bank_transfer',
    'other'
);

create type payment_status as enum (
    'pending',
    'completed',
    'failed',
    'refunded'
);

------------------------------------------------------------
-- USERS
------------------------------------------------------------

create table public.users (
    id uuid primary key default gen_random_uuid(),

    email text not null unique,
    password_hash text not null,

    first_name text,
    last_name text,

    phone text,
    avatar_url text,

    role user_role not null default 'customer',

    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

------------------------------------------------------------
-- ACTIVITIES
------------------------------------------------------------

create table public.activities (
    id uuid primary key default gen_random_uuid(),

    title text not null,
    description text,

    type activity_type not null,

    duration_minutes integer,
    max_participants integer,

    price_per_person numeric(10,2) not null,
    currency text default 'USD',

    is_active boolean default true,

    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

------------------------------------------------------------
-- DESTINATIONS
------------------------------------------------------------

create table public.destinations (
    id uuid primary key default gen_random_uuid(),

    name text not null,
    region text,
    description text,

    type destination_type,

    activity_id uuid not null
        references public.activities(id)
        on delete restrict,

    latitude numeric(10,8),
    longitude numeric(11,8),

    featured_image_url text,

    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

------------------------------------------------------------
-- ACTIVITY IMAGES
------------------------------------------------------------

create table public.activity_images (
    id uuid primary key default gen_random_uuid(),

    activity_id uuid not null
        references public.activities(id)
        on delete cascade,

    image_url text not null,

    alt_text text,

    sort_order integer default 0,

    created_at timestamptz default now()
);

------------------------------------------------------------
-- BOOKINGS
------------------------------------------------------------

create table public.bookings (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references public.users(id)
        on delete cascade,

    destination_id uuid not null
        references public.destinations(id)
        on delete restrict,

    participants_count integer not null,

    total_amount numeric(10,2) not null,

    currency text default 'USD',

    status booking_status default 'pending',

    starts_at timestamptz not null,
    ends_at timestamptz,

    special_requests text,

    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

------------------------------------------------------------
-- PAYMENTS
------------------------------------------------------------

create table public.payments (
    id uuid primary key default gen_random_uuid(),

    booking_id uuid not null
        references public.bookings(id)
        on delete cascade,

    amount numeric(10,2) not null,

    currency text default 'USD',

    payment_method payment_method,

    status payment_status default 'pending',

    external_payment_id text,

    paid_at timestamptz,

    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

------------------------------------------------------------
-- REVIEWS
------------------------------------------------------------

create table public.reviews (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references public.users(id)
        on delete cascade,

    activity_id uuid not null
        references public.activities(id)
        on delete cascade,

    booking_id uuid not null
        references public.bookings(id)
        on delete cascade,

    rating integer check (rating between 1 and 5),

    comment text,

    is_verified boolean default false,

    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

------------------------------------------------------------
-- WISHLISTS
------------------------------------------------------------

create table public.wishlists (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references public.users(id)
        on delete cascade,

    destination_id uuid not null
        references public.destinations(id)
        on delete cascade,

    created_at timestamptz default now(),

    unique(user_id, destination_id)
);

------------------------------------------------------------
-- ACTIVITY TAGS
------------------------------------------------------------

create table public.activity_tags (
    id uuid primary key default gen_random_uuid(),

    activity_id uuid not null
        references public.activities(id)
        on delete cascade,

    tag text not null,

    created_at timestamptz default now()
);

create index idx_activity_tags_activity_id
on public.activity_tags(activity_id);

------------------------------------------------------------
-- INDEXES
------------------------------------------------------------

create index idx_bookings_user
on public.bookings(user_id);

create index idx_bookings_destination
on public.bookings(destination_id);

create index idx_reviews_activity
on public.reviews(activity_id);

create index idx_payments_booking
on public.payments(booking_id);

create index idx_destination_activity
on public.destinations(activity_id);

create index idx_activity_images_activity
on public.activity_images(activity_id);
