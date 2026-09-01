# Sunday Roast test handoff

Base: d286f8b98fe7193922e1214c339f4d09a65725c3, test-work-layout-live-integration.

This is an isolated browser review prototype, not production-ready. No backend objects, auth policies, production settings, live orders or KDS deployment have been changed.

Customer: /sunday-roast-test.html
Admin: /sunday-admin-test.html
KDS: /sunday-kds-test.html (existing repository KDS renderer with an offline data adapter).

Sample storage is local to the preview origin/browser. The tabs share changes, using Web Locks for sample-stock mutations. It is not shared between devices and is not an authorization boundary. All sample orders are visible to the person testing in that browser; do not enter real customer details.

The theme loader only reads the existing public app_theme_mode RPC. Existing collection and signed-in home features on the preview still use their established services. Do not submit ordinary collection test orders to the live kitchen.

Completed offline checks: meals and mixed orders; each independent extra; prices; UK summer/winter Friday 20:00 cutoff; close/reopen; sold-out handling; current slots; remaining allocations; idempotency; rejected-stock release; prep totals and status lifecycle.

Required before readiness:
- Provision an isolated backend/project. Do not use production collection_orders for test orders.
- Use the existing collection_orders schema and existing KDS actions in that isolated environment.
- Add per-Sunday settings/slots and a stock allocation ledger.
- Implement atomic server-side stock decrement and order insertion in one PostgreSQL transaction, using a row lock, auth.uid ownership, a unique customer/request idempotency key, server-owned penny prices and Europe/London cutoff enforcement.
- Verify trusted profiles.role for admin changes; customers must not edit stock or other customers' orders.
- Make rejected-order release atomic and once-only for the original Sunday allocation.
- Include explicit Sunday title, date/time, separate meal and extra lines in the existing ticket payload.
- Test concurrent last-portion purchases, retries, ownership, staff/admin permissions, real status polling and notifications against isolated services.
- Replace reference food imagery with approved Dexter's imagery before production.
- Jamie must approve a completed integrated test version before any main/production promotion.
