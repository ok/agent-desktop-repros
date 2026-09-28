#!/usr/bin/env bash
# Runs every repro against every build in bin/ and the installed release, and keeps the output.
# Usage: ./run-evidence.sh            (builds are whatever bin/<label>/agent-desktop holds)
set -u
cd "$(dirname "$0")"
out=results
mkdir -p "$out"
labels=("released:$(command -v agent-desktop)")
for d in bin/*/; do labels+=("$(basename "$d"):$PWD/${d}agent-desktop"); done
for entry in "${labels[@]}"; do
  label=${entry%%:*}; bin=${entry#*:}
  for repro in repro/[0-9]-*.mjs; do
    name=$(basename "$repro" .mjs)
    AD="$bin" node "$repro" > "$out/$name.$label.txt" 2>&1
    printf '%-40s %-36s %s\n' "$name" "$label" "$(grep '^RESULT' "$out/$name.$label.txt" | cut -c9-40)"
  done
done
