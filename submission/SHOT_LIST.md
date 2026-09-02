# Demo capture shot list

| Clip | Time | Screen action | Proof delivered |
|---|---:|---|---|
| 1 | 0:00–0:15 | Live board plus agent prompt; execute `get_workspace_state` and `explain_conflicts` | Working product in the first seconds; agent discovers and uses tools |
| 2 | 0:15–0:45 | Show structured results for travelers, constraints, inventory, and conflicts | Non-trivial WebMCP implementation; no DOM scraping |
| 3 | 0:45–1:12 | Execute `select_scenario({scenarioId:"compromise"})` | Visible, reversible write; recalculation and auditability |
| 4 | 1:12–1:33 | Execute `prepare_booking_draft` and reveal confirmation boundary | Useful multi-step outcome without autonomous purchase |
| 5 | 1:33–2:03 | Create workspace: trip → 30 seats → organizer; reveal onboarding and invite | Coherent product experience beyond the technical demo |
| 6 | 2:03–2:28 | Show WebMCP-on state, data-source control, and ranked options | Architecture, extensibility, and impact |
| 7 | 2:28–2:35 | Compact end card with live URL | Memorable close and immediate testing path |

## Capture rules

- Record 1920×1080 or 1440×810 at 30 fps.
- Browser zoom: 90–100%; no bookmarks bar, notifications, or personal tabs.
- Begin already on the working decision board.
- Do not type on camera; insert the completed prompt.
- Record clips separately where practical and remove all network waits.
- Use a clean workspace created only for the demo.
- Do not show access tokens or invitation tokens in the address bar.
- Never claim that demo inventory is live. Label it “curated demo inventory.”
- Only describe TravelWithWadjet or other suppliers as live after their production credential and endpoint are configured.

