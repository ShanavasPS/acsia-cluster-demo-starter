#!/bin/bash
# Runs tests/index.html in headless Chrome and prints every result.
# Exits 0 only when at least one test ran and all passed. Needs Chrome or Chromium, nothing else.
#   tools/run-tests.sh            all results
#   tools/run-tests.sh TC-08      only the tests whose name mentions TC-08, plus the summary
# TEST_TIMEOUT (seconds, default 120) stops a run that hangs.
set -uo pipefail
cd "$(dirname "$0")/.."
source tools/chrome.sh
CHROME_BIN=$(find_chrome) || exit 2
PROFILE=$(mktemp -d)   # a throwaway profile, so an open Chrome is not involved
CHROME_PID=""; WATCHDOG=""
cleanup() {   # also on Ctrl-C: stop Chrome and wait for it before removing its profile; stop the watchdog and its sleep
  [ -n "$CHROME_PID" ] && { kill "$CHROME_PID" 2>/dev/null; wait "$CHROME_PID" 2>/dev/null; }
  [ -n "$WATCHDOG" ] && { pkill -P "$WATCHDOG" 2>/dev/null; kill "$WATCHDOG" 2>/dev/null; }
  rm -rf "$PROFILE"
}
trap cleanup EXIT
trap 'exit 130' INT TERM

# Tests use a fake clock, so virtual time is fine; file access lets them read the app's files.
# shellcheck disable=SC2086
"$CHROME_BIN" --headless=new --disable-gpu --no-first-run --user-data-dir="$PROFILE" \
  --allow-file-access-from-files --virtual-time-budget=120000 ${CHROME_FLAGS:-} \
  --dump-dom "$(file_url "$PWD/tests/index.html")" > "$PROFILE/dom" 2> "$PROFILE/stderr" &
CHROME_PID=$!
# The watchdog must not hold our stdout (a pipe would wait for its sleep), and its sleep is killed with it.
( sleep "${TEST_TIMEOUT:-120}" & wait $!; touch "$PROFILE/timeout"; kill "$CHROME_PID" 2>/dev/null ) >/dev/null 2>&1 & WATCHDOG=$!
wait "$CHROME_PID" 2>/dev/null; CHROME_STATUS=$?
CHROME_PID=""
pkill -P "$WATCHDOG" 2>/dev/null; kill "$WATCHDOG" 2>/dev/null; wait "$WATCHDOG" 2>/dev/null
WATCHDOG=""

RESULTS=$(awk '/<pre id="results">/{f=1} f{print} /<\/pre>/{if(f)exit}' "$PROFILE/dom" \
  | sed -e 's/.*<pre id="results">//' -e 's#</pre>.*##' \
        -e 's/&lt;/</g' -e 's/&gt;/>/g' -e 's/&quot;/"/g' -e "s/&#39;/'/g" -e 's/&amp;/\&/g')

if ! printf '%s\n' "$RESULTS" | grep -q '^RESULT: '; then
  if [ -e "$PROFILE/timeout" ]; then
    echo "Stopped by TEST_TIMEOUT=${TEST_TIMEOUT:-120} s. What the page showed:"; printf '%s\n' "$RESULTS"
  elif [ ! -s "$PROFILE/dom" ]; then
    echo "Chrome printed no page (exit $CHROME_STATUS). It said:"; tail -20 "$PROFILE/stderr"
  else
    echo "The tests did not finish within ${TEST_TIMEOUT:-120} s. What the page showed:"; printf '%s\n' "$RESULTS"
  fi
  exit 2
fi

if [ $# -gt 0 ]; then
  printf '%s\n' "$RESULTS" | awk -v p="$1" '/^(PASS|FAIL) /{show = index($0, p) > 0} show && !/^RESULT: /'
  printf '%s\n' "$RESULTS" | grep '^RESULT: '
else
  printf '%s\n' "$RESULTS"
fi
printf '%s\n' "$RESULTS" | grep -q '^RESULT: [1-9][0-9]* passed, 0 failed$'
