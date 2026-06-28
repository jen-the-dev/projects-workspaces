import type {
  MicrostepInteractionContext,
  MicrostepInteractionHandlers
} from "../handlers/handleMicrostepInteraction";

export type MicrostepWorkflowStatus =
  | "pending"
  | "in_progress"
  | "needs_breakdown"
  | "snoozed"
  | "done";

export interface MicrostepWorkflowHistoryItem {
  action: MicrostepInteractionContext["action"];
  stepId: string;
  occurredAt: string;
}

export interface MicrostepWorkflowSession {
  sessionId: string;
  currentStepId: string;
  status: MicrostepWorkflowStatus;
  completedStepIds: string[];
  rescueCount: number;
  checkInDueAt: string | null;
  snoozedUntil: string | null;
  lastActionAt: string;
  history: MicrostepWorkflowHistoryItem[];
}

export interface MicrostepWorkflowStore {
  onStartFocus(context: MicrostepInteractionContext): MicrostepWorkflowSession;
  onDone(context: MicrostepInteractionContext): MicrostepWorkflowSession;
  onTooHard(context: MicrostepInteractionContext): MicrostepWorkflowSession;
  onSnooze15(context: MicrostepInteractionContext): MicrostepWorkflowSession;
  getSession(sessionId: string): MicrostepWorkflowSession | null;
  reset(): void;
}

const cloneSession = (
  session: MicrostepWorkflowSession
): MicrostepWorkflowSession => ({
  ...session,
  completedStepIds: [...session.completedStepIds],
  history: [...session.history]
});

const fromSlackTimestamp = (
  timestamp: string | null,
  fallbackNow: () => Date
): Date => {
  if (!timestamp) {
    return fallbackNow();
  }

  const asSeconds = Number.parseFloat(timestamp);
  if (Number.isNaN(asSeconds) || !Number.isFinite(asSeconds)) {
    return fallbackNow();
  }

  return new Date(asSeconds * 1000);
};

const plusMinutesIso = (date: Date, minutes: number): string =>
  new Date(date.getTime() + minutes * 60_000).toISOString();

const toIso = (date: Date): string => date.toISOString();

export class InMemoryMicrostepWorkflowStore implements MicrostepWorkflowStore {
  private readonly sessions = new Map<string, MicrostepWorkflowSession>();
  private readonly now: () => Date;

  public constructor(now: () => Date = () => new Date()) {
    this.now = now;
  }

  public onStartFocus(context: MicrostepInteractionContext): MicrostepWorkflowSession {
    const occurredAt = fromSlackTimestamp(context.actionTs, this.now);
    const session = this.upsertSession(context, {
      status: "in_progress",
      checkInDueAt: plusMinutesIso(occurredAt, 10),
      snoozedUntil: null,
      lastActionAt: toIso(occurredAt),
      addHistory: {
        action: "start_focus",
        stepId: context.stepId,
        occurredAt: toIso(occurredAt)
      }
    });
    return cloneSession(session);
  }

  public onDone(context: MicrostepInteractionContext): MicrostepWorkflowSession {
    const occurredAt = fromSlackTimestamp(context.actionTs, this.now);
    const session = this.upsertSession(context, {
      status: "done",
      checkInDueAt: null,
      snoozedUntil: null,
      lastActionAt: toIso(occurredAt),
      addCompletedStepId: context.stepId,
      addHistory: {
        action: "done",
        stepId: context.stepId,
        occurredAt: toIso(occurredAt)
      }
    });
    return cloneSession(session);
  }

  public onTooHard(context: MicrostepInteractionContext): MicrostepWorkflowSession {
    const occurredAt = fromSlackTimestamp(context.actionTs, this.now);
    const session = this.upsertSession(context, {
      status: "needs_breakdown",
      checkInDueAt: null,
      snoozedUntil: null,
      lastActionAt: toIso(occurredAt),
      incrementRescueCount: true,
      addHistory: {
        action: "too_hard",
        stepId: context.stepId,
        occurredAt: toIso(occurredAt)
      }
    });
    return cloneSession(session);
  }

  public onSnooze15(context: MicrostepInteractionContext): MicrostepWorkflowSession {
    const occurredAt = fromSlackTimestamp(context.actionTs, this.now);
    const snoozedUntil = plusMinutesIso(occurredAt, 15);
    const session = this.upsertSession(context, {
      status: "snoozed",
      checkInDueAt: snoozedUntil,
      snoozedUntil,
      lastActionAt: toIso(occurredAt),
      addHistory: {
        action: "snooze_15",
        stepId: context.stepId,
        occurredAt: toIso(occurredAt)
      }
    });
    return cloneSession(session);
  }

  public getSession(sessionId: string): MicrostepWorkflowSession | null {
    const session = this.sessions.get(sessionId);
    return session ? cloneSession(session) : null;
  }

  public reset(): void {
    this.sessions.clear();
  }

  private upsertSession(
    context: MicrostepInteractionContext,
    params: {
      status: MicrostepWorkflowStatus;
      checkInDueAt: string | null;
      snoozedUntil: string | null;
      lastActionAt: string;
      addCompletedStepId?: string;
      incrementRescueCount?: boolean;
      addHistory: MicrostepWorkflowHistoryItem;
    }
  ): MicrostepWorkflowSession {
    const existing = this.sessions.get(context.sessionId);
    const base: MicrostepWorkflowSession =
      existing ??
      ({
        sessionId: context.sessionId,
        currentStepId: context.stepId,
        status: "pending",
        completedStepIds: [],
        rescueCount: 0,
        checkInDueAt: null,
        snoozedUntil: null,
        lastActionAt: params.lastActionAt,
        history: []
      } satisfies MicrostepWorkflowSession);

    const completedStepIds = [...base.completedStepIds];
    if (
      params.addCompletedStepId &&
      !completedStepIds.includes(params.addCompletedStepId)
    ) {
      completedStepIds.push(params.addCompletedStepId);
    }

    const nextSession: MicrostepWorkflowSession = {
      ...base,
      currentStepId: context.stepId,
      status: params.status,
      completedStepIds,
      rescueCount: params.incrementRescueCount
        ? base.rescueCount + 1
        : base.rescueCount,
      checkInDueAt: params.checkInDueAt,
      snoozedUntil: params.snoozedUntil,
      lastActionAt: params.lastActionAt,
      history: [...base.history, params.addHistory]
    };

    this.sessions.set(context.sessionId, nextSession);
    return nextSession;
  }
}

export const createMicrostepInteractionHandlers = (
  workflowStore: MicrostepWorkflowStore
): MicrostepInteractionHandlers => ({
  onStartFocus: (context) => {
    workflowStore.onStartFocus(context);
  },
  onDone: (context) => {
    workflowStore.onDone(context);
  },
  onTooHard: (context) => {
    workflowStore.onTooHard(context);
  },
  onSnooze15: (context) => {
    workflowStore.onSnooze15(context);
  }
});
