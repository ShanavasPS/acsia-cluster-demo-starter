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
  { printf '// Generated from %s by tools/bundle-csv.sh. Do not edit; change the CSV and run the tool again.\n' "$f"
    printf '(window.FILES = window.FILES || {})["%s"] = `' "$f"
    cat "$f"
    printf '`;\n'; } > "$f.js"
  echo "Bundled $f -> $f.js"
done
