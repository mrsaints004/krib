-- ============================================================
-- Allow landlords to edit and resubmit rejected listings.
-- Updates the RLS update policy to include 'rejected' status.
-- ============================================================

-- Drop and re-create the landlord update policy to include rejected listings
drop policy if exists "Landlords can edit their own draft/pending listings" on listings;

create policy "Landlords can edit their own draft/pending/rejected listings"
  on listings for update using (
    auth.uid() = landlord_id
    and status in ('draft', 'pending_verification', 'rejected')
  );
