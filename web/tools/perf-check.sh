#!/bin/bash
# F-13: measures the cluster in headless Chrome, in real time: frame rate over 10 s of the drive,
# the longest task, and the time from page open to the first live frame. Takes about 15 s.
# The page (tests/perf.html) puts its result in its title; Chrome's debugging port lists page
# titles over plain HTTP, so curl reads it. Needs Chrome or Chromium and curl.
set -uo pipefail
cd "$(dirname "$0")/.."
source tools/chrome.sh
CHROME_BIN=$(find_chrome) || exit 2
command -v curl >/dev/null || { echo "curl not found; the perf check reads Chrome's debugging port with it." >&2; exit 2; }
PROFILE=$(mktemp -d)
# Port 0 lets Chrome pick a free port; it writes the port to DevToolsActivePort in the profile.
# shellcheck disable=SC2086
"$CHROME_BIN" --headless=new --no-first-run --user-data-dir="$PROFILE" --allow-file-access-from-files \
  --remote-debugging-port=0 ${CHROME_FLAGS:-} "$(file_url "$PWD/tests/perf.html")" > /dev/null 2> "$PROFILE/stderr" &
PID=$!
trap 'kill $PID 2>/dev/null; wait $PID 2>/dev/null; rm -rf "$PROFILE"' EXIT

PORT=""
for _ in $(seq 1 20); do
  sleep 0.5
  [ -s "$PROFILE/DevToolsActivePort" ] && { PORT=$(head -1 "$PROFILE/DevToolsActivePort"); break; }
  kill -0 $PID 2>/dev/null || break
done
[ -n "$PORT" ] || { echo "Chrome did not start (no debugging port after 10 s). It said:"; tail -20 "$PROFILE/stderr"; exit 2; }

TITLE=""
for _ in $(seq 1 40); do
  sleep 0.5
  TITLE=$(curl -s "http://127.0.0.1:$PORT/json/list" | grep -o '"title": *"PERF [^"]*"' | sed 's/.*"PERF /PERF /; s/"$//' \
    | sed -e 's/&quot;/"/g' -e 's/&lt;/</g' -e 's/&gt;/>/g' -e "s/&#39;/'/g" -e 's/&amp;/\&/g')
  case "$TITLE" in "PERF running"|"") ;; *) break ;; esac
done

case "$TITLE" in
  "PERF fps="*) ;;
  "PERF error="*) echo "FAIL TC-13-01 TC-13-02 TC-13-03: ${TITLE#PERF error=}"; exit 1 ;;
  "PERF running") echo "FAIL: tests/perf.html gave no result within 20 s"; exit 1 ;;
  *) echo "FAIL: could not read the page title from Chrome on port $PORT"; exit 2 ;;
esac

field() { echo "$TITLE" | sed -n "s/.*$1=\([0-9.]*\).*/\1/p"; }
FPS=$(field fps); LONGEST=$(field longest); FIRST=$(field firstLive); MOUNTED=$(field mounted)
STATUS=0
check() {  # id, ok (1 or 0), message
  if [ "$2" = 1 ]; then echo "PASS $1 $3"; else echo "FAIL $1 $3"; STATUS=1; fi
}
check TC-13-01 "$(awk -v v="$FPS" 'BEGIN{print (v >= 55) ? 1 : 0}')" "frame rate ${FPS} fps (at least 55)"
check TC-13-02 "$([ "${LONGEST:-999}" -le 50 ] && echo 1 || echo 0)" "longest task ${LONGEST} ms (at most 50)"
check TC-13-03 "$([ "${FIRST:-9999}" -le 2000 ] && echo 1 || echo 0)" "first live frame at ${FIRST} ms from page open (at most 2000; the page took ${MOUNTED} ms to load)"
exit $STATUS
