import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryMicrostepWorkflowStore,
  createMicrostepInteractionHandlers
} from "./microstepWorkflow";

const interactionContext = {
  actionId: "microstep_start_focus",
  actionTs: "1700000.100",
  sessionId: "session_workflow_unit",
  stepId: "step_workflow_unit",
  userId: "U100",
  channelId: "D100",
  messageTs: "1700000.000",
  triggerId: null,
  responseUrl: null,
  rawActionValue: JSON.stringify({
    session_id: "session_workflow_unit",
    step_id: "step_workflow_unit"
  })
} as const;

test("workflow callbacks update state transitions and scheduling timestamps", () => {
  const store = new InMemoryMicrostepWorkflowStore();
  const handlers = createMicrostepInteractionHandlers(store);

  handlers.onStartFocus?.({
    ...interactionContext,
    action: "start_focus"
  });
  const started = store.getSession("session_workflow_unit");
  assert.equal(started?.status, "in_progress");
  assert.equal(typeof started?.checkInDueAt, "string");
  assert.equal(started?.snoozedUntil, null);

  handlers.onSnooze15?.({
    ...interactionContext,
    action: "snooze_15",
    actionId: "microstep_snooze_15",
    actionTs: "1700000.200"
  });
  const snoozed = store.getSession("session_workflow_unit");
  assert.equal(snoozed?.status, "snoozed");
  assert.equal(typeof snoozed?.snoozedUntil, "string");
  assert.equal(snoozed?.checkInDueAt, snoozed?.snoozedUntil);

  handlers.onTooHard?.({
    ...interactionContext,
    action: "too_hard",
    actionId: "microstep_too_hard",
    actionTs: "1700000.300"
  });
  const tooHard = store.getSession("session_workflow_unit");
  assert.equal(tooHard?.status, "needs_breakdown");
  assert.equal(tooHard?.rescueCount, 1);

  handlers.onDone?.({
    ...interactionContext,
    action: "done",
    actionId: "microstep_done",
    actionTs: "1700000.400"
  });
  const done = store.getSession("session_workflow_unit");
  assert.equal(done?.status, "done");
  assert.deepEqual(done?.completedStepIds, ["step_workflow_unit"]);
  assert.equal(done?.checkInDueAt, null);
  assert.equal(done?.snoozedUntil, null);
  assert.deepEqual(
    done?.history.map((item) => item.action),
    ["start_focus", "snooze_15", "too_hard", "done"]
  );
});
