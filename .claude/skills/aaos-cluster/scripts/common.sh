# Shared settings for the aaos-cluster skill scripts. Sourced, not run.
# bash names this file in BASH_SOURCE; zsh leaves that empty and uses %x instead.
if [ -n "${BASH_SOURCE[0]:-}" ]; then _common=${BASH_SOURCE[0]}; else eval '_common=${(%):-%x}'; fi
SKILL_DIR=$(cd "$(dirname "$_common")/.." && pwd)
TOOLS=$(cd "$SKILL_DIR/../../../tools" && pwd)               # cluster-demo.sh, install-showcase.sh, showcase-app
source "$TOOLS/env.sh"
AVD=${AVD:-AAOS_API35}
PORT=${ANDROID_SERIAL#emulator-}
DEMO_REPO=${DEMO_REPO:-$(cd "$SKILL_DIR/../../.." && pwd)}    # this repo: the cluster app
PKG=com.acsia.cluster
LOG_DIR=${TMPDIR:-/tmp}/aaos-cluster; mkdir -p "$LOG_DIR"

running() { pgrep -f "avd $AVD" >/dev/null; }
writable() { ps -ww -eo args | grep "avd $AVD" | grep -v grep | grep -q writable-system; }

booted() { [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; }
wait_boot() { local i; for i in $(seq 1 120); do booted && return 0; sleep 3; done; echo "Timed out waiting for boot." >&2; return 1; }
driver_user() { adb shell am get-current-user | tr -d '\r'; }
cluster_display() { adb shell dumpsys car_service --services ClusterHomeService | grep mClusterDisplayId | grep -oE '[0-9]+'; }
cluster_screen_id() { adb shell dumpsys SurfaceFlinger --display-id | grep EMU_display_1 | grep -oE 'Display [0-9]+' | grep -oE '[0-9]+'; }
main_screen_id() { adb shell dumpsys SurfaceFlinger --display-id | grep EMU_display_0 | grep -oE 'Display [0-9]+' | grep -oE '[0-9]+'; }
cluster_top() {  # the activity shown in the cluster window
  adb shell dumpsys activity activities | grep -A8 "Display #$(cluster_display)" \
    | grep -oE "topResumedActivity=ActivityRecord\{[^ ]+ [^ ]+ [^ ]+" | awk '{print $3}'
}
rpm_live() { adb shell dumpsys package "$PKG" 2>/dev/null | grep -q "CAR_ENGINE_DETAILED: granted=true"; }
showcase_embedded() { adb shell dumpsys activity activities | grep -q "com.acsia.showcase.*mode=multi-window"; }
# Installs the showcase only if the launcher has not embedded it: reinstalling restarts the launcher,
# and the map panel shows red meanwhile. After a boot the launcher embeds it within seconds, so
# ensure_showcase 20 waits up to 20 s first. Run install-showcase.sh by hand for a changed showcase.
ensure_showcase() {
  local waited=0
  while :; do
    if showcase_embedded && sleep 2 && showcase_embedded; then
      echo "Showcase already in the map panel; leaving the launcher alone."; return 0
    fi
    [ "$waited" -ge "${1:-0}" ] && break
    sleep 2; waited=$((waited + 2))
  done
  "$TOOLS/install-showcase.sh"
}
