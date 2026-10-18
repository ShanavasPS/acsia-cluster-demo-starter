# Android instrument cluster MVP

An instrument cluster for an Android Automotive OS (AAOS) car, built step by step with Claude Code in the "Agentic coding in practice" demo. It runs in the car's instrument cluster window, a 528 × 692 portrait screen, and shows speed in mph, a rev counter, gear, fuel, outside temperature and five warning lights, in a dark navy theme.

This is the starting point: the requirements, the design and the tools, with no app code yet. Works on macOS and Linux.

## What is here

- `docs/hmi-spec.md`: layout, behaviour, visual style and performance targets.
- `docs/signals.csv`: every vehicle signal with its unit, range, rate and timeout.
- `design/cluster.png`: the visual reference.
- `sim/drive-cycle.csv`: a recorded 50-second drive to replay while there is no vehicle data.
- `AGENTS.md` (read through `CLAUDE.md`): the commands, the device to use and the rules for working in this repo.
- `prompts/`: the prompts for the demo steps, starting with `p1.txt`. Later prompts are added during the demo.
- `.claude/skills/aaos-cluster/`: a Claude Code skill for the AAOS emulator: start it, show the cluster, reset it, check its state. The scripts in it also work on their own.
- `tools/`: `cluster-demo.sh` drives the car in a loop, `install-showcase.sh` puts the showcase app (`tools/showcase-app`) on the centre screen, and `env.sh` finds the Android SDK.

## Setup (macOS or Linux)

1. **Clone this repo.** You need access to it on GitHub first; ask for an invitation, then accept it from the email or https://github.com/notifications. Then clone it:
   ```sh
   git clone https://github.com/ShanavasPS/acsia-cluster-demo-starter.git
   ```
   Git asks for your GitHub username and a personal access token, not your password; `gh auth login` with the GitHub CLI sets this up for you. Then go into the folder:
   ```sh
   cd acsia-cluster-demo-starter
   ```
   To get prompts added later in the demo, run `git pull` in this folder.
2. **Install Claude Code** (macOS 13+, Ubuntu 20.04+, Debian 10+, or WSL). The native installer is recommended and updates itself:
   ```sh
   curl -fsSL https://claude.ai/install.sh | bash
   ```
   Or, on macOS, with Homebrew (update it later with `brew upgrade claude-code`):
   ```sh
   brew install --cask claude-code
   ```
   Open a new terminal and check it with `claude --version`. Then run `claude` and log in through the browser. It needs a Claude Pro, Max, Team or Enterprise plan, or a Console account. Full instructions: https://code.claude.com/docs/en/setup
3. **Install the Android SDK** (Android Studio does it) with the command-line tools, and **JDK 17** for Gradle. The scripts find the SDK in `$ANDROID_HOME`, `$ANDROID_SDK_ROOT`, `~/Library/Android/sdk` (macOS) or `~/Android/Sdk` (Linux).
4. **Linux only:** the emulator needs KVM. Enable virtualisation in the BIOS, then `sudo usermod -aG kvm $USER` and log out and in. `ls -l /dev/kvm` should show you can write to it.
5. **Start the emulator.** Run `claude` in this repo and ask it to "bring up the AAOS emulator", or run the script yourself:
   ```sh
   .claude/skills/aaos-cluster/scripts/start.sh   # first run downloads the system image and creates the AVD
   ```
   The system image matches your CPU: arm64 on Apple Silicon and ARM Linux, x86_64 on Intel and AMD. The emulator runs as `emulator-5556`; if something else uses that port, set `ANDROID_SERIAL=emulator-<another even port>`.

## Running the demo

Start Claude Code in this repo and give it `prompts/p1.txt`. Each prompt takes the project one step further: plan, technical plan, test cases, tests, code, a run on the emulator, an end-to-end test, a review and live vehicle data.

Once there is app code, show it in the cluster window with the car driving:

```sh
.claude/skills/aaos-cluster/scripts/demo.sh     # builds this repo as it is now
.claude/skills/aaos-cluster/scripts/reset.sh    # parks the car and removes the app again
```

## Build and test

```sh
./gradlew assembleDebug        # build
./gradlew testDebugUnitTest    # unit and UI tests (JVM)
./gradlew installDebug         # install on the AAOS emulator, emulator-5556
```
