# CommonGround demo video script

Target runtime: 2:20–2:35. Hard ceiling: 2:50.

## Narration and picture

### 0:00–0:15 — Start with the outcome

**Picture:** The live decision board is already open. An agent prompt appears: “Find the fairest Barcelona hotel for this group. Protect accessibility, stay under two hundred euros per night, and prepare the handoff.” The agent calls `get_workspace_state` and `explain_conflicts`.

**Voice:**

> Four friends want one hotel, but their needs conflict. One needs step-free access. Another cares about the beach. Everyone has a different budget. I can ask an agent to find the fairest option, and it starts by reading the group’s real, current workspace through WebMCP.

### 0:15–0:45 — Show genuine WebMCP use

**Picture:** Tool cards show `get_workspace_state`, `search_hotel_inventory`, and `explain_conflicts`. Keep the decision board visible behind the agent panel.

**Voice:**

> CommonGround exposes seventeen typed browser tools. The agent does not scrape the page or guess where to click. It receives structured travelers, must-haves, preferences, budgets, hotel inventory, and the current scenario. It searches the normalized inventory and asks CommonGround to explain the group’s actual trade-offs.

### 0:45–1:12 — Human-visible action

**Picture:** The agent calls `select_scenario` with `compromise`. The selected scenario visibly changes to Balanced Compromise and the ranking updates. Briefly show the explanation panel.

**Voice:**

> The strongest conflict is clear: the beachfront favorite stretches the budget, while the accessible city option sacrifices the beach. With approval, the agent switches to Balanced Compromise. That is a real WebMCP write action. The visible interface changes immediately, the ranking is recalculated, and the action is logged for the group.

### 1:12–1:33 — Safe booking boundary

**Picture:** The agent calls `prepare_booking_draft`; show the booking draft modal and its approval boundary.

**Voice:**

> Next, the agent prepares a booking draft with the selected hotel, dates, party size, price, and unresolved warnings. It cannot purchase anything. CommonGround deliberately stops at the human approval boundary, so automation is useful without becoming invisible or risky.

### 1:33–2:03 — Complete product experience

**Picture:** Jump to “Create your trip workspace.” Show destination and dates, choose 30 travelers, confirm the organizer, then show the onboarding checklist and invite step.

**Voice:**

> This is also a complete group product, not a single demo screen. An organizer creates a private trip in three short steps, for up to thirty travelers. The guided checklist then helps them invite people by private link, choose predefined priorities, compare fair scenarios, and connect an agent. Each traveler controls only their own profile.

### 2:03–2:28 — Architecture and impact

**Picture:** Return to the ranked decision board. Show “WebMCP on,” the live-data source control, and compact on-screen labels: “17 tools,” “visible writes,” “human approval,” “provider adapter.”

**Voice:**

> Demo inventory can be replaced by TravelWithWadjet, Booking.com Demand, Expedia Rapid, or another licensed provider through one server-side adapter. WebMCP is the right fit because the agent and the humans share the same live state and the same visible interface. CommonGround turns a messy group chat into an explainable decision everyone can inspect, influence, and trust.

### 2:28–2:35 — End card

**Picture:** Product mark, live URL, and “Built by TrailTrix Explore.”

**Voice:**

> CommonGround: group travel decisions that agents can help with, without taking control away from people.

## Delivery direction

- Male English voice, warm and confident, conversational rather than announcer-like.
- No title card before the working product.
- Use short tool-name overlays, not paragraphs.
- Keep cursor movement deliberate and cut every wait state.
- Export 1920×1080 H.264 with AAC audio.
- Final runtime must remain below 2:50 to leave a safe margin under the three-minute judging limit.

