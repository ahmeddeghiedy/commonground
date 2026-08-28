# Browser support and WebMCP enablement

CommonGround is a progressive web application. The complete human workspace—collaboration, invitations, capacity controls, inventory, scoring, and booking drafts—works without WebMCP. Structured agent tools are added only when the browser exposes `document.modelContext`.

## Current support matrix

| Environment | CommonGround app | Native WebMCP tools | Enablement |
|---|---:|---:|---|
| ChatGPT desktop built-in browser | Yes | Yes | Browser settings → Permissions → Enable Site Tools; reload; approve website access. |
| Chrome 149+ | Yes | Yes, experimental | Testing flag for demos, or the Chrome WebMCP origin trial for public no-flag access. |
| Comet | Yes | Not officially documented | No reliable native WebMCP switch currently exists. The assistant can still use ordinary page interaction. |
| Firefox | Yes | Not currently implemented | No native switch currently exists. |

WebMCP is intentionally a progressive enhancement. An unsupported browser never blocks or degrades the human experience.

## ChatGPT desktop

1. Open CommonGround in ChatGPT's built-in desktop browser.
2. Open **Browser settings → Permissions**.
3. Enable **Site Tools**.
4. Reload CommonGround and use an eligible account and model.
5. Approve the website-access prompt when the agent requests it.
6. Confirm the address-bar arrow is present. It turns blue while tools are being used.
7. Confirm the CommonGround header says **WebMCP · 15 tools**.

Official instructions: <https://help.openai.com/en/articles/20001423-using-site-tools-in-the-chatgpt-desktop-app>

## Chrome testing—the fastest judge setup

1. Install or update to Chrome 149 or newer.
2. Open `chrome://flags/#enable-webmcp-testing`.
3. Set **WebMCP testing** to **Enabled**.
4. Relaunch Chrome completely.
5. Open the deployed CommonGround URL in a top-level tab.
6. Confirm the header says **WebMCP · 15 tools**.
7. Use the WebMCP Model Context Tool Inspector extension or another WebMCP-aware agent to inspect and invoke the tools.

Official Chrome documentation: <https://developer.chrome.com/docs/ai/webmcp>

## Chrome public origin trial—no flag for visitors

The production site already emits an origin-trial meta tag whenever `WEBMCP_ORIGIN_TRIAL_TOKEN` is configured. To activate it:

1. Enroll the exact origin `https://commonground-travel.a-deghiedy.chatgpt.site` in Chrome's WebMCP origin trial.
2. Copy the issued origin-trial token.
3. Store it in the Codex Sites production environment as `WEBMCP_ORIGIN_TRIAL_TOKEN`.
4. Redeploy the current saved version so the environment revision becomes active.
5. Visit `/api/health` and confirm `webmcp.originTrialConfigured` is `true`.
6. Test in a fresh Chrome profile without the local testing flag.

The origin-trial token is origin-bound and public by design, but it should still be managed through the Sites environment rather than hard-coded into the repository.

## Comet and Firefox

Both browsers can use the complete CommonGround UI. At the time of writing, neither vendor documents a production switch for the WebMCP `document.modelContext` API. Do not advertise structured tool discovery in those browsers until it can be verified. CommonGround's readiness dialog reports this honestly and keeps every human workflow available.

## Troubleshooting

- **Badge says “WebMCP ready · connect browser”**: click it for the browser-specific support center.
- **Chrome flag is enabled but the badge does not change**: relaunch every Chrome window, verify the page is top-level, and confirm Chrome is current.
- **ChatGPT desktop arrow is missing**: verify Site Tools permission, account/model eligibility, and reload the tab.
- **Exactly 15 tools are not shown**: run `pnpm verify:webmcp` or the project’s Chrome verifier before presenting.
- **The app works but tools are absent**: this is expected in a browser without `document.modelContext`; it is not an application outage.
