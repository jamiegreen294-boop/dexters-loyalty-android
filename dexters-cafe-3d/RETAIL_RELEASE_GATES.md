# Dexter's Cafe 3D — Retail Release Gates

This game is **not** to be called final or retail-ready until every gate below is met on the isolated `dexters-cafe-3d-v1` branch and a verified Android build exists.

## 1. Core gameplay must be genuinely fun
- Player can move around the cafe and interact with stations.
- Customers enter, queue, order, wait, collect/sit, eat, pay, and leave.
- Staff move and perform visible jobs rather than teleporting or being decorative.
- Orders can succeed or fail based on service speed / patience.
- Breakfast, lunch, rushes, takeaway, sit-in and collection all create different pressure.
- Player decisions materially affect profit, reputation and progression.

## 2. Proper 3D presentation
- Portrait isometric camera suitable for mobile.
- Commercial-quality 3D cafe furniture and kitchen equipment.
- Proper character models / animations; no placeholder primitives in the release build.
- Visible food, trays, equipment activity, order/task markers and effects.
- Dexter's branding integrated naturally into signage, uniforms and UI.
- Smooth camera, movement and transitions.

## 3. Progression and retention
- XP / player level progression.
- Unlockable Dexter's menu items.
- Equipment upgrades that visibly and mechanically improve the cafe.
- Staff hiring and training.
- Cafe expansion / additional rooms or floor area.
- Decoration / placement mode.
- Daily objectives, achievements and milestone rewards.
- Long-term location progression, including a genuinely playable second Dexter's location.

## 4. Content
- Real Dexter's-inspired breakfast, lunch, drinks, burgers, subs, loaded fries, rice bowls and specials.
- Sunday Roast / special event gameplay.
- Catering orders and larger-value jobs later in progression.
- Multiple customer types with different patience / spend / preferences.
- Random service events so shifts do not feel identical.

## 5. Monetisation without ruining the game
- Rewarded ads only where they provide an optional benefit.
- No ad interrupts during live service.
- Limited interstitials only at natural break points if retained after playtesting.
- Optional ad-free purchase can be added later.
- Consent/privacy flow suitable for UK/EEA users before public release.

## 6. Mobile quality
- Android app opens reliably on supported devices.
- Portrait UI fits common phone/tablet aspect ratios.
- Touch targets are comfortable and responsive.
- Stable save/load, pause/resume and app-background handling.
- No lost progress after normal close/reopen.
- Audio/music can be muted separately.
- Performance remains smooth with a busy cafe.

## 7. QA gates before any 'final' claim
- Godot project parse succeeds.
- Android APK/AAB export succeeds.
- APK installs and launches successfully.
- Startup smoke test passes.
- Full first-day playthrough passes.
- Full early-game progression loop passes.
- Save/reload test passes.
- Long-session test passes.
- No blocker crashes or softlocks.
- Actual gameplay screenshots are taken from the build, not mockups.
- User approves the real gameplay visually and mechanically.

## Current rule
Do **not** send another build merely because it compiles. Send a test build only when it represents a meaningful playable improvement, and do not call it retail-ready until all gates above are complete.
