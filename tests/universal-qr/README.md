# Universal scanner — test branch only

Built from the current Dexter’s source on `test/universal-qr-scanner`. No remote database changes, pushes, deployments, customer actions, KDS orders or physical prints were performed.

## Delivered behavior

- One staff scanner recognises the existing permanent `DEXTERS:123456` customer format, deals, legacy `DEXTERS-OFFER` offers, points, Spin to Win and coffee rewards.
- All existing manual staff sections and buttons remain. The universal scanner also accepts typed codes and keyboard-style USB scanner input.
- Rewards show authoritative stored item/category details; unknown legacy metadata is explicitly labelled for staff review instead of guessed. Deals reuse the existing catalog. Ambiguous legacy spin names and free-text offers still require staff to check the original prize/offer details.
- New customer QR cards cover pending points rewards, winning spins and the current earned coffee reward. Existing deal and individual-offer QR cards remain.
- Redemption requires confirmation, persists on the server, and reuses the existing locked redemption functions. Points are deducted on confirmation. Coffee codes are tied to a specific stamp cycle, not just a permanent customer ID.
- Adding stamps/points uses retry receipts, so retrying the same uncertain request does not add twice. A separate intentional new purchase remains a new transaction. Manual legacy actions keep their existing behavior.
- The customer points panel refreshes while visible without replacing unchanged HTML.

## Verification

62 focused checks pass: 22 JavaScript/QR encoding-decoding checks and 40 SQL checks against isolated PGlite Postgres, including database restart persistence, auth/permissions, invalid/expired/replayed codes, balance deduction, insufficient balance rollback, nine-stamp coffee cycles and retry behavior. PGlite uses a single connection; parallel-request tests are serialized and are not a real multi-connection load test.

Browser checked: generated QR display, manual customer lookup, £12.80 -> 12 points, item/category display, cancel, confirmation, 650-point deduction, copied QR rejection, persistence after reload, expiry and camera-unavailable fallback. No physical camera/USB scanner was available. No live customer account was used. Existing deal stability, reorder and Sunday printer tests also pass, and the full build succeeds.

## Run locally

`npm run build` builds the existing app plus `dist/Dexters_Universal_QR_Test.html`. The HTML file is a self-contained offline demonstration with IndexedDB state (session fallback if the viewer blocks storage). It never contacts the live service. Its sample deals/items are examples, not new menu changes.

Tests need `@electric-sql/pglite@0.3.14` and `jsqr@1.4.0`. Set `DEXTERS_QA_MODULES` to their node_modules directory and run `npm run test:qr`. `npm run dev` serves only the offline test at the root on port 4173.

## Activation remains outstanding by user instruction

`supabase/sql/universal-qr.sql` was installed on 2026-09-02 as `universal_qr_scanner`. Installed-database assertions and rollback verification passed; see `tests/combined/live-rollback.sql`. Authenticated admin browser lookup passed against the live RPC; physical camera/USB scanning and the customer-side device flow remain unverified. The scanner retains manual fallback on network/server errors. Do not push this branch merely to save it: automatic preview builds could consume deployment allowance.
