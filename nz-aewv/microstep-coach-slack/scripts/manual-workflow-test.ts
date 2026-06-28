import assert from "node:assert/strict";

import { renderMicrostepMessage } from "../src/handlers/renderMicrostepMessage";
import { handleSlackInteractivityRequest } from "../src/app/slackApp";
import { InMemoryMicrostepWorkflowStore } from "../src/workflow/microstepWorkflow";

const workflowStore = new InMemoryMicrostepWorkflowStore();

const messagePayload = renderMicrostepMessage(
  {
    step_text: "Open the reimbursement form and upload the first two receipts.",
    duration_minutes: 10,
    success_criteria: "Two receipts are uploaded in the form.",
    fallback_if_stuck: "Find and pin the receipts folder.",
    clarifying_question: null
  },
  {
    sessionId: "session_manual",
    stepId: "step_manual"
  }
);

const actionsBlock = messagePayload.blocks[messagePayload.blocks.length - 1] as {
  elements: Array<{ action_id: string; value: string }>;
};
const actionValueById = new Map(
  actionsBlock.elements.map((element) => [element.action_id, element.value])
);

const click = async (actionId: string, actionTs: string): Promise<void> => {
  const response = await handleSlackInteractivityRequest(
    {
      payload: JSON.stringify({
        type: "block_actions",
        user: { id: "U_MANUAL" },
        channel: { id: "D_MANUAL" },
        message: { ts: "1700000.001" },
        actions: [
          {
            action_id: actionId,
            action_ts: actionTs,
            value: actionValueById.get(actionId)
          }
        ]
      })
    },
    { workflowStore }
  );
  assert.equal(response.status, 200);
};

const run = async (): Promise<void> => {
  await click("microstep_start_focus", "1700000.101");
  await click("microstep_too_hard", "1700000.102");
  await click("microstep_snooze_15", "1700000.103");
  await click("microstep_done", "1700000.104");

  const finalSession = workflowStore.getSession("session_manual");
  assert.ok(finalSession, "Expected final session state to be present.");
  assert.equal(finalSession?.status, "done");
  assert.equal(finalSession?.rescueCount, 1);
  assert.deepEqual(finalSession?.completedStepIds, ["step_manual"]);
  assert.deepEqual(
    finalSession?.history.map((historyItem) => historyItem.action),
    ["start_focus", "too_hard", "snooze_15", "done"]
  );

  console.log("Manual workflow test passed.");
  console.log(
    JSON.stringify(
      {
        sessionId: finalSession?.sessionId,
        currentStepId: finalSession?.currentStepId,
        status: finalSession?.status,
        rescueCount: finalSession?.rescueCount,
        completedStepIds: finalSession?.completedStepIds,
        history: finalSession?.history
      },
      null,
      2
    )
  );
};

run().catch((error: unknown) => {
  console.error("Manual workflow test failed.");
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
