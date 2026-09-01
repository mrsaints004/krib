-- ============================================================
-- Production hardening: security fixes, constraints, and indexes.
-- Addresses privilege escalation, missing role checks, fee
-- manipulation, and adds defensive constraints/indexes.
-- ============================================================

-- ------------------------------------------------------------
-- 1a. Fix privilege escalation: prevent users from changing
--     their own role via the profiles_update_own policy.
-- ------------------------------------------------------------
drop policy "profiles_update_own" on profiles;

create policy "profiles_update_own" on profiles for update
  using (id = auth.uid())
  with check (role = (select role from profiles where id = auth.uid()));

-- ------------------------------------------------------------
-- 1b. Fix duplicate listing update policy from migration 0009.
--     0009 dropped a non-existent policy name, leaving the
--     original listings_update_own_pre_approval alive.
-- ------------------------------------------------------------
drop policy if exists "listings_update_own_pre_approval" on listings;

-- ------------------------------------------------------------
-- 1c. Add role checks to INSERT policies.
--     Ensures only the correct role can create each resource.
-- ------------------------------------------------------------

-- Listings: only landlords can insert
drop policy "listings_insert_own" on listings;
create policy "listings_insert_own" on listings for insert
  with check (
    landlord_id = auth.uid()
    and (select role from profiles where id = auth.uid()) = 'landlord'
  );

-- Conversations: only students can start conversations
drop policy "conversations_insert_student" on conversations;
create policy "conversations_insert_student" on conversations for insert
  with check (
    student_id = auth.uid()
    and (select role from profiles where id = auth.uid()) = 'student'
  );

-- Bookings: only students can create bookings
drop policy "bookings_insert_student" on bookings;
create policy "bookings_insert_student" on bookings for insert
  with check (
    student_id = auth.uid()
    and (select role from profiles where id = auth.uid()) = 'student'
  );

-- Maintenance requests: only students can file
drop policy "maintenance_insert_student" on maintenance_requests;
create policy "maintenance_insert_student" on maintenance_requests for insert
  with check (
    student_id = auth.uid()
    and (select role from profiles where id = auth.uid()) = 'student'
  );

-- ------------------------------------------------------------
-- 1d. Add missing indexes for common query patterns.
-- ------------------------------------------------------------
create index if not exists conversations_student_idx
  on conversations (student_id);

create index if not exists conversations_landlord_idx
  on conversations (landlord_id);

create index if not exists messages_sender_created_idx
  on messages (sender_id, created_at);

create index if not exists maintenance_student_idx
  on maintenance_requests (student_id);

create index if not exists maintenance_listing_idx
  on maintenance_requests (listing_id);

create index if not exists bookings_listing_idx
  on bookings (listing_id);

-- ------------------------------------------------------------
-- 1e. Add missing constraints.
-- ------------------------------------------------------------

-- Bookings: total must equal rent + fee
alter table bookings
  add constraint bookings_total_check
  check (total_amount = rent_amount + facilitation_fee);

-- Bookings: no self-booking
alter table bookings
  add constraint bookings_no_self_booking
  check (student_id <> landlord_id);

-- Conversations: student and landlord must be different people
alter table conversations
  add constraint conversations_no_self_chat
  check (student_id <> landlord_id);

-- Bookings: unique paystack_reference (when not null)
create unique index if not exists bookings_paystack_ref_unique
  on bookings (paystack_reference)
  where paystack_reference is not null;

-- Profiles: full_name must not be empty/whitespace
alter table profiles
  add constraint profiles_name_not_empty
  check (length(trim(full_name)) > 0);

-- ------------------------------------------------------------
-- 1f & 1g. Rewrite create_booking to compute fee server-side
--          and handle unique_violation gracefully.
-- ------------------------------------------------------------
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
  -- Lock the listing row to prevent concurrent booking races
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

  -- Prevent self-booking
  if v_listing.landlord_id = p_student_id then
    raise exception 'Cannot book your own listing';
  end if;

  -- Compute fee server-side: 5% capped at 1,000,000 kobo (₦10,000)
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
    raise exception 'A booking already exists for this listing. It may have been booked by another student.';
  end;

  return v_booking_id;
end;
$$ language plpgsql;
