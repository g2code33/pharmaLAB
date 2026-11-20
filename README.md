# PharmaLab

Independent virtual pharmacology laboratory for local experiment setup and documentation. Phase 1 **does not simulate tissue responses**. No account, backend or PharmaTRACK installation is needed.

## Run the workspace

With Node 22 and npm: `npm ci`, then `npm run dev`. For the installable offline version use `npm run build && npm run preview`. Deploy the contents of `dist/` at the root of an HTTPS origin. Install through a supported browser after its service worker finishes caching the first load.

Start a named experiment, enter a setup, log actions and annotations, then select **Save experiment** before closing or opening another notebook. Use Experiments to reopen, duplicate, import or export a JSON backup. Reports exports a plain-text history, not a scientific result.

## Desktop

Install Rust stable, Node and the [Tauri 2 platform prerequisites](https://v2.tauri.app/start/prerequisites/). On Windows these include MSVC build tools; Ubuntu requires WebKitGTK 4.1 development libraries. `npm run tauri dev` starts the native shell; `npm run tauri build` packages the frontend and SQLite plugin. Windows is configured for the offline WebView2 installer. Linux machines need the distribution runtime libraries installed. Packaging requires network access on the build machine, not for routine application use. A manually triggered Windows/Linux build workflow is included; installers have not been tested here.

## Verification

`npm test` runs contract and IndexedDB tests. `npm run build`, `npx playwright install chromium`, then `npm run test:e2e` checks the production workspace, navigation, mobile width and offline reload. Set `CHROMIUM_PATH` to use an existing Chromium executable.

See [implementation status](docs/IMPLEMENTATION_STATUS.md), [architecture](docs/ARCHITECTURE.md) and the specifications in `docs/`.
