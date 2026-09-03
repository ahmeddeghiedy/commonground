# Production verification evidence

Verified on September 3, 2026 against:

- Live application: <https://commonground-travel.a-deghiedy.chatgpt.site/>
- Source checkpoint: `fde5e1395800dc7c15799ea2e1aa49de2e676a27`
- Sites release: version 14 at the URL above

## Automated results

- `pnpm lint`: passed with zero errors.
- TypeScript `--noEmit`: passed.
- `pnpm test`: 23 tests passed in 4 files, including delayed WebMCP host attachment and parameterless inventory-context alignment.
- Production build: passed from an isolated staging path to avoid Dropbox file locking on Windows.
- Collaboration API acceptance test: workspace creation, custom capacity, invitation creation/listing, traveler-scoped access, revocation, removal, and rejection of the revoked token all passed.
- Public health check: status `ok`, 27 WebMCP tools, human approval required, autonomous purchase disabled, deterministic demo inventory active.
- Public Chrome WebMCP verification: all 27 expected tools discovered; the seven core read/reason tools executed within the latency budget; exact demo workspace, destination, and traveler identities were asserted; hotel and scenario selections changed both structured state and the visible UI, then were restored.
- `get_workspace_state` returns explicit workspace identity and snapshot time so agents can reject stale or incorrectly attached browser sessions before acting.
- `explain_conflicts` returns traveler names and budgets with every locked constraint, avoiding ambiguous placeholder-only summaries.
- `prepare_booking_draft` preserves an explicitly requested scenario in the generated draft and continues to assert `purchaseOccurred: false`.
- The browser verifier also requires the human-confirmation dialog to be visible, name Pensão Lumen, retain the compromise scenario, and state that no purchase is made.
- Version 12 retries a late `document.modelContext` injection for six seconds, preventing a supported first-time browser session from requiring a page reload when host attachment races React mount.
- Three independent clean-profile Chrome runs each discovered all 27 tools, verified the workspace identity, executed the seven core reads, and synchronized reversible visible writes.
- A full version 12 production run verified the booking safety dialog and attachment telemetry: 15 calls, zero autonomous purchases, and `prepare booking draft · completed`. Evidence: `submission/artifacts/webmcp-v12-production.png`.
- Version 14 aligns parameterless `/api/inventory` responses with the demo workspace: Lisbon, October 15, 2026, four nights, four travelers, and all six hotels. The inventory Site Tool also returns that explicit search context and `matchesWorkspace: true`.
- The scenario board now distinguishes its filtered ranking from the source inventory with an explicit `Showing X ranked options from 6 hotels loaded` status, preventing a one-card consensus shortlist from being mistaken for incomplete inventory.
- A fresh version 14 production run discovered all 27 tools, executed the seven core reads, synchronized reversible visible writes, opened the Pensão Lumen compromise draft, verified `purchaseOccurred: false`, and showed 15 agent calls with zero autonomous purchases. Evidence: `submission/artifacts/webmcp-production-v14.png`.
- Production collaboration acceptance verified workspace creation, custom capacity, invitation creation/listing, traveler-scoped access, revocation, and denial of the revoked credential.

## Registered tools

### Read and reason

`get_collaboration_status`, `get_workspace_state`, `list_travelers_and_constraints`, `search_hotel_inventory`, `compare_scenarios`, `explain_conflicts`, `get_onboarding_status`, `list_invitations`

### Visible, permission-aware actions

`open_workspace_setup`, `create_workspace`, `open_invite_traveler`, `create_invitation`, `revoke_invitation`, `open_workspace_settings`, `open_workspace_onboarding`, `configure_trip_workspace`, `set_workspace_capacity`, `update_traveler_profile`, `add_constraint`, `remove_constraint`, `set_constraint_priority`, `lock_constraint`, `veto_hotel`, `create_scenarios`, `select_scenario`, `select_hotel`, `prepare_booking_draft`

Invitation tools create or revoke private links but never send external messages. Booking tools stop at a visible human-confirmation draft; no booking, payment, or charge endpoint exists.

## Honest demo state

The deployed build currently uses the curated deterministic inventory provider. TravelWithWadjet or another licensed supplier can replace it through the documented server-side provider adapter after its endpoint and credentials are configured. The application must not describe supplier data as live until that configuration is complete.
