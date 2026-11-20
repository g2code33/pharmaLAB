#!/usr/bin/env bash
set -euo pipefail
shopt -s nullglob
pkgs=(src-tauri/target/release/bundle/deb/*.deb); [[ ${#pkgs[@]} = 1 ]]; pkg=${pkgs[0]}
version=$(node scripts/version.mjs); [[ $(dpkg-deb -f "$pkg" Version) = "$version" && $(dpkg-deb -f "$pkg" Architecture) = amd64 ]]; dpkg-deb -I "$pkg"
base=$(mktemp -d); dpkg-deb -x "$pkg" "$base"; bin="$base/usr/bin/pharmalab"; test -x "$bin"; readelf -h "$bin" | grep -F 'Advanced Micro Devices X86-64'; desktop=("$base"/usr/share/applications/*.desktop); [[ ${#desktop[@]} = 1 ]]; desktop-file-validate "${desktop[0]}"; grep -E '^Exec=(/usr/bin/)?pharmalab( |$)' "${desktop[0]}"; find "$base/usr/share/icons" -name '*.png' -size +0c | grep .
# Smoke the installed binary on a fresh XDG data home; SQLite proves JS reached IPC.
sum=$(sha256sum "$pkg"); echo "$sum" | sha256sum -c -; sudo apt-get install -y "./$pkg"; cmp "$bin" /usr/bin/pharmalab
export XDG_DATA_HOME="$base/data" XDG_CONFIG_HOME="$base/config"; xvfb-run -a dbus-run-session -- bash -ec '
pharmalab & pid=$!; trap "kill $pid" EXIT
for i in {1..60}; do kill -0 "$pid"; if xdotool search --name "^PharmaLab$" >/dev/null && find "$XDG_DATA_HOME" "$XDG_CONFIG_HOME" -name pharmalab.db 2>/dev/null | grep -q .; then exit 0; fi; sleep 1; done; exit 1'
node scripts/stage.mjs linux "$pkg"
