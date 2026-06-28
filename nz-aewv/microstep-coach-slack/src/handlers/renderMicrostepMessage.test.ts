import assert from "node:assert/strict";
import test from "node:test";

import { buildMicrostepBlocks } from "../components/microstepBlocks";
import { renderMicrostepMessage } from "./renderMicrostepMessage";

const baseResponse = {
  step_text: "Open the reimbursement form and upload the first two receipts.",
  duration_minutes: 10,
  success_criteria: "Two receipts are uploaded in the form.",
  fallback_if_stuck: "Find and pin the receipts folder.",
  clarifying_question: null
} as const;

test("renders postMessage payload with fallback text, blocks, and metadata", () => {
  const context = { sessionId: "session_10", stepId: "step_10" };
  const payload = renderMicrostepMessage(baseResponse, context);

  assert.equal(
    payload.text,
    "Next microstep: Open the reimbursement form and upload the first two receipts. (about 10 min)."
  );
  assert.deepEqual(payload.blocks, buildMicrostepBlocks(baseResponse, context));
  assert.deepEqual(payload.metadata, {
    event_type: "microstep_rendered",
    event_payload: {
      session_id: "session_10",
      step_id: "step_10"
    }
  });
});

test("propagates custom action IDs and clarification content through renderer blocks", () => {
  const payload = renderMicrostepMessage(
    {
      ...baseResponse,
      clarifying_question: "Is this reimbursement for travel or meals?"
    },
    {
      sessionId: "session_11",
      stepId: "step_11",
      actionIds: {
        startFocus: "start_now_custom",
        snooze15: "snooze_custom"
      }
    }
  );

  const actionsBlock = payload.blocks[payload.blocks.length - 1] as {
    type: string;
    elements: Array<{ action_id: string }>;
  };
  const clarificationBlock = payload.blocks[5] as { text: { text: string } };

  assert.equal(actionsBlock.type, "actions");
  assert.deepEqual(
    actionsBlock.elements.map((element) => element.action_id),
    [
      "start_now_custom",
      "microstep_done",
      "microstep_too_hard",
      "snooze_custom"
    ]
  );
  assert.match(clarificationBlock.text.text, /Quick clarification/);
  assert.match(clarificationBlock.text.text, /travel or meals/);
});

test("formats fallback message text with dyscalculia-friendly phrasing when enabled", () => {
  const payload = renderMicrostepMessage(
    {
      step_text: "Upload 2 receipts in 10 min.",
      duration_minutes: 30,
      success_criteria: "2 receipts uploaded.",
      fallback_if_stuck: "Review 1 receipt first.",
      clarifying_question: null
    },
    {
      sessionId: "session_12",
      stepId: "step_12",
      dyscalculiaFriendlyPhrasing: true
    }
  );

  assert.equal(
    payload.text,
    "Next microstep: Upload two receipts in one ten-minute block. (about two blocks of fifteen minutes)."
  );
});
