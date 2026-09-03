# External agent capture runbook

Status: accepted and incorporated into `artifacts/commonground-final-submission-master.mp4` on September 3, 2026.

This is the one replacement clip the final video needs. It must show the recognizable ChatGPT/Codex conversation and CommonGround together; do not substitute the in-page test harness.

## Before recording

1. Open <https://commonground-travel.a-deghiedy.chatgpt.site/> in the Codex/ChatGPT built-in browser.
   Do not open `chatgpt.com` and CommonGround in two ordinary Chrome tabs; that does not attach ChatGPT to the page’s WebMCP context.
2. Confirm the green header badge reads **WebMCP · 27 tools** and inventory has finished loading.
3. Open the Browser **Site Tools** control and approve CommonGround website access if prompted.
   Before recording, invoke `get_workspace_state` once and confirm the dashboard’s **agent calls this session** counter increases.
4. Run the warm-up check below **off camera**. Start recording only after it passes. Do not reload the page, reconnect the browser, or open another tab between the warm-up and the recorded prompt.
5. Keep the conversation on the left and the CommonGround browser on the right. Collapse unrelated panels and hide notifications.
6. Begin on the populated demo workspace. Do not show sign-in, setup, invitation tokens, loading states, or browser-connection retries.

### Off-camera warm-up check

Paste this into the same agent conversation that will be recorded:

> Use the CommonGround Site Tools already attached to this built-in browser page. Do not reload or open another tab. Call `get_workspace_state` and report only: the discovered Site Tool count, workspace name, destination, and traveler names.

Proceed only when the response reports **27 tools**, **Demo workspace**, **Lisbon, Portugal**, and **Maya, Diego, Sana, and Leo**, and the dashboard says **Agent active** with a nonzero call count. If browser setup resets, recover off camera and repeat this check; that failure belongs to the Codex browser-control session, not to a CommonGround Site Tool invocation.

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

The frame must also show the CommonGround board changing to **Balanced Compromise**, a hotel becoming **Selected**, and the booking-draft drawer stating that no purchase occurred. Keep the **Approve draft** button visible but do not click it. Cut network waits, but do not recreate or imitate tool cards.

## Capture settings

- 1920×1080 preferred; 1600×900 acceptable.
- 30 fps.
- Record system UI only; the final narration is added separately.
- Keep the cursor deliberate and stationary while responses render.
- Save as `commonground-external-agent.mp4` in `submission/artifacts/`.

## Acceptance gate

The clip is accepted only when the external agent interface is recognizable, the 27-tool CommonGround origin is visible, at least one read and one visible write tool are shown, the booking draft is visible, and no purchase or secret is exposed.
