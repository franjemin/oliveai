/**
 * Product lock (Francesca): there is no 24h audio delete.
 * Audio is kept with the clinic record. Retention is clinic-controlled.
 * Do not add “deleted within 24 hours / 24h / audio TTL” anywhere in UX copy.
 * Encryption and audit messaging are unchanged.
 */
export const AUDIO_RETENTION = {
  heading: "How long audio is kept",
  short: "Audio is kept with the clinic record. Retention is clinic-controlled.",
  body: "Visit audio is kept with the clinic record. The clinic controls how long it is retained. Encryption and audit are unchanged.",
} as const;
