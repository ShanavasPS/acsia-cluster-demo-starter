# Finds Chrome or Chromium for the headless test scripts. Sourced, not run.
# CHROME=/path/to/the/binary overrides the search. CHROME_FLAGS adds flags (for example
# --no-sandbox when running as root in a container).
find_chrome() {
  local c
  if [ -n "${CHROME:-}" ]; then
    if [ -f "$CHROME" ] && [ -x "$CHROME" ]; then echo "$CHROME"; return 0; fi
    echo "CHROME=$CHROME is not an executable file (on macOS, point it at Contents/MacOS/Google Chrome inside the .app)." >&2
    return 1
  fi
  for c in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
           "${HOME:-/nonexistent}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
           "/Applications/Chromium.app/Contents/MacOS/Chromium" \
           /opt/google/chrome/chrome google-chrome google-chrome-stable chromium chromium-browser; do
    if [ -f "$c" ] && [ -x "$c" ]; then echo "$c"; return 0; fi
    if command -v "$c" >/dev/null 2>&1; then command -v "$c"; return 0; fi
  done
  echo "Chrome or Chromium not found. Install one, or set CHROME=/path/to/chrome." >&2
  return 1
}

# A file:// URL for a path under the project, with the characters a URL would misread encoded.
file_url() {
  local p=$1
  p=${p//%/%25}; p=${p//#/%23}; p=${p//\?/%3F}; p=${p// /%20}
  echo "file://$p"
}
