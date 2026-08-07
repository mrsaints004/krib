-- ============================================================
-- UniNest: Row Level Security Policies
-- Security lives here, in the database — not just in app code.
-- Even if a route forgets a check, the DB refuses the query.
-- ============================================================

-- Helper: is the current user an admin?
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- ------------------------------------------------------------
-- PROFILES
-- ------------------------------------------------------------
alter table profiles enable row level security;

-- Anyone can read the *view* (public_profile), but the raw table
-- (with phone number) is only readable by the row's own owner or an admin.
create policy "profiles_select_own_or_admin"
  on profiles for select
  using (id = auth.uid() or is_admin());

create policy "profiles_update_own"
  on profiles for update
  using (id = auth.uid());

-- Note: row creation happens via a trigger on auth.users signup,
-- not direct client insert — see 0003_signup_trigger.sql.

-- ------------------------------------------------------------
-- LISTINGS
-- ------------------------------------------------------------
alter table listings enable row level security;

-- Public can see approved listings only.
create policy "listings_select_approved"
  on listings for select
  using (status = 'approved' or landlord_id = auth.uid() or is_admin());

-- Landlord can only insert their own listings.
create policy "listings_insert_own"
  on listings for insert
  with check (landlord_id = auth.uid());

-- Landlord can edit their own listing ONLY while it's draft or
-- pending — once approved, edits go through re-verification,
-- preventing a landlord from quietly editing out disclosed defects
-- after approval.
create policy "listings_update_own_pre_approval"
  on listings for update
  using (
    (landlord_id = auth.uid() and status in ('draft', 'pending_verification'))
    or is_admin()
  );

-- ------------------------------------------------------------
-- CONVERSATIONS
-- ------------------------------------------------------------
alter table conversations enable row level security;

create policy "conversations_select_participant"
  on conversations for select
  using (student_id = auth.uid() or landlord_id = auth.uid() or is_admin());

create policy "conversations_insert_student"
  on conversations for insert
  with check (student_id = auth.uid());

-- ------------------------------------------------------------
-- MESSAGES
-- No direct client insert at all. All messages MUST go through
-- the /api/messages route, which runs the content filter first
-- (see src/lib/messageFilter.ts) then inserts using the service
-- role key. This makes the filter impossible to bypass by calling
-- the Supabase client directly from the browser.
-- ------------------------------------------------------------
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

-- Deliberately NO insert policy for the `authenticated` role.
-- Only the service_role key (used server-side only) can write here.

-- ------------------------------------------------------------
-- BOOKINGS
-- Status/payment transitions happen via server routes (webhook-
-- verified payment, admin confirming disputes) using the service
-- role — not directly writable by students/landlords beyond creation.
-- ------------------------------------------------------------
alter table bookings enable row level security;

create policy "bookings_select_participant"
  on bookings for select
  using (student_id = auth.uid() or landlord_id = auth.uid() or is_admin());

create policy "bookings_insert_student"
  on bookings for insert
  with check (student_id = auth.uid());

-- No client-side update policy: status/payment_status/funds_released_at
-- changes only happen server-side (Paystack webhook, admin action).

-- ------------------------------------------------------------
-- MAINTENANCE REQUESTS
-- ------------------------------------------------------------
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

create policy "maintenance_insert_student"
  on maintenance_requests for insert
  with check (student_id = auth.uid());
