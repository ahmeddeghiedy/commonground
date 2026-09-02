# CommonGround — TrailTrix Labs

CommonGround is a multi-traveler hotel decision workspace where an AI agent and humans share one live board. Phase 3 adds **WebMCP**: the page exposes its capabilities as tools via `document.modelContext.registerTool` (W3C WebMCP draft) so an in-browser agent (e.g. ChatGPT in-app browser) can read and — with visible, auditable effects — change the shared state.

**Live:** https://commonground-travel.a-deghiedy.chatgpt.site/

**Challenge submission package:** [`submission/`](submission/) contains the exact Devpost copy, judge testing steps, timed demo script, capture plan, narration, and final deadline checklist.

### Judge quick path

1. Open the live application in ChatGPT’s in-app browser or Chrome with WebMCP enabled.
2. Confirm the header reports `WebMCP · 27 tools`.
3. Ask: “Inspect this group’s hotel constraints, explain the biggest conflict, switch to Balanced Compromise, and prepare a booking draft. Do not purchase anything.”
4. Watch the shared scenario change visibly and review the human-confirmation booking draft.

No login or testing credentials are required. The deployed challenge catalog is deterministic demo inventory and is labeled as such in the interface.

**Presenter runbook:** [`docs/DEMO_GUIDE.md`](docs/DEMO_GUIDE.md)

**Workspace, invite, and scoring model:** [`docs/COLLABORATION.md`](docs/COLLABORATION.md)

**Wadjet, custom inventory, and demo data:** [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md)

**Dated production test evidence:** [`docs/VERIFICATION_EVIDENCE.md`](docs/VERIFICATION_EVIDENCE.md)

## Setup

```bash
corepack pnpm install
corepack pnpm dev      # http://localhost:3000
```

Optional live inventory: choose `wadjet` or `custom` through the provider adapter documented in `.env.example` and `docs/INTEGRATIONS.md`. Without a configured endpoint, or whenever it fails safely, the app uses the curated demo catalog and labels the source honestly.

## Feature overview

- **People & priorities**: each traveler's constraints with priority (must/prefer/flexible/exclude), weights, and locks.
- **Private collaboration**: durable trip workspaces with organizer-selected capacity from 2–30, link/email/WhatsApp/native sharing, traveler-scoped editing, and automatic shared refresh.
- **Pluggable inventory**: Wadjet and generic REST/JSON adapters normalize live data without changing the fairness engine or WebMCP contract.
- **Scenario board**: consensus / value / compromise rankings with fairness scores and per-traveler scores.
- **Agent rail**: conflicts with suggested resolutions, activity log, prompt box.
- **Booking drawer**: human-in-the-loop draft; approving records intent only — **no purchase ever occurs**.
- **Judge mode**: a built-in three-minute walkthrough, WebMCP readiness check, copyable prompts, and deterministic reset.
- **Production surface**: health endpoint, social share card, robots/sitemap, honest inventory source reporting, and optional origin-trial activation.

## WebMCP tools

