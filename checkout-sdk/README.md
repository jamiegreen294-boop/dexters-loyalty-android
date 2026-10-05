# Dexter Checkout — Mobile Payments SDK

Separate Android package `co.dexters.checkout`, using Square Mobile Payments SDK 2.6.1. The existing `co.dexters.livepos` and `co.dexters.terminal` packages are not overwritten. The original POS app/build/release workflow is unchanged.

The checkout receives the existing EPOS payment requests. Staff sessions persist encrypted with Android Keystore and refresh before expiry. Network failures retain the session. A payment attempt is journalled before opening Square's secure SDK payment activity. Approved results are verified server-side against Square status, amount, GBP currency, location and request reference before reaching the till. An interrupted attempt is reconciled; it is never automatically charged a second time. No offline card payments are enabled. The existing Foodhub printer service/AIDL is retained. Scanner keyboard output is shown for hardware verification; barcode product lookup and basket creation are not implemented in this version.

## Build

Requires Java 17, Gradle 8.13, Android SDK platform/build-tools 36:

`gradle -p checkout-sdk assembleDebug`

No access token is embedded in the Android package. The SDK-only `sdk_*` actions are added to `supabase/functions/pc-pos-square-bridge` with JWT verification enabled; original receiver actions are preserved. Configure **OAuth** credentials `SQUARE_MOBILE_OAUTH_TOKEN` and `SQUARE_MOBILE_LOCATION_ID` for the existing Square application. Do not copy the existing personal Square access token into this endpoint. Square credentials are sent directly to the signed-in native app over HTTPS, never to a webpage. Tokens need server-managed OAuth refresh before enabling production; this source currently reports configuration failure when an OAuth token expires.

Square must register the package name and the actual SHA-256 signing-certificate fingerprint before production payments. Developer options must be disabled, runtime permissions granted, and this Model 1008 must pass Square's own compatibility/attestation checks. A prior successful payment in the separate Square app does not establish SDK compatibility.

The new endpoint does not claim payment requests unless `DEXTERS_CHECKOUT_SDK_ENABLED=YES`. Keep this off until SDK authorisation, reader/Tap to Pay, callback, cancellation, reconnect, and printer checks pass. Do not run the old receiver alongside an enabled new checkout; both would compete for the same request queue.

## Scope still requiring merchant setup and verification

OAuth authorisation/refresh, certificate registration, device attestation, live reader/Tap to Pay, scanner lookup, and end-to-end EPOS approval remain outstanding. No real payment has been tested by creating this build.
