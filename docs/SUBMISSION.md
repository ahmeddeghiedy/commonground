# CommonGround Travel — WebMCP Challenge Submission

## One-line pitch

CommonGround turns group travel disagreement into an explainable, fair hotel decision that humans and an AI agent resolve together on one live board.

## The problem

Group travel planning breaks down because preferences arrive through scattered messages, budgets conflict, accessibility needs get treated like ordinary preferences, and one person ends up doing all the comparison work. Conventional travel chatbots optimize for an individual and jump too quickly from search to booking.

## The solution

CommonGround gives every traveler an explicit voice: must-haves, preferences, exclusions, budgets, and locked requirements. It combines normalized hotel inventory with three explainable decision scenarios—Group Consensus, Best Value, and Balanced Compromise—and displays how each option affects every traveler.

An agent can inspect the same state humans see, explain conflicts, change agreed priorities, veto rejected hotels, switch scenarios, and prepare a booking draft. Every write is immediately visible and logged. The agent cannot purchase anything; the final boundary is a human-reviewed draft.

## Why WebMCP is essential

Without WebMCP, an agent would scrape cards, infer controls, and simulate clicks. CommonGround exposes the decision model directly as 27 typed browser tools:

- Eight read tools for onboarding and collaboration status, workspace state, invitation status, constraints, inventory, scenarios, and conflicts.
- Nineteen permission-aware action tools for workspace creation, scoped invitation links, capacity and trip configuration, traveler profiles, priorities, locks, vetoes, scenario and hotel selection, and booking-draft preparation.
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

## Final 2:06 demo arc

1. Open immediately on the real Codex agent and CommonGround built-in browser using Site Tools.
2. Show named travelers, locked must-haves, six-hotel inventory context, and conflict reasoning.
3. Show Balanced Compromise as a visible WebMCP state change.
4. Return to the authentic agent capture for Pensão Lumen and the human-confirmation draft with no purchase.
5. Close with the 30-traveler workspace flow, scoped invitations, provider adapter, and live URL.

## Judging criteria

| Criterion | CommonGround evidence |
|---|---|
| WebMCP leverage | 27 purposeful tools, typed schemas, role enforcement, annotations, cancellation, visible shared state, and browser-native verification. |
| Execution | Responsive working application, deterministic fallback, live-ready adapter, tests, production build, and documented demo. |
| Impact | Reduces planning labor while protecting budget, accessibility, and family requirements for real travel groups. |
| Creativity | Applies AI to consensus mediation and fairness rather than another itinerary generator or booking chatbot. |

## Submission links

- Live demo: `https://commonground-travel.a-deghiedy.chatgpt.site`
- Repository: `https://github.com/ahmeddeghiedy/commonground`
- Final local master: `submission/artifacts/commonground-final-submission-master.mp4`
- Public YouTube video: `TBD after upload`
- TrailTrix Explore: <https://trailtrixexplore.com/>
