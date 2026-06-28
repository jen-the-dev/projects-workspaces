import assert from "node:assert/strict";
import test from "node:test";

import {
  handleMicrostepInteraction,
  parseMicrostepInteraction
} from "./handleMicrostepInteraction";

const basePayload = {
  type: "block_actions",
  user: { id: "U123" },
  channel: { id: "D123" },
  message: { ts: "1717000.000200" },
  trigger_id: "trig_123",
  response_url: "https://hooks.slack.com/actions/abc",
  actions: [
    {
      action_id: "microstep_done",
      action_ts: "1717000.000210",
      value: JSON.stringify({
        session_id: "session_1",
        step_id: "step_2"
      })
    }
  ]
} as const;

test("parses a valid default microstep action payload", () => {
  const result = parseMicrostepInteraction(basePayload);

  assert.equal(result.handled, true);
  if (!result.handled) {
    throw new Error("Expected handled result.");
  }

  assert.equal(result.interaction.action, "done");
  assert.equal(result.interaction.actionId, "microstep_done");
  assert.equal(result.interaction.sessionId, "session_1");
  assert.equal(result.interaction.stepId, "step_2");
  assert.equal(result.interaction.userId, "U123");
  assert.equal(result.interaction.channelId, "D123");
  assert.equal(result.interaction.messageTs, "1717000.000200");
});

test("parses JSON-string payload and supports custom action IDs", () => {
  const payload = JSON.stringify({
    ...basePayload,
    actions: [
      {
        action_id: "custom_start_now",
        value: JSON.stringify({
          session_id: "session_custom",
          step_id: "step_custom"
        })
      }
    ]
  });

  const result = parseMicrostepInteraction(payload, {
    actionIds: {
      startFocus: "custom_start_now"
    }
  });

  assert.equal(result.handled, true);
  if (!result.handled) {
    throw new Error("Expected handled result.");
  }

  assert.equal(result.interaction.action, "start_focus");
  assert.equal(result.interaction.sessionId, "session_custom");
  assert.equal(result.interaction.stepId, "step_custom");
});

test("returns unsupported_action when action_id is unrelated", () => {
  const result = parseMicrostepInteraction({
    ...basePayload,
    actions: [
      {
        action_id: "totally_other_button",
        value: JSON.stringify({
          session_id: "session_x",
          step_id: "step_x"
        })
      }
    ]
  });

  assert.deepEqual(result, {
    handled: false,
    reason: "unsupported_action"
  });
});

test("returns invalid_action_value when button value is malformed", () => {
  const result = parseMicrostepInteraction({
    ...basePayload,
    actions: [
      {
        action_id: "microstep_too_hard",
        value: "{not-json"
      }
    ]
  });

  assert.deepEqual(result, {
    handled: false,
    reason: "invalid_action_value"
  });
});

test("dispatches to the matching callback when handled", async () => {
  const dispatchLog: string[] = [];

  const result = await handleMicrostepInteraction(basePayload, {
    handlers: {
      onDone: async (interaction) => {
        dispatchLog.push(
          `${interaction.action}:${interaction.sessionId}:${interaction.stepId}`
        );
      }
    }
  });

  assert.equal(result.handled, true);
  if (!result.handled) {
    throw new Error("Expected handled result.");
  }

  assert.equal(result.dispatched, true);
  assert.deepEqual(dispatchLog, ["done:session_1:step_2"]);
});

test("returns handled=true and dispatched=false when no callback provided", async () => {
  const result = await handleMicrostepInteraction({
    ...basePayload,
    actions: [
      {
        action_id: "microstep_snooze_15",
        value: JSON.stringify({
          session_id: "session_9",
          step_id: "step_9"
        })
      }
    ]
  });

  assert.equal(result.handled, true);
  if (!result.handled) {
    throw new Error("Expected handled result.");
  }

  assert.equal(result.interaction.action, "snooze_15");
  assert.equal(result.dispatched, false);
});
