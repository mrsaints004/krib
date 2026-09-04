-- ============================================================
-- UniNest: COMBINED MIGRATION SCRIPT (IDEMPOTENT)
-- Paste this entire script into the Supabase SQL Editor and run.
-- Safe to run even if some objects already exist.
-- ============================================================

-- ============================================================
-- STEP 0: Clean slate — drop everything safely
-- CASCADE on tables auto-drops their triggers, so we only need
-- to drop the auth trigger separately, then tables, then functions.
-- ============================================================

-- Drop the auth trigger (the only one on a table we don't own)
drop trigger if exists on_auth_user_created on auth.users;

-- Drop storage policies first (storage.objects always exists)
drop policy if exists "verification_docs_upload_own_folder" on storage.objects;
drop policy if exists "verification_docs_read_own_or_admin" on storage.objects;
drop policy if exists "listing_photos_upload_own_folder" on storage.objects;
drop policy if exists "listing_photos_read_public" on storage.objects;
drop policy if exists "listing_photos_delete_own" on storage.objects;
drop policy if exists "listing_photos_update_own" on storage.objects;
drop policy if exists "verification_docs_delete_own" on storage.objects;
drop policy if exists "verification_docs_update_own" on storage.objects;

-- Drop views
drop view if exists public_profile cascade;

-- Drop tables (CASCADE removes triggers, policies, indexes automatically)
drop table if exists audit_log cascade;
drop table if exists maintenance_requests cascade;
drop table if exists messages cascade;
drop table if exists conversations cascade;
drop table if exists bookings cascade;
drop table if exists verification_documents cascade;
drop table if exists listings cascade;
drop table if exists profiles cascade;

-- Drop functions (after tables are gone)
drop function if exists handle_new_user() cascade;
drop function if exists is_admin() cascade;
drop function if exists set_updated_at() cascade;
drop function if exists create_booking(uuid, uuid) cascade;
drop function if exists create_booking(uuid, uuid, uuid, integer, integer, integer) cascade;
drop function if exists validate_conversation_landlord() cascade;
drop function if exists handle_verification_doc_approved() cascade;
drop function if exists handle_maintenance_resolved() cascade;

-- Clean up any test users from previous runs
delete from auth.users where email in (
  'student@uninest.test', 'landlord@uninest.test', 'admin@uninest.test'
);


-- ============================================================
-- 0001: Core Schema
-- ============================================================

create extension if not exists "uuid-ossp";

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  phone text not null,
  role text not null check (role in ('student', 'landlord', 'admin')),
  matric_number text,
  university text check (university in ('FUOYE', 'EKSU', 'FUTES', 'BOUESTI')),
  is_verified boolean not null default false,
  is_premium boolean not null default false,
  verified_properties_count integer not null default 0,
  created_at timestamptz not null default now()
);

create view public_profile as
  select id, full_name, role, is_verified, is_premium, verified_properties_count
  from profiles;

