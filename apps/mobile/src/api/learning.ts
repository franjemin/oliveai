/**
 * Voice-learning events — session-style heuristic only (not PHI training).
 *
 * Contract when present: `POST /v1/follow-ups/:id/edits` `{ before, after }`
 * (OpenAPI `FollowUpEdit`). Note edit/sign have no dedicated route yet —
 * those payloads still persist on the client / mock so they are never dropped.
 *
 * Do not claim batch-apply, queue rewrite, or model training from these events.
 */

import type { LearningEvent, StoredLearningEvent, StyleHeuristic } from "./types";

export function learningEventPayload(input: LearningEvent): LearningEvent {
  return {
    source: input.source,
    before: input.before,
    after: input.after,
    resourceId: input.resourceId,
  };
}

/** OpenAPI FollowUpEdit request body. */
export function followUpEditContractBody(input: Pick<LearningEvent, "before" | "after">): {
  before: string;
  after: string;
} {
  return { before: input.before, after: input.after };
}

export function sameLearningEvent(a: LearningEvent, b: LearningEvent): boolean {
  return (
    a.source === b.source &&
    a.resourceId === b.resourceId &&
    a.before === b.before &&
    a.after === b.after
  );
}

export function appendLearningEvent(
  log: StoredLearningEvent[],
  input: LearningEvent,
  at = new Date().toISOString(),
): StoredLearningEvent[] {
  const payload = learningEventPayload(input);
  const last = log[log.length - 1];
  if (last && sameLearningEvent(last, payload)) {
    return log;
  }
  return [...log, { ...payload, at }];
}

export function inferGreeting(text?: string | null): string | null {
  if (!text) return null;
  const match = text.trim().match(/^(hi|hello|hey)\b/i);
  return match ? match[1] : null;
}

/** Session `style` heuristic from stored before/after events. Not a rewrite queue. */
export function styleHeuristicFromEvents(events: LearningEvent[]): StyleHeuristic {
  const edits = events.filter((row) => row.source === "follow_up_edit" || row.source === "note_edit");
  const last = edits[edits.length - 1];
  return {
    editCount: edits.length,
    preferShorter: last ? last.after.trim().length < last.before.trim().length : undefined,
    greeting: inferGreeting(last?.after),
  };
}

export class LearningLog {
  private events: StoredLearningEvent[] = [];

  remember(input: LearningEvent, at?: string): StoredLearningEvent {
    this.events = appendLearningEvent(this.events, input, at);
    return this.events[this.events.length - 1]!;
  }

  list(): StoredLearningEvent[] {
    return this.events.slice();
  }

  reset(): void {
    this.events = [];
  }
}

/** HTTP client log — note_edit / note_sign have no contract route yet. */
export const httpLearningLog = new LearningLog();
