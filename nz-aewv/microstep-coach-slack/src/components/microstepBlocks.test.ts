import assert from "node:assert/strict";
import test from "node:test";

import { buildMicrostepBlocks } from "./microstepBlocks";
import { DEFAULT_MICROSTEP_ACTION_IDS } from "../types/microstep";

const baseResponse = {
  step_text: "Open the reimbursement form and upload the first two receipts.",
  duration_minutes: 10,
  success_criteria: "Two receipts are uploaded in the form.",
  fallback_if_stuck: "Find and pin the receipts folder.",
  clarifying_question: null
} as const;

test("renders full microstep blocks with expected content and default actions", () => {
  const context = { sessionId: "session_1", stepId: "step_1" };
  const blocks = buildMicrostepBlocks(baseResponse, context);

  assert.equal(blocks.length, 6);

  assert.equal(blocks[0].type, "header");
  assert.equal(blocks[1].type, "divider");

  const actionSection = blocks[2] as { text: { text: string } };
  const timeContext = blocks[3] as { elements: Array<{ text: string }> };
  const guidanceSection = blocks[4] as { fields: Array<{ text: string }> };
  const actionsBlock = blocks[5] as {
    type: string;
    elements: Array<{
      action_id: string;
      style?: string;
      text: { text: string };
      value: string;
    }>;
  };

  assert.match(actionSection.text.text, /Action now/);
  assert.match(actionSection.text.text, /upload the first two receipts/);
  assert.match(timeContext.elements[0].text, /\*10 min\*/);

  assert.match(guidanceSection.fields[0].text, /Done looks like/);
  assert.match(guidanceSection.fields[0].text, /Two receipts are uploaded/);
  assert.match(guidanceSection.fields[1].text, /If stuck/);
  assert.match(guidanceSection.fields[1].text, /Find and pin the receipts folder/);

  assert.equal(actionsBlock.type, "actions");
  assert.equal(actionsBlock.elements.length, 4);
  assert.equal(actionsBlock.elements[0].text.text, "Start 10 min");
  assert.equal(actionsBlock.elements[0].style, "primary");
  assert.deepEqual(
    actionsBlock.elements.map((button) => button.action_id),
    [
      DEFAULT_MICROSTEP_ACTION_IDS.startFocus,
      DEFAULT_MICROSTEP_ACTION_IDS.done,
      DEFAULT_MICROSTEP_ACTION_IDS.tooHard,
      DEFAULT_MICROSTEP_ACTION_IDS.snooze15
    ]
  );

  for (const button of actionsBlock.elements) {
    assert.deepEqual(JSON.parse(button.value), {
      session_id: context.sessionId,
      step_id: context.stepId
    });
  }
});

test("renders a clarification block only when question exists", () => {
  const withQuestion = buildMicrostepBlocks(
    {
      ...baseResponse,
      clarifying_question: "Is this update for engineering-only or all-hands?"
    },
    {
      sessionId: "session_2",
      stepId: "step_2"
    }
  );

  const withoutQuestion = buildMicrostepBlocks(
    {
      ...baseResponse,
      clarifying_question: null
    },
    {
      sessionId: "session_3",
      stepId: "step_3"
    }
  );

  assert.equal(withQuestion.some((block) => block.type === "actions"), true);
  assert.equal(withQuestion.length, withoutQuestion.length + 1);
  const clarificationBlock = withQuestion[5] as { text: { text: string } };
  assert.match(clarificationBlock.text.text, /Quick clarification/);
  assert.match(clarificationBlock.text.text, /engineering-only or all-hands/);
});

test("allows overriding action IDs via render context", () => {
  const blocks = buildMicrostepBlocks(baseResponse, {
    sessionId: "session_4",
    stepId: "step_4",
    actionIds: {
      done: "custom_done",
      tooHard: "custom_too_hard"
    }
  });

  const actionsBlock = blocks[5] as {
    elements: Array<{ action_id: string }>;
  };
  const actionIds = actionsBlock.elements.map((button) => button.action_id);

  assert.deepEqual(actionIds, [
    DEFAULT_MICROSTEP_ACTION_IDS.startFocus,
    "custom_done",
    "custom_too_hard",
    DEFAULT_MICROSTEP_ACTION_IDS.snooze15
  ]);
});

test("renders dyscalculia-friendly phrasing for duration and quantity when enabled", () => {
  const blocks = buildMicrostepBlocks(
    {
      step_text: "Upload 2 receipts in 10 minutes.",
      duration_minutes: 30,
      success_criteria: "2 receipts are uploaded.",
      fallback_if_stuck: "Review 1 receipt first.",
      clarifying_question: "Can you finish this in 15 min?"
    },
    {
      sessionId: "session_5",
      stepId: "step_5",
      dyscalculiaFriendlyPhrasing: true
    }
  );

  const actionSection = blocks[2] as { text: { text: string } };
  const timeContext = blocks[3] as { elements: Array<{ text: string }> };
  const guidanceSection = blocks[4] as { fields: Array<{ text: string }> };
  const clarificationSection = blocks[5] as { text: { text: string } };
  const actionsBlock = blocks[6] as {
    elements: Array<{ text: { text: string } }>;
  };

  assert.match(actionSection.text.text, /Upload two receipts/);
  assert.match(actionSection.text.text, /one ten-minute block/);
  assert.match(timeContext.elements[0].text, /two blocks of fifteen minutes/);
  assert.match(guidanceSection.fields[0].text, /two receipts are uploaded/);
  assert.match(guidanceSection.fields[1].text, /Review one receipt first/);
  assert.match(clarificationSection.text.text, /one fifteen-minute block/);
  assert.equal(actionsBlock.elements[0].text.text, "Start two blocks of fifteen minutes");
  assert.equal(actionsBlock.elements[3].text.text, "Snooze fifteen minutes");
});
