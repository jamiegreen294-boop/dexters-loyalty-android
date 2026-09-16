# Dexter's Platform Engine — Supabase Schema Plan

This is the planned central data model. Implement incrementally; do not alter any existing production database until the schema is reviewed and tested.

## Tenant boundary

Core tenant table:

- `businesses` — one row per customer business/tenant
- `locations` — physical sites belonging to a business

Every business-owned table must contain `business_id`. Location-specific tables should also contain `location_id` where appropriate.

## Identity and access

- `users`
- `staff`
- `roles`
- `permissions`
- `user_roles`
- `staff_locations`

Platform users and business users must be separated by authorization rules. Never rely on the client UI alone for tenant security.

## Menu and POS

- `menus`
- `menu_categories`
- `products`
- `product_variants`
- `modifiers`
- `modifier_groups`
- `product_modifiers`
- `orders`
- `order_items`
- `payments`
- `discounts`
- `refunds`
- `order_events`

## Customers and loyalty

- `customers`
- `customer_addresses`
- `loyalty_accounts`
- `loyalty_transactions`
- `loyalty_rewards`
- `customer_consents`

## KDS and printing

- `kds_stations`
- `kds_orders`
- `kds_events`
- `printers`
- `print_jobs`

## Stock and food costing

- `ingredients`
- `inventory_items`
- `inventory_movements`
- `recipes`
- `recipe_items`
- `suppliers`
- `supplier_products`
- `purchase_orders`
- `purchase_order_items`
- `waste_records`

## Staff operations

- `shifts`
- `time_entries`
- `breaks`
- `staff_notes`
- `leave_requests`

## Integrations

- `integrations`
- `integration_accounts`
- `integration_events`
- `webhook_events`

Secrets/tokens must not be exposed to the browser and must be stored using an appropriate server-side secret mechanism rather than plain public database fields.

## AI

- `ai_agents`
- `ai_instructions`
- `ai_memory`
- `ai_tasks`
- `ai_tool_runs`
- `ai_approvals`
- `ai_audit_logs`

AI actions must be tenant-scoped and permission-checked server-side.

## Marketing and reporting

- `campaigns`
- `campaign_messages`
- `promotions`
- `report_snapshots`
- `business_alerts`

## Platform/SaaS

- `plans`
- `plan_features`
- `business_subscriptions`
- `business_feature_entitlements`
- `platform_audit_logs`

These tables are planned for future SaaS functionality and do not need billing implementation in the first phase.

## RLS requirements

For tenant-owned tables:

1. Authenticated users must only access rows belonging to businesses they are authorized to access.
2. Staff access must be limited by business and, where relevant, location.
3. Platform administration must use explicitly privileged server-side paths.
4. AI tools must execute through server-side authorization and must never bypass tenant checks merely because an AI request asks for it.
5. Customer data must never be returned across tenant boundaries.

## Migration strategy

Create a new development/staging schema first. Import/synchronize Dexter's data only after mapping existing systems. Validate counts and key records before any live cutover. Keep existing live databases and workflows untouched until a migration has been tested and approved.