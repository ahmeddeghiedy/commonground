#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { createServer } from "node:net";

const VIDEO = resolve(process.argv[2] ?? "submission/artifacts/commonground-demo-silent.mp4");
const OUTPUT_DIR = resolve(process.argv[3] ?? "submission/artifacts/inspection");

async function reservePort() {
  const server = createServer();
  await new Promise((done, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", done); });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  await new Promise((done) => server.close(done));
  return port;
}

async function waitFor(operation, timeout = 20_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try { const value = await operation(); if (value) return value; } catch { /* retry */ }
    await new Promise((done) => setTimeout(done, 200));
  }
  throw new Error("Timed out waiting for Chrome");
}

class Cdp {
  constructor(socket) {
    this.socket = socket; this.id = 0; this.pending = new Map();
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data); const pending = this.pending.get(message.id); if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolvePromise, reject) => { this.pending.set(id, { resolve: resolvePromise, reject }); this.socket.send(JSON.stringify({ id, method, params })); });
  }
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result?.value;
}

async function main() {
  if (!existsSync(VIDEO)) throw new Error(`Missing video: ${VIDEO}`);
  await mkdir(OUTPUT_DIR, { recursive: true });
  const profile = await mkdtemp(join(tmpdir(), "cg-video-inspect-"));
  const port = await reservePort();
  const chrome = spawn("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", [
    "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--allow-file-access-from-files", `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`, "--window-size=1600,900", "about:blank",
  ], { shell: false, windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
  const chromeErrors = [];
  chrome.stderr.on("data", (chunk) => chromeErrors.push(String(chunk)));
  let client;
  try {
    const target = await waitFor(async () => {
      if (chrome.exitCode !== null) throw new Error(`Chrome exited ${chrome.exitCode}: ${chromeErrors.join("").slice(-1000)}`);
      const response = await fetch(`http://127.0.0.1:${port}/json/list`); const items = response.ok ? await response.json() : [];
      return items.find((item) => item.type === "page" && item.webSocketDebuggerUrl);
    });
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((done, reject) => { socket.addEventListener("open", done, { once: true }); socket.addEventListener("error", reject, { once: true }); });
    client = new Cdp(socket); await client.send("Runtime.enable"); await client.send("Page.enable");
    const inspector = pathToFileURL(resolve(dirname(VIDEO), "video-inspector.html")).href;
    await client.send("Page.navigate", { url: inspector });
    const duration = await waitFor(() => evaluate(client, `document.querySelector('video')?.duration || 0`));
    const requestedTimes = process.env.DEMO_INSPECT_TIMES?.split(",").map(Number).filter(Number.isFinite);
    const times = requestedTimes?.length ? requestedTimes : [5, 55, 95, Math.min(124, Math.max(0, duration - 2))];
    const frames = [];
    for (const time of times) {
      await evaluate(client, `(async()=>{const v=document.querySelector('video');v.currentTime=${time};await new Promise(done=>v.addEventListener('seeked',done,{once:true}));return v.currentTime})()`);
      const shot = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      const output = join(OUTPUT_DIR, `frame-${String(Math.round(time)).padStart(3, "0")}.png`);
      await writeFile(output, Buffer.from(shot.data, "base64")); frames.push(output);
    }
    process.stdout.write(`${JSON.stringify({ duration, frames }, null, 2)}\n`);
    await client.send("Browser.close");
  } finally {
    if (chrome.exitCode === null) chrome.kill();
    await new Promise((done) => setTimeout(done, 600));
    try { await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 400 }); } catch { /* Chrome can release its profile lock late on Windows */ }
  }
}

main().catch((error) => { process.stderr.write(`${error.stack ?? error.message}\n`); process.exitCode = 1; });
