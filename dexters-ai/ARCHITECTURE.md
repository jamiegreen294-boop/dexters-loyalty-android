# Dexter's AI — Architecture Plan

## Objective
Create a ChatGPT-style Dexter's software agent that can understand requests, inspect Dexter's projects, write code, test it, and prepare approved deployments.

## Components

### 1. Client
Android app or responsive web app.

Responsibilities:
- chat interface
- project selector
- task status
- proposed changes
- test/build results
- approval buttons
- deployment status

The client must never contain privileged GitHub, Supabase or model credentials.

### 2. Home-PC Agent Server
Runs on Dexter's home PC.

Responsibilities:
- authenticate clients
- receive tasks
- call the local AI model
- expose controlled tools
- read/write approved repositories
- execute local builds/tests
- communicate with Supabase
- communicate with GitHub
- maintain task/audit history

### 3. Local AI Runtime
Use an open-source/local model where practical so AI inference does not require a paid API.

Runtime/model selection depends on the home PC hardware and must be tested rather than assumed.

### 4. Supabase
Shared data layer for:
- business configuration
- project registry
- AI memory
- task history
- audit events
- app configuration
- staff authentication where required

Source code should remain in GitHub rather than being duplicated into Supabase unless a specific feature requires indexing or metadata.

### 5. GitHub
Source control and collaboration layer.

The agent should support:
- inspect
- search
- branch
- edit
- diff
- test/build through available automation
- pull request
- review
- approved merge/deployment

### 6. Remote connectivity
A secure private networking layer can allow the phone to reach the home PC without exposing the agent server directly to the public internet.

A free/private option such as Tailscale can be evaluated during setup.

## Security model

Client → authenticated Home-PC Agent Server → privileged tools → GitHub/Supabase/local filesystem.

Never:
- expose service-role keys to clients
- expose GitHub tokens to clients
- expose local filesystem directly to the internet
- allow unrestricted shell execution from unauthenticated requests
- deploy production changes without the required approval

## Agent execution loop

1. Receive task.
2. Identify project.
3. Read project instructions.
4. Inspect relevant files.
5. Search for related code/configuration.
6. Form a plan.
7. Make a controlled change.
8. Generate a diff.
9. Run tests/builds.
10. Fix failures where appropriate.
11. Present the result.
12. Request approval for production-sensitive actions.
13. Commit/create PR.
14. Deploy only when approved.
15. Verify deployment.
16. Write an audit event.

## Failure handling
If a build/test fails:
- capture the error
- identify the likely affected file/component
- inspect relevant code
- make the smallest corrective change
- rerun the failed check
- do not report success until the check passes or the limitation is clearly stated.

## Data handling
Customer, staff, payment, banking and authentication information is sensitive. The agent should only retrieve the minimum data required for a task and should not copy sensitive information into logs, source files or AI memory unnecessarily.

## Deployment stages
Development → Test → Review → Approval → Production.

Production should never be treated as an automatic side effect of an ordinary coding request unless the user has explicitly configured that behaviour for a specific low-risk project.