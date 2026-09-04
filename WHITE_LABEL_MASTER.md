# White-label master platform

This branch is a safe starting point for turning the Dexter's Loyalty App into a reusable platform for other businesses.

## Safety
- Branch: `white-label/master-platform-20260904`
- Based on `main`
- No changes are made to `main`
- No Vercel deployment is required for this work
- Dexter's remains the first/default business configuration

## First reusable pieces
- `web/white-label/business-config.js` — business name, colours, domain, currency, features and integrations
- `web/white-label/runtime-branding.js` — applies branding and feature toggles at runtime
- `web/white-label/admin.html` — simple no-code setup page for creating a new business configuration

## Next migration stages
1. Move all hard-coded Dexter's branding into business configuration.
2. Add a `business_id` / tenant key to customer, order, staff, menu, rewards and stock data.
3. Add database row-level security so one business cannot read another business's data.
4. Add business-level admin login and permissions.
5. Add per-business Stripe/KDS/printer/EPOS credentials.
6. Add branded PWA manifest/icon generation per business.
7. Add a master owner dashboard for creating, suspending and managing businesses.
8. Add automated setup so a new business can be provisioned without code changes.

## Important
Do not point another real business at Dexter's current Supabase tables until tenant isolation and row-level security are in place.
