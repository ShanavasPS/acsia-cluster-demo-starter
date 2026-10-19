#!/bin/bash
# Wraps CSV files as scripts, so the page can read them when opened from disk (file://),
# where the browser blocks fetch(). Each file.csv becomes file.csv.js, which stores the text
# in window.FILES["<path>"]. Run it again after changing a CSV.
#   tools/bundle-csv.sh                  all CSVs under docs/ and sim/
#   tools/bundle-csv.sh sim/drive-cycle.csv
set -euo pipefail
cd "$(dirname "$0")/.."
FILES=("$@"); [ ${#FILES[@]} -eq 0 ] && FILES=(docs/*.csv sim/*.csv)
for f in "${FILES[@]}"; do
  # The text goes into a template literal, so it must not contain a backtick, a backslash or "${".
  if grep -qE '`|\\|\$\{' "$f"; then echo "$f contains a backtick, backslash or \${; not bundled." >&2; exit 1; fi
  # The key is the path from the repo root, as the docs name it, whatever form the argument took.
  key=$(cd "$(dirname "$f")" && pwd -P)/$(basename "$f"); key=${key#"$PWD/"}
  case "$key" in docs/*.csv|sim/*.csv) ;; *) echo "$f is not a CSV under docs/ or sim/; not bundled." >&2; exit 1 ;; esac
  { printf '// Generated from %s by tools/bundle-csv.sh. Do not edit; change the CSV and run the tool again.\n' "$key"
    printf '(window.FILES = window.FILES || {})["%s"] = `' "$key"
    cat "$f"
    printf '`;\n'; } > "$f.js"
  echo "Bundled $f -> $f.js"
done
