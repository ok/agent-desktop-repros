# agent-desktop repros

Minimal, self-contained reproductions for three [agent-desktop](https://github.com/lahfir/agent-desktop)
problems, each runnable against any build so the same script shows the bug on the current release
and its absence on the proposed fix.

| # | Problem | Script |
|---|---|---|
| 1 | While Finder's desktop has focus, every command that builds the global window inventory times out (`list-windows`, `snapshot --window-id`, `screenshot --window-id`) | `repro/1-finder-desktop.mjs` |
| 2 | `press` selects its target by application name only, so with two running instances of one app it cannot be aimed at either | `repro/2-multi-instance-press.mjs` |
| 3 | 0.9 cannot snapshot a stock Electron app: Electron reads `AXManualAccessibility` back as false even while its accessibility tree is live | `repro/3-electron-activation.mjs` |

Each script prints the exact commands, their envelopes and timings, and ends with
`RESULT: BUG REPRODUCED` (exit 1) or `RESULT: NOT REPRODUCED` (exit 0).

## Setup

macOS with Accessibility permission for your terminal (Screen Recording too, for the screenshot in
repro 1), Node 22+.

```bash
cd fixture
npm install
node node_modules/electron/install.js   # npm 11 skips Electron's download script by default
cd ..
```

The fixture (`fixture/main.cjs`) is a stock Electron window with a heading, a button, a key
listener and one menu accelerator (⌘K). It enables accessibility only when `FIXTURE_A11Y` asks:
`none` (what shipped Electron apps do), `switch` (`--force-renderer-accessibility`) or `api`
(`app.setAccessibilitySupportEnabled(true)`).

## Run

```bash
AD=/path/to/agent-desktop node repro/1-finder-desktop.mjs
AD=/path/to/agent-desktop node repro/2-multi-instance-press.mjs
AD=/path/to/agent-desktop node repro/3-electron-activation.mjs
```

`AD` defaults to `agent-desktop` on `PATH`. `./run-evidence.sh` runs all three against the
`agent-desktop` on `PATH` (label `installed`) and every build under `bin/<label>/`, writing `results/<repro>.<label>.txt`.

Repro 1 activates Finder and focuses its desktop through the accessibility API (no clicks), then
restores the previously frontmost app. Repro 2 and 3 launch fixture windows and close them.

## Results

macOS 15.7.9 (arm64), Electron 44.4.5. Full output in `results/`.

| Build | 1 Finder desktop | 2 press, two instances | 3 stock Electron |
|---|---|---|---|
| 0.9.2 release | reproduced | reproduced | works |
| 0.9.4 release (npm) | reproduced | reproduced | reproduced |
| `main` @ dcfeb737 | reproduced | reproduced | reproduced |
| `main` @ b8d538c0 | reproduced | reproduced | works (fixed upstream in #234) |
| `fix/finder-desktop-focus` (on b8d538c0) | **fixed** | reproduced | works |
| `feat/press-window-id` (on b8d538c0) | reproduced | **fixed** | works |

Problem 3 was a regression in 0.9.4 (0.9.2 and 0.8.1 snapshot all three modes); upstream fixed it
in #234 (b8d538c0). Each remaining fix changes only its own column.

Repro 2 uses `--headed`: since #234 a menu shortcut is performed only for a headed `press`, which
first focuses the target's exact window — the focus `--window-id` has to put on the right instance.
