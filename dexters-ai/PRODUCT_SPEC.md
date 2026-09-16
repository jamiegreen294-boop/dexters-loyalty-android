# Dexter's Platform Engine — Product Specification

## Purpose

Dexter's AI is the control, engineering and business-assistance layer for a reusable, multi-tenant hospitality software platform. Dexter's Café is Tenant 1 and the reference implementation. The platform must be reusable for cafés, takeaways, restaurants, food trucks and multi-site operators without copying Dexter's private business data.

## Product ambition

The target is a highly capable AI workspace with the broad functions of a modern AI assistant plus a deeply integrated hospitality operating platform and software-engineering agent. It should be designed to exceed a basic chatbot in practical software-development and hospitality-management capability by combining reasoning with controlled tools, project context, persistent verified memory and authorised business integrations.

No claim of objectively superior underlying model intelligence should be assumed. Capability comes from the combination of model + tools + project context + memory + verification + integrations + automation.

## Core principle

Build the platform engine once. A new customer is created as a new tenant/business and receives its own configuration, data, users, branding, integrations and enabled modules.

## Tenant isolation

Every business-owned record must be scoped to a tenant/business ID. No tenant may read, modify or expose another tenant's data. Supabase Row Level Security (RLS) and server-side authorization are mandatory for tenant-scoped data.

## AI workspace capabilities

The AI workspace should support, where technically available and authorised:

- Natural conversation and general assistance
- Voice input/output
- Image understanding
- Document, PDF, spreadsheet and image upload/analysis
- Current web research
- Current weather/current-data tools
- Technical documentation retrieval
- Long-running/resumable tasks
- Background automations
- Task history and status
- Project context loading
- Persistent verified memory
- Self-verification and evidence-based completion reporting

## Advanced coding agent

The coding agent should be able to:

- Understand complete repositories and project structures
- Search code semantically and by exact text/symbol/error
- Trace dependencies
- Plan multi-file changes
- Create and edit files/directories
- Refactor and fix bugs
- Generate tests
- Run builds, tests, lint and type checks
- Inspect errors/logs
- Iterate through diagnose → fix → retest
- Review diffs
- Use Git branches, commits and pull requests
- Prepare and verify deployments
- Work across Android, web, backend, databases, APIs and infrastructure
- Build complete applications from specifications
- Maintain project architecture and coding conventions
- Create technical documentation
- Store verified project lessons and architecture decisions

The target workflow is:

**Ask → understand → inspect → plan → code → build → test → diagnose → fix → retest → review → remember verified lessons → approval → deploy → verify.**

## Dexter's existing POS ecosystem

Dexter's Café already has a working POS ecosystem containing the business communication and operational systems that Dexter's AI is intended to work with. The platform must treat these existing capabilities as the starting point rather than rebuilding them unnecessarily.

Existing Dexter's POS capabilities include:

- POS / till and order management
- WhatsApp integration
- Email integration
- KDS / order flow
- Receipt/order printing infrastructure
- Customer and loyalty functionality
- Existing business/order data and workflows

The first integration goal is therefore to securely connect Dexter's AI to the existing POS capabilities and expose approved functions through controlled tools. The AI should discover the existing interfaces, APIs, database structures or supported integration mechanisms before proposing replacement systems.

WhatsApp and email are **already integrated into the Dexter's POS system** and must be recorded as existing Dexter's capabilities. They are not treated as integrations that still need to be built for Dexter's reference tenant.

Existing live systems must remain operational while the new platform is developed. Development should use read-only, shadow or test synchronization where practical before any replacement or migration.

## Dexter's account/integration access

Dexter's AI should be able to access Dexter's accounts and services that are explicitly connected and authorised through secure connectors or server-side integrations.

Existing/connected Dexter's capabilities must be detected and reused where supported, including:

- POS and existing POS communication services
- WhatsApp
- Email
- GitHub
- Supabase
- XEPOS/POS services where supported
- Xero
- Just Eat
- Deliveroo
- Get Me Food
- bOnline/telephony where supported
- KDS/order services
- Printer infrastructure
- Loyalty/customer systems

Future providers may include Google services, Microsoft services, payment providers and other hospitality integrations where official APIs/integrations permit access.

If a provider does not expose an approved API/integration, the platform must not bypass security or provider restrictions. It should identify the supported route.

## Integration Manager

Provide a central Integration Manager showing:

- Connected service
- Connection status
- Tenant/business
- Granted permissions
- Last verification
- Health/error state
- Connect/reconnect/disconnect controls
- Audit history

The Integration Manager must distinguish between:

1. **Existing Dexter's integrations/capabilities** that are already active in the POS ecosystem.
2. **New integrations** that still require connection or configuration.
3. **Supported provider types** that can be connected by future tenants.

Credentials must remain server-side and be encrypted/secured through an appropriate secret-management mechanism.

## Permission model

Use granular permission scopes for tools and accounts, including examples such as:

- Repository read/write/deploy
- Development database read/write
- Production database read/write
- Orders read/write
- Customer read/write
- Accounting read/write
- Marketing write
- Staff read/write
- Integration management
- Production deployment
- Security management

