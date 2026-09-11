# Dexter's no-deploy hardening branch

This branch is intentionally isolated from production. Do not merge or deploy until each numbered change is verified individually.

## Verification order

1. Order API secret hardening
   - Remove hard-coded shared source key from source.
   - Read the key from `DEXTERS_ORDER_SOURCE_KEY`.
   - Preserve legacy-route behaviour and existing KDS/order payloads.
   - Rotate the production secret only at the deployment step, after callers are updated together.

2. Authentication hardening
   - Enable leaked-password protection in Supabase Auth at the production-change step.
   - Review privileged `SECURITY DEFINER` functions before changing grants.
   - Require explicit role checks in every privileged function.

3. POS consolidation
   - Keep the current restored working POS as the baseline.
   - Establish one canonical POS entrypoint and one production terminal API.
   - Do not remove old/test endpoints until caller tracing is complete.

4. Database performance
   - Add only evidence-based indexes for high-traffic order, loyalty, POS, staff and food-safety paths first.
   - Optimise repeated `auth.*` RLS calls using `(select auth.*())` where semantically identical.
   - Apply in small batches and compare query behaviour before/after.

5. Back Office system health
   - Add read-only status checks for website, loyalty, KDS, POS, printers, latest order and failed print queue.
   - Add alerting separately after the read-only dashboard is verified.

6. Test/Hub cleanup
   - Trace every active endpoint first.
   - Disable/archive only endpoints with no production callers.
   - Keep one staging route for each critical workflow.

## Hard rules

- No Vercel deployment from this branch.
- No GitHub Pages production publish.
- No Supabase Edge Function deployment.
- No production database migration.
- No secret rotation until all dependent callers are staged for the same verification step.
