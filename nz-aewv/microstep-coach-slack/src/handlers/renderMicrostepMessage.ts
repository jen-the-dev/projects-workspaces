import { buildMicrostepBlocks } from "../components/microstepBlocks";
import type {
  MicrostepRenderContext,
  MicrostepResponse,
  SlackMessagePayload
} from "../types/microstep";

const buildFallbackText = (response: MicrostepResponse): string =>
  `Next microstep: ${response.step_text} (about ${response.duration_minutes} min).`;

export const renderMicrostepMessage = (
  response: MicrostepResponse,
  context: MicrostepRenderContext
): SlackMessagePayload => ({
  text: buildFallbackText(response),
  blocks: buildMicrostepBlocks(response, context),
  metadata: {
    event_type: "microstep_rendered",
    event_payload: {
      session_id: context.sessionId,
      step_id: context.stepId
    }
  }
});
