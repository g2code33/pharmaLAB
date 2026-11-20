# Offline operation

A production build generates a content-versioned service worker and precaches every emitted static asset. Installation completes only if the whole cache is available. Navigations use cached index.html. Old application caches are removed on activation, never the notebook database. Development mode does not register a service worker. Connectivity is the browser network flag, not a promise that a particular server responds.

IndexedDB v1 creates `records` in an upgrade transaction. Tauri uses a versioned SQL migration for a key/value table. Both store experiment snapshots and user configuration. Future migrations must be additive or transactional, with explicit schema upgrades and preserved model identifiers. Unsupported notebook schemas are rejected on import; collisions preserve the existing record. Export backups before clearing browser or application data. The notebook collection currently assumes one editing window; it is not a concurrent multi-user database.
