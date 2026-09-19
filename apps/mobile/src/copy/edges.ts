/**
 * Edge-state CTAs from Design cuts 1–4 (hi-fi PNGs not mounted).
 * Sign confirm is the short three-beat sheet Product/TL approved for demo week.
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
    oliveTruth: "Olive drafted this. You sign it.",
    audio: "Audio is deleted in 24 hours.",
    noOd: "No Open Dental write-back.",
    sign: "Sign note",
    cancel: "Cancel",
  },
  postSign: {
    title: "Signed",
    body: "A follow-up is ready to review.",
    cta: "Review follow-ups",
  },
} as const;
