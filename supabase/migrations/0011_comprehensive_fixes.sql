-- ============================================================
-- Comprehensive production fixes.
-- Addresses: admin policy conflict, signup trigger constraint,
-- create_booking caller verification, conversation landlord
-- validation, missing constraints, indexes, audit log, storage
-- policies, soft delete, and data integrity.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Fix admin listing UPDATE policy conflict (#1)
--    After 0009+0010, the surviving policy does not include
--    is_admin(). Drop it and recreate with admin access.
-- ------------------------------------------------------------
drop policy if exists "Landlords can edit their own draft/pending/rejected listings" on listings;

create policy "listings_update_own_or_admin"
  on listings for update using (
    (auth.uid() = landlord_id and status in ('draft', 'pending_verification', 'rejected'))
    or is_admin()
  );

-- ------------------------------------------------------------
-- 2. Fix signup trigger vs CHECK constraint conflict (#2)
--    Trigger must provide non-empty full_name to satisfy
--    profiles_name_not_empty CHECK. Also validate phone.
-- ------------------------------------------------------------
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

  -- Ensure full_name is non-empty (satisfies profiles_name_not_empty CHECK)
  v_full_name := coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), 'User');
  -- Ensure phone is non-null
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

-- ------------------------------------------------------------
-- 3. Fix create_booking() caller verification (#4)
--    Verify p_student_id matches auth.uid() to prevent
--    booking on behalf of other students.
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
  -- Verify caller is the student
  if p_student_id <> auth.uid() then
    raise exception 'Cannot create a booking for another user';
  end if;

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

-- Restrict direct execution: only authenticated users via RPC
revoke execute on function create_booking(uuid, uuid) from public;
grant execute on function create_booking(uuid, uuid) to authenticated;

-- ------------------------------------------------------------
-- 4. Validate conversations.landlord_id matches listing (#5)
--    Add a trigger since CHECK constraints can't do subqueries.
-- ------------------------------------------------------------
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

drop trigger if exists trg_validate_conversation_landlord on conversations;
create trigger trg_validate_conversation_landlord
  before insert on conversations
  for each row execute function validate_conversation_landlord();

-- ------------------------------------------------------------
-- 5. Missing constraints (#27, #32, #28)
-- ------------------------------------------------------------

-- Distance must be non-negative
alter table listings
  add constraint listings_distance_non_negative
  check (distance_to_campus_km >= 0);

-- Title/description length bounds
alter table listings
  add constraint listings_title_length
  check (length(title) between 1 and 200);

alter table listings
  add constraint listings_description_length
  check (length(description) between 1 and 5000);

-- Message content max length
alter table messages
  add constraint messages_content_length
  check (length(content) <= 2000);

-- Facilitation fee cap (matches business logic)
alter table bookings
  add constraint bookings_fee_cap
  check (facilitation_fee <= 1000000);

-- Funds released only when paid
alter table bookings
  add constraint bookings_funds_release_requires_payment
  check (funds_released_at is null or payment_status = 'paid');

-- ------------------------------------------------------------
-- 6. Missing indexes (#1.1-1.4 from DB audit)
-- ------------------------------------------------------------
create index if not exists listings_status_idx
  on listings (status);

create index if not exists bookings_status_idx
  on bookings (status);

create index if not exists verification_docs_reviewed_by_idx
  on verification_documents (reviewed_by)
  where reviewed_by is not null;

create index if not exists profiles_id_role_idx
  on profiles (id, role);

create index if not exists verification_docs_status_idx
  on verification_documents (status);

-- ------------------------------------------------------------
-- 7. Storage DELETE/UPDATE policies (#26)
-- ------------------------------------------------------------

-- Landlords can delete their own listing photos
create policy "listing_photos_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Landlords can update/replace their own listing photos
create policy "listing_photos_update_own"
  on storage.objects for update
  using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own verification documents
create policy "verification_docs_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update their own verification documents
create policy "verification_docs_update_own"
  on storage.objects for update
  using (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ------------------------------------------------------------
-- 8. Audit log table (#16)
-- ------------------------------------------------------------
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

-- Only admins can read audit logs
create policy "audit_log_admin_read"
  on audit_log for select
  using (is_admin());

-- Only service_role can insert (server-side only)
-- No insert policy for authenticated role

-- ------------------------------------------------------------
-- 9. Auto-verify profile when document is approved (#5.2)
-- ------------------------------------------------------------
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

drop trigger if exists trg_verification_doc_approved on verification_documents;
create trigger trg_verification_doc_approved
  after update on verification_documents
  for each row execute function handle_verification_doc_approved();

-- ------------------------------------------------------------
-- 10. Auto-set resolved_at on maintenance requests (#5.6)
-- ------------------------------------------------------------
create or replace function handle_maintenance_resolved()
returns trigger as $$
begin
  if new.status in ('resolved', 'closed') and old.status not in ('resolved', 'closed') then
    new.resolved_at := now();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_maintenance_resolved on maintenance_requests;
create trigger trg_maintenance_resolved
  before update on maintenance_requests
  for each row execute function handle_maintenance_resolved();

-- ------------------------------------------------------------
-- 11. Add updated_at to maintenance_requests (#5.1)
-- ------------------------------------------------------------
alter table maintenance_requests
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists set_maintenance_updated_at on maintenance_requests;
create trigger set_maintenance_updated_at
  before update on maintenance_requests
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- 12. Add deleted_at for soft delete on critical tables (#17)
-- ------------------------------------------------------------
alter table profiles
  add column if not exists deleted_at timestamptz;

alter table bookings
  add column if not exists deleted_at timestamptz;

alter table listings
  add column if not exists deleted_at timestamptz;
