# Dexter's Platform Engine — Product Specification

## Purpose

Dexter's AI is being developed as the control and engineering layer for a reusable, multi-tenant hospitality software platform. Dexter's Café is Tenant 1 and the reference implementation. The platform must be reusable for cafés, takeaways, restaurants, food trucks and multi-site operators without copying Dexter's private business data.

## Core principle

Build the platform engine once. A new customer is created as a new tenant/business and receives its own configuration, data, users, branding, integrations and enabled modules.

## Tenant isolation

Every business-owned record must be scoped to a tenant/business ID. No tenant may read, modify or expose another tenant's data. Supabase Row Level Security (RLS) and server-side authorization are mandatory for tenant-scoped data.

## Platform modules

- Platform Core / Tenant Management
- Authentication and Roles
- POS
- KDS / Kitchen Operations
- Unified Ordering Hub
- Customer Management
- Loyalty
- AI Business Manager
- AI Customer Assistant
- Stock / Inventory
- Recipes / Food Costing
- Suppliers / Purchasing / Waste
- Staff / Shifts / Permissions
- Accounting and Xero integration
- Marketing / Promotions
- Analytics / Reports
- Printing
- External Integrations
- Multi-site Management

## Roles

- Platform Owner: manages the software platform and tenant lifecycle.
- Business Owner/Admin: manages one business and its locations, staff, menus and settings.
- Manager: operational access for an assigned business/location.
- Staff: restricted operational access.
- AI Agent: acts only within explicit tenant permissions and approved tools.

## Configuration

Each tenant can have:

- Business name and branding
- Locations
- Menus, products, modifiers and prices
- Opening hours
- Staff and permissions
- Customers and loyalty rules
- Ordering channels
- Printer/KDS configuration
- Integrations
- AI instructions/knowledge
- Enabled modules
- Tax/VAT configuration
- Reporting settings

## Integration architecture

External systems must connect through a controlled integration layer rather than being hard-coded into individual modules. Credentials and tokens must remain server-side and must never be committed to the public repository.

## Dexter's reference tenant

Dexter's Café remains the first production/reference business. Existing live apps and workflows must not be replaced during platform development. New platform functionality should initially operate alongside existing systems, using test/shadow synchronization where practical, followed by controlled migration only after verification and explicit approval.

## Sellable SaaS direction

The architecture must support future:

- Customer self-service onboarding
- Subscription plans
- Feature/add-on entitlements
- White-label branding
- Multi-location businesses
- Platform administration
- Audit logs
- Data export/deletion
- Usage limits
- Backups and recovery
- Support tooling

Billing can be implemented later, but the data model must not prevent it.

## Security requirements

- Tenant isolation is mandatory.
- Financial, customer and authentication data are sensitive.
- Production changes require explicit approval during the initial build.
- AI must inspect before modifying existing code.
- Changes affecting money, customer data, authentication, databases or live ordering require approval.
- Test and staging environments should be used before production migration.

## Success condition

A second business can be created from the same platform engine without cloning Dexter's database or application code, while Dexter's existing business continues operating independently.