create table listings (
  id uuid primary key default uuid_generate_v4(),
  landlord_id uuid not null references profiles (id) on delete cascade,
  title text not null,
  description text not null,
  university text not null check (university in ('FUOYE', 'EKSU', 'FUTES', 'BOUESTI')),
  distance_to_campus_km numeric(4, 1) not null,
  exact_address text not null,
  area_description text not null,
  rent_amount integer not null check (rent_amount > 0),
  rent_period text not null check (rent_period in ('monthly', 'quarterly', 'annual', 'custom')),
  amenities text[] not null default '{}',
  gender_preference text not null check (gender_preference in ('male', 'female', 'any')),
  photo_urls text[] not null default '{}',
  video_walkthrough_url text,
  defects jsonb not null default '[]',
  is_premium boolean not null default false,
  status text not null default 'draft'
    check (status in ('draft', 'pending_verification', 'approved', 'rejected', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index listings_university_status_idx on listings (university, status);
create index listings_landlord_idx on listings (landlord_id);

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
  content text not null,
  original_content text not null,
  was_flagged boolean not null default false,
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on messages (conversation_id, created_at);

create table bookings (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references listings (id),
  student_id uuid not null references profiles (id),
  landlord_id uuid not null references profiles (id),
  facilitation_fee integer not null check (facilitation_fee >= 0),
  rent_amount integer not null check (rent_amount > 0),
  total_amount integer not null check (total_amount > 0),
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'confirmed', 'active', 'completed', 'cancelled', 'disputed')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid', 'refunded', 'failed')),
  paystack_reference text,
  funds_released_at timestamptz,
  physical_inspection_requested boolean not null default false,
  physical_inspection_date timestamptz,
  move_in_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bookings_student_idx on bookings (student_id);
create index bookings_landlord_idx on bookings (landlord_id);

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


-- ============================================================
-- 0002: Row Level Security Policies
-- ============================================================

create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

alter table profiles enable row level security;

create policy "profiles_select_own_or_admin"
  on profiles for select
  using (id = auth.uid() or is_admin());

alter table listings enable row level security;

create policy "listings_select_approved"
  on listings for select
  using (status = 'approved' or landlord_id = auth.uid() or is_admin());

alter table conversations enable row level security;

create policy "conversations_select_participant"
  on conversations for select
  using (student_id = auth.uid() or landlord_id = auth.uid() or is_admin());

alter table messages enable row level security;

create policy "messages_select_participant"
  on messages for select
  using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id
      and (c.student_id = auth.uid() or c.landlord_id = auth.uid())
    )
    or is_admin()
  );

alter table bookings enable row level security;

create policy "bookings_select_participant"
  on bookings for select
  using (student_id = auth.uid() or landlord_id = auth.uid() or is_admin());

alter table maintenance_requests enable row level security;

create policy "maintenance_select_participant"
  on maintenance_requests for select
  using (
    student_id = auth.uid()
    or is_admin()
    or exists (
      select 1 from listings l
      where l.id = listing_id and l.landlord_id = auth.uid()
    )
  );


-- ============================================================
-- 0004: Verification Documents
-- ============================================================

create table verification_documents (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references profiles (id) on delete cascade,
  document_type text not null
    check (document_type in ('jamb_admission_letter', 'school_id', 'acceptance_letter', 'other')),
  file_url text not null,
  note text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references profiles (id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now()
);

create index verification_documents_status_idx on verification_documents (status);
create index verification_documents_profile_idx on verification_documents (profile_id);

alter table verification_documents enable row level security;

create policy "verification_docs_select"
  on verification_documents for select
  using (profile_id = auth.uid() or is_admin());

create policy "verification_docs_insert_own"
  on verification_documents for insert
  with check (profile_id = auth.uid());

create policy "verification_docs_update_admin_only"
  on verification_documents for update
  using (is_admin());


-- ============================================================
-- 0005: Storage Bucket Policies
-- ============================================================

create policy "verification_docs_upload_own_folder"
  on storage.objects for insert
  with check (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "verification_docs_read_own_or_admin"
  on storage.objects for select
  using (
    bucket_id = 'verification-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or is_admin()
    )
  );

create policy "listing_photos_upload_own_folder"
  on storage.objects for insert
  with check (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "listing_photos_read_public"
  on storage.objects for select
  using (bucket_id = 'listing-photos');


-- ============================================================
-- 0006: Updated-at Trigger
-- ============================================================

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger listings_set_updated_at
  before update on listings
  for each row execute function set_updated_at();

create trigger bookings_set_updated_at
  before update on bookings
  for each row execute function set_updated_at();


-- ============================================================
-- 0007: Secure Admin Role + Deny Client Insert
-- ============================================================

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'profiles' and policyname = 'profiles_deny_client_insert'
  ) then
    create policy "profiles_deny_client_insert"
      on profiles for insert
      with check (false);
  end if;
end $$;


-- ============================================================
-- 0008: Booking Concurrency
-- ============================================================

create unique index bookings_active_listing_idx
  on bookings (listing_id)
  where status in ('pending_payment', 'confirmed', 'active');


-- ============================================================
-- 0009 + 0010 + 0011: Combined final policies & hardening
-- (Skips intermediate policies that get dropped anyway)
-- ============================================================

-- Final profiles update policy (prevents role change)
create policy "profiles_update_own" on profiles for update
  using (id = auth.uid())
  with check (role = (select role from profiles where id = auth.uid()));

-- Final listings insert (landlord role check)
create policy "listings_insert_own" on listings for insert
  with check (
    landlord_id = auth.uid()
    and (select role from profiles where id = auth.uid()) = 'landlord'
  );

-- Final listings update (own draft/pending/rejected + admin)
create policy "listings_update_own_or_admin"
  on listings for update using (
    (auth.uid() = landlord_id and status in ('draft', 'pending_verification', 'rejected'))
    or is_admin()
  );

-- Final conversations insert (student role check)
create policy "conversations_insert_student" on conversations for insert
  with check (
    student_id = auth.uid()
    and (select role from profiles where id = auth.uid()) = 'student'
  );

-- Final bookings insert (student role check)
create policy "bookings_insert_student" on bookings for insert
  with check (
    student_id = auth.uid()
    and (select role from profiles where id = auth.uid()) = 'student'
  );

-- Final maintenance insert (student role check)
create policy "maintenance_insert_student" on maintenance_requests for insert
  with check (
    student_id = auth.uid()
    and (select role from profiles where id = auth.uid()) = 'student'
  );

-- Additional indexes
create index if not exists conversations_student_idx on conversations (student_id);
create index if not exists conversations_landlord_idx on conversations (landlord_id);
create index if not exists messages_sender_created_idx on messages (sender_id, created_at);
create index if not exists maintenance_student_idx on maintenance_requests (student_id);
create index if not exists maintenance_listing_idx on maintenance_requests (listing_id);
create index if not exists bookings_listing_idx on bookings (listing_id);
create index if not exists listings_status_idx on listings (status);
create index if not exists bookings_status_idx on bookings (status);
create index if not exists profiles_id_role_idx on profiles (id, role);

-- Constraints
alter table bookings
  add constraint bookings_total_check
  check (total_amount = rent_amount + facilitation_fee);

alter table bookings
  add constraint bookings_no_self_booking
  check (student_id <> landlord_id);

alter table conversations
  add constraint conversations_no_self_chat
  check (student_id <> landlord_id);

create unique index if not exists bookings_paystack_ref_unique
  on bookings (paystack_reference)
  where paystack_reference is not null;

alter table profiles
  add constraint profiles_name_not_empty
  check (length(trim(full_name)) > 0);

alter table listings
  add constraint listings_distance_non_negative
  check (distance_to_campus_km >= 0);

alter table listings
  add constraint listings_title_length
  check (length(title) between 1 and 200);

alter table listings
  add constraint listings_description_length
  check (length(description) between 1 and 5000);

alter table messages
  add constraint messages_content_length
  check (length(content) <= 2000);

alter table bookings
  add constraint bookings_fee_cap
  check (facilitation_fee <= 1000000);

alter table bookings
  add constraint bookings_funds_release_requires_payment
  check (funds_released_at is null or payment_status = 'paid');


-- ============================================================
-- 0011: Final functions, triggers, and extra tables
-- ============================================================

-- Signup trigger (final version — secure, validates name)
create or replace function handle_new_user()
returns trigger as $$
declare
  requested_role text;
  v_full_name text;
  v_phone text;
begin
  requested_role := coalesce(new.raw_user_meta_data->>'role', 'student');

  if requested_role not in ('student', 'landlord') then
    requested_role := 'student';
  end if;

  v_full_name := coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), 'User');
  v_phone := coalesce(new.raw_user_meta_data->>'phone', '');

  insert into profiles (id, full_name, phone, role, university)
  values (
    new.id,
    v_full_name,
    v_phone,
    requested_role,
    new.raw_user_meta_data->>'university'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Booking function (final version — caller verification, fee computation)
create or replace function create_booking(
  p_listing_id uuid,
  p_student_id uuid
) returns uuid as $$
declare
  v_listing record;
  v_fee integer;
  v_total integer;
  v_booking_id uuid;
begin
  if p_student_id <> auth.uid() then
    raise exception 'Cannot create a booking for another user';
  end if;

  select id, landlord_id, rent_amount, status
  into v_listing
  from listings
  where id = p_listing_id
  for update;

  if v_listing is null then
    raise exception 'Listing not found';
  end if;

  if v_listing.status <> 'approved' then
    raise exception 'Listing is not available for booking';
  end if;

  if v_listing.landlord_id = p_student_id then
    raise exception 'Cannot book your own listing';
  end if;

  v_fee := least(round(v_listing.rent_amount * 0.05)::integer, 1000000);
  v_total := v_listing.rent_amount + v_fee;

  begin
    insert into bookings (
      listing_id, student_id, landlord_id,
      rent_amount, facilitation_fee, total_amount
    ) values (
      p_listing_id, p_student_id, v_listing.landlord_id,
      v_listing.rent_amount, v_fee, v_total
    ) returning id into v_booking_id;
  exception when unique_violation then
    raise exception 'A booking already exists for this listing.';
  end;

  return v_booking_id;
end;
$$ language plpgsql security definer;

revoke execute on function create_booking(uuid, uuid) from public;
grant execute on function create_booking(uuid, uuid) to authenticated;

-- Conversation landlord validation trigger
create or replace function validate_conversation_landlord()
returns trigger as $$
declare
  v_landlord_id uuid;
begin
  select landlord_id into v_landlord_id
  from listings where id = new.listing_id;

  if v_landlord_id is null then
    raise exception 'Listing not found';
  end if;

  if new.landlord_id <> v_landlord_id then
    raise exception 'landlord_id must match the listing landlord';
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_validate_conversation_landlord
  before insert on conversations
  for each row execute function validate_conversation_landlord();

-- Verification doc auto-approve trigger
create or replace function handle_verification_doc_approved()
returns trigger as $$
begin
  if new.status = 'approved' and (old.status is null or old.status <> 'approved') then
    update profiles
    set is_verified = true
    where id = new.profile_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_verification_doc_approved
  after update on verification_documents
  for each row execute function handle_verification_doc_approved();

-- Maintenance resolved trigger
create or replace function handle_maintenance_resolved()
returns trigger as $$
begin
  if new.status in ('resolved', 'closed') and old.status not in ('resolved', 'closed') then
    new.resolved_at := now();
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_maintenance_resolved
  before update on maintenance_requests
  for each row execute function handle_maintenance_resolved();

-- Add updated_at to maintenance_requests
alter table maintenance_requests
  add column if not exists updated_at timestamptz not null default now();

create trigger set_maintenance_updated_at
  before update on maintenance_requests
  for each row execute function set_updated_at();

-- Soft delete columns
alter table profiles add column if not exists deleted_at timestamptz;
alter table bookings add column if not exists deleted_at timestamptz;
alter table listings add column if not exists deleted_at timestamptz;

-- Storage delete/update policies
create policy "listing_photos_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "listing_photos_update_own"
  on storage.objects for update
  using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "verification_docs_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "verification_docs_update_own"
  on storage.objects for update
  using (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Audit log
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles (id),
  action text not null,
  target_type text not null,
  target_id uuid,
  details jsonb default '{}',
  created_at timestamptz not null default now()
);

create index if not exists audit_log_actor_idx on audit_log (actor_id);
create index if not exists audit_log_target_idx on audit_log (target_type, target_id);
create index if not exists audit_log_created_idx on audit_log (created_at);

alter table audit_log enable row level security;

create policy "audit_log_admin_read"
  on audit_log for select
  using (is_admin());

-- Verification docs index
create index if not exists verification_docs_reviewed_by_idx
  on verification_documents (reviewed_by) where reviewed_by is not null;


-- ============================================================
-- CREATE DEFAULT TEST USERS
-- ============================================================
--
-- DEFAULT CREDENTIALS:
--   Student:  student@uninest.test  / UniNest@2024
--   Landlord: landlord@uninest.test / UniNest@2024
--   Admin:    admin@uninest.test    / UniNest@2024
-- ============================================================

-- Student account
insert into auth.users (
  id, instance_id, aud, role,
  email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token
) values (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'student@uninest.test',
  crypt('UniNest@2024', gen_salt('bf')),
  now(),
  '{"full_name": "Test Student", "phone": "08012345678", "role": "student", "university": "FUOYE"}'::jsonb,
  now(), now(),
  '', ''
);

-- Landlord account
insert into auth.users (
  id, instance_id, aud, role,
  email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token
) values (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'landlord@uninest.test',
  crypt('UniNest@2024', gen_salt('bf')),
  now(),
  '{"full_name": "Test Landlord", "phone": "08098765432", "role": "landlord"}'::jsonb,
  now(), now(),
  '', ''
);

-- Admin account
insert into auth.users (
  id, instance_id, aud, role,
  email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token
) values (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'admin@uninest.test',
  crypt('UniNest@2024', gen_salt('bf')),
  now(),
  '{"full_name": "Test Admin", "phone": "08011111111", "role": "admin"}'::jsonb,
  now(), now(),
  '', ''
);

-- Fix admin role (trigger downgrades it to 'student' for security)
update profiles
set role = 'admin'
where id = (select id from auth.users where email = 'admin@uninest.test');

-- Mark all test users as verified
update profiles
set is_verified = true
where id in (
  select id from auth.users
  where email in ('student@uninest.test', 'landlord@uninest.test', 'admin@uninest.test')
);
