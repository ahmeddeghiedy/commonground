# CommonGround production demo guide

Use the public build: **https://commonground-travel.a-deghiedy.chatgpt.site/**

## 1. Prepare the browser

The header must show **WebMCP · 11 tools** before recording or presenting.

For the Chrome testing build:

1. Open `chrome://flags/#enable-webmcp-testing`.
2. Set **WebMCP testing** to Enabled and relaunch Chrome.
3. Open CommonGround and confirm `document.modelContext` exists in DevTools.
4. Click **Run the 3-minute demo**. Its readiness card should say **11 WebMCP tools registered**.

For a public no-flag judging experience, enroll the exact production origin in the Chrome WebMCP origin trial, set the resulting token as `WEBMCP_ORIGIN_TRIAL_TOKEN` in the Sites environment, then rebuild and deploy. The app emits the token through an `origin-trial` meta tag.

Before every take, click **Reset workspace**. Use a new incognito window for the final smoke test so extensions and stale service workers cannot affect the demo.

## 2. The winning three-minute sequence

### 0:00–0:25 — The human problem

Say:

> “Group travel is not a search problem. It is a negotiation problem. Maya needs step-free access, Diego has a hard budget, Sana needs family rooms, and Leo cares about quality. CommonGround gives all four people—and an AI agent—the same live decision surface.”

Point to the locked constraints and the fairness score. Avoid explaining implementation details yet.

### 0:25–1:10 — Read and reason through WebMCP

Paste this exact prompt into the WebMCP-enabled agent:

> Read the CommonGround workspace, explain the conflicts, compare all scenarios, and recommend the fairest hotel. Do not change anything yet.

Expected tools: `get_workspace_state`, `explain_conflicts`, and `compare_scenarios`. The agent should mention locked constraints and recommend from the visible data. Emphasize that there was no scraping, selector hunting, or hidden API contract—the page declared its own semantic tools.

### 1:10–1:45 — Make a visible, reversible change

Prompt:

> Switch the visible board to the compromise scenario, preserving every locked constraint. Then explain what changed.

Expected tool: `select_scenario` with `scenarioId: "compromise"`. The selected tab changes immediately and the activity log records the action. This is the strongest visual proof that WebMCP is working.

Optional second write if time allows:

> Sana can relax “Near beach” from prefer to flexible. Make that change and recalculate.

Expected tool: `set_constraint_priority` with `travelerId: "t-sana"`, `constraintId: "c-sana-3"`, and `priority: "flexible"`.

### 1:45–2:30 — Search and choose fairly

Prompt:

> Search inventory for hotels under €900 total with a review score of at least 8, then tell me which result best protects the group’s hard constraints.

Expected tool: `search_hotel_inventory`. Point out the inventory source badge: it honestly reports Live or Demo inventory, while the WebMCP interaction stays identical.

Select the recommended hotel on the board if the agent has not selected one.

### 2:30–3:00 — Prove the safety boundary

Prompt:

> Prepare a booking draft for the selected hotel. Do not purchase anything.

Expected tool: `prepare_booking_draft`. The booking drawer opens and the tool response includes `purchaseOccurred: false`. Say:

> “The agent can read, reason, and prepare. A human must approve, and even approval records intent only—this demo never purchases. Every write is visible, auditable, and reversible.”

Close with: **“Common ground between humans and agents. Decide together. Travel better.”**

## 3. Fast technical proof

From the repository:

```powershell
corepack pnpm install
corepack pnpm build
$env:WEBMCP_TEST_URL='https://commonground-travel.a-deghiedy.chatgpt.site/'
corepack pnpm verify:webmcp
```

To preserve a visual evidence frame, also set `WEBMCP_SCREENSHOT_PATH` to an absolute `.png` path before running the verifier.

The verifier starts an isolated Chrome profile with WebMCP enabled, requires all 11 tool names, calls `get_workspace_state`, switches to the compromise scenario, confirms the visible UI changed, then restores consensus.

Production health checks:

- `/api/health` must return `status: "ok"`, `toolCount: 11`, and `autonomousPurchase: false`.
- `/api/inventory` must return normalized hotels and an honest `source` value.
- `/robots.txt`, `/sitemap.xml`, and `/og.png` must return 200.

## 4. Recovery during a live demo

- **Badge says WebMCP off:** confirm the Chrome flag, fully relaunch, then hard-refresh. Check `document.modelContext` in DevTools.
- **Tool count is below 11:** hard-refresh once. If still wrong, use a fresh browser profile; registration is cleaned up on unmount.
- **Inventory API fails:** continue. The app deliberately falls back to deterministic seed inventory and labels it clearly.
- **The agent chooses a different tool order:** that is fine. Judge the result by the visible board and audit log, not by a scripted chain of internal calls.
- **A prior take changed the board:** click **Reset workspace** and verify the Consensus tab is active with no hotel selected.

## 5. Submission evidence checklist

- Public URL loads in an incognito window.
- Header and demo guide show 11 registered tools in the WebMCP-enabled browser.
- A read call accurately describes all four travelers.
- `select_scenario` causes an obvious visible tab change.
- A constraint mutation appears in the activity log.
- The booking draft opens and explicitly confirms no purchase.
- Health and inventory endpoints return 200.
- Video clearly shows the prompt, tool invocation, visible UI effect, and human gate.
- Repository is public before final submission and README links to the live demo and this guide.
