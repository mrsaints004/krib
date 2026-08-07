-- ============================================================
-- UniNest: Verification Documents
-- Replaces "matric number as proof" with admin-reviewed document
-- upload — necessary because many real users (pre-admission,
-- awaiting JAMB placement, etc.) have no matric number yet.
-- ============================================================

create table verification_documents (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references profiles (id) on delete cascade,

  document_type text not null
    check (document_type in ('jamb_admission_letter', 'school_id', 'acceptance_letter', 'other')),
  file_url text not null,
  note text, -- optional context from the user, e.g. "awaiting matriculation"

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

-- User can see their own submissions; admins can see all (the review queue).
create policy "verification_docs_select"
  on verification_documents for select
  using (profile_id = auth.uid() or is_admin());

-- User can submit their own document.
create policy "verification_docs_insert_own"
  on verification_documents for insert
  with check (profile_id = auth.uid());

-- Only admins can update status (approve/reject) — never the user themself.
create policy "verification_docs_update_admin_only"
  on verification_documents for update
  using (is_admin());

-- university on profiles becomes optional / self-declared at this stage,
-- not a hard requirement tied to a matric number.
alter table profiles alter column university drop not null;
comment on column profiles.matric_number is
  'Optional. Many users (pre-admission, awaiting JAMB placement) will not have one yet. Never required for verification.';
