# Release decisions

- Preserve the original application as its own commit. Do not change experimental data or storage migrations for packaging.
- Canonical version: package.json. Treat the two npm lockfile copies, Rust package/lock and Tauri version as synchronized projections. Dispatch override is an assertion against the committed version, not permission to build different binaries from the same source tag.
- Deliver an offline-WebView2 **current-user NSIS installer** for Windows x64 and a **Debian package** for Ubuntu amd64. A raw Windows executable would not carry the offline WebView runtime. No portable archive is advertised. RPM/AppImage are not primary Ubuntu targets; no tested non-Debian distribution or portable integration contract exists.
- Web delivery is a deployable zip, not a deployment. No known host to authorize. Dispatch requests for deployment must fail explicitly.
- Keep native updates manual and verified. PWA cache updates remain browser-managed. Do not add a native feed, admin panel or cloud service.
- Stable publication requires a matching vX.Y.Z tag on main history or a production-environment-approved manual run on main. Configure reviewers/tag rules in repository settings. Development tags never become latest.

## Security-driven SQLite driver revision

RustSec in PR CI reported RUSTSEC-2023-0071 and RUSTSEC-2026-0459 in the SQL plugin graph. Keeping the affected bundled SQLite or suppressing the advisory is not acceptable. Use rusqlite 0.43 with a patched bundled SQLite behind two narrow Tauri commands. The SQLite database, application config directory, keys, schema and JSON snapshots remain compatible. Migrate legacy schema zero in a transaction, preserve the SQLx migration table if present, reject unknown newer revisions. Test historical row preservation on native runners. No cloud service, new storage format or broad SQL IPC permission is introduced.
