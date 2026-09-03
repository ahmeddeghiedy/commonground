# Devpost — Additional Info

Use the following answers for the **Additional info** step.

Complete the submitter type, country of residence, and optional organization fields directly in Devpost. These personal eligibility answers are intentionally excluded from the public repository.

## App Status

**New**

CommonGround was created as a new, standalone project for the WebMCP Challenge. It is informed by our experience with group-travel products, but it is not a resubmission or a renamed version of an existing application.

## If Existing, explain what you updated

Leave this blank because **New** is selected.

## Live URL

https://commonground-travel.a-deghiedy.chatgpt.site/

## Testing instructions

```text
No login or credentials are required.

1. Open the live URL in ChatGPT desktop's built-in browser with Browser settings → Permissions → Site Tools enabled. Approve the website-access prompt if it appears. Alternatively, use Google Chrome with WebMCP testing enabled and the Model Context Tool Inspector.

2. Click “Reset workspace,” wait for the inventory to load, and confirm the header shows “WebMCP · 27 tools” in green.

3. Ask the browser agent:

Use CommonGround’s Site Tools to inspect the group, list every traveler’s budget and locked must-have, explain the conflicts, search inventory, compare all three scenarios, select the fairest zero-violation option in Balanced Compromise, and prepare a booking draft. Do not approve, book, purchase, message, or charge anything.

4. Expected result: the agent identifies Maya, Diego, Sana, and Leo; explains the €80, €100, and €140 budget conflicts; selects Balanced Compromise and Pensão Lumen; and opens an “Approve booking draft” dialog for EUR 380.

5. Confirm the dashboard reports a nonzero agent-call count, the latest Site Tool action as completed, and zero autonomous purchases. Leave the approval button untouched. The agent prepares a draft only; no reservation, purchase, message, or charge occurs.

The full human interface can also be tested without WebMCP. “Create your trip workspace” opens the guided workspace, capacity, invitation, traveler-priority, and onboarding flow for groups of up to 30 people.
```

## Public code repository

https://github.com/ahmeddeghiedy/commonground

The repository is public and includes the MIT license in the root `LICENSE` file.

## Which agents or clients did you test your WebMCP tools with?

```text
We tested the 27 WebMCP Site Tools with the Codex agent through ChatGPT desktop’s built-in browser and Site Tools interface. We also tested discovery and execution in Google Chrome’s experimental WebMCP implementation using the Model Context Tool Inspector. Automated Chrome acceptance tests verify tool registration, strict schemas, reads and writes, visible state synchronization, permissions, cancellation/error handling, and the human-only booking-draft boundary.
```

## Which AI tools did you leverage while working on this project?

```text
We used OpenAI Codex for implementation, debugging, automated tests, browser acceptance testing, deployment support, and documentation. We used the ChatGPT/Codex Site Tools agent for genuine end-to-end WebMCP tests against the deployed application. AI-assisted narration helped produce the male demo voice-over, and Adobe Express was used to assemble and render the final video. All demonstrated agent actions are real calls to the deployed Site Tools, not a simulated transcript.
```

## Level of learning derived from the project

**Significant**

## Did you gain AI value that you can use in your career?

**Yes**
