# Demo Script (< 3 minutes)

**Setup**: Chrome with `chrome://flags/#enable-webmcp-testing` enabled (or ChatGPT desktop Site Tools), app open, side panel agent attached. Badge reads **"WebMCP · 15 tools"**.

1. **(20s) Hook.** "A group of travelers, one Lisbon trip, and an AI that can actually *see and touch* the same board they do — that's WebMCP." Point at People & Priorities: Maya's locked step-free access, Diego's budget cap, and Sana's family-room requirement.

2. **(30s) Read.** Ask the agent: *"What's the state of our trip workspace?"* → `get_workspace_state`, then *"Where do we disagree?"* → `explain_conflicts`. The agent identifies the budget gaps and explains which must-haves cannot be weakened.

3. **(30s) Search.** *"Find hotels under €900 total with review score 8+"* → `search_hotel_inventory` hits the live API; agent lists normalized results.

4. **(30s) Visible write.** *"Sana can relax the beach preference — make it flexible."* → `set_constraint_priority`. **The board recolors live.** Point at the activity log: "Agent set…". Every mutation is on-screen and audited.

5. **(20s) Compare & steer.** *"Which scenario is fairest now?"* → `compare_scenarios`; *"Switch to the compromise view."* → `select_scenario`; board flips.

6. **(20s) Human-in-the-loop.** *"Draft a booking for the top compromise hotel."* → `prepare_booking_draft` opens the drawer. Emphasize the return value: **`purchaseOccurred: false`**. "The agent can prepare, humans approve. Nothing is ever bought."

**Close (10s)**: "Read, reason, act — visibly, auditable, reversible. Common ground between humans and agents. TrailTrix Labs."