| Tool | Mode | Purpose |
|---|---|---|
| `get_collaboration_status` | read | Workspace mode, role, capacity, and current traveler scope. |
| `get_workspace_state` | read | Full snapshot: travelers, constraints, scenarios, selection. |
| `list_travelers_and_constraints` | read | Per-traveler constraints + detected conflicts. |
| `search_hotel_inventory` | read | Calls `/api/inventory`, returns normalized hotels (supports price/score filters). |
| `compare_scenarios` | read | Side-by-side scenario comparison with per-traveler scores. |
| `explain_conflicts` | read | Conflicts with severity, resolutions, locked constraints. |
| `get_onboarding_status` | read | Setup progress, capacity, incomplete profiles, and selections. |
| `open_workspace_setup` | write | Opens the human-controlled trip creation form; never submits it. |
| `create_workspace` | write | Creates a confirmed private workspace and opens its guided setup. |
| `open_invite_traveler` | write | Opens the organizer-only invite form; never shares a link automatically. |
| `list_invitations` | read | Organizer-only invitation and activation status without private tokens. |
| `create_invitation` | write | Creates a private scoped link for manual human sharing. |
| `revoke_invitation` | write | Revokes a private link and removes that traveler after confirmation. |
| `open_workspace_settings` | write | Opens organizer-only traveler-capacity settings. |
| `open_workspace_onboarding` | write | Opens the visible organizer guide at invite, priorities, compare, or agent setup. |
| `configure_trip_workspace` | write | Organizer-confirmed destination, nights, and capacity update; opens the guide. |
| `set_workspace_capacity` | write | Sets organizer-controlled capacity from 2–30 seats. |
| `update_traveler_profile` | write | Updates an authorized traveler name or budget. |
| `add_constraint` | write | Adds an authorized traveler decision rule. |
| `remove_constraint` | write | Removes an unlocked rule after explicit confirmation. |
| `set_constraint_priority` | write | Change a constraint's priority; recalculates; logs activity. |
| `lock_constraint` | write | Lock/unlock a constraint so its priority cannot change silently. |
| `veto_hotel` | write | Remove/restore a hotel across scenarios. |
| `create_scenarios` | write | Regenerate scenarios from current state. |
| `select_scenario` | write | Switch the visible board. |
| `select_hotel` | write | Selects or clears a non-vetoed hotel on the visible board. |
| `prepare_booking_draft` | write | Opens human confirmation UI only; reports `purchaseOccurred: false`. |

## Testing with an agent

**ChatGPT desktop built-in browser**: enable **Site Tools** under Browser settings → Permissions, open the deployed app with an eligible account/model, and approve the website-access prompt. The address-bar arrow shows availability.

**Chrome testing**: `chrome://flags/#enable-webmcp-testing` → Enabled → relaunch. The header shows `WebMCP · N tools` when connected. If it says `WebMCP ready · connect browser`, click it for the diagnostic; the website is ready but that browser session has not exposed `document.modelContext`.

**Comet and Firefox**: the complete CommonGround application works, but neither browser currently documents native `document.modelContext` support. The in-product connection center explains the supported setup paths without presenting missing browser capability as an app error. See [browser support and WebMCP enablement](docs/BROWSER_SUPPORT.md) for the maintained compatibility matrix and exact instructions.

For a deterministic browser smoke test, start the production server in one terminal, then run:

```bash
corepack pnpm build
corepack pnpm start
# In a second terminal:
corepack pnpm verify:webmcp
```

The verifier launches an isolated Chrome profile with the WebMCP feature enabled, confirms all 27 registered names, executes workspace and onboarding reads, visibly selects and restores a hotel, switches to the compromise scenario, and restores consensus. It supports both the current object-argument API and Chrome builds that still expose the earlier JSON-string testing convention.

For a public URL, enroll the deployed origin in Chrome's WebMCP origin trial and set `WEBMCP_ORIGIN_TRIAL_TOKEN`. The app emits it as an origin-trial meta tag. Local development does not need a token when the testing flag is enabled.

Production diagnostics are available at [`/api/health`](https://commonground-travel.a-deghiedy.chatgpt.site/api/health). It reports release mode, inventory mode, WebMCP tool count, and the no-autonomous-purchase invariant without exposing secrets.

## Demo vs live environment

- `demo` (default): deterministic catalog; badge shows "Demo inventory"; all tools use the same normalized contract.
- `wadjet`: Wadjet's private inventory endpoint and server credential.
- `custom`: another REST/JSON provider with configurable method, authentication header, response path, and flexible field normalization.

## Safety

- Every write tool mutates React state through the app's own setters — the UI is the source of truth; the agent cannot bypass it.
- Private workspaces persist in D1. Organizer writes use optimistic version checks, invite tokens are stored only as SHA-256 hashes, and traveler links can update only their assigned profile.
- All mutations append activity-log entries (actor `agent`).
- No payments: `prepare_booking_draft` only opens a confirmation drawer and explicitly returns `purchaseOccurred: false`.
- Schemas are strict (`additionalProperties: false`); arguments are validated before any state change.
- Tool registration uses an `AbortController` registration signal, unregistering all tools on unmount.

MIT © 2026 TrailTrix Explore. See `LICENSE`.
