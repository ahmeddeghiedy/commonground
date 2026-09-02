# External agent capture runbook

This is the one replacement clip the final video needs. It must show the recognizable ChatGPT/Codex conversation and CommonGround together; do not substitute the in-page test harness.

## Before recording

1. Open <https://commonground-travel.a-deghiedy.chatgpt.site/> in the Codex/ChatGPT built-in browser.
2. Confirm the green header badge reads **WebMCP · 27 tools** and inventory has finished loading.
3. Open the Browser **Site Tools** control and approve CommonGround website access if prompted.
4. Keep the conversation on the left and the CommonGround browser on the right. Collapse unrelated panels and hide notifications.
5. Begin on the populated demo workspace. Do not show sign-in, setup, invitation tokens, or loading states.

## One prompt to paste

> Use CommonGround’s site tools to inspect the group, search the current hotel inventory, find the fairest option, explain the key conflicts, switch to Balanced Compromise, select the fairest non-vetoed hotel, and prepare a human-confirmation booking draft. Do not book, purchase, send invitations, or charge anything.

## What the clip must show

Capture 35–50 seconds containing these genuine tool calls or their visible Site Tools cards:

1. `get_workspace_state`
2. `search_hotel_inventory`
3. `explain_conflicts`
4. `select_scenario` with `compromise`
5. `select_hotel`
6. `prepare_booking_draft`

The frame must also show the CommonGround board changing to **Balanced Compromise**, a hotel becoming **Selected**, and the booking-draft drawer stating that no purchase occurred. Keep any approval click visible. Cut network waits, but do not recreate or imitate tool cards.

## Capture settings

- 1920×1080 preferred; 1600×900 acceptable.
- 30 fps.
- Record system UI only; the final narration is added separately.
- Keep the cursor deliberate and stationary while responses render.
- Save as `commonground-external-agent.mp4` in `submission/artifacts/`.

## Acceptance gate

The clip is accepted only when the external agent interface is recognizable, the 27-tool CommonGround origin is visible, at least one read and one visible write tool are shown, the booking draft is visible, and no purchase or secret is exposed.
