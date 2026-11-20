# Architecture

The React workspace owns a draft notebook and navigation. Explicit Save commits a snapshot through `src/database/store.ts`; reports and analysis read saved snapshots. Dose-response computation is not part of the frontend. The technical SVG in `laboratory/Bath.tsx` accepts a read-only simulation snapshot; changing zoom does not mutate the notebook. Static SVG avoids a chart or WebGL runtime until there is a real signal to plot.

`catalogue` identifies planned resources, `evidence` describes provenance, and `simulation` defines UI-independent contracts and unavailable operations. Tauri packages the same production assets as the web application. There are no remote services or runtime fonts.

The [versioned Option A protocol](scientific/GP_ACH_OPTION_A.md) adds a mutually exclusive `trial` payload to the existing envelope. `ProtocolBench` controls virtual time; `protocol.ts` alone evolves tissue state. SVG and CSV read its samples; storage never serializes wall-clock callbacks.
