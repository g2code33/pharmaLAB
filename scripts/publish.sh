#!/usr/bin/env bash
set -euo pipefail
# TAG, CHANNEL, GITHUB_SHA and GH_TOKEN supplied by the trusted delivery job.
[[ $(git rev-parse HEAD) = "$GITHUB_SHA" ]]; version=$(node scripts/version.mjs check)
case "$CHANNEL" in
 stable) [[ $TAG = "v$version" ]]; pre=false; latest=true;;
 prerelease) [[ $TAG = "main-${GITHUB_SHA:0:7}" ]]; pre=true; latest=false;;
 *) exit 1;;
esac
git merge-base --is-ancestor HEAD origin/main
# Exact lookup: an API error is not evidence that no release exists.
gh api --paginate "repos/$GITHUB_REPOSITORY/releases?per_page=100" --slurp > "$RUNNER_TEMP/releases.json"
entry=$(jq -c --arg t "$TAG" '[.[][]|select(.tag_name==$t)]|first // null' "$RUNNER_TEMP/releases.json")
remote=$(git ls-remote --tags origin "refs/tags/$TAG" "refs/tags/$TAG^{}")
if [[ -n $remote ]]; then actual=$(awk 'END {print $1}' <<< "$remote"); [[ $actual = "$GITHUB_SHA" ]] || { echo 'Tag points to another commit' >&2; exit 1; }; fi
if [[ $entry != null ]]; then
 [[ $(jq -r .prerelease <<< "$entry") = "$pre" ]] || { echo 'Channel collision' >&2; exit 1; }
 if [[ $(jq -r .draft <<< "$entry") = false ]]; then
   [[ -n $remote ]]; gh release download "$TAG" -D "$RUNNER_TEMP/published"; node scripts/delivery.mjs verify "$RUNNER_TEMP/published"; echo 'Already published: existing verified bytes unchanged.'; gh release view "$TAG" --json url --jq .url >> "$GITHUB_STEP_SUMMARY"; exit 0
 fi
 [[ $(jq -r .target_commitish <<< "$entry") = "$GITHUB_SHA" ]] || { echo 'Unrelated draft; refusing takeover' >&2; exit 1; }
fi
if [[ $pre = false ]]; then
 highest=$(jq -r '.[][] | select(.draft==false and .prerelease==false) | .tag_name |select(test("^v[0-9]+\\.[0-9]+\\.[0-9]+$"))' "$RUNNER_TEMP/releases.json" | sort -V | tail -1)
 if [[ -n $highest ]]; then [[ $(printf '%s\n%s\n' "$highest" "$TAG" | sort -V | tail -1) = "$TAG" ]] || { echo 'Stable downgrade refused' >&2; exit 1; }; fi
fi
if [[ $entry = null ]]; then
 gh release create "$TAG" --draft --prerelease="$pre" --target "$GITHUB_SHA" --generate-notes --title "PharmaLab $TAG"
fi
gh release upload "$TAG" verified/* --clobber
gh release download "$TAG" -D "$RUNNER_TEMP/uploaded"; node scripts/delivery.mjs verify "$RUNNER_TEMP/uploaded"; cmp verified/SHA256SUMS.txt "$RUNNER_TEMP/uploaded/SHA256SUMS.txt"
gh release edit "$TAG" --draft=false --latest="$latest"
gh release view "$TAG" --json url,isDraft,isPrerelease | tee -a "$GITHUB_STEP_SUMMARY"
