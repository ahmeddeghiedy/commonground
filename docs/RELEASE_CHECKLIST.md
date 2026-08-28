# Release and Submission Checklist

## Repository

- [x] Initialize the Git repository on `main` and connect `vteamtech/commonground`.
- [ ] Confirm `pnpm-lock.yaml`, `LICENSE`, `.env.example`, and documentation are committed.
- [ ] Confirm `.env*`, `.next`, and `node_modules` are not committed.
- [x] Add repository URL to `docs/SUBMISSION.md`.
- [ ] Make the repository public before submission.

## Deployment

- [ ] Deploy to a dedicated HTTPS development URL.
- [ ] Configure TrailTrix inventory credentials, or intentionally keep deterministic demo inventory.
- [ ] Enroll the final origin in Chrome's WebMCP origin trial.
- [ ] Set `WEBMCP_ORIGIN_TRIAL_TOKEN` and redeploy.
- [ ] Verify the `Origin-Trial` response header on the public URL.
- [ ] Add the live URL to `docs/SUBMISSION.md`.

## Verification

- [x] `pnpm test` — 18 tests passing.
- [x] `pnpm lint` — zero errors.
- [x] `pnpm build` — production build passing.
- [x] `pnpm verify:webmcp` — 11 tools registered, read executed, visible reversible write verified.
- [ ] Run every prompt in `WEBMCP_EVALS.md` with the final agent/browser.
- [ ] Verify desktop and mobile layouts on the deployed URL.
- [ ] Verify the fallback demo with supplier credentials removed.

## Demo and Devpost

- [ ] Record a clean sub-three-minute video using `docs/DEMO_SCRIPT.md`.
- [ ] Add captions and zoom enough for the activity log and safety boundary to remain legible.
- [ ] Capture a hero screenshot and a WebMCP DevTools/Inspector screenshot showing all 11 tools.
- [ ] Complete the Devpost copy from `docs/SUBMISSION.md`.
- [ ] Confirm all links are public in an incognito browser.
