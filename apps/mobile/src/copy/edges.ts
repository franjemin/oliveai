/**
 * Edge + post-sign copy aligned to EOD-sign hi-fi (Live → Draft saved → Finish day → Notes to sign → All signed → Follow-ups).
 * No 24h wipe language — audio stays with the clinic record (OLI-11).
 */
export const EDGE = {
  consentDenied: {
    title: "Recording declined",
    body: "Olive will not listen to this visit. Care continues. You can still write and sign a note.",
    cta: "Continue without recording",
  },
  badAudio: {
    title: "We can’t hear clearly",
    body: "Check the mic, or continue and write the note.",
    fixMic: "Fix mic",
    continueAnyway: "Continue anyway",
  },
  emptySwipe: {
    title: "All caught up",
    body: "No pending follow-ups.",
    cta: "Back to Today",
  },
  signConfirm: {
    title: "Sign this note?",
    oliveTruth: "You’re signing this as the clinical record.",
    audio: "Audio stays with the clinic record. The clinic controls how long it is kept.",
    noOd: "No Open Dental write-back.",
    sign: "Sign note",
    cancel: "Cancel",
  },
  postSign: {
    title: "Note signed.\nReview follow-ups?",
    allSigned: "All signed.\nReview follow-ups?",
    body: "now in the clinic record",
    batchBody: "in the clinic record · ready for end-of-day swipe",
    cta: "Review follow-ups",
    back: "Back to Today",
    chip: "Signed",
    batchChip: "Day-end batch complete",
  },
  draftSaved: "Draft saved",
  draftSavedHint: "sign at end of day",
  finishDay: "Finish day",
  visitsDone: "Visits done",
  endOfDay: "End of day",
  unsignedDrafts: "Unsigned drafts",
  draftPill: "Draft",
  notesToSign: {
    title: "Notes to sign",
    kicker: "Notes to sign",
    cta: "Review & sign",
    hint: "One note at a time · then follow-ups",
    back: "← Notes to sign",
    today: "← Today",
    chip: "End-of-day queue · optional early sign anytime",
    skip: "Skip for now · back to queue",
  },
  live: {
    pause: "PAUSE",
    resume: "RESUME",
    listening: "Listening",
    paused: "Paused",
    viewFull: "View full transcript",
    patient: "PATIENT",
  },
} as const;

export function draftsWaitingLabel(count: number): string {
  return `${EDGE.visitsDone} · ${count} draft${count === 1 ? "" : "s"} waiting`;
}

export function signDraftsBody(count: number): string {
  return `Sign ${count} draft note${count === 1 ? "" : "s"}, then review follow-ups — one clear path.`;
}

export function notesToSignCount(count: number): string {
  return `${count} note${count === 1 ? "" : "s"} to sign`;
}

export function notesProgress(index: number, total: number): string {
  return `${index} of ${total}`;
}

export function draftSavedDetail(name: string): string {
  const who = name.trim() || "Visit";
  return `${who} · ${EDGE.draftSavedHint}`;
}

export function batchSignedLine(count: number): string {
  return `${count} note${count === 1 ? "" : "s"} ${EDGE.postSign.batchBody}`;
}
