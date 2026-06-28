import type { Block, KnownBlock } from "@slack/types";
import {
  formatDurationForDisplay,
  formatTextForDyscalculiaSupport
} from "../accessibility/dyscalculiaPhrasing";

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

const buildStepBlock = (
  response: MicrostepResponse,
  dyscalculiaFriendlyPhrasing: boolean
): KnownBlock => ({
  type: "section",
  text: {
    type: "mrkdwn",
    text: `*Action now*\n${formatTextForDyscalculiaSupport(
      response.step_text,
      dyscalculiaFriendlyPhrasing
    )}`
  }
});

const buildTimeContextBlock = (
  response: MicrostepResponse,
  dyscalculiaFriendlyPhrasing: boolean
): KnownBlock => ({
  type: "context",
  elements: [
    {
      type: "mrkdwn",
      text: `⏱️ Estimated time: *${formatDurationForDisplay(
        response.duration_minutes,
        dyscalculiaFriendlyPhrasing
      )}*`
    }
  ]
});

const buildGuidanceBlock = (
  response: MicrostepResponse,
  dyscalculiaFriendlyPhrasing: boolean
): KnownBlock => ({
  type: "section",
  fields: [
    {
      type: "mrkdwn",
      text: `*Done looks like*\n${formatTextForDyscalculiaSupport(
        response.success_criteria,
        dyscalculiaFriendlyPhrasing
      )}`
    },
    {
      type: "mrkdwn",
      text: `*If stuck*\n${formatTextForDyscalculiaSupport(
        response.fallback_if_stuck,
        dyscalculiaFriendlyPhrasing
      )}`
    }
  ]
});

const buildClarifyingQuestionBlock = (
  response: MicrostepResponse,
  dyscalculiaFriendlyPhrasing: boolean
): KnownBlock | null => {
  if (!response.clarifying_question) {
    return null;
  }

  return {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*Quick clarification*\n${formatTextForDyscalculiaSupport(
        response.clarifying_question,
        dyscalculiaFriendlyPhrasing
      )}`
    }
  };
};

const buildActionsBlock = (
  context: MicrostepRenderContext,
  response: MicrostepResponse,
  dyscalculiaFriendlyPhrasing: boolean
): KnownBlock => {
  const actionIds = {
    ...DEFAULT_MICROSTEP_ACTION_IDS,
    ...context.actionIds
  };
  const value = toActionValue(context);
  const startLabel = dyscalculiaFriendlyPhrasing
    ? `Start ${formatDurationForDisplay(response.duration_minutes, true)}`
    : `Start ${response.duration_minutes} min`;
  const snoozeLabel = dyscalculiaFriendlyPhrasing
    ? "Snooze fifteen minutes"
    : "Snooze 15m";

  return {
    type: "actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: startLabel,
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
          text: snoozeLabel,
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
  const dyscalculiaFriendlyPhrasing =
    context.dyscalculiaFriendlyPhrasing === true;
  const clarifyingBlock = buildClarifyingQuestionBlock(
    response,
    dyscalculiaFriendlyPhrasing
  );

  return [
    buildHeaderBlock(),
    { type: "divider" },
    buildStepBlock(response, dyscalculiaFriendlyPhrasing),
    buildTimeContextBlock(response, dyscalculiaFriendlyPhrasing),
    buildGuidanceBlock(response, dyscalculiaFriendlyPhrasing),
    ...(clarifyingBlock ? [clarifyingBlock] : []),
    buildActionsBlock(context, response, dyscalculiaFriendlyPhrasing)
  ];
};
