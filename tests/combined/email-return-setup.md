# Verification-email return setup

The retained signup code omitted `emailRedirectTo`, so Supabase chooses its configured default Site URL. The combined build now explicitly requests `https://dexters-loyalty-v15.vercel.app/` and retains the existing SDK session handling. It uses the stable production alias rather than an ephemeral preview, localhost, or a new callback route that the current deployment cannot serve.

The connected Supabase tools do not expose Auth URL configuration, and no management API credential is configured in this workspace. Therefore the current Site URL and redirect allowlist have not been read or changed. A public invalid-token redirect probe was not completed because network approval was cancelled. Do not claim the live email problem is fixed from the local code change alone.

Required project setting in Supabase project `bpnkouymdvcogeaqjmxl`, Authentication → URL Configuration:

- Site URL: `https://dexters-loyalty-v15.vercel.app/`
- Redirect URLs: allow that exact URL, preserving any other required application URLs.
- Preserve email confirmation and existing authentication security settings.

The Site URL correction can also fix the currently live frontend, which does not supply an explicit redirect. The explicit signup redirect becomes active only when the combined frontend is approved and published. Previously sent links may retain their previous explicit destinations; test with a fresh verification email on a dedicated test account. Do not publish or send messages automatically as part of the build test.

Reference: https://supabase.com/docs/guides/auth/redirect-urls
