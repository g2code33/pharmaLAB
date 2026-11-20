# PharmaLab

Local virtual pharmacology laboratory for guinea-pig ileum and acetylcholine. The [Option A protocol recorder](docs/scientific/GP_ACH_OPTION_A.md) simulates phasic contraction, fade, sustained response and recovery. Its default MPLM profile uses a reported isometric potency midpoint; the time course and optional force scale are **provisional assumptions, not independently validated predictions**. The [original bath-only notebook](docs/scientific/GP_ACH_SCIENTIFIC_SPECIFICATION.md) remains available. No account or backend required.

## Run the workspace

With Node 22 and npm: `npm ci`, then `npm run dev`. For the installable offline version use `npm run build && npm run preview`. Deploy the contents of `dist/` at the root of an HTTPS origin. Install through a supported browser after its service worker finishes caching the first load.

Start a named experiment, enter a setup, log actions and annotations, then select **Save experiment** before closing or opening another notebook. Use Experiments to reopen, duplicate, import or export a JSON backup. Reports exports a plain-text history, not a scientific result.

## Desktop

Install Rust stable, Node and the [Tauri 2 platform prerequisites](https://v2.tauri.app/start/prerequisites/). On Windows these include MSVC build tools; Ubuntu requires WebKitGTK 4.1 development libraries. `npm run tauri dev` starts the native shell; `npm run tauri build` packages the frontend and bundled SQLite driver. Windows is configured for the offline WebView2 installer. Linux machines need the distribution runtime libraries installed. Packaging requires network access on the build machine, not for routine application use. The verification workflow builds and smoke-tests native packages on Windows and Ubuntu runners. Consult its actual run status before distributing any installer.

## Verification

`npm test` runs contract and IndexedDB tests. `npm run build`, `npx playwright install chromium`, then `npm run test:e2e` checks the production workspace, navigation, mobile width and offline reload. Set `CHROMIUM_PATH` to use an existing Chromium executable.

See [implementation status](docs/IMPLEMENTATION_STATUS.md), [architecture](docs/ARCHITECTURE.md) and the specifications in `docs/`.

## Build and release engineering

See [build instructions](docs/BUILD-INSTRUCTIONS.md), [release policy and recovery commands](docs/RELEASE-PIPELINE.md), [updates](docs/UPDATE-ARCHITECTURE.md), [security](docs/SECURITY.md), [engineering profile](docs/PROJECT-ENGINEERING-PROFILE.md) and [decisions](docs/DECISIONS.md). Main deliveries are commit-specific prereleases; only authorized version releases are stable.
