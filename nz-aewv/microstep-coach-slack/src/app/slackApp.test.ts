import assert from "node:assert/strict";
import test from "node:test";

import { renderMicrostepMessage } from "../handlers/renderMicrostepMessage";
import { InMemoryMicrostepWorkflowStore } from "../workflow/microstepWorkflow";
import { handleSlackInteractivityRequest } from "./slackApp";

test("processes a Done button click end-to-end through the app entrypoint", async () => {
  const messagePayload = renderMicrostepMessage(
    {
      step_text: "Open the reimbursement form and upload the first two receipts.",
      duration_minutes: 10,
      success_criteria: "Two receipts are uploaded in the form.",
      fallback_if_stuck: "Find and pin the receipts folder.",
      clarifying_question: null
    },
    {
      sessionId: "session_e2e",
      stepId: "step_e2e"
    }
  );

  const actionsBlock = messagePayload.blocks[messagePayload.blocks.length - 1] as {
    type: string;
    elements: Array<{ action_id: string; value: string }>;
  };
  const doneButton = actionsBlock.elements.find(
    (element) => element.action_id === "microstep_done"
  );

  if (!doneButton) {
    throw new Error("Expected done button in rendered microstep actions block.");
  }

  const dispatchLog: string[] = [];
  const response = await handleSlackInteractivityRequest(
    {
      payload: JSON.stringify({
        type: "block_actions",
        user: { id: "U777" },
        channel: { id: "D777" },
        message: { ts: "1700000.001" },
        actions: [
          {
            action_id: doneButton.action_id,
            value: doneButton.value
          }
        ]
      })
    },
    {
      handlers: {
        onDone: async (interaction) => {
          dispatchLog.push(
            `${interaction.action}:${interaction.sessionId}:${interaction.stepId}`
          );
        }
      }
    }
  );

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    ok: true,
    handled: true,
    action: "done",
    session_id: "session_e2e",
    step_id: "step_e2e"
  });
  assert.deepEqual(dispatchLog, ["done:session_e2e:step_e2e"]);
});

test("returns 400 when interactivity payload is missing", async () => {
  const response = await handleSlackInteractivityRequest({});

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, {
    ok: false,
    handled: false,
    reason: "missing_payload"
  });
});

test("runs full Start → Too hard → Snooze → Done workflow with default callbacks", async () => {
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
      sessionId: "session_workflow",
      stepId: "step_workflow"
    }
  );
  const actionsBlock = messagePayload.blocks[messagePayload.blocks.length - 1] as {
    elements: Array<{ action_id: string; value: string }>;
  };
  const byId = new Map(
    actionsBlock.elements.map((element) => [element.action_id, element])
  );

  const click = async (actionId: string, actionTs: string) =>
    handleSlackInteractivityRequest(
      {
        payload: JSON.stringify({
          type: "block_actions",
          user: { id: "U100" },
          channel: { id: "D100" },
          message: { ts: "1700000.100" },
          actions: [
            {
              action_id: actionId,
              action_ts: actionTs,
              value: byId.get(actionId)?.value
            }
          ]
        })
      },
      { workflowStore }
    );

  const startResponse = await click("microstep_start_focus", "1700000.101");
  assert.equal(startResponse.status, 200);
  assert.equal(workflowStore.getSession("session_workflow")?.status, "in_progress");

  const tooHardResponse = await click("microstep_too_hard", "1700000.102");
  assert.equal(tooHardResponse.status, 200);
  assert.equal(
    workflowStore.getSession("session_workflow")?.status,
    "needs_breakdown"
  );

  const snoozeResponse = await click("microstep_snooze_15", "1700000.103");
  assert.equal(snoozeResponse.status, 200);
  assert.equal(workflowStore.getSession("session_workflow")?.status, "snoozed");

  const doneResponse = await click("microstep_done", "1700000.104");
  assert.equal(doneResponse.status, 200);
  assert.deepEqual(doneResponse.body, {
    ok: true,
    handled: true,
    action: "done",
    session_id: "session_workflow",
    step_id: "step_workflow"
  });

  const finalSession = workflowStore.getSession("session_workflow");
  assert.equal(finalSession?.status, "done");
  assert.equal(finalSession?.rescueCount, 1);
  assert.deepEqual(finalSession?.completedStepIds, ["step_workflow"]);
  assert.deepEqual(
    finalSession?.history.map((historyItem) => historyItem.action),
    ["start_focus", "too_hard", "snooze_15", "done"]
  );
});
