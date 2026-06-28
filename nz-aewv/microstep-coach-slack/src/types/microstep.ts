export interface MicrostepResponse {
  step_text: string;
  duration_minutes: number;
  success_criteria: string;
  fallback_if_stuck: string;
  clarifying_question: string | null;
}

export interface MicrostepActionIds {
  startFocus: string;
  done: string;
  tooHard: string;
  snooze15: string;
}

export interface MicrostepRenderContext {
  sessionId: string;
  stepId: string;
  actionIds?: Partial<MicrostepActionIds>;
  dyscalculiaFriendlyPhrasing?: boolean;
}

export const DEFAULT_MICROSTEP_ACTION_IDS: MicrostepActionIds = {
  startFocus: "microstep_start_focus",
  done: "microstep_done",
  tooHard: "microstep_too_hard",
  snooze15: "microstep_snooze_15"
};

export interface SlackMessageMetadata {
  event_type: string;
  event_payload: Record<string, string | number | boolean | null>;
}

export interface SlackMessagePayload {
  text: string;
  blocks: unknown[];
  metadata?: SlackMessageMetadata;
}
