# ClaudePet

Cross-platform virtual desktop pet that visualizes Claude activity (idle, working, done).  
No AI API calls are made by this app.

The app now renders a smaller Claude critter and performs varied idle motions (bob/hop/look/wiggle/stretch/squish/float) modeled after the reference pet behavior, with Windows-friendly defaults.

## Chosen Tech Stack

- **Electron + Node.js**
- Single codebase for **Windows / macOS / Linux**
- Native desktop features used in cross-platform-safe ways:
  - Transparent frameless window
  - Always-on-top desktop pet
  - Drag support
  - System tray menu

## Project Structure

```text
/home/runner/work/claudepet/claudepet
├── assets/
│   └── tray.png
├── src/
│   ├── main/
│   │   ├── main.js
│   │   ├── monitor.js
│   │   └── state-machine.js
│   ├── preload/
│   │   └── preload.js
│   └── renderer/
│       ├── index.html
│       ├── renderer.js
│       └── styles.css
├── package.json
└── README.md
```

## Install & Run

```bash
cd claudepet
npm install
npm start
```

When the app starts, the Claude critter appears immediately.

## Shortcut

- `Ctrl+Y` (Windows/Linux) or `Cmd+Y` (macOS): Toggle show/hide ClaudePet

## Monitoring Modes

Set `CLAUDEPET_MONITOR_MODE` to choose activity source.

### 1) Log Tail Mode (default)

Reads appended lines and infers state from keywords.

```bash
CLAUDEPET_MONITOR_MODE=log CLAUDE_LOG_PATH=/absolute/path/to/claude.log npm start
```

If `CLAUDE_LOG_PATH` is omitted, fallback:

```text
$HOME/.claude/claude.log
```

### 2) Spawned CLI Process Mode

Spawns a command and infers state from stdout/stderr.

```bash
CLAUDEPET_MONITOR_MODE=process CLAUDE_PROCESS_COMMAND="claude --verbose" npm start
```

### 3) Local Webhook Mode

Starts local HTTP listener (`POST /status`) and accepts explicit or inferred states.

```bash
CLAUDEPET_MONITOR_MODE=webhook CLAUDEPET_WEBHOOK_PORT=39123 npm start
```

Example payloads:

```bash
curl -X POST http://127.0.0.1:39123/status \
  -H "Content-Type: application/json" \
  -d '{"state":"WORKING","message":"Claude is thinking"}'
```

```bash
curl -X POST http://127.0.0.1:39123/status \
  -H "Content-Type: application/json" \
  -d '{"message":"Task finished"}'
```

## State Machine

- `IDLE`
- `WORKING`
- `DONE`

`DONE` automatically falls back to `IDLE` after a short timeout.

## Fault Tolerance

- Missing log file / missing process / webhook bind errors are handled without crashing.
- Monitor failures gracefully force pet state back to `IDLE`.

## Packaging (Executables)

```bash
npm run dist
```

Outputs platform packages in `dist/`:

- **Windows:** NSIS installer + ZIP
- **macOS:** DMG + ZIP
- **Linux:** AppImage + DEB + tar.gz

You can also produce unpacked output for quick inspection:

```bash
npm run pack
```
