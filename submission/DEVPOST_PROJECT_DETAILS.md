# Devpost — Project Details

Use the following content for the **Project details** step.

## About the project

```markdown
## Inspiration

Planning a group trip rarely fails because there are too few hotel options. It fails because the important details are scattered across messages and held by different people. One traveler needs step-free access. Another has a hard nightly limit. A parent needs a suitable family room. Someone else cares most about reviews, location, or a gym. The organizer ends up acting as a human spreadsheet, and the loudest preference often wins.

We built CommonGround to make that negotiation explicit, fair, and inspectable. The goal is not to let an AI choose a holiday for everyone. It is to let people and an agent work on the same decision, while preserving each traveler’s constraints and keeping the final commitment with a human.

## What it does

CommonGround is a shared hotel decision workspace for groups of up to 30 travelers. Each person has a budget, preferences, and locked must-haves. The workspace detects conflicts, normalizes hotel inventory, and scores options under three transparent strategies: Group Consensus, Best Value, and Balanced Compromise.

An attached agent can use 27 WebMCP Site Tools to read the live workspace and act on it. In one request, the agent can:

1. identify every traveler by name;
2. read their budgets, preferences, and locked requirements;
3. explain concrete conflicts between them;
4. search the available hotel inventory;
5. compare all three decision strategies;
6. select the fairest zero-violation result; and
7. prepare a complete booking draft for human review.

In the public Lisbon demo, that flow considers Maya’s step-free requirement, Diego’s €130-per-night limit, Sana’s family-room requirement, and Leo’s higher-budget preferences. It identifies budget gaps of €80, €100, and €140, then selects Pensão Lumen at €95 per night—€380 for four nights—with zero locked must-have violations.

The agent stops there. The final **Approve draft** button remains untouched. CommonGround has no autonomous purchase path, and the tool response reports `purchaseOccurred: false`.

## Why WebMCP is essential

A screenshot or scraped page is not enough for this problem. The agent needs structured access to shared state: who owns a requirement, whether it is a preference or a lock, which hotels violate it, which scoring strategy is active, and what the agent is permitted to change.

WebMCP turns the website itself into the agent interface. The agent and the travelers use the same workspace, the same scoring logic, and the same visible controls. There is no separate chatbot database that can drift away from the page. When the agent selects a scenario or prepares a draft, the board changes in front of the group and the action appears in the activity and telemetry surfaces.

This replaces a multi-screen, copy-and-paste workflow with one auditable request. More importantly, it gives the agent useful power without hiding its actions or surrendering human control.

## How we built it

CommonGround feature-detects `document.modelContext` and registers 27 typed Site Tools. Every tool has a strict JSON schema, read/write annotations, cancellation support, and structured success or error results.

Eight read tools expose workspace identity, onboarding and collaboration state, invitations, named traveler constraints, normalized inventory, scenario comparisons, and conflict explanations. Nineteen permission-aware action tools cover workspace creation, scoped invitations, trip and capacity settings, traveler-profile changes, priorities, locks, vetoes, scenario and hotel selection, and booking-draft preparation.

The tools call the same React state transitions and scoring functions as the human interface. Writes are immediately visible. Invitation tokens are scoped to a traveler and stored as hashes. Supplier responses are treated as untrusted data. There is deliberately no reservation or payment endpoint behind the draft action.

The application is built with React, TypeScript, Vite/vinext, Zod, Cloudflare Workers and D1, and Codex Sites. Vitest and automated browser verification exercise the scoring, permissions, tool contracts, state synchronization, and the no-purchase safety boundary.

For a reliable judging experience, the deployed challenge build uses six clearly labeled curated Lisbon hotel records. The inventory layer is provider-based, so a licensed TravelWithWadjet, Booking.com Demand, Expedia Rapid, or other hotel supplier adapter can replace the demo provider without changing the consensus model or the WebMCP interface.

## Challenges we faced

The hardest problem was not registering tools; it was keeping three things synchronized: the state returned to the agent, the state visible to people, and the permission boundary between reading, changing, and committing.

We also had to make subjective fairness explainable. A single “best hotel” score hides who is being asked to compromise. CommonGround therefore shows individual satisfaction, hard violations, group conflicts, and the effect of each scenario rather than presenting an unexplained recommendation.

Browser support for an emerging technology was another practical challenge. We added capability detection, clear connection status, deterministic demo data, strict tool outputs, and a Chrome verification path so a judge can distinguish a product problem from a missing browser capability.

## Accomplishments that we're proud of

We are proud that CommonGround is a complete shared product experience rather than a chatbot wrapped around a static demo. A real external Codex agent can discover 27 typed Site Tools, identify four travelers by name, explain their specific conflicts, compare three decision strategies, choose a zero-violation hotel, and prepare a human-review draft in one request. The same actions immediately update the board the travelers are looking at.

We are especially proud of the safety boundary. The agent is useful enough to complete the difficult research and negotiation work, but it cannot quietly cross into a purchase. The interface shows zero autonomous purchases, the draft explicitly says that no purchase is made, and the final approval remains a deliberate human action.

We also built beyond the single demo path: organizers can create private workspaces for up to 30 travelers, invite people with scoped links, configure the trip, manage priorities and locks, and follow a guided onboarding flow. Automated tests and browser acceptance checks cover the tool contracts, permissions, fairness scoring, state synchronization, and booking-draft boundary. The result is something judges can use as a coherent product, not merely inspect as a technical prototype.

## What we learned

Agents are most useful when they can operate on the same structured state as people—not when they merely describe what appears on a page. We also learned that visible actions are a product feature, not debugging decoration. People trust an agent more when they can see what it read, what it changed, why it made a recommendation, and where its authority ends.

## What's next

The next step is to connect licensed live hotel inventory through the provider adapter and carry the same model into flights, itineraries, and group expense decisions. The larger opportunity is a reusable negotiation layer for any shared decision where several people have different constraints and an agent should help without taking control away from them.
```

## Built with

Add these tags individually:

1. WebMCP
2. React
3. TypeScript
4. Vite
5. vinext
6. Next.js
7. Cloudflare Workers
8. Cloudflare D1
9. Codex Sites
10. Zod
11. Vitest
12. ESLint
13. Google Chrome
14. ChatGPT
15. Codex

## Try it out links

Add both links:

1. **Live demo** — https://commonground-travel.a-deghiedy.chatgpt.site/
2. **Source code** — https://github.com/ahmeddeghiedy/commonground

## Image gallery

Upload these in this order:

1. `submission/devpost-gallery/01-live-webmcp-workspace.png`
   - Caption: **The live CommonGround workspace exposes 27 typed WebMCP Site Tools while keeping every agent action visible.**
2. `submission/devpost-gallery/02-codex-site-tools-agent.jpg`
   - Caption: **A real Codex agent reads the group’s constraints, explains the trade-offs, and prepares the result beside the shared board.**
3. `submission/devpost-gallery/03-human-booking-approval.png`
   - Caption: **The agent reaches the human-confirmation boundary: a complete €380 draft is ready, but no booking or charge occurs.**
Do not upload raw capture checks, duplicate frames, or screenshots containing unrelated browser windows.

## Video demo link

https://youtu.be/pGRNtlabnbg
