#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

const APP_URL = process.env.WEBMCP_TEST_URL ?? "http://localhost:3000";
const SCREENSHOT_PATH = process.env.WEBMCP_SCREENSHOT_PATH;
const EXPECTED_TOOLS = [
  "get_collaboration_status",
  "get_workspace_state",
  "list_travelers_and_constraints",
  "search_hotel_inventory",
  "compare_scenarios",
  "explain_conflicts",
  "open_workspace_setup",
  "open_invite_traveler",
  "open_workspace_settings",
  "set_constraint_priority",
  "lock_constraint",
  "veto_hotel",
  "create_scenarios",
  "select_scenario",
  "prepare_booking_draft",
];

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function reservePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  await new Promise((resolve) => server.close(resolve));
  if (!port) throw new Error("Could not reserve a Chrome debugging port");
  return port;
}

function findChrome() {
  const candidates = process.platform === "win32"
    ? [
        process.env.CHROME_PATH,
        join(process.env.ProgramFiles ?? "C:\\Program Files", "Google", "Chrome", "Application", "chrome.exe"),
        join(process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)", "Google", "Chrome", "Application", "chrome.exe"),
        join(process.env.LOCALAPPDATA ?? "", "Google", "Chrome", "Application", "chrome.exe"),
      ]
    : [
        process.env.CHROME_PATH,
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/chromium",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      ];

  const executable = candidates.find((candidate) => candidate && existsSync(candidate));
  if (!executable) throw new Error("Chrome was not found. Set CHROME_PATH to its executable.");
  return executable;
}

async function waitFor(operation, label, timeout = 30_000) {
  const startedAt = Date.now();
  let lastError;
  while (Date.now() - startedAt < timeout) {
    try {
      const result = await operation();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await sleep(200);
  }
  throw new Error(`Timed out waiting for ${label}${lastError ? `: ${lastError.message}` : ""}`);
}

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.sequence = 0;
    this.pending = new Map();
    socket.addEventListener("message", (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      const pending = this.pending.get(message.id);
      if (!pending) return;
      clearTimeout(pending.timer);
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(`${message.error.code}: ${message.error.message}`));
      else pending.resolve(message.result);
    });
  }

  send(method, params = {}, timeout = 30_000) {
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP ${method} timed out`));
      }, timeout);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error("CDP connection closed"));
    }
    this.pending.clear();
    this.socket.close();
  }
}

async function evaluate(client, expression, timeout = 60_000) {
  const response = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  }, timeout);
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
  }
  return response.result?.value;
}

let activeChrome;
let activeProfile;

async function cleanupBestEffort() {
  if (activeChrome) {
    if (process.platform === "win32" && activeChrome.pid) {
      const killer = spawn("taskkill.exe", ["/pid", String(activeChrome.pid), "/t", "/f"], {
        shell: false,
        windowsHide: true,
        stdio: "ignore",
      });
      await Promise.race([
        new Promise((resolve) => killer.once("exit", resolve)),
        sleep(5_000),
      ]);
      const profileKiller = spawn("powershell.exe", [
        "-NoProfile",
        "-Command",
        "$target=$env:WEBMCP_PROFILE_TO_CLEAN; Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'chrome|msedge' -and $_.CommandLine -like ('*'+$target+'*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }",
      ], {
        shell: false,
        windowsHide: true,
        stdio: "ignore",
        env: { ...process.env, WEBMCP_PROFILE_TO_CLEAN: activeProfile },
      });
      await Promise.race([
        new Promise((resolve) => profileKiller.once("exit", resolve)),
        sleep(5_000),
      ]);
      await sleep(2_000);
    } else if (activeChrome.exitCode === null) {
      activeChrome.kill();
      await Promise.race([
        new Promise((resolve) => activeChrome.once("exit", resolve)),
        sleep(5_000),
      ]);
    }
    activeChrome.stderr?.destroy();
    activeChrome.unref();
  }
  if (activeProfile) {
    await rm(activeProfile, { recursive: true, force: true, maxRetries: 20, retryDelay: 500 });
  }
  activeChrome = undefined;
  activeProfile = undefined;
}

async function cleanup() {
  // Chrome can retain a Windows profile lock after its debugging socket closes.
  // Cleanup must never keep an otherwise successful CI verification alive.
  await Promise.race([cleanupBestEffort(), sleep(15_000)]);
}

async function main() {
  const chromePath = findChrome();
  activeProfile = await mkdtemp(join(tmpdir(), "commonground-webmcp-"));
  const port = await reservePort();
  const stderr = [];

  activeChrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--enable-features=WebMCP",
    "--enable-blink-features=WebMCP",
    "--enable-experimental-web-platform-features",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${activeProfile}`,
    APP_URL,
  ], { shell: false, windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
  activeChrome.stderr.on("data", (chunk) => stderr.push(String(chunk)));

  const target = await waitFor(async () => {
    if (activeChrome.exitCode !== null) {
      throw new Error(`Chrome exited with ${activeChrome.exitCode}: ${stderr.join("").slice(0, 800)}`);
    }
    const response = await fetch(`http://127.0.0.1:${port}/json/list`);
    if (!response.ok) return false;
    const targets = await response.json();
    return targets.find((candidate) =>
      candidate.type === "page" &&
      candidate.webSocketDebuggerUrl &&
      candidate.url.startsWith(APP_URL)
    );
  }, "Chrome page target");

  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("DevTools WebSocket timed out")), 15_000);
    socket.addEventListener("open", () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
    socket.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error("DevTools WebSocket failed"));
    }, { once: true });
  });

  const client = new CdpClient(socket);
  try {
    await client.send("Runtime.enable");
    await client.send("Page.enable");
    if (SCREENSHOT_PATH) {
      await client.send("Emulation.setDeviceMetricsOverride", {
        width: 1440,
        height: 1200,
        deviceScaleFactor: 1,
        mobile: false,
      });
    }
    // The target appears before its initial navigation context settles. A short
    // fixed gate is more reliable than evaluating against that disposable context.
    await sleep(5_000);
    const result = await waitFor(() => evaluate(client, `
      (async () => {
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const deadline = Date.now() + 15000;
        let tools = [];
        while (Date.now() < deadline) {
          if (document.modelContext && typeof document.modelContext.getTools === "function") {
            tools = await document.modelContext.getTools();
            if (tools.length === ${EXPECTED_TOOLS.length}) break;
          }
          await wait(250);
        }
        if (!document.modelContext) throw new Error("document.modelContext is unavailable");
        if (typeof document.modelContext.executeTool !== "function") throw new Error("executeTool is unavailable");

        const byName = (name) => tools.find((tool) => tool.name === name);
        const normalizeResult = (value) => {
          if (typeof value !== "string") return value;
          try { return JSON.parse(value); } catch { return value; }
        };
        const callTool = async (tool, input) => {
          try {
            return {
              result: normalizeResult(await document.modelContext.executeTool(tool, input)),
              argumentMode: "object",
            };
          } catch (error) {
            if (!/parse input arguments/i.test(String(error?.message || error))) throw error;
            return {
              result: normalizeResult(await document.modelContext.executeTool(tool, JSON.stringify(input))),
              argumentMode: "json-string-compat",
            };
          }
        };
        const workspaceTool = byName("get_workspace_state");
        const scenarioTool = byName("select_scenario");
        if (!workspaceTool || !scenarioTool) throw new Error("required smoke-test tools were not registered");

        const workspaceCall = await callTool(workspaceTool, {});
        const changedCall = await callTool(scenarioTool, { scenarioId: "compromise" });
        await wait(100);
        const compromiseVisible = [...document.querySelectorAll("button")]
          .some((button) => /balanced compromise/i.test(button.textContent || "") && button.getAttribute("aria-selected") === "true");
        const restoredCall = await callTool(scenarioTool, { scenarioId: "consensus" });
        await wait(100);
        const consensusVisible = [...document.querySelectorAll("button")]
          .some((button) => /group consensus/i.test(button.textContent || "") && button.getAttribute("aria-selected") === "true");

        return {
          url: location.href,
          toolNames: tools.map((tool) => tool.name),
          workspace: workspaceCall.result,
          changed: changedCall.result,
          restored: restoredCall.result,
          argumentMode: changedCall.argumentMode,
          compromiseVisible,
          consensusVisible,
        };
      })()
    `), "stable WebMCP execution context", 60_000);

    const actual = [...result.toolNames].sort();
    const expected = [...EXPECTED_TOOLS].sort();
    const missing = expected.filter((name) => !actual.includes(name));
    const extra = actual.filter((name) => !expected.includes(name));
    if (missing.length || extra.length || actual.length !== expected.length) {
      throw new Error(`Tool mismatch: ${JSON.stringify({ missing, extra, actual })}`);
    }
    if (!result.workspace?.success) throw new Error("get_workspace_state did not return success");
    if (!result.changed?.success || !result.compromiseVisible) throw new Error("compromise selection was not visible");
    if (!result.restored?.success || !result.consensusVisible) throw new Error("consensus restoration was not visible");

    if (SCREENSHOT_PATH) {
      const screenshot = await client.send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: false,
      });
      await writeFile(SCREENSHOT_PATH, Buffer.from(screenshot.data, "base64"));
    }

    process.stdout.write(`${JSON.stringify({
      success: true,
      url: result.url,
      chromePath,
      toolCount: actual.length,
      tools: actual,
      readTool: "get_workspace_state",
      reversibleWrite: "select_scenario: compromise -> consensus",
      visibleStateVerified: true,
      executeToolArgumentMode: result.argumentMode,
      ...(SCREENSHOT_PATH ? { screenshotPath: SCREENSHOT_PATH } : {}),
    }, null, 2)}\n`);
  } finally {
    try {
      await client.send("Browser.close", {}, 5_000);
    } catch {
      // The WebSocket commonly closes before Browser.close replies.
    }
    client.close();
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, async () => {
    try {
      await cleanup();
    } finally {
      process.exit(signal === "SIGINT" ? 130 : 143);
    }
  });
}

try {
  await main();
} catch (error) {
  process.stderr.write(`WebMCP verification failed: ${error.stack ?? error.message}\n`);
  process.exitCode = 1;
} finally {
  try {
    await cleanup();
  } catch (error) {
    process.stderr.write(`WebMCP cleanup warning: ${error.message}\n`);
  }
}

process.exit(process.exitCode ?? 0);
