# Shared settings for the web-cluster skill scripts. Sourced, not run.
# bash names this file in BASH_SOURCE; zsh leaves that empty and uses %x instead.
if [ -n "${BASH_SOURCE[0]:-}" ]; then _common=${BASH_SOURCE[0]}; else eval '_common=${(%):-%x}'; fi
SKILL_DIR=$(cd "$(dirname "$_common")/.." && pwd)
WEB_REPO=${WEB_REPO:-$(cd "$SKILL_DIR/../../.." && pwd)}    # web/ in the starter repo: the cluster app
PAGE=$WEB_REPO/index.html
[ -f "$PAGE" ] || { echo "No $PAGE. Set WEB_REPO=/path/to/the/web/folder." >&2; exit 1; }

# Opens a file:// URL in the default browser. Handing the system a file URL drops its query
# (macOS open and osascript both do), so a URL with one goes through a small launcher page
# that redirects to it.
open_url() {
  local target=$1
  if [ "${1#*\?}" != "$1" ]; then
    local dir=${TMPDIR:-/tmp}/web-cluster; mkdir -p "$dir"
    target=$dir/open.html
    printf '<!doctype html><meta charset="utf-8"><script>location.replace(%s)</script>\n' "\"$1\"" > "$target"
  fi
  case "$(uname -s)" in
    Darwin) open "$target" ;;
    *) command -v xdg-open >/dev/null || { echo "xdg-open not found: open $1 in a browser." >&2; return 1; }
       xdg-open "$target" >/dev/null 2>&1 ;;
  esac
}

# A Chrome or Chromium binary for headless screenshots, if the machine has one.
find_chrome() {
  local c
  for c in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
           "/Applications/Chromium.app/Contents/MacOS/Chromium" \
           google-chrome google-chrome-stable chromium chromium-browser; do
    if [ -x "$c" ] || command -v "$c" >/dev/null 2>&1; then echo "$c"; return 0; fi
  done
  return 1
}
