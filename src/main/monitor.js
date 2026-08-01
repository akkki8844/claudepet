const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { EventEmitter } = require("node:events");
const { spawn } = require("node:child_process");
const { PetState } = require("./state-machine");

class BaseMonitor extends EventEmitter {
  start() {}
  stop() {}
}

function inferStateFromText(text) {
  const value = (text || "").toLowerCase();
  if (!value.trim()) {
    return null;
  }
  if (
    value.includes("working") ||
    value.includes("thinking") ||
    value.includes("processing") ||
    value.includes("running")
  ) {
    return PetState.WORKING;
  }
  if (
    value.includes("done") ||
    value.includes("finished") ||
    value.includes("complete") ||
    value.includes("completed") ||
    value.includes("success")
  ) {
    return PetState.DONE;
  }
  if (value.includes("idle") || value.includes("waiting")) {
    return PetState.IDLE;
  }
  return null;
}

class LogFileMonitor extends BaseMonitor {
  constructor(filePath, { pollMs = 1000 } = {}) {
    super();
    this.filePath = filePath;
    this.pollMs = pollMs;
    this.position = 0;
    this.timer = null;
  }

  async checkOnce() {
    try {
      const stat = await fs.promises.stat(this.filePath);
      if (stat.size < this.position) {
        this.position = 0;
      }
      if (stat.size === this.position) {
        return;
      }
      const stream = fs.createReadStream(this.filePath, {
        encoding: "utf8",
        start: this.position,
        end: stat.size - 1
      });
      let text = "";
      stream.on("data", (chunk) => {
        text += chunk;
      });
      stream.on("end", () => {
        this.position = stat.size;
        text.split(/\r?\n/).forEach((line) => this.handleLine(line));
      });
      stream.on("error", (err) => {
        this.emit("error", err);
      });
    } catch (error) {
      this.emit("unavailable", `log-not-found:${this.filePath}`);
    }
  }

  handleLine(line) {
    const state = inferStateFromText(line);
    if (state) {
      this.emit("activity", { state, source: "log", detail: line });
    }
  }

  start() {
    if (!this.filePath) {
      this.emit("unavailable", "log-path-empty");
      return;
    }
    this.checkOnce();
    this.timer = setInterval(() => this.checkOnce(), this.pollMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

class ProcessMonitor extends BaseMonitor {
  constructor(command, args = []) {
    super();
    this.command = command;
    this.args = args;
    this.child = null;
  }

  start() {
    if (!this.command) {
      this.emit("unavailable", "process-command-empty");
      return;
    }
    try {
      this.child = spawn(this.command, this.args, { shell: true });
    } catch (error) {
      this.emit("error", error);
      this.emit("unavailable", `process-spawn-failed:${this.command}`);
      return;
    }

    this.child.stdout?.on("data", (chunk) => this.consumeText(chunk.toString()));
    this.child.stderr?.on("data", (chunk) => this.consumeText(chunk.toString()));

    this.child.on("error", (error) => {
      this.emit("error", error);
      this.emit("unavailable", `process-error:${this.command}`);
    });
    this.child.on("close", () => {
      this.emit("activity", {
        state: PetState.DONE,
        source: "process",
        detail: "process closed"
      });
    });
  }

  consumeText(text) {
    text.split(/\r?\n/).forEach((line) => {
      const state = inferStateFromText(line);
      if (state) {
        this.emit("activity", { state, source: "process", detail: line });
      }
    });
  }

  stop() {
    if (this.child && !this.child.killed) {
      this.child.kill();
    }
  }
}

class WebhookMonitor extends BaseMonitor {
  constructor(port = 39123) {
    super();
    this.port = port;
    this.server = null;
  }

  start() {
    this.server = http.createServer((req, res) => {
      if (req.method !== "POST" || req.url !== "/status") {
        res.writeHead(404);
        res.end("Not Found");
        return;
      }
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });
      req.on("end", () => {
        try {
          const payload = JSON.parse(body || "{}");
          const forcedState = payload.state ? String(payload.state).toUpperCase() : null;
          const inferred = inferStateFromText(payload.message || "");
          const state = PetState[forcedState] || inferred;
          if (state) {
            this.emit("activity", { state, source: "webhook", detail: payload.message || "" });
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, state: state || null }));
        } catch (error) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: "invalid-json" }));
        }
      });
    });

    this.server.on("error", (error) => {
      this.emit("error", error);
      this.emit("unavailable", `webhook-error:${error.message}`);
    });

    this.server.listen(this.port, "127.0.0.1");
  }

  stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}

function createMonitor() {
  const mode = (process.env.CLAUDEPET_MONITOR_MODE || "log").toLowerCase();

  if (mode === "process") {
    const commandRaw = process.env.CLAUDE_PROCESS_COMMAND || "";
    const [command, ...args] = commandRaw.split(" ").filter(Boolean);
    return new ProcessMonitor(command, args);
  }

  if (mode === "webhook") {
    const port = Number(process.env.CLAUDEPET_WEBHOOK_PORT || 39123);
    return new WebhookMonitor(Number.isFinite(port) ? port : 39123);
  }

  const defaultLogPath = path.join(process.env.HOME || process.cwd(), ".claude", "claude.log");
  const logPath = process.env.CLAUDE_LOG_PATH || defaultLogPath;
  return new LogFileMonitor(logPath);
}

module.exports = {
  createMonitor,
  PetState,
  inferStateFromText
};
