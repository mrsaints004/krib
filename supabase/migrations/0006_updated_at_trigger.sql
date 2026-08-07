-- ============================================================
-- UniNest: Auto-update `updated_at` on row changes
-- Without this trigger, updated_at always equals created_at.
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
