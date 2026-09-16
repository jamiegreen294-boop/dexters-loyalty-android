# Dexter's Platform Engine — Build Roadmap

## Rule

All platform work happens on the `dexters-ai-v1` development branch first. Existing live Dexter's applications and workflows remain untouched until a tested migration is explicitly approved.

## Phase 1 — Foundation

- Multi-tenant platform core
- Tenant/business/location model
- Authentication and roles
- Supabase schema and RLS
- Central API/service layer
- Platform configuration
- Audit logging
- Development/staging separation

## Phase 2 — Dexter's synchronization

Connect existing Dexter's systems to the platform without taking over live operations:

- POS
- WhatsApp AI/orders
- KDS
- Loyalty
- Printer
- Customers
- Ordering channels
- Existing back-office data

Use read-only or shadow synchronization first where possible.

## Phase 3 — Operational platform

Build platform-native versions of:

- POS/order management
- KDS
- unified order hub
- customer/loyalty
- printing
- business dashboard

Migrate individual components only after testing.

## Phase 4 — Business management

- Stock/inventory
- Recipes
- Food costing
- Suppliers
- Waste
- Staff/shifts
- Accounting
- Marketing
- Analytics

## Phase 5 — AI layer

- AI Business Manager
- AI Customer Assistant
- Business knowledge/memory
- Controlled coding agent
- Automated reports
- Alerts and workflow automation
- Approval system for sensitive actions

## Phase 6 — Sellable platform

- Customer onboarding
- Tenant provisioning
- White-label branding
- Module entitlements
- Subscription/billing architecture
- Multi-site management
- Platform admin console
- Data export/deletion
- Support tools

## Phase 7 — Second-business validation

Create a second tenant using the same engine and prove that:

1. Its data is isolated from Dexter's.
2. Its branding/configuration is independent.
3. Its staff and permissions are independent.
4. Its menu/orders/customers are independent.
5. Modules can be enabled or disabled per tenant.
6. Dexter's live workflows remain unaffected.

## Deployment rule

No production migration is automatic. Every live cutover must be tested, documented, approved and reversible.