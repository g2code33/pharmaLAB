# Reproduce a build

Use a clean Git checkout (build identity requires `.git`), Node 22.22.3, npm, and the committed npm lock. Use an empty output directory when staging packages. Never ship files from `npm run dev`.

```sh
npm ci
npm run check
npm test
npm audit --audit-level=high
npm run build
npm run verify:web
npx playwright install --with-deps chromium
npm run test:e2e
(cd dist && zip -qr ../web.zip .)
unzip -t web.zip
node scripts/stage.mjs web web.zip
node scripts/delivery.mjs collect release-out web /tmp/pharmalab-verified
node scripts/delivery.mjs verify /tmp/pharmalab-verified web
```

Use Playwright on a machine supporting Chromium's sandbox. `CHROMIUM_PATH` can select a compatible installed browser. Never disable its sandbox. `dist/version.json`, the About screen and staged metadata identify the commit. CI builds from an immutable checkout; don't distribute builds from a dirty tree. Timestamps, signatures, OS packages and the vendor's offline WebView installer prevent a promise of byte-for-byte reproducibility. The npm and Cargo dependency graphs are locked.

## Ubuntu amd64

Install rustup, the repository toolchain, and `libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev patchelf desktop-file-utils xdotool xvfb dbus-x11`. Build in a disposable Ubuntu 24.04 VM:

```sh
export PHARMA_TARGET=linux
npm ci && npm run build
cargo clippy --manifest-path src-tauri/Cargo.toml --locked -- -D warnings
npm run tauri build -- --ci --bundles deb -- --locked
bash scripts/linux-package.sh
```

The smoke script intentionally installs the verified package in that VM. It checks architecture, app version, executable, icons, desktop entry, and the running GUI plus SQLite initialization. This `.deb` targets Ubuntu 24.04 amd64 with WebKitGTK 4.1 available; it is not an offline OS dependency installer or universal Linux package.

## Windows x64

Use Visual Studio C++ build tools, Rust MSVC via rustup and WebView2. In PowerShell:

```powershell
$env:PHARMA_TARGET='windows'
npm ci
npm run tauri build -- --ci --bundles nsis -- --locked
```

CI smoke-tests the current-user NSIS install on Windows Server, checking the installed PE machine type, product version, main window and local SQLite file. `scripts/windows-package.ps1` is intended for disposable runners (it actually installs the app). A clean consumer PC without WebView2 still requires separate qualification.

## Versions

`node scripts/version.mjs check` fails on drift. `node scripts/version.mjs patch` (or `minor`, `major`, or a higher explicit `X.Y.Z`) synchronizes npm metadata, npm lock, Tauri and Cargo metadata/lock. Review and commit all changed files together. Do not run `npm version` or edit only the UI. Published binaries keep their original identity; version bumps do not migrate notebook model versions.
