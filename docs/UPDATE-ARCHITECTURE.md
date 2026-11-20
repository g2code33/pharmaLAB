# Updates and rollback

The PWA is the only existing update client. Build output includes the immutable asset bundle, `version.json` and a service worker with a content-derived cache name. A new worker completes its entire precache install before activation. Browser lifecycle keeps existing open tabs on their worker until safe takeover. Closing all app tabs and reopening allows a waiting worker to activate. IndexedDB is independent of shell cache eviction. Offline is a connectivity state, not a successful check for newer versions.

Serve the verified zip at the root of a dedicated HTTPS origin, not a subdirectory. Revalidate `/sw.js`, `/index.html` and `/version.json` (Cache-Control: no-cache); use immutable caching only for content-hashed assets. Publish new assets before replacing the entrypoint/service worker. Retain the previous release for rollback. There is no configured live hostname or deployment token.

Native upgrades are user-controlled: choose a versioned release, verify the checksum (and system signature where provided), back up notebooks, then install through Windows or the Debian package manager. There is no unattended installation, native update feed, forced downgrade or fabricated `latest` URL. Release verification, not a second unsigned manifest, is the source of artifact integrity. See RELEASE-PIPELINE.md for reinstallation limitations.
