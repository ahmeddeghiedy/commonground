# Release and Submission Checklist

## Repository

- [x] Publish the canonical repository at `ahmeddeghiedy/commonground` while retaining the private development remote separately.
- [x] Confirm `pnpm-lock.yaml`, `LICENSE`, `.env.example`, and documentation are committed.
- [x] Confirm secrets, `.next`, and `node_modules` are not committed.
- [x] Add repository URL to `docs/SUBMISSION.md`.
- [x] Make the repository public before submission.

## Deployment

- [x] Deploy to a dedicated public HTTPS development URL.
- [ ] Configure Wadjet/custom inventory credentials, or intentionally keep deterministic demo inventory.
- [ ] Enroll the final origin in Chrome's WebMCP origin trial.
- [ ] Set `WEBMCP_ORIGIN_TRIAL_TOKEN` and redeploy.
- [ ] Verify the `Origin-Trial` response header on the public URL.
- [x] Add the live URL to `docs/SUBMISSION.md`.

## Verification

- [x] `pnpm test` — 23 tests passing.
- [x] `pnpm lint` — zero errors.
- [x] `pnpm build` — production build passing.
- [x] `pnpm verify:webmcp` — 27 production tools registered; workspace/traveler identity, seven core reads, latency budget, and visible hotel/scenario writes verified on September 3, 2026.
- [ ] Run every prompt in `WEBMCP_EVALS.md` with the final agent/browser.
- [ ] Verify desktop and mobile layouts on the deployed URL.
- [ ] Verify the fallback demo with supplier credentials removed.

## Demo and Devpost

- [x] Record and assemble a clean approximately 2:06 video using the final submission script.
- [ ] Add captions and zoom enough for the activity log and safety boundary to remain legible.
- [x] Capture a production hero screenshot showing the connected 27-tool status.
- [x] Capture the recognizable ChatGPT/Codex Site Tools conversation beside CommonGround for the replacement video.
- [ ] Complete the Devpost copy from `docs/SUBMISSION.md`.
- [ ] Confirm all links are public in an incognito browser.
