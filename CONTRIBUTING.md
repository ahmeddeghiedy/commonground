# Contributing to CommonGround

Thanks for helping improve CommonGround. Please keep changes focused, explain the user outcome, and preserve the human-approval boundary around booking actions.

## Local development

1. Fork and clone the repository.
2. Run `corepack pnpm install`.
3. Run `corepack pnpm dev`.
4. Before opening a pull request, run `corepack pnpm test`, `corepack pnpm lint`, and `corepack pnpm build`.

## Pull requests

- Describe the problem and the observable behavior after the change.
- Add or update tests for behavior changes.
- Keep WebMCP schemas strict and tool results structured.
- Never add credentials, private invitation links, supplier secrets, or traveler data.
- Do not introduce a purchase or payment path under `prepare_booking_draft`; it must remain a human-confirmation draft.

By contributing, you agree that your contribution is licensed under the repository's MIT License.
