# Dexter's AI — Platform Feature Expansion

## Purpose

This document records the expanded capabilities required for Dexter's AI to become a full hospitality operating platform and commercial multi-tenant SaaS product.

## AI Command Centre

The main Dexter's AI workspace is the control centre for authorised business and engineering functions.

Example requests:

- "Check everything."
- "How did we perform today?"
- "Why is the printer not working?"
- "Build me a booking system."
- "Create a stock-management feature."
- "Send today's report."

The AI selects the appropriate specialist agent and controlled tools, performs verification, and reports exactly what was completed.

## Specialist AI agents

The platform should support specialist roles including:

- Coding Agent
- POS Agent
- Kitchen/KDS Agent
- Finance/Xero Agent
- Stock Agent
- Marketing Agent
- Customer Communications Agent
- Security Agent
- Deployment Agent
- Business Analyst

A central orchestrator selects the appropriate specialist or combination of specialists.

## Full POS operations

Where supported and authorised, the AI should be able to inspect and operate:

- Orders and order status
- Customer lookup
- Products, modifiers and pricing
- Discounts
- Refunds
- Till status
- Daily takings
- Cash/card reconciliation
- Staff permissions
- Operational settings

Existing Dexter's POS functionality must be inspected and reused rather than unnecessarily rebuilt.

## Existing communications

Dexter's WhatsApp and email are already integrated into the existing POS ecosystem. They are existing capabilities for the Dexter's reference tenant, not integrations that need to be rebuilt.

The AI should use the existing POS communication functionality through supported interfaces and permissions. Any replacement must be independently tested and approved.

## Unified ordering

Where official integrations permit, provide one order model for:

- POS
- WhatsApp
- Website
- Just Eat
- Deliveroo
- Uber Eats
- Collection
- QR ordering

Provider-specific limitations must be preserved and never bypassed.

## Platform Doctor

Provide a full system health function such as **RUN FULL SYSTEM CHECK**.

Checks may include:

- POS
- WhatsApp
- Email
- KDS
- Printers
- Loyalty
- Database
- Network/connectivity
- Xero
- Ordering integrations
- Backups
- Security
- Website/app services

Results should use clear states such as working, attention required, or problem detected. Where authorised, the AI may diagnose and repair issues.

## Automation engine

Support scheduled, event-driven and conditional workflows, for example:

- Daily sales reports
- Low-stock alerts
- System-failure alerts
- Printer/KDS monitoring
- Weekly business reports
- Customer communication workflows
- Routine maintenance
- Backup checks

Automations must be permission-scoped, auditable and disableable.

## Live business dashboard

Provide configurable dashboards for:

- Sales
- Orders
- Average order value
- Product performance
- Collection/delivery mix
- Stock warnings
- Margins
- Customer activity
- System health
- Integration health

The AI should be able to explain dashboard information in natural language.

## Sandbox and deployment pipeline

Development must support:

**Sandbox → Staging → Approval → Production**

The AI should be able to experiment, build, test and diagnose without touching production. Production changes require appropriate approval and rollback capability.

## Emergency controls

Provide an emergency control centre capable of disabling selected AI capabilities without unnecessarily shutting down the underlying business systems.

Controls may include:

- Stop AI actions
- Stop AI ordering
- Stop AI communications
- Stop deployments
- Disable individual integrations
- Disable automations
- Read-only mode where practical

## AI activity and audit history

Record important actions with sufficient information to determine:

- Who requested the action
- Which tenant/business was active
- Which tool/integration was used
- What changed
- Test/verification results
- Approval status
- Deployment status
- Errors and recovery actions

## Communication controls

Tenant administrators should define what AI can do automatically and what requires approval.

Examples of protected actions include refunds, exceptional discounts, financial actions, customer-data changes, authentication changes and other high-risk operations.

## Device management

Where technically supported, monitor connected business devices such as:

- POS PCs
- KDS screens
- Printers
- Tablets
- Android devices
- Network-connected operational equipment

The AI should identify connectivity and health problems and provide diagnostic information without bypassing device security.

## Commercial SaaS

The platform should eventually support:

- Business self-service onboarding
- Trial accounts
- Subscriptions
- Plans and feature entitlements
- White-label branding
- Multi-location management
- Billing
- Invoices
- Upgrade/downgrade/cancellation
- Usage monitoring
- Data export
- Data deletion
- Platform administration
- Support tooling
- Module/add-on marketplace

Dexter's is Tenant 1 and must not be hard-coded as the only business.

## AI onboarding

A new tenant should be guided through setup of:

- Business profile
- Locations
- Branding
- Menu/products
- Staff
- POS
- Ordering channels
- Payments where supported
- Communications
- Loyalty
- AI instructions
- Integrations
- Reporting

The onboarding system must never copy Dexter's private tenant data into another tenant.

## Security and compliance centre

Provide continuous or scheduled checks for:

- Exposed secrets
- Weak permissions
- Dependency vulnerabilities
- Database/RLS problems
- Tenant-isolation failures
- Failed authentication activity
- Backup status
- Configuration risks
- Integration health
- Security events

## Data import and migration

Where supported by source providers, allow businesses to import:

- Menus
- Products
- Customers
- Loyalty data
- Staff
- Orders
- Stock
- Suppliers
- Business configuration

Imports must be validated, tenant-scoped and reversible where practical.

## AI memory controls

Each business must be able to inspect and manage its AI memory.

Administrators should be able to:

- View memories
- Correct memories
- Delete memories
- Approve durable knowledge
- Mark information as business policy
- See source and verification status
- Supersede outdated information

## Build Anything mode

Dexter's AI should eventually be able to turn a natural-language requirement into a complete software-development workflow.

Example:

**"Build staff holiday management."**

The agent should:

1. Understand requirements.
2. Inspect architecture and existing code.
3. Design the feature.
4. Plan database changes.
5. Build backend and UI components.
6. Generate tests.
7. Run builds and tests.
8. Diagnose and fix failures.
9. Review the diff.
10. Present the proposed result.
11. Obtain required approval.
12. Deploy through the approved pipeline.
13. Verify the deployed result.
14. Record verified project lessons.

## Local-first / £0 core target

The platform should target a £0/month core operating cost wherever technically practical.

Preferred architecture:

- Local/self-hosted agent server where practical
- Local/open-source AI models where hardware permits
- GitHub for source control
- Self-hosted/local development and test tooling
- Optional cloud infrastructure rather than mandatory paid infrastructure

External paid services may still be required for specific capabilities such as messaging, payments, third-party APIs, cloud AI models, app-store accounts or provider-specific services. These should be optional, replaceable and isolated behind provider interfaces where practical.

For the commercial SaaS, third-party transaction/API costs should be attributable to the appropriate tenant/customer where commercially and technically appropriate.

## Commercial platform principle

The architecture must be designed so the same platform engine can serve Dexter's and independent future businesses without cloning the application or database.

Each tenant receives isolated:

- Data
- Staff
- Customers
- Menus
- Branding
- Integrations
- AI instructions
- AI memory
- Automations
- Permissions
- Reporting

## End-state architecture

**AI Command Centre → Specialist Agents → Permissioned Tools → POS/Business Systems → Verification → Audit → Memory → Automation**

The platform should remain modular so capabilities can be added without compromising tenant isolation, security, production safety or the existing Dexter's live operation.
