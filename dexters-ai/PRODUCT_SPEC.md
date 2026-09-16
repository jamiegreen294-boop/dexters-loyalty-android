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

## AI knowledge, internet access and general assistant capability

Dexter's AI must support three distinct knowledge sources:

### 1. Live internet information

The AI should be able to use an approved web/search tool when a question requires current information, including:

- Current weather and forecasts
- Current news and public information
- Opening times and current business information
- Travel, events, sports and local information
- Current product/service information and research
- Other time-sensitive facts that cannot safely be answered from stored knowledge

Weather should use a suitable current-weather source/tool where available rather than relying only on the model's static knowledge.

The AI must recognise when live information is required instead of pretending that an old model answer is current. Web access must be controlled through approved tools and must not expose private tenant data to arbitrary websites.

### 2. General AI knowledge and conversation

Dexter's AI should also work as a general-purpose assistant when internet access is unnecessary. It can answer general questions and provide normal conversation such as:

- Jokes and humour
- Stories and creative writing
- History and general educational explanations
- Everyday questions
- Coding explanations
- General problem solving

### 3. Persistent business knowledge and memory

Each tenant must have its own protected knowledge/memory layer. Dexter's Café can store approved business-specific information such as:

- Business history
- Menu and product information
- Recipes and operating procedures
- Opening hours and policies
- Staff-approved instructions
- Supplier and stock information
- System documentation
- Customer-service rules
- Approved business preferences and facts

A future tenant must never inherit Dexter's private knowledge unless explicitly configured to do so. Tenant knowledge must be isolated by business/tenant ID and protected by authorization/RLS.

## Important distinction: retrieval is not automatic training

Internet access does not mean the AI continuously retrains itself from everything it reads. The intended design is:

**Live web information** → retrieve current facts at query time.

**Approved tenant knowledge** → store and retrieve information from the tenant's protected knowledge base.

**Model** → provides general reasoning and language capability.

If the system later supports learning from business interactions, that must be an explicit, controlled memory/knowledge process with tenant isolation, auditability and appropriate approval. Do not silently add arbitrary web content or customer data to permanent model training.

## AI tool-selection behaviour

The AI should decide which source is appropriate:

- "What's the weather today?" → current weather tool/web source.
- "What's happening in Glasgow this weekend?" → current web/local information.
- "Tell me a joke." → normal model response; no web search required.
- "Tell me about Glasgow history." → general knowledge, with web research when current or source-specific information is requested.
- "What are Dexter's opening hours?" → Dexter's protected business knowledge.
- "Check why the POS is failing." → private project/code/tool access, not public web search unless external research is useful.

The AI should avoid unnecessary web searches while still using live information whenever freshness materially affects correctness.

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
