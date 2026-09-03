# Devpost submission copy

## Project name

CommonGround Travel

## One-line description

An agent-assisted workspace that helps travel groups turn conflicting budgets and must-haves into one explainable, human-approved hotel decision.

## Full description

Planning a group trip usually means collecting preferences in a chat, losing important constraints between messages, and letting the loudest person choose. CommonGround gives each traveler a private decision profile and turns the group’s budgets, accessibility needs, location preferences, amenities, and vetoes into a transparent shortlist.

### Why this is a strong fit for WebMCP

Group travel decisions are stateful, collaborative, and full of permission boundaries. An agent needs more than page text: it needs structured access to the current travelers, invitations, constraints, inventory, conflicts, scenarios, and booking state. CommonGround exposes those capabilities directly from the live web application as twenty-seven typed WebMCP tools. The website remains the shared source of truth for both people and agents.

### How it creates a better experience

Instead of asking an organizer to copy preferences into an AI chat or guide an agent through a fragile series of clicks, the agent can read the current workspace, search normalized hotel inventory, explain the real trade-offs, and compare scoring scenarios. With approval, it can make visible changes such as selecting a scenario or updating a traveler’s priority. Every change appears immediately in the interface and is added to the activity log.

### What people and agents can now do together

A group can ask, “Find the fairest option that protects accessibility and keeps us near our budgets.” The agent can inspect every member’s constraints, identify the budget-versus-location conflict, switch the visible ranking to Balanced Compromise, and prepare a booking draft in one guided interaction. Humans still control invitation links, ambiguous preference changes, vetoes, and the final purchase. This combination was difficult with a conventional travel site because the agent could not reliably understand shared group state or act through explicit, permission-aware controls.

### How WebMCP is implemented

CommonGround feature-detects `document.modelContext` and registers twenty-seven tools with explicit names, descriptions, JSON input schemas, annotations, and execution handlers. Read tools expose onboarding status, collaboration status, workspace state, invitation status, traveler constraints, hotel inventory, scenario comparisons, and conflict explanations. Permission-aware write tools create a workspace, create or revoke scoped invitation links, configure capacity and trip settings, update an authorized traveler profile, manage priorities, generate scenarios, select a hotel, and prepare a booking draft. Tool handlers reuse the same application state and scoring functions as the human interface. Links are returned for a human to share, and there is no hidden purchase path.

### Product and data architecture

An organizer can create a private workspace for two to thirty travelers. Each invitation token is scoped to one person, and each traveler edits only their own profile. The app includes a guided creation and onboarding journey, predefined travel priorities, explainable group scoring, an activity log, and a human confirmation boundary before booking.

The deployed challenge build uses clearly labeled curated demo inventory so judges receive deterministic results. A provider adapter can connect the same search and scoring experience to TravelWithWadjet, Booking.com Demand, Expedia Rapid, or another licensed hotel inventory API without changing the WebMCP tools or the consensus model.

## Technologies

WebMCP, React 19, Next.js-compatible routing through vinext, TypeScript, Cloudflare Workers and D1, Codex Sites, Vitest, and Zod.

## Testing instructions

1. In the ChatGPT desktop app, enable **Browser settings → Permissions → Site Tools**, then open the live URL in the built-in browser. No separate connection or extension is required. Alternatively, use Chrome 149+ with `chrome://flags/#enable-webmcp-testing` and the Model Context Tool Inspector.
2. Select **Reset workspace**, wait for inventory to load, and confirm the header says **WebMCP · 27 tools**. In ChatGPT desktop, the Site Tools arrow must appear in the address bar; approve the website-access prompt if shown.
3. Ask the attached browser agent: “Use CommonGround’s Site Tools to inspect the group, list every traveler’s budget and locked must-have, explain the conflicts, search inventory, compare all three scenarios, select the fairest zero-violation option in Balanced Compromise, and prepare a booking draft. Do not approve, book, purchase, message, or charge anything.”
4. Confirm that the dashboard changes visibly to **Balanced Compromise**, selects **Pensão Lumen**, and opens the **Approve booking draft** dialog for **EUR 380** while stating that no purchase is made.
5. Confirm the dashboard says **Agent active**, its call counter is nonzero, and **Last Site Tool** reports `prepare booking draft · completed`.
6. Optionally choose **Create your trip workspace** to test the three-step workspace wizard, capacity up to 30 travelers, invitation links, traveler-scoped permissions, and the post-creation onboarding guide.

No login or test credentials are required for the public demo.

Do not test by opening `chatgpt.com` and CommonGround in two ordinary Chrome tabs: page-level Site Tools are available to ChatGPT only inside the desktop app’s built-in browser. If the Site Tools arrow is absent, the selected ChatGPT account/model does not currently expose Site Tools; use the Chrome testing path above.

## Links

- Live application: https://commonground-travel.a-deghiedy.chatgpt.site/
- Source repository: https://github.com/vteamtech/commonground
- Video: TO BE ADDED AFTER PUBLIC YOUTUBE UPLOAD
