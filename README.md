# CommonGround — TrailTrix Labs

CommonGround is a multi-traveler hotel decision workspace where an AI agent and humans share one live board. Phase 3 adds **WebMCP**: the page exposes its capabilities as tools via `document.modelContext.registerTool` (W3C WebMCP draft) so an in-browser agent (e.g. ChatGPT in-app browser) can read and — with visible, auditable effects — change the shared state.

**Live:** https://commonground-travel.a-deghiedy.chatgpt.site/

**Presenter runbook:** [`docs/DEMO_GUIDE.md`](docs/DEMO_GUIDE.md)

## Setup

```bash
corepack pnpm install
corepack pnpm dev      # http://localhost:3000
```

Optional live inventory: configure the server adapter described in `.env.example`; `GET /api/inventory` returns `{ hotels: Hotel[] }` using the model in `src/features/consensus/types.ts`. Without credentials the app falls back to seeded demo data and shows a "Demo inventory" badge.

## Feature overview

- **People & priorities**: each traveler's constraints with priority (must/prefer/flexible/exclude), weights, and locks.
- **Scenario board**: consensus / value / compromise rankings with fairness scores and per-traveler scores.
- **Agent rail**: conflicts with suggested resolutions, activity log, prompt box.
- **Booking drawer**: human-in-the-loop draft; approving records intent only — **no purchase ever occurs**.
- **Judge mode**: a built-in three-minute walkthrough, WebMCP readiness check, copyable prompts, and deterministic reset.
- **Production surface**: health endpoint, social share card, robots/sitemap, honest inventory source reporting, and optional origin-trial activation.

## WebMCP tools

| Tool | Mode | Purpose |
|---|---|---|
| `get_workspace_state` | read | Full snapshot: travelers, constraints, scenarios, selection. |
| `list_travelers_and_constraints` | read | Per-traveler constraints + detected conflicts. |
| `search_hotel_inventory` | read | Calls `/api/inventory`, returns normalized hotels (supports price/score filters). |
| `compare_scenarios` | read | Side-by-side scenario comparison with per-traveler scores. |
| `explain_conflicts` | read | Conflicts with severity, resolutions, locked constraints. |
| `set_constraint_priority` | write | Change a constraint's priority; recalculates; logs activity. |
| `lock_constraint` | write | Lock/unlock a constraint so its priority cannot change silently. |
| `veto_hotel` | write | Remove/restore a hotel across scenarios. |
| `create_scenarios` | write | Regenerate scenarios from current state. |
| `select_scenario` | write | Switch the visible board. |
| `prepare_booking_draft` | write | Opens human confirmation UI only; reports `purchaseOccurred: false`. |

## Testing with an agent

**ChatGPT in-app browser**: open the deployed app inside ChatGPT's browser; tools are offered to the model automatically when WebMCP is enabled.

**Chrome flag**: `chrome://flags/#enable-webmcp-testing` → Enabled → relaunch. The header badge shows `WebMCP · N tools` when registered, `WebMCP off` otherwise. Verify in DevTools: `document.modelContext`.

For a deterministic browser smoke test, start the production server in one terminal, then run:

```bash
corepack pnpm build
corepack pnpm start
# In a second terminal:
corepack pnpm verify:webmcp
```

The verifier launches an isolated Chrome profile with the WebMCP feature enabled, confirms all 11 registered names, executes `get_workspace_state`, visibly switches to the compromise scenario, and restores consensus. It supports both the current object-argument API and Chrome builds that still expose the earlier JSON-string testing convention.

For a public URL, enroll the deployed origin in Chrome's WebMCP origin trial and set `WEBMCP_ORIGIN_TRIAL_TOKEN`. The app emits it as an origin-trial meta tag. Local development does not need a token when the testing flag is enabled.

Production diagnostics are available at [`/api/health`](https://commonground-travel.a-deghiedy.chatgpt.site/api/health). It reports release mode, inventory mode, WebMCP tool count, and the no-autonomous-purchase invariant without exposing secrets.

## Demo vs live environment

- `DEMO` (default): seeded hotels; badge shows "Demo inventory"; all tools still work against seed data.
- `LIVE`: any `/api/inventory` conforming to the `Hotel[]` shape; `search_hotel_inventory` proxies it with `AbortSignal` cancellation.

## Safety

- Every write tool mutates React state through the app's own setters — the UI is the source of truth; the agent cannot bypass it.
- All mutations append activity-log entries (actor `agent`).
- No payments: `prepare_booking_draft` only opens a confirmation drawer and explicitly returns `purchaseOccurred: false`.
- Schemas are strict (`additionalProperties: false`); arguments are validated before any state change.
- Tool registration uses an `AbortController` registration signal, unregistering all tools on unmount.

MIT © 2026 TrailTrix Explore. See `LICENSE`.
