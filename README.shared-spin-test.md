# Shared Spin to Win test branch

This branch is based on the current live main commit and is test-only.

Checks:
- one shared 1,000-spin cycle across customers
- one spin per customer per day handled by integration layer
- non-overlapping prize ranges
- guaranteed meal at spin 1000
- compatibility with the existing Universal QR scanner routing
- no live deployment

Current test head: dbb80495d48a2d8b43b1bc27736159e8f7b93f28
