# Dexter's AI — Advanced Coding Agent Specification

## Objective

Dexter's AI must be built as a highly capable software engineering agent, with coding capability designed to be comparable to or exceed a modern AI coding assistant for the tasks it is equipped and tooled to perform. The target is not a simple chatbot. It must be able to understand repositories, reason about architecture, edit code, use development tools, test its work, recover from failures and improve its project-specific performance over time.

It should also provide a broad general-assistant experience: conversation, explanations, jokes, stories, history, current web research, weather/current information through suitable tools, and business assistance.

## Expanded capabilities

The platform should support, where technically and legally permitted:

- Repository and project access across all authorised Dexter's development repositories.
- Semantic and exact code search, dependency tracing and multi-file reasoning.
- File and directory creation/editing, refactoring and bug fixing.
- Unit, integration, lint, type, Android, web and backend build/test workflows.
- Build-log/error inspection and iterative diagnose → fix → retest loops.
- Git branches, commits, pull requests, diffs and deployment preparation.
- Current technical documentation and web research.
- Database development/staging access through approved server-side services.
- Supabase operations through approved server-side services.
- Controlled access to Dexter's business systems and integrations.
- Business analytics, reporting, automation and operational assistance.
- General AI conversation and knowledge functions.
- Persistent, verified project/business memory.

## Dexter's account and integration access

Dexter's AI should be able to access the Dexter's accounts and services it is explicitly authorised to use, through secure connectors or server-side integrations rather than by storing passwords in the application.

Potential authorised integrations include:

- GitHub and GitHub repositories
- Supabase
- XEPOS / POS services where an approved API or integration is available
- Xero
- bOnline / telephony services where an approved API or integration is available
- WhatsApp / Meta business services where approved APIs and permissions are available
- Just Eat, Deliveroo, Get Me Food and other ordering channels where official APIs/integrations permit access
- Dexter's KDS/order services
- Dexter's printer/order infrastructure
- Dexter's loyalty/customer systems
- Google or Microsoft services if explicitly connected and authorised
- Email, calendars, files and other business services if explicitly connected and authorised

Access must be connector-specific and permission-scoped. If an integration has no supported API, the agent must not attempt to bypass security or automate through prohibited methods; instead it should identify the supported integration route.

### Credential and secret rules

- Never put passwords, API keys, access tokens, banking credentials or private secrets in public GitHub files, frontend JavaScript or client-side storage.
- Store secrets in secure server-side environment variables, a secret manager, or the connected provider's secure credential system.
- Use least-privilege permissions wherever possible.
- Maintain an integration registry showing which business service is connected, what permissions it has, its status, and when it was last verified.
- Allow individual integrations to be disconnected/revoked without disabling the whole platform.
- Do not expose one tenant's credentials, data or integrations to another tenant.

## Permission model

Use explicit permission scopes, for example:

- `repo.read`
- `repo.write`
- `repo.deploy`
- `database.dev.read`
- `database.dev.write`
- `database.production.read`
- `database.production.write`
- `orders.read`
- `orders.write`
- `customer.read`
- `customer.write`
- `accounting.read`
- `accounting.write`
- `marketing.write`
- `staff.read`
- `staff.write`
- `integration.manage`
- `production.deploy`
- `security.manage`

Production, financial, customer-data, authentication and destructive permissions require stronger approval controls.

## Agent loop

For a coding task, prefer this loop:

1. Understand the requested outcome and constraints.
2. Identify the correct tenant, project and repository.
3. Identify which connected accounts/integrations are relevant.
4. Inspect relevant code, configuration, tests and documentation.
5. Search project memory for previous decisions, known bugs and successful fixes.
6. Form a concrete implementation plan.
7. Make the smallest coherent set of changes.
8. Run relevant tests/builds/static checks.
9. Inspect failures rather than guessing.
10. Fix failures and rerun validation.
11. Review the final diff for unintended changes.
12. Record useful durable lessons and architecture decisions.
13. Report exactly what changed and the verified status.
14. Request approval before protected production actions.

The agent should continue the test/fix cycle when practical rather than stopping after the first failed build.

## Tool access model

The platform should provide controlled tools for:

- Repository/file browsing
- Code search
- File creation and editing
- Git operations
- Build execution
- Test execution
- Log inspection
- Database development/staging access
- Supabase operations through approved server-side services
- Web/search research
- Documentation retrieval
- Deployment preparation and verification
- Project memory/knowledge retrieval and storage
- Connected business-account integrations
- Operational automation

Tools must have explicit permissions and should be scoped to the active tenant/project.

## Learning and improvement

Dexter's AI should become better at working on Dexter's projects through controlled experience, not by silently retraining the underlying model.

After successful or failed tasks, the system may store useful project-specific lessons such as:

- Root causes of recurring bugs
- Build commands and environment requirements
- Successful implementation patterns
- Integration quirks
- API limitations
- Deployment requirements
- Architecture decisions
- Testing procedures
- Known failure modes and their fixes
- User-approved coding preferences

Each memory should include useful metadata such as project/tenant, date, source task, confidence/status and whether it was verified.

Failed or uncertain conclusions must not automatically become authoritative facts. Prefer verified results and allow outdated memories to be corrected or superseded.

## Self-verification

The agent must distinguish between:

- Code written
- Code tested
- Build completed
- Deployment prepared
- Deployment completed
- Live result verified

It must never claim a higher level of completion than the evidence supports.

## General intelligence and internet research

The coding agent can use live web research for current technical documentation, API changes, error explanations and other information where freshness matters. It can also operate as a general assistant for normal questions, jokes, stories, history, current information and business questions.

Weather/current conditions should use a suitable current-data source rather than stale model knowledge.

Web retrieval and tenant-private data must remain separate. Do not send private customer data, credentials or secrets to arbitrary external sites.

## Human control

The user remains in control of production changes. Require approval for production deployments, live database migrations, payment/banking changes, customer-data changes, authentication/security changes and destructive actions unless an explicitly configured trusted workflow says otherwise.

## Multi-tenant product requirement

Dexter's Café is the first tenant, not the permanent hard-coded identity of the platform. The same engine must support additional businesses with isolated data, staff, customers, menus, integrations, branding, AI instructions and memory.

A second business must never inherit Dexter's private knowledge or credentials unless explicitly shared through a controlled platform-level resource.

## Target end state

Dexter's AI should feel like a capable software-engineering and business workspace rather than a basic chat window:

**Ask → identify context → inspect → reason → research if needed → access authorised tools → code/act → build → test → diagnose → fix → retest → review → remember verified lessons → ask for approval when required → deploy/execute → verify.**

The architecture must support Dexter's Café first and then other independent businesses as separate tenants without sharing private business knowledge.