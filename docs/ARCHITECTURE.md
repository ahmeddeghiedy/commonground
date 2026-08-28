# Architecture

## Data flow

```
Humans (UI) ──► Workspace state (React) ──► ScenarioBoard / AgentRail
                        ▲   │
      setters/callbacks │   │ read via refs
                        │   ▼
              use-common-ground-webmcp ── registerTool ──► document.modelContext
                        │                                     │
                        └── search_hotel_inventory ──► /api/inventory ──► provider adapter
                        │
                        └── debounced role-scoped sync ──► workspace API ──► D1
```

- `Workspace` owns all state. The hook receives setters/callbacks and stores them in a ref updated every render, so handlers registered **once** always act on current state.
- Writes flow only through the provided setters (`setState`, `setSelectedScenarioId`, `setVetoedHotelIds`, `openBookingDraft`), guaranteeing the visible UI and agent view cannot diverge.
- Every state-changing handler appends an `Activity` entry (`actorId: "agent"`); IDs are `act-webmcp-<timestamp>-<counter>`, avoiding collisions within a session.
- Private workspaces persist traveler profiles and activity in D1. The client refreshes visible workspaces every eight seconds; organizer updates carry a version for optimistic concurrency.

## Trust boundaries

| Boundary | Rule |
|---|---|
| Agent → App state | Only via registered tool handlers with strict schemas + manual validation. |
| Invite link → Workspace | High-entropy bearer token; only its SHA-256 hash is stored. Traveler tokens are scoped to one profile; organizer-only actions are rejected server-side and in WebMCP. |
| App → Inventory API | Read-only `fetch` with `AbortSignal`; response shape-validated before use; failures degrade to seed data. |
| App → Payment | None. `prepare_booking_draft` opens a human confirmation drawer and returns `purchaseOccurred: false`. Approval records intent only. |
| Page ↔ Browser | `document.modelContext` (W3C name). The legacy `navigator.modelContext` alias is typed as deprecated but intentionally unused. |

## WebMCP annotations

Read tools declare `readOnlyHint: true`; write tools declare `readOnlyHint: false`. The inventory search also declares `untrustedContentHint: true` because its normalized records may originate with an external supplier. These are the two annotation fields currently exposed by the experimental WebMCP shape used by this project.

## Fallback behavior

- No `document.modelContext` → hook is a strict no-op; status `{supported: false, registeredCount: 0}` drives a readiness badge and browser-permission diagnostic. No errors are thrown and the app remains fully usable.
- Individual `registerTool` failures are swallowed; `registeredCount` reflects actual successes.
- Inventory API down or not configured → the provider adapter returns normalized deterministic demo inventory and identifies the response as fallback data.
- Unmount → all tool handles removed and in-flight fetches aborted.
- Older Chrome testing builds that omit callback execution options receive a safe local `AbortSignal`; current builds pass through the browser-provided cancellation signal.
