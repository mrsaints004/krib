-- ============================================================
-- Prevent double-bookings via a partial unique index.
--
-- Only one active booking (pending_payment, confirmed, or active)
-- is allowed per listing at a time. Completed, cancelled, and
-- disputed bookings don't block new ones.
-- ============================================================

create unique index bookings_active_listing_idx
  on bookings (listing_id)
  where status in ('pending_payment', 'confirmed', 'active');

-- Helper function for server-side booking creation.
-- Atomically checks listing status and creates the booking,
-- returning the booking ID on success or raising an exception.
create or replace function create_booking(
  p_listing_id uuid,
  p_student_id uuid,
  p_landlord_id uuid,
  p_rent_amount integer,
  p_facilitation_fee integer,
  p_total_amount integer
) returns uuid as $$
declare
  v_listing_status text;
  v_booking_id uuid;
begin
  -- Lock the listing row to prevent concurrent booking races
  select status into v_listing_status
  from listings
  where id = p_listing_id
  for update;

  if v_listing_status is null then
    raise exception 'Listing not found';
  end if;

  if v_listing_status <> 'approved' then
    raise exception 'Listing is not available for booking';
  end if;

  -- Attempt the insert — the partial unique index will reject
  -- duplicates if another booking was created between our check
  -- and the insert.
  insert into bookings (
    listing_id, student_id, landlord_id,
    rent_amount, facilitation_fee, total_amount
  ) values (
    p_listing_id, p_student_id, p_landlord_id,
    p_rent_amount, p_facilitation_fee, p_total_amount
  ) returning id into v_booking_id;

  return v_booking_id;
end;
$$ language plpgsql;
