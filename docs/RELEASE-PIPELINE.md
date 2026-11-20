# Verified delivery

`.github/workflows/ci.yml` is a reusable read-only build workflow and PR check. PR jobs check out GitHub's test merge commit; its SHA, **not necessarily the branch tip**, is embedded in artifacts. Superseded PR checks are cancelled. CI verifies versions, formatting, types, fixtures, dependencies, secrets, and the production PWA offline workflow. Native packaging uses platform runners and a locked Cargo graph. Platform smoke tests run against actual installations, not the dev server. Checksums and metadata accompany each upload. A failed security gate blocks publishing even if other jobs uploaded diagnostic build artifacts.

`.github/workflows/release.yml` runs automatically on main pushes and version tags. It checks version/channel policy, calls CI, downloads this run's artifacts, and reconstructs the exact expected asset set. A single restricted job may write releases. It creates a draft, uploads payloads, named per-target build identities and a combined SHA256SUMS.txt, downloads them again, verifies their bytes and provenance, then publishes. See the run summary and job annotations for results, skipped targets, warnings and failure reasons. There is no deployment job: an explicit request for hosted deployment is rejected.

- **Main:** `main-<sha7>` prerelease, never latest. The tag resolves to the full build commit.
- **Stable:** `vX.Y.Z` must match committed `package.json`, and be in main's history. Manual stable requires main (or a matching version tag) and a production environment with required reviewers. All platforms required. Configure tag/branch protection and production reviewers in GitHub before adopting this policy; workflow files cannot grant approvals.
- **Manual build-only:** select web, linux, windows or all. Native targets still require shared web validation. Version input is a consistency assertion, not a hidden version rewrite.
- **Idempotence:** same-channel published release is downloaded and verified, not overwritten. An incomplete same-commit draft can be repaired. Refuse mismatched channels/tags, a stable downgrade, extra files, missing targets or corrupt checksums. A failed publish leaves a draft rather than claiming success.
- **Access:** enable repository Actions, artifact storage and Actions-token release writes for the publishing workflow. Organization policy may restrict these even when job permissions request them. Configure protected environments and restricted tags via repository settings. No PAT required by the workflow. See SECURITY.md for optional signing.

## Commands

After workflows land on the default branch:

```sh
gh workflow run release.yml --ref main -f mode=build-only -f target=all -f deployment=none
gh run list --workflow release.yml
gh run view <run-id> --log-failed
gh run download <run-id> -D downloads
gh release list
gh release view <tag> --json url,isDraft,isPrerelease,assets
gh release download <tag> -D downloaded-release
(cd downloaded-release && sha256sum -c SHA256SUMS.txt)
```

Use the actual tag, run ID and filenames returned by GitHub. On Windows compare `Get-FileHash -Algorithm SHA256 <installer>` with the corresponding manifest entry; check Authenticode for a signed build. Checksums from the same repository detect corruption, not compromise of the publisher.

**Authorized release manager only:** bump and merge the canonical version first, confirm main CI, then locally verify the intended commit and push its version tag:

```sh
git fetch origin main --tags
v=$(git show origin/main:package.json | node -pe 'JSON.parse(require("fs").readFileSync(0)).version')
git tag -a "v$v" origin/main -m "PharmaLab $v"
git push origin "refs/tags/v$v"
```

Alternatively: `gh workflow run release.yml --ref main -f mode=stable -f target=all -f deployment=none`, then approve through the configured environment. Neither command is part of ordinary development or PR validation.

## Recovery

Inspect the **first failed step**; use `gh run view <run-id> --log-failed`. For a transient service failure only, `gh run rerun <run-id> --failed`. A source defect needs a new commit and a new build; never move an existing tag. A release with incorrect payloads should be withdrawn with a user notice and superseded with a higher patch version. Do not replace published assets. For a web regression restore the previously verified zip on the same host. For desktop, export notebooks before reinstalling a known-good installer; do not point an older program at an incompatible newer database. No universal database downgrade is provided.
