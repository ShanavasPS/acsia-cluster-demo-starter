# Shared environment for the demo tools: finds the Android SDK on macOS or Linux and puts its tools on PATH.
# Sourced by the scripts in this repo, not run on its own.
export ANDROID_SERIAL=${ANDROID_SERIAL:-emulator-5556}     # the AAOS emulator; never touch any other device
# Android SDK: $ANDROID_HOME or $ANDROID_SDK_ROOT if set, else the default place on macOS or Linux.
SDK=${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}
if [ -z "$SDK" ]; then
  for d in "$HOME/Library/Android/sdk" "$HOME/Android/Sdk"; do [ -d "$d" ] && { SDK=$d; break; }; done
fi
[ -d "${SDK:-}" ] || { echo "Android SDK not found. Install it (Android Studio does) or set ANDROID_HOME." >&2; exit 1; }
# System image for this CPU: arm64 on Apple Silicon and ARM Linux, x86_64 on Intel and AMD.
case "$(uname -m)" in arm64|aarch64) ABI=arm64-v8a ;; *) ABI=x86_64 ;; esac
export PATH="$SDK/platform-tools:$SDK/emulator:$SDK/cmdline-tools/latest/bin:$PATH"

# Gradle needs local.properties (not in git, as it holds a local path) to find the SDK.
ensure_local_properties() { [ -f "$1/local.properties" ] || echo "sdk.dir=$SDK" > "$1/local.properties"; }
