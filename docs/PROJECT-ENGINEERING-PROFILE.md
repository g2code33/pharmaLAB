# PharmaLab engineering profile

| Category | Discovery baseline |
|---|---|
| Product / repository | PharmaLab · g2code33/pharmaLAB · default branch main |
| Languages / framework | TypeScript, React 19.3.1, Vite 6.4.6; Rust Tauri 2 with SQL plugin |
| Package managers | npm (lockfile v3), Cargo (initially no Cargo.lock) |
| Entry points | index.html → src/main.tsx; src-tauri/src/main.rs |
| Backend, authentication | None. No account or required network service. |
| Storage | IndexedDB v1 in browser; local SQLite migration in native shell |
| Hosting / deployment | No provider, domain, API, container or deployment authorization discovered |
| Prior CI/CD | Manual Windows/Linux build; no checksums, uploads or releases |
| Prior version | 0.1.0 duplicated in npm, Cargo, Tauri and UI |
| Updates | Content-addressed service worker, no native updater or update feed |
| Targets | Root-hosted static web/PWA; x86-64 Windows and Ubuntu desktop |
| Source assets | Local SVG and PNG PWA icons, ICO/PNG native icons, no CDN |
| Baseline commands | npm ci; npm test; npm run build; npm run test:e2e; npm run tauri build |
| Credentials | No application secrets. CI publication needs a scoped Actions token. Optional Windows signing credentials only in trusted jobs. |
| Limitations | No native installation evidence in original checkout; no shared server, mobile projects or macOS release requirement. Simulation intentionally absent. |
