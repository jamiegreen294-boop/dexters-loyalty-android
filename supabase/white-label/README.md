# White-label database work

These files are **prepared only** and are not applied to the live Dexter's Supabase project.

## Order
1. Clone/restore the Dexter's database into a safe test project.
2. Apply `001_multitenant_foundation.sql` there.
3. Run `002_rls_verification.sql`.
4. Run Supabase security and performance advisors.
5. Verify customer, staff, KDS, printer, menu, points, offers, collection and Sunday roast flows.
6. Only after all checks pass should a production migration be considered.

The migration creates a `businesses` registry, `business_memberships`, business-scoped customer profiles, adds `business_id` to the operational tables, backfills all existing data to Dexter's, and replaces tenant-table RLS policies with business-aware rules.

Important: the live database already contains SECURITY DEFINER functions. Those must be separately reviewed before multi-business production use. This white-label migration does not silently change their behaviour.
