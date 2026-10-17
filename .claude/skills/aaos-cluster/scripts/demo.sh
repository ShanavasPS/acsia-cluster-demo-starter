#!/bin/bash
# Shows the cluster demo: installs the cluster app, puts it in the cluster window, fills the
# centre screen with the showcase and starts the drive loop in the background.
#   demo.sh             builds and installs this repo as it is now
#   demo.sh <git ref>   builds that commit, branch or tag in a temporary worktree instead
# The app reads the car's speed once it has a live vehicle data source (step 9); before that it
# replays sim/drive-cycle.csv.
set -uo pipefail
source "$(dirname "$0")/common.sh"
booted || { echo "Emulator not running. Run start.sh first."; exit 1; }

if [ $# -eq 0 ]; then
  REF="this repo"
  ensure_local_properties "$DEMO_REPO"
  echo "Building and installing the current checkout…"
  (cd "$DEMO_REPO" && ./gradlew -q installDebug) || { echo "Build or install failed."; exit 1; }
else
  # Build from a temporary worktree, so the checkout you are working in is left alone.
  REF=$1
  WT=$LOG_DIR/build-$(echo "$REF" | tr '/' '-')
  git -C "$DEMO_REPO" worktree remove --force "$WT" >/dev/null 2>&1 || true
  git -C "$DEMO_REPO" worktree add --detach "$WT" "$REF" >/dev/null || { echo "Unknown ref $REF in $DEMO_REPO"; exit 1; }
  cp "$DEMO_REPO/local.properties" "$WT/" 2>/dev/null; ensure_local_properties "$WT"
  echo "Building and installing ${REF}…"
  (cd "$WT" && ./gradlew -q installDebug) || { echo "Build or install failed."; exit 1; }
  git -C "$DEMO_REPO" worktree remove --force "$WT" >/dev/null 2>&1
fi

# The showcase needs the car parked while the launcher restarts; the drive loop starts after it.
"$TOOLS/cluster-demo.sh" stop >/dev/null 2>&1 || true
ensure_showcase || echo "Showcase not embedded; run install-showcase.sh again from the home screen."

nohup "$TOOLS/cluster-demo.sh" > "$LOG_DIR/drive-loop.log" 2>&1 &
for i in $(seq 1 60); do grep -q "Driving in a loop" "$LOG_DIR/drive-loop.log" && break; sleep 1; done
grep -q "Driving in a loop" "$LOG_DIR/drive-loop.log" || { echo "Drive loop did not start:"; cat "$LOG_DIR/drive-loop.log"; exit 1; }
echo "Demo running: $REF in the cluster window, showcase on the centre screen, car driving in a loop."
echo "Stop the car with: $TOOLS/cluster-demo.sh stop    Clean up with: reset.sh"
