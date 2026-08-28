# Collaboration product model

## Capacity and roles

CommonGround is designed for groups of **2–12 travelers**. A workspace begins with the organizer, so it can temporarily contain one person while setup is in progress. The twelfth seat is the hard technical limit; this keeps the comparison board readable and the pairwise conflict analysis responsive.

- **Organizer**: creates the workspace, invites travelers, edits trip-level state, can edit every profile when helping the group, and controls shared scenario/veto/booking-draft actions.
- **Traveler**: opens a personal private link and can edit only their own budget, priorities, and locks. Other profiles are view-only.
- **Agent**: receives the same role boundary through WebMCP. It cannot use a traveler link to mutate another person's profile or perform organizer-only actions.

## Create and invite flow

1. From the demo homepage, choose **Create your trip**.
2. Enter the trip name, destination, number of nights, and organizer name.
3. CommonGround creates a durable D1 workspace and stores the organizer credential in that browser.
4. Choose **Invite traveler**, add a name and optional email label, then copy the generated private link.
5. Send that link manually. CommonGround deliberately does not send email or expose a contact list.
6. The traveler opens the link and is immediately guided through their own priority profile.

Each link contains a high-entropy token. Only its SHA-256 hash is stored in D1. The token is removed from the address bar after it is saved to the browser. Losing the organizer browser credential currently requires creating another workspace; account-based recovery is a future enhancement.

## How priorities become a shortlist

The profile wizard turns plain choices into deterministic decision rules:

- **Must**: a deal-breaker, weighted 1.5×. The Group Consensus scenario removes hotels that violate any must.
- **Prefer**: important, weighted 1.0×.
- **Flexible**: nice to have, weighted 0.5×.
- **Exclude**: a feature to avoid; matching is inverted.
- **Lock**: prevents a priority from being changed until that traveler (or organizer) explicitly unlocks it.

The nightly budget is always created as a locked must. For every hotel, CommonGround calculates a 0–100 score per traveler from satisfied weighted rules, then averages those values for the group. Fairness rewards options with both a strong mean score and a small gap between the happiest and least-happy traveler.

The three lists answer different questions:

| Scenario | Ranking rule |
|---|---|
| Group Consensus | Remove all must violations, then rank by fairness and average score. |
| Best Value | Rank by total stay price; show traveler scores so cheap-but-unfair choices remain visible. |
| Balanced Compromise | Blend average satisfaction (60%) and fairness (40%). |

Any profile change recalculates conflicts and all three lists immediately. Private workspaces save after a short debounce and refresh from D1 every eight seconds while visible.

## Current boundary

The application creates booking drafts only. It does not reserve inventory, charge a card, send email, or autonomously purchase travel. Live inventory can be enabled through the TrailTrix-compatible server adapter; otherwise the UI labels deterministic demo inventory honestly.
