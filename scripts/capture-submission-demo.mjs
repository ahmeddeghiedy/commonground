#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const APP_URL = process.env.DEMO_URL ?? "https://commonground-travel.a-deghiedy.chatgpt.site/";
const OUTPUT = resolve(process.env.DEMO_CAPTURE_PATH ?? "submission/artifacts/commonground-demo-silent.mp4");
const CAPTURE_SECONDS = Number(process.env.DEMO_CAPTURE_SECONDS ?? 138);
const VTT_PATH = resolve(process.env.DEMO_VTT_PATH ?? "submission/artifacts/commonground-male-narration.vtt");
const WINDOW_TITLE = "CommonGround Demo Capture";
const sleep = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

function chromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    join(process.env.LOCALAPPDATA ?? "", "Google", "Chrome", "Application", "chrome.exe"),
  ];
  const selected = candidates.find((candidate) => candidate && existsSync(candidate));
  if (!selected) throw new Error("Google Chrome was not found. Set CHROME_PATH.");
  return selected;
}

async function reservePort() {
  const server = createServer();
  await new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolvePromise);
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  await new Promise((resolvePromise) => server.close(resolvePromise));
  return port;
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
    await sleep(250);
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
      try { message = JSON.parse(event.data); } catch { return; }
      const pending = this.pending.get(message.id);
      if (!pending) return;
      clearTimeout(pending.timer);
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
  }

  send(method, params = {}, timeout = 30_000) {
    const id = ++this.sequence;
    return new Promise((resolvePromise, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP ${method} timed out`));
      }, timeout);
      this.pending.set(id, { resolve: resolvePromise, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() { this.socket.close(); }
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

function parseVtt(value) {
  const timestamp = (raw) => {
    const [hours, minutes, rest] = raw.split(":");
    return Number(hours) * 3600 + Number(minutes) * 60 + Number(rest.replace(",", "."));
  };
  return [...value.matchAll(/(\d\d:\d\d:\d\d,\d{3}) --> (\d\d:\d\d:\d\d,\d{3})\r?\n([^\r\n]+)/g)]
    .map((match) => ({ start: timestamp(match[1]), end: timestamp(match[2]), text: match[3] }));
}

const overlayScript = `
(() => {
  document.title = ${JSON.stringify(WINDOW_TITLE)};
  document.documentElement.style.scrollBehavior = "smooth";
  document.documentElement.style.setProperty("--demo-panel-width", "420px");
  document.getElementById("cg-demo-style")?.remove();
  const style = document.createElement("style");
  style.id = "cg-demo-style";
  style.textContent = \`
    #cg-demo-agent{position:fixed;z-index:2147483600;right:22px;top:72px;width:420px;border:1px solid rgba(255,255,255,.18);border-radius:18px;background:rgba(10,18,33,.96);box-shadow:0 22px 70px rgba(0,0,0,.48);color:#eef4ff;font:14px/1.45 Inter,system-ui,sans-serif;overflow:hidden}
    #cg-demo-agent header{display:flex;align-items:center;gap:9px;padding:13px 15px;border-bottom:1px solid rgba(255,255,255,.1);font-weight:750}.cg-demo-live{width:8px;height:8px;border-radius:50%;background:#59e0b5;box-shadow:0 0 0 5px rgba(89,224,181,.12)}
    #cg-demo-prompt{margin:14px;padding:13px 14px;border-radius:13px;background:#17253c;color:#f7fbff;font-size:13px}.cg-demo-label{display:block;color:#8fa7c7;font-size:10px;letter-spacing:.12em;text-transform:uppercase;margin-bottom:5px}
    #cg-demo-tools{padding:0 14px 14px;display:grid;gap:8px}.cg-demo-tool{display:grid;grid-template-columns:22px 1fr auto;gap:8px;align-items:center;padding:10px 11px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(255,255,255,.035)}.cg-demo-tool strong{font:650 12px/1.2 ui-monospace,SFMono-Regular,Consolas,monospace}.cg-demo-tool small{display:block;color:#9fb0c8;font-size:11px;margin-top:3px}.cg-demo-check{display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:#1d7a61;color:white;font-weight:800}.cg-demo-status{color:#59e0b5;font-size:11px;font-weight:700}.cg-demo-tool.is-running .cg-demo-check{background:#945df4}.cg-demo-tool.is-running .cg-demo-status{color:#c9adff}
    #cg-demo-caption{position:fixed;z-index:2147483640;left:50%;bottom:24px;transform:translateX(-50%);width:min(1060px,calc(100vw - 80px));padding:10px 18px;border-radius:12px;background:rgba(5,11,20,.9);color:white;text-align:center;font:600 18px/1.35 Inter,system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.35)}
    #cg-demo-end{position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;background:radial-gradient(circle at 35% 20%,#174f5d 0,#0b1526 48%,#070d18 100%);color:white;font-family:Inter,system-ui,sans-serif;text-align:center}#cg-demo-end h1{font-size:58px;letter-spacing:-2px;margin:10px}#cg-demo-end p{color:#b9c8db;font-size:22px;margin:6px}#cg-demo-end strong{display:block;margin-top:26px;color:#65e6be;font-size:17px}
  \`;
  document.head.append(style);
  document.getElementById("cg-demo-agent")?.remove();
  const panel = document.createElement("aside");
  panel.id = "cg-demo-agent";
  panel.innerHTML = \`<header><span class="cg-demo-live"></span>Browser agent <span style="margin-left:auto;color:#93a8c4;font-size:11px">WebMCP connected</span></header><div id="cg-demo-prompt"><span class="cg-demo-label">Group request</span>Find the fairest Barcelona hotel. Protect accessibility, stay below €200 per night, and prepare the handoff.</div><div id="cg-demo-tools"></div>\`;
  document.body.append(panel);
  if (!document.getElementById("cg-demo-caption")) {
    const caption = document.createElement("div"); caption.id = "cg-demo-caption"; caption.textContent = ""; document.body.append(caption);
  }
  window.__cgDemo = {
    caption(text){ const node=document.getElementById("cg-demo-caption"); if(node) node.textContent=text || ""; },
    tool(name, detail, running=false){
      const list=document.getElementById("cg-demo-tools"); if(!list) return;
      let row=document.getElementById("cg-demo-tool-"+name); if(!row){row=document.createElement("div");row.id="cg-demo-tool-"+name;row.className="cg-demo-tool";list.append(row);}
      row.className="cg-demo-tool"+(running?" is-running":"");
      row.innerHTML=\`<span class="cg-demo-check">\${running?"⋯":"✓"}</span><div><strong>\${name}</strong><small>\${detail}</small></div><span class="cg-demo-status">\${running?"calling":"done"}</span>\`;
    },
    end(){
      document.getElementById("cg-demo-end")?.remove(); const end=document.createElement("div");end.id="cg-demo-end";
      end.innerHTML=\`<div><span style="color:#65e6be;text-transform:uppercase;letter-spacing:.2em;font-weight:800">TrailTrix Explore presents</span><h1>CommonGround</h1><p>Group travel decisions people and agents can trust.</p><strong>commonground-travel.a-deghiedy.chatgpt.site</strong></div>\`;document.body.append(end);
    }
  };
})();`;

async function callTool(client, name, input, detail) {
  await evaluate(client, `window.__cgDemo?.tool(${JSON.stringify(name)}, ${JSON.stringify(detail)}, true)`);
  const result = await evaluate(client, `(async()=>{
    const tools=await document.modelContext.getTools(); const tool=tools.find(item=>item.name===${JSON.stringify(name)});
    if(!tool) throw new Error("Missing tool: "+${JSON.stringify(name)});
    try{return await document.modelContext.executeTool(tool,${JSON.stringify(input)});}catch(error){if(!/parse input arguments/i.test(String(error?.message||error)))throw error;return await document.modelContext.executeTool(tool,JSON.stringify(${JSON.stringify(input)}));}
  })()`);
  await evaluate(client, `window.__cgDemo?.tool(${JSON.stringify(name)}, ${JSON.stringify(detail)}, false)`);
  return result;
}

async function clickButton(client, pattern) {
  return evaluate(client, `(()=>{const button=[...document.querySelectorAll("button")].find(node=>${pattern}.test((node.textContent||"").trim()));if(!button)return false;button.click();return true})()`);
}

async function main() {
  await mkdir(dirname(OUTPUT), { recursive: true });
  const cues = parseVtt(await readFile(VTT_PATH, "utf8"));
  const origin = new URL(APP_URL).origin;
  const workspaceResponse = await fetch(`${origin}/api/workspaces`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Barcelona for everyone",
      destination: "Barcelona",
      checkIn: "2026-10-15",
      nights: 4,
      organizerName: "Demo organizer",
      travelerLimit: 30,
    }),
  });
  if (!workspaceResponse.ok) throw new Error(`Could not prepare demo workspace: HTTP ${workspaceResponse.status}`);
  const preparedWorkspace = await workspaceResponse.json();
  const preparedWorkspaceUrl = `${origin}/w/${preparedWorkspace.workspace.id}?invite=${encodeURIComponent(preparedWorkspace.ownerToken)}&onboarding=1`;
  const profile = await mkdtemp(join(tmpdir(), "commonground-demo-capture-"));
  const port = await reservePort();
  const chrome = spawn(chromePath(), [
    "--no-first-run", "--no-default-browser-check", "--disable-notifications", "--test-type",
    "--disable-features=TranslateUI", "--hide-scrollbars", "--force-device-scale-factor=1",
    "--enable-features=WebMCP", "--enable-blink-features=WebMCP",
    "--enable-experimental-web-platform-features", `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`, "--window-position=0,0", "--window-size=1600,900",
    `--app=${APP_URL}`,
  ], { shell: false, windowsHide: false, stdio: ["ignore", "ignore", "pipe"] });
  const stderr = [];
  chrome.stderr.on("data", (chunk) => stderr.push(String(chunk)));
  let client;
  let recorder;
  try {
    const target = await waitFor(async () => {
      if (chrome.exitCode !== null) throw new Error(stderr.join("").slice(0, 900));
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = response.ok ? await response.json() : [];
      return targets.find((item) => item.type === "page" && item.webSocketDebuggerUrl);
    }, "Chrome demo target");
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolvePromise, reject) => {
      socket.addEventListener("open", resolvePromise, { once: true });
      socket.addEventListener("error", reject, { once: true });
    });
    client = new CdpClient(socket);
    await client.send("Runtime.enable");
    await client.send("Page.enable");
    await sleep(5_000);
    await waitFor(() => evaluate(client, `document.modelContext?.getTools?.().then(tools=>tools.length===17)`), "17 WebMCP tools", 30_000);
    await evaluate(client, overlayScript);
    await evaluate(client, `document.querySelector(".cg-col-board")?.scrollIntoView({block:"start"})`);
    await sleep(2_000);

    recorder = spawn("ffmpeg", [
      "-hide_banner", "-loglevel", "warning", "-f", "gdigrab", "-framerate", "30",
      "-offset_x", "0", "-offset_y", "0", "-video_size", "1600x900", "-i", "desktop",
      "-c:v", "libx264", "-preset", "ultrafast",
      "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-y", OUTPUT,
    ], { shell: false, windowsHide: true, stdio: ["pipe", "ignore", "pipe"] });
    const recorderErrors = [];
    recorder.stderr.on("data", (chunk) => recorderErrors.push(String(chunk)));
    await sleep(1_200);
    if (recorder.exitCode !== null) throw new Error(`Recorder failed: ${recorderErrors.join("").slice(-1200)}`);

    const startedAt = Date.now();
    const at = async (seconds, action) => {
      const delay = startedAt + seconds * 1000 - Date.now();
      if (delay > 0) await sleep(delay);
      await action();
    };
    const captionTasks = cues.map((cue) => at(cue.start, async () => {
      try { await evaluate(client, `window.__cgDemo?.caption(${JSON.stringify(cue.text)})`, 5_000); } catch { /* navigation */ }
    }));

    await at(2, () => callTool(client, "get_workspace_state", {}, "4 travelers · structured priorities"));
    await at(19, () => callTool(client, "search_hotel_inventory", { maxTotalPrice: 800 }, "Normalized inventory · 4 matches"));
    await at(35, () => callTool(client, "explain_conflicts", {}, "Budget vs beach · accessibility protected"));
    await at(50, async () => {
      await callTool(client, "select_scenario", { scenarioId: "compromise" }, "Visible write · Balanced Compromise");
      await evaluate(client, `document.querySelector(".cg-col-board")?.scrollIntoView({block:"start"})`);
    });
    await at(64, () => callTool(client, "prepare_booking_draft", { hotelId: "h-aurora", scenarioId: "compromise" }, "Draft only · human confirmation required"));
    await at(80, async () => {
      await clickButton(client, "/close/i");
      await callTool(client, "open_workspace_setup", {}, "Visible setup · human remains in control");
    });
    await at(86, async () => {
      await evaluate(client, `(()=>{const inputs=[...document.querySelectorAll(".cg-create-wizard input")];const set=(node,value)=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;setter.call(node,String(value));node.dispatchEvent(new Event("input",{bubbles:true}));node.dispatchEvent(new Event("change",{bubbles:true}));};if(inputs[0])set(inputs[0],"Barcelona for everyone");if(inputs[1])set(inputs[1],"Barcelona");if(inputs[2])set(inputs[2],"2026-10-15");if(inputs[3])set(inputs[3],4);})()`);
      await evaluate(client, `document.querySelector(".cg-create-wizard form")?.requestSubmit()`);
    });
    await at(92, async () => {
      await evaluate(client, `(()=>{const button=[...document.querySelectorAll(".cg-capacity-presets button")].find(node=>/^30\\s*tour$/i.test((node.textContent||"").trim()));button?.click();return !!button})()`);
    });
    await at(95, () => evaluate(client, `document.querySelector(".cg-create-wizard form")?.requestSubmit()`));
    await at(98, async () => {
      await evaluate(client, `(()=>{const input=document.querySelector('.cg-create-wizard input[placeholder]');const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;setter.call(input,"Demo organizer");input.dispatchEvent(new Event("input",{bubbles:true}));input.dispatchEvent(new Event("change",{bubbles:true}));})()`);
    });
    await at(101, () => evaluate(client, `location.assign(${JSON.stringify(preparedWorkspaceUrl)})`));
    await at(107, async () => {
      await waitFor(() => evaluate(client, `!!document.querySelector(".cg-onboarding-dialog")`), "workspace onboarding", 20_000);
      await evaluate(client, overlayScript);
      await evaluate(client, `document.getElementById("cg-demo-agent")?.remove()`);
    });
    await at(112, () => clickButton(client, "/priorities/i"));
    await at(117, async () => {
      await evaluate(client, `document.querySelector('[aria-label="Close setup guide"]')?.click()`);
      await evaluate(client, `window.scrollTo({top:0,behavior:"smooth"})`);
      await sleep(900);
      await clickButton(client, "/demo inventory/i");
    });
    await at(130, () => evaluate(client, `window.__cgDemo?.end()`));
    await Promise.allSettled(captionTasks);
    await at(CAPTURE_SECONDS, async () => {});
    recorder.stdin.write("q\n");
    await new Promise((resolvePromise) => recorder.once("exit", resolvePromise));
    if (recorder.exitCode !== 0) throw new Error(`Recorder exited ${recorder.exitCode}: ${recorderErrors.join("").slice(-1200)}`);
    process.stdout.write(`${JSON.stringify({ success: true, output: OUTPUT, durationSeconds: CAPTURE_SECONDS }, null, 2)}\n`);
  } finally {
    if (recorder?.exitCode === null) recorder.stdin.write("q\n");
    try { await client?.send("Browser.close", {}, 3_000); } catch { /* browser already closed */ }
    client?.close();
    if (chrome.exitCode === null) chrome.kill();
    await sleep(1_000);
    await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  }
}

main().catch((error) => {
  process.stderr.write(`Demo capture failed: ${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
