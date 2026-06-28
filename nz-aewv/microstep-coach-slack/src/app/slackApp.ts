import {
  handleMicrostepInteraction,
  type MicrostepInteractionAction,
  type MicrostepInteractionHandlers,
  type MicrostepInteractionHandleOptions,
  type MicrostepInteractionUnhandledReason
} from "../handlers/handleMicrostepInteraction";
import {
  InMemoryMicrostepWorkflowStore,
  createMicrostepInteractionHandlers,
  type MicrostepWorkflowStore
} from "../workflow/microstepWorkflow";

export interface SlackInteractivityRequestBody {
  payload?: string;
}

export type SlackInteractivityRouteReason =
  | "missing_payload"
  | MicrostepInteractionUnhandledReason;

export type SlackInteractivityResponseBody =
  | {
      ok: true;
      handled: true;
      action: MicrostepInteractionAction;
      session_id: string;
      step_id: string;
    }
  | {
      ok: true;
      handled: false;
      reason: SlackInteractivityRouteReason;
    }
  | {
      ok: false;
      handled: false;
      reason: SlackInteractivityRouteReason;
    };

export interface SlackInteractivityRouteResponse {
  status: number;
  body: SlackInteractivityResponseBody;
}
export interface SlackInteractivityRouteOptions
  extends MicrostepInteractionHandleOptions {
  workflowStore?: MicrostepWorkflowStore;
}

const IGNORE_REASONS: Set<SlackInteractivityRouteReason> = new Set([
  "unsupported_action",
  "unsupported_payload_type"
]);
const defaultWorkflowStore = new InMemoryMicrostepWorkflowStore();

export const getDefaultWorkflowStore = (): MicrostepWorkflowStore =>
  defaultWorkflowStore;

export const handleSlackInteractivityRequest = async (
  requestBody: SlackInteractivityRequestBody,
  options?: SlackInteractivityRouteOptions
): Promise<SlackInteractivityRouteResponse> => {
  if (!requestBody.payload) {
    return {
      status: 400,
      body: {
        ok: false,
        handled: false,
        reason: "missing_payload"
      }
    };
  }
  const workflowStore = options?.workflowStore ?? defaultWorkflowStore;
  const handlers: MicrostepInteractionHandlers =
    options?.handlers ?? createMicrostepInteractionHandlers(workflowStore);

  const interactionResult = await handleMicrostepInteraction(
    requestBody.payload,
    {
      actionIds: options?.actionIds,
      handlers
    }
  );

  if (!interactionResult.handled) {
    if (IGNORE_REASONS.has(interactionResult.reason)) {
      return {
        status: 200,
        body: {
          ok: true,
          handled: false,
          reason: interactionResult.reason
        }
      };
    }

    return {
      status: 400,
      body: {
        ok: false,
        handled: false,
        reason: interactionResult.reason
      }
    };
  }

  return {
    status: 200,
    body: {
      ok: true,
      handled: true,
      action: interactionResult.interaction.action,
      session_id: interactionResult.interaction.sessionId,
      step_id: interactionResult.interaction.stepId
    }
  };
};
