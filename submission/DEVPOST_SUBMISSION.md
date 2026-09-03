# Devpost submission copy

## Project name

CommonGround Travel

## One-line description

A shared hotel decision board where an agent mediates conflicting traveler needs through 27 WebMCP tools—and stops at a human-reviewed booking draft.

## Full description

Four people can agree on Lisbon and still disagree about every hotel. One needs step-free access. Another cannot exceed €130 per night. A family needs suitable rooms, while someone else values reviews and a gym. Those requirements normally disappear into a group chat and leave one organizer reconciling everything by hand. CommonGround gives each traveler a scoped decision profile and turns the group’s budgets, accessibility requirements, family needs, preferences, and vetoes into a transparent hotel ranking.

### Why this is a strong fit for WebMCP

Group travel is a strong WebMCP use case because the answer depends on live shared state and explicit permissions—not just information visible in a page. The agent must know which traveler owns each requirement, which rules are locked, which hotels violate them, which scenario is active, and whether it may change anything. CommonGround exposes that decision model as 27 typed Site Tools. The agent and the travelers operate on the same workspace, while every agent action remains visible in the interface.

### How it creates a better experience

One request can make the agent inspect all four traveler profiles, search six normalized hotel results, explain three concrete budget conflicts, compare three scoring models, select Balanced Compromise, choose a zero-violation hotel, and open a booking draft. The organizer does not copy constraints into chat or guide the agent through six screens. Writes update the shared board immediately and appear in the activity log, so the group can see exactly what changed and why.

### What people and agents can now do together

In the supplied Lisbon workspace, the agent reads Maya’s step-free requirement, Diego’s €130 limit, Sana’s family-room requirement, and Leo’s higher-budget preferences. It identifies budget gaps of €80, €100, and €140, then surfaces Pensão Lumen at €95 per night—€380 for four nights—with zero locked must-have violations. It can prepare that result as a human-confirmation draft, but it cannot book or charge. Conventional travel sites can return hotels; CommonGround lets people and an agent negotiate a fair, inspectable decision together without surrendering control.

### How WebMCP is implemented

CommonGround feature-detects `document.modelContext` and registers 27 tools with strict JSON schemas, read/write annotations, cancellation support, and structured success or error results. Eight read tools expose workspace identity, collaboration and onboarding status, invitations, named traveler constraints, normalized inventory, scenario comparisons, and conflict explanations. Nineteen permission-aware actions cover workspace creation, scoped invitation links, capacity and trip settings, authorized profile changes, priorities, locks, vetoes, scenario and hotel selection, and booking-draft preparation. Tool handlers call the same React state transitions and scoring functions as the human controls. Supplier output is marked untrusted, invitation tokens are role-scoped and stored hashed, and no payment or reservation endpoint exists.

### What judges can verify

The public demo requires no login. A supported browser discovers all 27 tools. The supplied test prompt changes the visible board to Balanced Compromise, selects Pensão Lumen, and opens an **Approve booking draft** dialog for EUR 380. The dashboard records a nonzero agent-call count and `prepare booking draft · completed`, while the tool result explicitly reports `purchaseOccurred: false`. The repository includes automated Chrome verification and dated production evidence for this exact flow.

### Product and data architecture

An organizer can create a private workspace for two to thirty travelers. Each invitation token is scoped to one person, and each traveler edits only their own profile. The app includes a guided creation and onboarding journey, predefined travel priorities, explainable group scoring, an activity log, and a human confirmation boundary before booking.

The deployed challenge build uses clearly labeled curated demo inventory so judges receive deterministic results. A provider adapter can connect the same search and scoring experience to TravelWithWadjet, Booking.com Demand, Expedia Rapid, or another licensed hotel inventory API without changing the WebMCP tools or the consensus model.

## Technologies

WebMCP, React 19, Next.js-compatible routing through vinext, TypeScript, Cloudflare Workers and D1, Codex Sites, Vitest, and Zod.

## AI-assisted development

AI assistants helped scaffold, debug, test edge cases, tighten documentation, and produce the male narration. The recorded interaction is a real Codex agent using CommonGround’s registered Site Tools; it is not a recreated chat or simulated tool log. Product claims are limited to the deployed build, and the deterministic inventory is labeled as demo data rather than live supplier inventory.

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
- Source repository: https://github.com/ahmeddeghiedy/commonground
- Final local master: `submission/artifacts/commonground-final-submission-master.mp4`
- Public YouTube video: TO BE ADDED AFTER UPLOAD
