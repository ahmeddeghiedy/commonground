# CommonGround Travel — Build Plan

## Objective

Build a polished, runnable WebMCP challenge application where travelers and an
AI agent collaboratively resolve conflicting hotel preferences using live-ready
inventory, explainable scenarios, and a human-approved booking draft.

## Product boundaries

- Standalone TrailTrix Labs application; do not modify Wadjet Travel.
- No authentication, payment, or live reservation confirmation.
- Session-local workspace with deterministic seeded demo data.
- Server-side inventory adapter contract ready for TrailTrix credentials.
- Public-repository quality: license, setup, architecture, and test instructions.

## Stack

- Next.js App Router + React + TypeScript.
- Tailwind CSS for styling.
- Zod validation at API and WebMCP boundaries.
- Vitest for deterministic domain logic; documented manual evaluations for browser tool handlers.
- Browser-native `document.modelContext.registerTool` with feature detection.
- No database for the challenge MVP.

## Experience

1. Load a seeded four-traveler family scenario.
2. Review and edit must-have, preferred, flexible, and excluded constraints.
3. Search normalized hotel inventory.
4. Generate three explainable scenarios: Best Consensus, Best Value, and Least
   Compromise.
5. Display traveler satisfaction, conflicts, policy/price evidence, and fairness.
6. Lock a requirement, veto a hotel, vote, or rebalance priorities.
7. Recalculate scenarios visibly.
8. Prepare a booking draft requiring explicit human approval.

## Architecture

- `src/app`: thin routes, API route, metadata, global styling.
- `src/features/consensus`: workspace UI, state, domain types, scoring engine.
- `src/features/inventory`: normalized inventory types and client query layer.
- `src/features/webmcp`: tool definitions, registration hook, handlers.
- `src/server/services`: live-ready TrailTrix adapter plus seeded fallback.

## WebMCP tools

Read tools:

- `get_workspace_state`
- `list_travelers_and_constraints`
- `search_hotel_inventory`
- `compare_scenarios`
- `explain_conflicts`

Write tools:

- `set_constraint_priority`
- `lock_constraint`
- `veto_hotel`
- `create_scenarios`
- `select_scenario`
- `prepare_booking_draft`

All tools use strict schemas, truthful `readOnlyHint` values, structured results,
abort handling where applicable, and visibly update application state.

## Delivery phases

1. Scaffold project and install dependencies.
2. Implement domain models, seed data, scoring, and fallback inventory API.
3. Build responsive three-area decision workspace.
4. Add WebMCP tool registration and visible activity log.
5. Add booking-draft confirmation boundary.
6. Add unit tests, accessibility pass, and production build verification.
7. Add README, architecture notes, license, and demo script.

## Verification

- [x] `pnpm test` — 18/18 tests passing.
- [x] `pnpm lint` — zero errors.
- [x] `pnpm build` — production build passing.
- [x] Desktop visual smoke test at 1600×1000.
- [x] Browser-native verification: all 15 tools discovered; one read and one reversible visible write executed through `document.modelContext`.
- [ ] Run the natural-language prompt suite with the final judging agent/browser.
- [x] Seeded demo verified with all external credentials absent (6 normalized hotels).

## Delegation

- Coding agent: scaffold and implement the complete first pass from this plan.
- Primary agent: review architecture and diff, run tests/build, inspect UI, fix
  correctness, accessibility, WebMCP, and presentation issues.
