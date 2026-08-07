-- ============================================================
-- UniNest: Core Schema
-- Run in Supabase SQL Editor, or via `supabase db push`
-- ============================================================

create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- PROFILES
-- Extends Supabase's built-in auth.users with app-specific data.
-- Raw contact info (phone, email) lives here and is NEVER exposed
-- directly to the other party in a transaction — see public_profile
-- view below, and the RLS policies in 0002_rls.sql.
-- ------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  phone text not null,
  role text not null check (role in ('student', 'landlord', 'admin')),

  -- student-only
  matric_number text,
  university text check (university in ('FUOYE', 'EKSU', 'FUTES', 'BOUESTI')),
  is_verified boolean not null default false,

  -- landlord-only
  is_premium boolean not null default false,
  verified_properties_count integer not null default 0,

  created_at timestamptz not null default now()
);

-- A safe, public-facing view that excludes phone/email entirely.
-- The app should query THIS, never `profiles` directly, when
-- rendering anything the other party in a deal might see.
create view public_profile as
  select
    id,
    full_name,
    role,
    is_verified,
    is_premium,
    verified_properties_count
  from profiles;

-- ------------------------------------------------------------
-- LISTINGS
-- ------------------------------------------------------------
create table listings (
  id uuid primary key default uuid_generate_v4(),
  landlord_id uuid not null references profiles (id) on delete cascade,

  title text not null,
  description text not null,
  university text not null check (university in ('FUOYE', 'EKSU', 'FUTES', 'BOUESTI')),
  distance_to_campus_km numeric(4, 1) not null,

  -- Exact address is intentionally NOT shown to students pre-booking.
  -- The app should only ever display `area_description` until a
  -- booking exists — see ARCHITECTURE.md.
  exact_address text not null,
  area_description text not null, -- e.g. "Off Ijigbo Road, near FUOYE gate 2"

  rent_amount integer not null check (rent_amount > 0), -- kobo
  rent_period text not null check (rent_period in ('monthly', 'quarterly', 'annual', 'custom')),
  amenities text[] not null default '{}',
  gender_preference text not null check (gender_preference in ('male', 'female', 'any')),

  photo_urls text[] not null default '{}',
  video_walkthrough_url text,

  -- Mandatory defect disclosure: NOT NULL with a default of empty array
  -- means the field must always be present. "No defects" is an
  -- explicit empty array, never a missing/null field.
  defects jsonb not null default '[]',

  is_premium boolean not null default false,
  status text not null default 'draft'
    check (status in ('draft', 'pending_verification', 'approved', 'rejected', 'archived')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index listings_university_status_idx on listings (university, status);
create index listings_landlord_idx on listings (landlord_id);

-- ------------------------------------------------------------
-- CONVERSATIONS & MESSAGES
-- One conversation per (listing, student) pair. All contact
-- between parties MUST go through here — see messageFilter.ts.
-- ------------------------------------------------------------
create table conversations (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references listings (id) on delete cascade,
  student_id uuid not null references profiles (id) on delete cascade,
  landlord_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (listing_id, student_id)
);

create table messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_id uuid not null references profiles (id),

  -- What actually gets shown to the recipient (may be redacted)
  content text not null,
  -- The original, unredacted text — kept for moderation/dispute review
  original_content text not null,
  was_flagged boolean not null default false,

  created_at timestamptz not null default now()
);

create index messages_conversation_idx on messages (conversation_id, created_at);

-- ------------------------------------------------------------
-- BOOKINGS
-- Escrow-style: money is marked "held" until move-in is confirmed,
-- not released to the landlord immediately on payment.
-- ------------------------------------------------------------
create table bookings (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references listings (id),
  student_id uuid not null references profiles (id),
  landlord_id uuid not null references profiles (id),

  facilitation_fee integer not null check (facilitation_fee >= 0), -- kobo
  rent_amount integer not null check (rent_amount > 0),
  total_amount integer not null check (total_amount > 0),

  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'confirmed', 'active', 'completed', 'cancelled', 'disputed')),

  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid', 'refunded', 'failed')),
  paystack_reference text,

  -- Escrow: funds are "paid" (captured by platform) but not
  -- released to landlord until student confirms move-in.
  funds_released_at timestamptz,

  physical_inspection_requested boolean not null default false,
  physical_inspection_date timestamptz,
  move_in_date timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bookings_student_idx on bookings (student_id);
create index bookings_landlord_idx on bookings (landlord_id);

-- ------------------------------------------------------------
-- MAINTENANCE REQUESTS
-- ------------------------------------------------------------
create table maintenance_requests (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid not null references bookings (id),
  student_id uuid not null references profiles (id),
  listing_id uuid not null references listings (id),

  category text not null check (category in ('plumbing', 'electrical', 'carpentry', 'structural', 'appliance', 'other')),
  description text not null,
  photo_urls text[] not null default '{}',
  video_url text,

  status text not null default 'submitted'
    check (status in ('submitted', 'acknowledged', 'technician_assigned', 'in_progress', 'resolved', 'closed', 'disputed')),
  is_student_caused boolean not null default false,
  assigned_technician_id uuid,

  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index maintenance_booking_idx on maintenance_requests (booking_id);
