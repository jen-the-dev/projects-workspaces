import type { Block, KnownBlock } from "@slack/types";

import {
  DEFAULT_MICROSTEP_ACTION_IDS,
  type MicrostepRenderContext,
  type MicrostepResponse
} from "../types/microstep";

const toActionValue = (context: MicrostepRenderContext): string =>
  JSON.stringify({
    session_id: context.sessionId,
    step_id: context.stepId
  });

const buildHeaderBlock = (): KnownBlock => ({
  type: "header",
  text: {
    type: "plain_text",
    text: "Next microstep",
    emoji: true
  }
});

const buildStepBlock = (response: MicrostepResponse): KnownBlock => ({
  type: "section",
  text: {
    type: "mrkdwn",
    text: `*Action now*\n${response.step_text}`
  }
});

const buildTimeContextBlock = (response: MicrostepResponse): KnownBlock => ({
  type: "context",
  elements: [
    {
      type: "mrkdwn",
      text: `⏱️ Estimated time: *${response.duration_minutes} min*`
    }
  ]
});

const buildGuidanceBlock = (response: MicrostepResponse): KnownBlock => ({
  type: "section",
  fields: [
    {
      type: "mrkdwn",
      text: `*Done looks like*\n${response.success_criteria}`
    },
    {
      type: "mrkdwn",
      text: `*If stuck*\n${response.fallback_if_stuck}`
    }
  ]
});

const buildClarifyingQuestionBlock = (
  response: MicrostepResponse
): KnownBlock | null => {
  if (!response.clarifying_question) {
    return null;
  }

  return {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*Quick clarification*\n${response.clarifying_question}`
    }
  };
};

const buildActionsBlock = (
  context: MicrostepRenderContext,
  response: MicrostepResponse
): KnownBlock => {
  const actionIds = {
    ...DEFAULT_MICROSTEP_ACTION_IDS,
    ...context.actionIds
  };
  const value = toActionValue(context);

  return {
    type: "actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: `Start ${response.duration_minutes} min`,
          emoji: true
        },
        action_id: actionIds.startFocus,
        style: "primary",
        value
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "Done",
          emoji: true
        },
        action_id: actionIds.done,
        value
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "Too hard",
          emoji: true
        },
        action_id: actionIds.tooHard,
        value
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "Snooze 15m",
          emoji: true
        },
        action_id: actionIds.snooze15,
        value
      }
    ]
  };
};

export const buildMicrostepBlocks = (
  response: MicrostepResponse,
  context: MicrostepRenderContext
): (KnownBlock | Block)[] => {
  const clarifyingBlock = buildClarifyingQuestionBlock(response);

  return [
    buildHeaderBlock(),
    { type: "divider" },
    buildStepBlock(response),
    buildTimeContextBlock(response),
    buildGuidanceBlock(response),
    ...(clarifyingBlock ? [clarifyingBlock] : []),
    buildActionsBlock(context, response)
  ];
};
