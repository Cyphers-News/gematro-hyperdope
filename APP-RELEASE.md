# Cyphers app release

This branch prepares an installable web app and bundled Capacitor iOS/Android
projects from the existing calculator. It has not been published or submitted
to either store. Native binaries and real-device sign-in still need validation.

## First: test the web app on iPhone

After reviewing and releasing the web changes to the existing HTTPS website,
open cyphers.news in Safari, choose Share → Add to Home Screen, and leave
Open as Web App enabled if offered. Use the app once online before testing
airplane mode. Check phrase calculations, matching, saved settings, history,
image/text exports, sign-in, and the smaller phone layout. Account/community
features need a connection. No existing account data is migrated.

The service worker caches only an explicit list of public calculator files,
including the phrase database. API responses, account HTML and uploaded user
content are never added to this cache. Updates wait for open Cyphers windows
to close. Browser/OS storage eviction can remove offline files.

## Build and keep releases reproducible

Use Node 22+ and pnpm 11.19.0:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm mobile:sync
```

`pnpm build` writes the web-only `dist/` bundle and regenerates
`app/precache.js`. Commit the regenerated file whenever public assets change;
the existing GitHub Pages deployment can continue serving the repository root
with `_config.yml` exclusions. Alternatively deploy only `dist/`. Preserve the
existing custom domain configuration when changing the publishing workflow.
Do not publish the complete repository with exclusions disabled.

`pnpm mobile:sync` builds `www/` and copies it into both native projects.
The apps use bundled local assets, not Capacitor's development-only server URL.
The native bridge uses the system browser for OAuth and the system share sheet
for existing image/text exports. Native auth uses PKCE; web auth remains on its
existing flow. Browser storage and native storage are separate: sign in again
inside the installed native app. Local guest history/settings can be moved with
the existing export/import functions.

## Supabase setup for native sign-in

In the existing Supabase project, Authentication → URL Configuration → Redirect
URLs, add these exact URLs while retaining all current web URLs:

```text
news.cyphers.app://auth/index.html
news.cyphers.app://auth/login.html
news.cyphers.app://auth/reset-password.html
```

The app identifier is `news.cyphers.app`; both platforms register that scheme.
OAuth returns a one-use authorization code. The app exchanges it using its
locally stored PKCE verifier and rejects unrelated routes and raw access-token
links. Start sign-up, sign-in and password recovery on the same app/device in
which the return link will open. The existing Discord callback at Supabase stays
unchanged. Do not put a Discord secret or Supabase service-role key in the app.

Test email/password, Discord sign-in, Discord linking, signup confirmation,
password recovery, cancelled/expired links and cold-start callbacks on a real
device. Confirm existing account deletion and community features end to end
with dedicated test accounts before distribution.

## iPhone build

Install Xcode 26+ on the Mac and its iOS platform components. Run
`pnpm mobile:sync`, then `pnpm mobile:ios`. In Xcode select the App target,
choose the owner's signing team, connect the iPhone and run. A paid Apple
Developer membership is needed for TestFlight/App Store distribution.

The project includes an opaque app icon, the custom return scheme and the
Filesystem required-reason privacy manifest. The icon derives from the current
256-pixel favicon; replace it with original high-resolution artwork before the
store release if available. Xcode compilation, signing and device testing were
not performed because Xcode is not installed on the preparation Mac.

## Android build

Install Android Studio 2025.2.1+ and Android SDK 36. Run `pnpm mobile:sync`, then
`pnpm mobile:android`. Test on an emulator/device before creating a signed AAB.
Keep the upload key outside the repository; keystores are ignored. Android
compilation, signing and device testing remain outstanding.

## Before store submission

- Finish the real-device checks above, including offline relaunch, keyboard,
  notches, rotation, photos/uploads and export sharing.
- Resolve Apple's login-services requirement for the existing Discord login;
  a compliant equivalent option such as Sign in with Apple needs provider
  configuration and implementation before iOS submission unless an exception
  applies. Email/password alone does not automatically resolve this requirement.
- Review existing community reporting, blocking and moderation against store
  requirements; verify account deletion using a test account.
- Supply the public privacy-policy/support URLs and complete accurate store
  privacy disclosures, including existing analytics and Supabase processing.
- Review inherited GPL-2.0 distribution obligations; retain LICENSE and source
  notices. Do not claim exclusive ownership of upstream code.
- Add store screenshots, age ratings, reviewer access and signing credentials
  through the store consoles, then distribute via TestFlight/Play testing.

Sources: [Capacitor setup](https://capacitorjs.com/docs/getting-started/environment-setup),
[Supabase PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow),
[Apple review guidelines](https://developer.apple.com/app-store/review/guidelines/).
