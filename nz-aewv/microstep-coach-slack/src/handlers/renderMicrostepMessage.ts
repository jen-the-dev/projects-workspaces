import { buildMicrostepBlocks } from "../components/microstepBlocks";
import {
  formatDurationForDisplay,
  formatTextForDyscalculiaSupport
} from "../accessibility/dyscalculiaPhrasing";
import type {
  MicrostepRenderContext,
  MicrostepResponse,
  SlackMessagePayload
} from "../types/microstep";

const buildFallbackText = (
  response: MicrostepResponse,
  context: MicrostepRenderContext
): string => {
  const dyscalculiaFriendlyPhrasing =
    context.dyscalculiaFriendlyPhrasing === true;
  return `Next microstep: ${formatTextForDyscalculiaSupport(
    response.step_text,
    dyscalculiaFriendlyPhrasing
  )} (about ${formatDurationForDisplay(
    response.duration_minutes,
    dyscalculiaFriendlyPhrasing
  )}).`;
};

export const renderMicrostepMessage = (
  response: MicrostepResponse,
  context: MicrostepRenderContext
): SlackMessagePayload => ({
  text: buildFallbackText(response, context),
  blocks: buildMicrostepBlocks(response, context),
  metadata: {
    event_type: "microstep_rendered",
    event_payload: {
      session_id: context.sessionId,
      step_id: context.stepId
    }
  }
});