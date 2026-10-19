# Web instrument cluster MVP

An instrument cluster for a car, in the browser. It runs in a 528 × 692 portrait cluster window and shows speed in mph, a rev counter, gear, fuel, outside temperature and five warning lights, in a dark navy theme.

This is the web version of the Android starter in the folder above, with the same requirements. It needs nothing installed: no SDK, emulator, server or packages. Just a browser.

## Requirements

- `docs/hmi-spec.md`: layout, behaviour, visual style and performance targets.
- `docs/signals.csv`: every vehicle signal with its unit, range, rate and timeout.
- `design/cluster.png`: the visual reference.
- `sim/drive-cycle.csv`: a recorded 50-second drive to replay while there is no vehicle data.
- `prompts/`: the prompts for the demo steps, starting with `p1.txt`.

`AGENTS.md` has the commands, how the page is put together and the rules for working in this repo.

## Run it

```sh
open index.html
```

On Linux, `xdg-open index.html`. Or double-click `index.html`.

The page shows the cluster window with the car's controls below it. The car drives in a loop (park, pull away, 80 mph, slow to 40 mph, stop), and the line next to the buttons shows what it reports. Add `?car=parked` to start parked, or `?car=off` for no car at all.

## Running the demo with Claude Code

Start Claude Code in this folder, not the repo root, so it reads this folder's `AGENTS.md` and finds the `/web-cluster` skill:

```sh
cd web
claude
```

Then open the cluster:

```
/web-cluster start
```

Give Claude Code `prompts/p1.txt` to begin. After each change, reload the browser tab. `/web-cluster start parked` and `/web-cluster start off` open the other car modes; the scripts are in `.claude/skills/web-cluster/scripts/` and also run on their own.
