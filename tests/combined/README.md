# Combined Work build — not deployed

This branch unifies the existing production-line app, the latest approved news styling, A–Z customer offers, admin inactive-customer deletion, points redemption and the universal QR scanner with manual backups.

Verified source provenance:
- Latest READY production in the connected Vercel project: `762ed8a217228ea818bbadc06783fd8b0ed1f25e` (`dpl_AUJSaUWfS7Q1Y8RDzPMZEPGRRnP1`).
- Latest READY deployment, a news preview: `6cd673a5d866136928031465aab46404c1778277` (`dpl_MpLKsDkH8Ch7LBHb93c199b7W7ic`). That commit adds an isolated news-test page.
- Latest repository main: `b7f410a`, already included in the scanner branch.
- Updated news presentation: `test/customer-offers-combined-final` at `3cd41a7`.
- Universal scanner source: `9994d8f`.
- Original server snapshots: customer-offers-admin v4, app-news-api v1 and loyalty-points-api v2. The subsequently authorized backend activation is recorded below.

The combined pipeline injects one customer-management runtime and one news runtime. It retains the current A–Z offer form, admin role checks, deletion confirmations and server inactivity recheck; unknown activity now fails closed both in the interface and in the prepared backend update. The original staff stamp, coffee/prize redemption and points controls remain. Existing collection, Sunday Roast, menu and seasonal features are built through the same unchanged base pipeline.

`npm run build` produces the integrated application at `dist/index.html`, its assets, a provenance manifest, and `dist/Dexters_Combined_Work_Test.html`. The standalone HTML is a review simulation for the changed staff/customer features, not the complete live service: it uses dummy customer/news data, blocks real fetches, and contains the earlier offline QR adapter. No live account is deleted or offer sent when using that file. Its Reset test button resets the QR scenario only.

Final validation: 115 focused checks pass (16 mocked backend deletion/news checks; 13 integrated UI checks; 22 QR/core checks; 40 isolated Postgres checks; 24 production UI-to-SQL journey checks). Browser inspection confirmed the combined screen, inactive-customer filtering and manual scanner lookup. Existing build-time Sunday checks pass. Previously passing reorder/printer/deal suites were retained; their source was not changed in this integration.

Run tests with `DEXTERS_QA_MODULES` pointing at node_modules containing jsdom@26.1.0, jsqr@1.4.0 and @electric-sql/pglite@0.3.14, then `npm run test:combined`.

Server updates were authorized and applied on 2026-09-02: migration `universal_qr_scanner` and `customer-offers-admin` version 5. The frontend remains unpublished. `live-rollback.sql` passed 21 installed-database assertions using temporary fixtures and authenticated/anonymous database roles; every fixture was rolled back and absence was verified. This tests database authorization, not a real browser sign-in. The security advisor added only two informational notices for intentionally inaccessible private tables with RLS and no policies; neither table grants client access.

Authenticated browser verification passed using the full local frontend against the live server: admin sign-in, customer listing, inactive filtering, universal customer lookup with real balances, manual stamp controls, and news controls. No account was deleted and no real reward or balance was changed. Customer-side redemption on a physical device remains unverified; no physical scanner was available. Do not conflate the standalone demo with production server verification. Do not push or publish the frontend until Jamie's publication approval. Include the remaining device check in release acceptance. Preserve the existing KDS/printer project as a separate app.

Final check (2026-09-02): full build and all 115 focused checks passed, and the 21 installed-database assertions passed again with transaction rollback. The new journey checks run the production wallet/scanner UI against the real SQL in a local Postgres engine with fixture identities and an HTTP adapter. They cover decoded customer QR output, category/cost presentation, cancel, redemption, customer-wallet removal, screenshot replay, whole-pound earning, lost-response retry, ninth-stamp coffee, spin, deals, offers, expiry, invalid input and sign-out cleanup. Browser confirmation on the isolated demo passed keyboard input plus Enter, 650-point redemption, QR removal and replay rejection. These are software checks, not a physical-camera/USB-reader test. No frontend was published during final testing.

Verification-email follow-up: `postprocess-auth-return.cjs` supplies the stable production `emailRedirectTo` while preserving the original asynchronous app loader. Eleven signup/redirect checks, the full 115-check suite and a signed-in browser load passed. Live Auth URL configuration is still unverified/unmodified; see `email-return-setup.md`. No confirmation email was sent and no frontend was published.
