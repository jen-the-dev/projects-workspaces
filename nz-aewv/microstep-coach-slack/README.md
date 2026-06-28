# Microstep Coach Slack
Reusable Slack Block Kit components and interactivity handling for the Microstep Coach workflow.

## What is included
- Block Kit rendering for microstep messages (`src/components/microstepBlocks.ts`)
- Message composer for `chat.postMessage` payloads (`src/handlers/renderMicrostepMessage.ts`)
- Interaction parsing + dispatch for button clicks (`src/handlers/handleMicrostepInteraction.ts`)
- App-level interactivity entrypoint (`src/app/slackApp.ts`)
- In-memory workflow callback logic (`src/workflow/microstepWorkflow.ts`)

## Workflow integration
`handleSlackInteractivityRequest` is the main integration point for Slack interactivity requests.

It:
1. Accepts Slack form payload bodies (`{ payload: string }`)
2. Parses and validates `block_actions`
3. Routes actions to the microstep callbacks
4. Returns normalized HTTP-style responses for your route handler

Default callback wiring is enabled automatically in the app entrypoint:
- `microstep_start_focus` → marks session `in_progress`, sets check-in due time
- `microstep_done` → marks session `done`, records completed step
- `microstep_too_hard` → marks session `needs_breakdown`, increments rescue count
- `microstep_snooze_15` → marks session `snoozed`, sets snooze/check-in timestamp

By default these actions are handled by an `InMemoryMicrostepWorkflowStore`.  
You can pass a custom `workflowStore` or custom `handlers` when calling `handleSlackInteractivityRequest`.

## Route usage example
```ts
import { handleSlackInteractivityRequest } from "./src/app/slackApp";

app.post("/slack/interactivity", async (req, res) => {
  const result = await handleSlackInteractivityRequest(req.body);
  res.status(result.status).json(result.body);
});
```

## Verification
- Typecheck: `npm run typecheck`
- Tests: `npm test`
- Manual full button workflow:
  - `npm run manual:test-workflow`
  - Simulates Start → Too hard → Snooze → Done and prints final session state
