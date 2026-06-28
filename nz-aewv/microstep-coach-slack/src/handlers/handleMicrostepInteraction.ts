import {
  DEFAULT_MICROSTEP_ACTION_IDS,
  type MicrostepActionIds
} from "../types/microstep";

export type MicrostepInteractionAction =
  | "start_focus"
  | "done"
  | "too_hard"
  | "snooze_15";

export type MicrostepInteractionUnhandledReason =
  | "invalid_payload_json"
  | "unsupported_payload_type"
  | "missing_action"
  | "unsupported_action"
  | "missing_action_value"
  | "invalid_action_value";

export interface SlackBlockActionPayload {
  type: string;
  trigger_id?: string;
  response_url?: string;
  user?: { id?: string };
  channel?: { id?: string };
  message?: { ts?: string };
  actions?: Array<{
    action_id?: string;
    value?: string;
    action_ts?: string;
  }>;
}

export interface MicrostepInteractionContext {
  action: MicrostepInteractionAction;
  actionId: string;
  actionTs: string | null;
  sessionId: string;
  stepId: string;
  userId: string | null;
  channelId: string | null;
  messageTs: string | null;
  triggerId: string | null;
  responseUrl: string | null;
  rawActionValue: string;
}

export interface MicrostepInteractionHandlers {
  onStartFocus?: (
    context: MicrostepInteractionContext
  ) => void | Promise<void>;
  onDone?: (context: MicrostepInteractionContext) => void | Promise<void>;
  onTooHard?: (context: MicrostepInteractionContext) => void | Promise<void>;
  onSnooze15?: (context: MicrostepInteractionContext) => void | Promise<void>;
}

export interface MicrostepInteractionHandleOptions {
  actionIds?: Partial<MicrostepActionIds>;
  handlers?: MicrostepInteractionHandlers;
}

export type ParsedMicrostepInteraction =
  | {
      handled: true;
      interaction: MicrostepInteractionContext;
    }
  | {
      handled: false;
      reason: MicrostepInteractionUnhandledReason;
    };

export type HandledMicrostepInteractionResult =
  | {
      handled: true;
      dispatched: boolean;
      interaction: MicrostepInteractionContext;
    }
  | {
      handled: false;
      reason: MicrostepInteractionUnhandledReason;
    };

const toPayloadObject = (
  payload: string | SlackBlockActionPayload
): SlackBlockActionPayload | null => {
  if (typeof payload !== "string") {
    return payload;
  }

  try {
    return JSON.parse(payload) as SlackBlockActionPayload;
  } catch {
    return null;
  }
};

const toInteractionAction = (
  actionId: string,
  actionIds: MicrostepActionIds
): MicrostepInteractionAction | null => {
  if (actionId === actionIds.startFocus) {
    return "start_focus";
  }
  if (actionId === actionIds.done) {
    return "done";
  }
  if (actionId === actionIds.tooHard) {
    return "too_hard";
  }
  if (actionId === actionIds.snooze15) {
    return "snooze_15";
  }

  return null;
};

const parseInteractionValue = (
  actionValue: string
): { sessionId: string; stepId: string } | null => {
  try {
    const parsed = JSON.parse(actionValue) as {
      session_id?: unknown;
      step_id?: unknown;
    };

    if (
      typeof parsed.session_id !== "string" ||
      typeof parsed.step_id !== "string" ||
      !parsed.session_id.trim() ||
      !parsed.step_id.trim()
    ) {
      return null;
    }

    return {
      sessionId: parsed.session_id,
      stepId: parsed.step_id
    };
  } catch {
    return null;
  }
};

export const parseMicrostepInteraction = (
  payload: string | SlackBlockActionPayload,
  options?: Pick<MicrostepInteractionHandleOptions, "actionIds">
): ParsedMicrostepInteraction => {
  const payloadObject = toPayloadObject(payload);
  if (!payloadObject) {
    return {
      handled: false,
      reason: "invalid_payload_json"
    };
  }

  if (payloadObject.type !== "block_actions") {
    return {
      handled: false,
      reason: "unsupported_payload_type"
    };
  }

  const action = payloadObject.actions?.[0];
  if (!action?.action_id) {
    return {
      handled: false,
      reason: "missing_action"
    };
  }

  const actionIds = {
    ...DEFAULT_MICROSTEP_ACTION_IDS,
    ...options?.actionIds
  };
  const interactionAction = toInteractionAction(action.action_id, actionIds);
  if (!interactionAction) {
    return {
      handled: false,
      reason: "unsupported_action"
    };
  }

  if (!action.value) {
    return {
      handled: false,
      reason: "missing_action_value"
    };
  }

  const parsedActionValue = parseInteractionValue(action.value);
  if (!parsedActionValue) {
    return {
      handled: false,
      reason: "invalid_action_value"
    };
  }

  return {
    handled: true,
    interaction: {
      action: interactionAction,
      actionId: action.action_id,
      actionTs: action.action_ts ?? null,
      sessionId: parsedActionValue.sessionId,
      stepId: parsedActionValue.stepId,
      userId: payloadObject.user?.id ?? null,
      channelId: payloadObject.channel?.id ?? null,
      messageTs: payloadObject.message?.ts ?? null,
      triggerId: payloadObject.trigger_id ?? null,
      responseUrl: payloadObject.response_url ?? null,
      rawActionValue: action.value
    }
  };
};

const toHandler = (
  action: MicrostepInteractionAction,
  handlers?: MicrostepInteractionHandlers
):
  | ((context: MicrostepInteractionContext) => void | Promise<void>)
  | undefined => {
  if (!handlers) {
    return undefined;
  }

  if (action === "start_focus") {
    return handlers.onStartFocus;
  }
  if (action === "done") {
    return handlers.onDone;
  }
  if (action === "too_hard") {
    return handlers.onTooHard;
  }

  return handlers.onSnooze15;
};

export const handleMicrostepInteraction = async (
  payload: string | SlackBlockActionPayload,
  options?: MicrostepInteractionHandleOptions
): Promise<HandledMicrostepInteractionResult> => {
  const parsed = parseMicrostepInteraction(payload, {
    actionIds: options?.actionIds
  });

  if (!parsed.handled) {
    return parsed;
  }

  const handler = toHandler(parsed.interaction.action, options?.handlers);
  if (handler) {
    await handler(parsed.interaction);
  }

  return {
    handled: true,
    dispatched: Boolean(handler),
    interaction: parsed.interaction
  };
};
