# Dexters Windows EPOS Platform — Test Build

This branch is isolated from the current live/test POS flow.

## Components

- `windows-epos/DextersHub.ps1` — local Windows hardware/app hub.
- `windows-epos/Install-DextersHub.ps1` — installs the hub into ProgramData and creates an auto-start scheduled task.
- `windows-epos/config.example.json` — per-till hardware/application configuration.
- `windows-epos-test/index.html` — test Back Office device/integration dashboard.
- `.github/workflows/deploy-windows-epos-test.yml` — publishes only the test dashboard to `gh-pages/windows-epos-test`.

## Test architecture

The POS sends one local command to the Windows Hub for each hardware transaction. A cash sale can therefore request receipt printing and the drawer pulse together. The Hub owns Windows-specific hardware behavior; the browser POS does not.

The Hub also exposes status/launch connectors for WhatsApp Desktop and bOnline Desktop/Web launcher without changing their own message or call flows.

## Safety

This branch must not be merged into the live/main branch until the shop hardware acceptance test passes:
1. receipt print,
2. cash drawer,
3. receipt + drawer combined,
4. scanner,
5. customer display,
6. Square launch/return,
7. KDS flow,
8. WhatsApp launch/status,
9. bOnline launch/status,
10. Windows restart/self-heal,
11. offline queue/replay,
12. rollback.


## Pilot build 0.4.0-pilot
Built and packaged on 2026-09-26 as an isolated Windows pilot.

Validated:
- Packaged Electron app launches from bundled resources
- Local Hub reports version 0.4.0-pilot
- SQLite integrity check passes
- Product catalogue query passes
- Scottish alcohol MUP rule self-test passes
- Customer display assets present
- Config and integrations config present
- Runtime data directory writable
- No live connectors enabled in pilot self-test
- Staff PIN bootstrap and session permission enforcement added
- Refund/void, stock, setup, reports, release and backup actions are permission-gated
- Backup validation/restore and pilot self-test added

Installer created:
Dexters-EPOS-Setup-0.4.0-pilot.exe

Production external integrations remain intentionally unconfigured until their credentials/partner access are supplied.
