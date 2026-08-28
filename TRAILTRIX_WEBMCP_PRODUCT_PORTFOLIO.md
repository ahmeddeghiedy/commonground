# TrailTrix WebMCP Product Portfolio

Status: Living product strategy document  
Created: 28 August 2026  
Primary challenge concept: CommonGround Travel

## Context

TrailTrix Explore will enter the 2026 WebMCP Challenge with a new, standalone,
open-source application hosted on a development URL. The application will use
authorized TrailTrix/Wadjet hotel inventory where practical while remaining
separate from the production Wadjet Travel experience.

The challenge entry must demonstrate a genuinely shared human-agent workflow.
It will not process payments or finalize live reservations. External inventory
will have a deterministic fallback so the judging experience remains reliable.

## 1. CommonGround Travel — selected challenge concept

### One-line proposition

An AI mediator that helps couples, families, and groups reach a fair, explainable
decision about where to stay.

### Problem

Group travel decisions are scattered across chats, links, polls, and spreadsheets.
People express preferences differently, important requirements become buried,
and one confident person often dominates the decision. Traditional booking sites
optimize inventory for an individual shopper rather than consensus among people.

### Experience

Travelers add requirements as must-have, preferred, flexible, or excluded. The
agent searches live inventory and creates several bookable scenarios rather than
asserting that one result is universally best. Each scenario explains which
requirements it satisfies, where compromise occurs, and which conflicts cannot be
resolved simultaneously.

Humans can lock a requirement, veto a candidate, alter a priority, or combine
elements from different scenarios. The agent then rebalances the visible decision
space and prepares an approved booking draft.

### Why WebMCP is essential

The page is a shared negotiation surface, not a chat transcript. WebMCP gives the
agent structured access to the same constraints, candidates, scenarios, votes,
and decisions the humans can see and manipulate. The agent's actions visibly
change the workspace while consequential actions remain subject to human approval.

### Commercial path

- White-label group-planning workspace for agencies and DMCs.
- Lead-conversion link sent by agents to families or corporate groups.
- Structured preference and consensus layer across TrailTrix inventory.
- Reusable negotiation engine for hotels, packages, tours, and transfers.

## 2. Trip Rescue Room — future TrailTrix module

### One-line proposition

A live recovery workspace where an agent and traveler rebuild a disrupted trip
without losing the priorities that matter most.

### Problem

When a flight is cancelled, a hotel becomes unavailable, or dates change, travelers
must compare replacements under pressure. The original trip's reasoning is lost,
and recovery is fragmented across suppliers and communication channels.

### Experience

The traveler imports or opens an existing trip and identifies what must be protected:
budget, dates, accessibility, location, room configuration, or minimum disruption.
The agent builds recovery scenarios, calculates the change from the original plan,
and stages an approval-ready replacement.

### WebMCP opportunity

The agent can read the visible disruption state, inspect protected constraints,
search alternatives, create recovery branches, and apply an approved plan to the
shared workspace. Explicit confirmation gates protect cancellations, holds, and
other sensitive changes.

### Commercial path

- After-sales service module for agencies and DMCs.
- Operations console for disruption teams.
- Premium traveler-assistance product.
- Eventually extend across hotels, flights, transfers, and activities.

### Principal risk

The product requires reliable access to existing bookings, availability, policies,
and disruption feeds. It is compelling but integration-heavy.

## 3. Booking Truth Lab — future TrailTrix module

### One-line proposition

An explainable decision lab that exposes the real trade-offs, restrictions, and
risks behind apparently similar travel offers.

### Problem

Travelers compare headline prices while missing cancellation conditions, taxes,
room suitability, meal inclusion, location costs, and fragile assumptions. Standard
result lists make these differences difficult to reason about.

### Experience

The agent normalizes shortlisted offers and explains meaningful differences. A
traveler can stress-test the shortlist against date changes, one person withdrawing,
late arrival, accessibility requirements, or a tighter budget. The resulting
evidence remains visible and traceable in the shared interface.

### WebMCP opportunity

The agent can inspect candidates, request policy details, run named stress tests,
annotate risks, and prepare a booking draft from the chosen offer. Read-only and
state-changing tools remain clearly separated.

### Commercial path

- Trust and conversion layer for TrailTrix booking portals.
- Quality-control workspace for travel agents.
- Explainable comparison component for B2B and B2C channels.
- Foundation for policy intelligence and post-booking risk monitoring.

### Principal risk

The concept is highly feasible but less novel than CommonGround unless the evidence
model and visual execution are exceptional.

## Comparative assessment

| Concept | WebMCP leverage | Execution | Impact | Creativity | Delivery risk |
| --- | ---: | ---: | ---: | ---: | --- |
| CommonGround Travel | 5/5 | 4.5/5 | 5/5 | 5/5 | Medium |
| Trip Rescue Room | 5/5 | 3/5 | 5/5 | 4.5/5 | High |
| Booking Truth Lab | 4.5/5 | 5/5 | 4.5/5 | 3.5/5 | Low |

## Challenge assumptions

- Useful results should appear in approximately three seconds when inventory is healthy.
- Challenge traffic is small, but the API boundary should permit later scaling.
- No passport, payment, or other sensitive traveler data is required.
- Inventory credentials remain server-side.
- WebMCP tools use strict input schemas, validation, and truthful annotations.
- A deterministic demo journey and inventory fallback protect judging reliability.
- The application is publicly accessible over HTTPS without complicated authentication.
- The repository includes an open-source license, setup instructions, and dated commits.

## Non-goals for the challenge

- A generic itinerary chatbot.
- A rebuild of Wadjet Travel.
- Payment processing or live booking confirmation.
- Full support for every travel vertical.
- Total dependence on a third-party supplier during judging.

## Decision log

1. **Standalone application.** A new TrailTrix Labs app gives the challenge work a
   clean eligibility boundary and protects the production booking experience.
2. **Real inventory with fallback.** Live data provides credibility; seeded results
   provide repeatability.
3. **Human approval before consequence.** The agent may prepare but not purchase.
4. **CommonGround selected.** It makes WebMCP central to a visible, stateful,
   multi-person negotiation and differs from existing travel-search and itinerary demos.
5. **Trip Rescue Room retained.** Its impact is strong, but its integrations make it
   unsuitable for the initial challenge deadline.
6. **Booking Truth Lab retained.** It is an attractive lower-risk TrailTrix module,
   but its creativity ceiling is lower for this competition.

## Reference material

- WebMCP Challenge: https://webmcp.devpost.com/
- Official rules: https://webmcp.devpost.com/rules
- WebMCP specification: https://webmachinelearning.github.io/webmcp/
- Chrome WebMCP guide: https://developer.chrome.com/docs/ai/webmcp
- OpenAI WebMCP showcase: https://developers.openai.com/showcase

