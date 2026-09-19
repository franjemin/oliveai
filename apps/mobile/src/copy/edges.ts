/**
 * Edge-state CTAs from Design hi-fi (`olive-v1/hifi/edges/`).
 * PNGs were not mounted in this environment; labels are taken from the
 * locked filenames / captions — do not invent alternate CTAs.
 *
 * Product lock: sign confirm must not claim 24h audio delete.
 * Use clinic-controlled retention instead of any wipe copy.
 */
export const EDGE = {
  consentDenied: {
    title: "Recording declined",
    body: "Olive will not listen to this visit. Care continues. You can still write and sign a note.",
    cta: "Continue without recording",
  },
  badAudio: {
    title: "We can’t hear clearly",
    body: "Check the microphone, or continue and finish the note yourself.",
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
    oliveTruth: "Olive drafted this. You are responsible for what you sign.",
    retention: "Visit audio stays with the clinic record. Retention is clinic-controlled.",
    noOd: "No Open Dental write-back in this demo.",
    sign: "Sign note",
    cancel: "Cancel",
  },
} as const;
