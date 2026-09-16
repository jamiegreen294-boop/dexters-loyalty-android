# Dexter's AI — Handover / Setup Guide

## Current state
The Dexter's AI foundation is being developed on branch `dexters-ai-v1` in `jamiegreen294-boop/dexters-loyalty-android`.

Files currently added:
- `dexters-ai/index.html` — Dexter's AI interface prototype
- `dexters-ai/AGENT_SYSTEM.md` — agent behaviour and safety rules
- `dexters-ai/projects.json` — project registry
- `dexters-ai/DEXTERS_AI_SETUP.md` — this handover document

## Target architecture
The intended end state is a mostly-free Dexter's software engineering platform:

```text
Phone / Android Dexter's AI app
              |
       secure private network
              |
       Home PC AI server
       /       |        \
 Local AI   GitHub     Supabase
 model      tools      database
       \       |        /
        Dexter's apps
```

The home PC should perform the AI/model work and coding operations locally wherever practical. Supabase should act as the shared data/memory/auth layer when its free tier is suitable. GitHub remains the source-control layer.

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
10. Test the complete inspect → plan → code → test → review → approve → deploy workflow.

## Local AI requirement
The agent should prefer a local/open-source model running on the home PC so there is no mandatory per-request cloud model bill.

The exact model/runtime must be selected after checking the home PC's CPU, RAM, GPU and operating system. Do not assume hardware capability. The agent may support more than one local runtime if practical.

## Home PC server responsibilities
The home PC server should provide authenticated endpoints for:
- chat/task requests
- project selection
- repository inspection
- code search
- file reading/writing
- branch creation
- diff generation
- tests/builds
- GitHub pull requests
- deployment status
- Supabase queries and controlled administrative operations
- audit logging

The server must keep all secrets off the client.

## Coding-agent tool plan
Initial tools:
- `github_list_files`
- `github_read_file`
- `github_search`
- `github_create_branch`
- `github_write_file`
- `github_delete_file`
- `github_get_diff`
- `github_create_pull_request`
- `github_get_workflow_status`
- `github_get_build_logs`
- `supabase_query`
- `supabase_write`
- `supabase_schema_inspect`
- `audit_log`

Later tools may include controlled deployment, Android build automation, local shell/build execution, printer diagnostics and other Dexter-specific integrations.

## Tool permissions
Separate tools into:

### Read-only
- inspect repositories
- read files
- search code
- inspect database schema
- read logs/status
- inspect deployments

### Write / approval required
- modify code
- create/delete files
- modify database records
- modify schema
- create releases
- deploy production
- change authentication or permissions

Production and sensitive operations require explicit approval.

## Supabase plan
When Supabase access becomes available:

1. Determine whether an existing Dexter's project should be reused.
2. Do not overwrite existing data.
3. Back up or export important existing data before migrations.
4. Create only the tables actually required.
5. Configure Row Level Security.
6. Create separate client and server access paths.
7. Keep secret/service-role credentials server-side only.
8. Add an audit log for AI actions.

Suggested initial tables:
- `business_settings`
- `projects`
- `project_files` (metadata only unless there is a clear reason to duplicate source code)
- `ai_memory`
- `ai_tasks`
- `ai_task_events`
- `audit_log`
- `integrations`
- `staff_users`

Do not store passwords or API secrets in ordinary tables.

## Dexter's business knowledge
Known configuration currently includes:
- Business: Dexter's Café
- Address: 10A Dundasvale Court, Glasgow, G4 0JS
- Phone: 0141 473 5249
- Email: orders@dextersspot.co.uk
- Email: hello@dextersspot.co.uk
- Email: catering@dextersspot.co.uk

These should eventually live in the authoritative Supabase business configuration rather than being duplicated throughout application code.

## Security rules
Never put any of the following in this public repository, browser JavaScript or Android client code:
- GitHub personal access tokens
- Supabase service-role/secret keys
- API keys
- passwords
- database connection strings containing credentials
- customer private data

Store secrets on the home PC/server or in an appropriate secure secret store.

## Free-cost objective
Target recurring software/hosting cost: £0 where practical.

Potential free components:
- GitHub repository/source control
- GitHub Pages for static frontend
- local AI model on home PC
- local coding/build server
- Supabase free tier if sufficient
- a free/private remote-networking option such as Tailscale, subject to current limits

Do not assume any free-tier limit is permanent. Verify current limits when setup is performed.

## Handover instructions for another ChatGPT account
Open this repository and read these files first:
1. `dexters-ai/AGENT_SYSTEM.md`
2. `dexters-ai/projects.json`
3. `dexters-ai/DEXTERS_AI_SETUP.md`
4. `dexters-ai/index.html`

Then inspect the rest of the repository before changing existing applications.

Continue from branch `dexters-ai-v1`. Do not start a duplicate Dexter's AI project.

### Exact continuation request
Use this request in the other ChatGPT account:

> Continue building Dexter's AI from branch `dexters-ai-v1` in `jamiegreen294-boop/dexters-loyalty-android`. Read `dexters-ai/AGENT_SYSTEM.md`, `dexters-ai/projects.json` and `dexters-ai/DEXTERS_AI_SETUP.md` first. The goal is a free/local coding agent running from Dexter's home PC, with Supabase as the shared data layer and GitHub as the source-control layer. Continue from the documented architecture, inspect the existing repository before editing, and do not create a duplicate project.

## First tasks after Supabase access is available
- Identify the existing Supabase project if one exists.
- Decide whether to reuse it or create a separate Dexter's project.
- Do not overwrite existing data.
- Create/migrate the central tables.
- Configure authentication and Row Level Security.
- Create server-side access for the coding agent.
- Add an audit log for agent actions.

## First tasks after home PC access is available
- Identify Windows/Linux/macOS and hardware.
- Check CPU, RAM, GPU and available storage.
- Install an appropriate local model runtime.
- Run a local model test.
- Create the Dexter's AI server.
- Connect the server to the GitHub repository.
- Add the coding tools.
- Connect the Supabase backend.
- Add authentication.
- Test a harmless read-only repository task first.
- Test a controlled code change on a feature branch.
- Run build/tests.
- Add the approval gate before any production deployment.

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