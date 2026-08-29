# CommonGround Travel — WebMCP Challenge Submission

## One-line pitch

CommonGround turns group travel disagreement into an explainable, fair hotel decision that humans and an AI agent resolve together on one live board.

## The problem

Group travel planning breaks down because preferences arrive through scattered messages, budgets conflict, accessibility needs get treated like ordinary preferences, and one person ends up doing all the comparison work. Conventional travel chatbots optimize for an individual and jump too quickly from search to booking.

## The solution

CommonGround gives every traveler an explicit voice: must-haves, preferences, exclusions, budgets, and locked requirements. It combines normalized hotel inventory with three explainable decision scenarios—Group Consensus, Best Value, and Balanced Compromise—and displays how each option affects every traveler.

An agent can inspect the same state humans see, explain conflicts, change agreed priorities, veto rejected hotels, switch scenarios, and prepare a booking draft. Every write is immediately visible and logged. The agent cannot purchase anything; the final boundary is a human-reviewed draft.

## Why WebMCP is essential

Without WebMCP, an agent would scrape cards, infer controls, and simulate clicks. CommonGround exposes the decision model directly as 17 typed browser tools:

- Six read tools for collaboration status, workspace state, constraints, inventory, scenarios, and conflicts.
- Eleven write tools for human-gated workspace/invite/settings/onboarding flows, agent-assisted trip configuration, priority changes, locks, vetoes, scenario generation/selection, and booking-draft preparation.
- Truthful `readOnlyHint` annotations and `untrustedContentHint` on supplier inventory.
- Browser cancellation support and structured success/error results.
- State changes routed through the same React actions as the human interface.

The result is a genuine human-agent shared workspace, not a chatbot placed beside a website.

## Innovation

Most travel agents answer “What should I book?” CommonGround answers a harder question: “What can all of us live with, and why?” Its fairness layer makes hidden trade-offs visible, preserves accessibility and family requirements, and lets an agent mediate rather than merely recommend.

## Safety and trust

- No payment or reservation endpoint exists.
- `prepare_booking_draft` explicitly reports `purchaseOccurred: false`.
- Locked constraints cannot have their priority changed until their owner unlocks them.
- Traveler-scoped links cannot edit another person's priorities or run organizer-only group actions.
- Unknown IDs and malformed arguments fail before state mutation.
- External inventory is normalized, time-bounded, and marked untrusted.
- Every agent mutation is visible in the activity log.

## Technical implementation

- Next.js 15, React 19, TypeScript, Zod, and Vitest.
- D1 persistence with hashed access tokens, role-scoped invites, automatic refresh, and optimistic concurrency for organizer writes.
- Browser-native `document.modelContext.registerTool` integration.
- Provider-neutral server-side inventory adapter for Wadjet, custom APIs, or deterministic demo data, with an eight-second timeout and safe fallback.
- Pure scoring engine for traveler satisfaction, must-have violations, fairness, and scenario generation.
- Automated real-Chrome verifier using `getTools()` and `executeTool()`.

## Three-minute demo arc

1. Show the sample traveler profiles, configurable group capacity, and locked must-haves.
2. Ask the agent to read the workspace and explain conflicts.
3. Search normalized hotel inventory.
4. Let Sana relax the beach preference; show the board and audit log update.
5. Ask which scenario is fairest and switch to Balanced Compromise.
6. Ask to book the winner; show that WebMCP opens a human confirmation draft and makes no purchase.

## Judging criteria

| Criterion | CommonGround evidence |
|---|---|
| WebMCP leverage | 17 purposeful tools, typed schemas, role enforcement, annotations, cancellation, visible shared state, and browser-native verification. |
| Execution | Responsive working application, deterministic fallback, live-ready adapter, tests, production build, and documented demo. |
| Impact | Reduces planning labor while protecting budget, accessibility, and family requirements for real travel groups. |
| Creativity | Applies AI to consensus mediation and fairness rather than another itinerary generator or booking chatbot. |

## Submission links

- Live demo: `https://commonground-travel.a-deghiedy.chatgpt.site`
- Repository: `https://github.com/vteamtech/commonground`
- Demo video: `TBD`
- TrailTrix Explore: <https://trailtrixexplore.com/>