High-risk permissions require stronger authentication/approval.

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

## Hospitality operations

### POS

- Till/order taking
- Staff PINs/roles
- Collection and delivery
- Discounts
- Refunds
- Modifiers/extras
- Customer accounts
- Cash/card reconciliation
- Table service where required

### KDS

- Live orders
- Kitchen timers
- Priority handling
- Courses
- Ready/completed states
- Printer fallback

### Ordering hub

Unify supported channels including website, WhatsApp, Just Eat, Deliveroo, Uber Eats where supported, collection and QR ordering.

### Customer app

- Loyalty
- Rewards
- Digital receipts
- Offers
- Order history
- Click & collect
- Notifications

### AI Customer Assistant

Business-specific answers about menus, hours, allergens, offers, locations, FAQs and ordering rules, using protected tenant knowledge.

### Stock and costing

- Stock levels
- Ingredient usage
- Low-stock alerts
- Supplier prices
- Purchase orders
- Waste tracking
- Recipe costing
- Margin analysis
- Ingredient price change impact

### Staff

- Accounts
- Permissions
- Rotas/shifts
- Clock-in/out
- Breaks
- Holiday requests
- Staff records

### Accounting

- Xero integration
- VAT/tax configuration
- Daily takings
- Expenses
- Supplier invoices
- Payroll exports

### Marketing

AI-assisted creation of promotions, social posts, customer messages, flyers, menu-board content and campaigns, subject to configured permissions.

## AI Business Manager

The AI should be able to answer business questions and, where authorised, perform actions such as:

- Sales analysis
- Order analysis
- Product performance
- Stock warnings
- Margin analysis
- Operational issue diagnosis
- Promotion creation
- Report generation
- Routine automation
- System health checks

It should clearly distinguish analysis from actions and require approval for protected actions.

## AI knowledge, internet access and general assistant capability

Dexter's AI must support three distinct knowledge sources:

### 1. Live internet information

Use approved web/search tools for current weather, forecasts, news, public information, opening times, travel, events, sports, local information, current products/services and other time-sensitive facts.

### 2. General AI knowledge and conversation

Support jokes, humour, stories, history, education, everyday questions, coding explanations and general problem solving without unnecessary web searches.

### 3. Persistent business knowledge and memory

Each tenant has protected knowledge/memory for business history, menus, recipes, procedures, hours, policies, staff-approved instructions, suppliers, stock, system documentation, customer-service rules and approved preferences.

Internet retrieval is not automatic model retraining. Approved business knowledge may be stored as controlled tenant memory; arbitrary web content and customer data must not silently become permanent training data.

## Learning and improvement

The platform should improve through verified experience. It may remember:

- Root causes
- Successful fixes
- Build commands
- Environment requirements
- Integration quirks
- API limitations
- Deployment requirements
- Architecture decisions
- Testing procedures
- Known failure modes
- User-approved coding preferences

Memories require tenant/project metadata, source task, date, confidence/status and verification state. Unverified conclusions must not become authoritative facts.

## Self-verification

The AI must distinguish between code written, code tested, build completed, deployment prepared, deployment completed and live result verified. It must never claim a higher completion level than the evidence supports.

## Security

Mandatory controls include:

- Tenant isolation
- Secure credential/secret storage
- MFA where supported
- Role-based permissions
- Audit trails
- Session management
- Integration permission controls
- Production approval gates
- Backups and recovery
- Rollback capability
- Customer-data controls
- Data export/deletion
- Emergency disable capability
- Rate limiting
- Security-event logging

Never expose secrets to frontend code or public GitHub files. Never expose one tenant's credentials/data to another tenant.

## Dexter's reference tenant and migration strategy

Dexter's Café remains the first reference business. Existing live apps and workflows must not be replaced during platform development. New functionality initially operates alongside existing systems using test/shadow synchronization where practical. Migration happens component-by-component only after verification, approval and a documented rollback route.

The existing POS, WhatsApp and email capabilities are particularly important: the platform should integrate with and reuse them first, rather than creating duplicate communication systems. Any proposed replacement must be separately tested and approved.

## Sellable SaaS direction

The architecture must support:

- Customer self-service onboarding
- Free trials
- Subscription plans
- Feature/add-on entitlements
- White-label branding
- Multi-location businesses
- Platform administration
- Audit logs
- Data export/deletion
- Usage limits
- Backups/recovery
- Support tooling
- Billing architecture
- Module marketplace/add-ons

Dexter's should be Tenant 1, not hard-coded into the engine.

## Platform self-development

Dexter's AI should eventually be capable of extending the platform itself. Example:

**User:** "Add staff rota management."

The agent should inspect the existing architecture, design the feature, create/update database structures, build backend and UI components, generate tests, build the application, diagnose and fix failures, show the proposed changes, request required approval, deploy and verify.

## Success condition

A second business can be onboarded from the same platform engine without cloning Dexter's database or application code, while Dexter's existing business continues operating independently.