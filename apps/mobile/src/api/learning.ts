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

/** Matches Backend PR #1 `clinician_style_profiles` greeting extract. */
export function inferGreeting(text?: string | null): string | null {
  if (!text) return null;
  const first = text.trim().split(/[.!\n]/)[0]?.trim() ?? "";
  if (first.length > 4 && first.length < 80 && /^(hi|hello|hey|thanks|thank you)\b/i.test(first)) {
    return first;
  }
  return null;
}

/** Session `style` heuristic from stored before/after events → clinician_style_profiles. */
export function styleHeuristicFromEvents(events: LearningEvent[]): StyleHeuristic {
  const edits = events.filter((row) => row.source === "follow_up_edit" || row.source === "note_edit");
  let preferShorter = false;
  let greeting: string | null = null;
  for (const row of edits) {
    if (row.after.trim().length < row.before.trim().length) preferShorter = true;
    greeting = inferGreeting(row.after) ?? greeting;
  }
  return {
    editCount: edits.length,
    preferShorter: edits.length ? preferShorter : undefined,
    greeting,
  };
}

/** Demo simplicity cuts — same-day draft heuristic. Not PHI training / queue rewrite. */
export function applyStyle(body: string, profile: StyleHeuristic): string {
  let out = body.trim();
  const greeting = profile.greeting;
  if (greeting && !out.toLowerCase().startsWith(greeting.toLowerCase().slice(0, 6))) {
    out = `${greeting} ${out}`.trim();
  }
  if (profile.preferShorter && out.length > 280) {
    const cut = out.slice(0, 280);
    const last = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("\n"));
    out = (last > 40 ? cut.slice(0, last + 1) : cut).trim();
  }
  return out;
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
