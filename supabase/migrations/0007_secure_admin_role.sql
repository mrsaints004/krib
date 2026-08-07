-- ============================================================
-- UniNest: Prevent self-assignment of admin role via signup.
-- The original trigger blindly trusted raw_user_meta_data.role,
-- meaning anyone could sign up as an admin by passing
-- { role: "admin" } in the signup metadata.
-- ============================================================

create or replace function handle_new_user()
returns trigger as $$
declare
  requested_role text;
begin
  requested_role := coalesce(new.raw_user_meta_data->>'role', 'student');

  -- Only allow 'student' or 'landlord' via self-signup.
  -- Admins must be promoted manually via SQL or an admin dashboard.
  if requested_role not in ('student', 'landlord') then
    requested_role := 'student';
  end if;

  insert into profiles (id, full_name, phone, role, university)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    requested_role,
    new.raw_user_meta_data->>'university'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Also add an RLS policy preventing direct client insert into profiles.
-- Profiles are created ONLY via the trigger above.
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
