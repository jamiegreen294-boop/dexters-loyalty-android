# Dexter's AI — Handover / Setup Guide

## Current state
The Dexter's AI foundation is being developed on branch `dexters-ai-v1` in `jamiegreen294-boop/dexters-loyalty-android`.

Files currently added:
- `dexters-ai/index.html` — Dexter's AI interface prototype
- `dexters-ai/AGENT_SYSTEM.md` — agent behaviour and safety rules
- `dexters-ai/projects.json` — project registry
- `dexters-ai/DEXTERS_AI_SETUP.md` — this handover document

## What is still required
1. Connect the Dexter's Supabase project/account.
2. Create the central Supabase schema for business data, projects, AI memory and audit logs.
3. Choose/install a local AI runtime on the home PC so model usage can be free.
4. Build the home-PC API/server that the web/Android client connects to.
5. Connect the server to GitHub using secure credentials.
6. Implement coding-agent tools for repository inspection, editing, branching, testing and pull requests.
7. Add the approval interface for production changes.
8. Connect Dexter's existing apps to the central services where appropriate.
9. Add secure remote access from the phone.
10. Test the complete inspect → code → test → approve → deploy workflow.

## Important credential rule
Never put GitHub tokens, Supabase service-role/secret keys, model API keys, passwords or other secrets in this public repository, browser JavaScript or Android client code.

Secrets belong on the home PC/server or another secure secret store.

## Intended free architecture
- GitHub: source control and static frontend where suitable.
- Home PC: local AI model, coding agent and secure API server.
- Supabase: shared cloud database/auth/data layer if the free tier is suitable.
- Phone: Android app or web client connecting securely to the home PC.
- Remote access: a free/private networking option such as Tailscale can be evaluated.

The local AI approach avoids mandatory per-request model API charges. Hardware performance will determine which local model is practical.

## Handover instructions for another ChatGPT account
Open this repository and read these files first:
1. `dexters-ai/AGENT_SYSTEM.md`
2. `dexters-ai/projects.json`
3. `dexters-ai/DEXTERS_AI_SETUP.md`
4. `dexters-ai/index.html`

Then inspect the rest of the repository before changing existing applications.

The next operator should continue from branch `dexters-ai-v1` rather than starting a duplicate project.

## First tasks after Supabase access is available
- Identify whether an existing Dexter's Supabase project should be reused.
- Do not overwrite existing data.
- Create or migrate only the required central tables.
- Configure authentication and Row Level Security.
- Create server-side access for the coding agent.
- Add an audit log for agent actions.

## Desired end state
Dexter can open the dedicated Dexter's AI app and say things like:
- Build this app.
- Fix the POS login.
- Check the whole POS.
- Add this feature.
- Check why orders aren't printing.
- Build and test it.
- Deploy the approved version.

Dexter's AI should inspect the correct project, make controlled changes, run tests/builds, show the changes, request approval where required, and only then deploy production changes.