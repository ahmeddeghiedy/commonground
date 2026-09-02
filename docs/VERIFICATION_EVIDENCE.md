# Production verification evidence

Verified on September 2, 2026 against:

- Live application: <https://commonground-travel.a-deghiedy.chatgpt.site/>
- Source checkpoint: `924522303665e0846a8e16555c0d3d3caac984ee`
- Sites release: version 9

## Automated results

- `pnpm lint`: passed with zero errors.
- TypeScript `--noEmit`: passed.
- `pnpm test`: 21 tests passed in 2 files.
- Production build: passed from an isolated staging path to avoid Dropbox file locking on Windows.
- Collaboration API acceptance test: workspace creation, custom capacity, invitation creation/listing, traveler-scoped access, revocation, removal, and rejection of the revoked token all passed.
- Public health check: status `ok`, 27 WebMCP tools, human approval required, autonomous purchase disabled, deterministic demo inventory active.
- Public Chrome WebMCP verification: all 27 expected tools discovered; `get_workspace_state` and `get_onboarding_status` executed; hotel and scenario selections changed both structured state and the visible UI, then were restored.

## Registered tools

### Read and reason

`get_collaboration_status`, `get_workspace_state`, `list_travelers_and_constraints`, `search_hotel_inventory`, `compare_scenarios`, `explain_conflicts`, `get_onboarding_status`, `list_invitations`

### Visible, permission-aware actions

`open_workspace_setup`, `create_workspace`, `open_invite_traveler`, `create_invitation`, `revoke_invitation`, `open_workspace_settings`, `open_workspace_onboarding`, `configure_trip_workspace`, `set_workspace_capacity`, `update_traveler_profile`, `add_constraint`, `remove_constraint`, `set_constraint_priority`, `lock_constraint`, `veto_hotel`, `create_scenarios`, `select_scenario`, `select_hotel`, `prepare_booking_draft`

Invitation tools create or revoke private links but never send external messages. Booking tools stop at a visible human-confirmation draft; no booking, payment, or charge endpoint exists.

## Honest demo state

The deployed build currently uses the curated deterministic inventory provider. TravelWithWadjet or another licensed supplier can replace it through the documented server-side provider adapter after its endpoint and credentials are configured. The application must not describe supplier data as live until that configuration is complete.
