# Dexter’s AI Agent Server — Development Only

This service is the privileged backend for Dexter’s AI. It is intentionally separate from all live Dexter’s applications.

## Safety boundary

- Development branch: `dexters-ai-v1`
- Development Supabase project: `slktukywdzvtvhveheni`
- Never place secrets in the browser or GitHub source.
- Production repositories, databases and deployments require explicit approval.
- The server exposes only controlled agent operations; it must never expose unrestricted shell access.

## Initial responsibilities

1. Authenticate an authorised Dexter’s AI user.
2. Create and track AI tasks in Supabase.
3. Select the relevant project from the project registry.
4. Inspect authorised GitHub repositories.
5. Record task events, tool runs, approvals and audit events.
6. Prepare changes for review before any protected deployment.

## Runtime

Node.js 20+ / TypeScript.

Required environment variables are documented by name only; values must be supplied through the host's secret/environment configuration:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GITHUB_TOKEN`
- `DEXTERS_AI_ALLOWED_REPOS`

The service-role key is server-only and must never be returned to the client.

## Current status

Foundation only. No production deployment or live Dexter’s application has been changed.