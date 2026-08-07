-- ============================================================
-- UniNest: Auto-create a profile row when someone signs up.
-- Role/matric/university get filled in during the verify step
-- (an UPDATE, permitted by profiles_update_own) — not at signup.
-- ============================================================

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'role', 'student')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
