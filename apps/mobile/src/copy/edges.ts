/**
 * Edge + post-sign copy aligned to hi-fi 01–05b.
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
    body: "now in the clinic record",
    cta: "Review follow-ups",
    back: "Back to Today",
    chip: "Signed",
  },
  draftSaved: "Draft saved",
  finishDay: "Finish day",
  notesToSign: {
    kicker: "Notes to sign",
    cta: "Finish day",
  },
} as const;
