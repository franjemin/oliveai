export type TranscriptUtterance = {
  speakerLabel: string;
  roleHint: string;
  text: string;
  startMs: number;
  endMs: number;
};

export type TranscriptionVendor = {
  readonly name: string;
  transcribe(input: { visitId: string; objectKey: string }): Promise<TranscriptUtterance[]>;
};

/**
 * Stub until a BAA-backed vendor is contracted.
 * Does not send audio off-box.
 */
export function createStubTranscriptionVendor(): TranscriptionVendor {
  return {
    name: "stub",
    async transcribe() {
      return [
        {
          speakerLabel: "speaker_clinician",
          roleHint: "clinician",
          text: "Good morning, how has the sensitivity been since the last visit?",
          startMs: 0,
          endMs: 4200,
        },
        {
          speakerLabel: "speaker_patient",
          roleHint: "patient",
          text: "Better on the cold, still a bit sore when I chew on the right.",
          startMs: 4300,
          endMs: 9800,
        },
        {
          speakerLabel: "speaker_clinician",
          roleHint: "clinician",
          text: "We'll keep the note conservative and send a clinical follow-up after sign-off.",
          startMs: 9900,
          endMs: 15000,
        },
      ];
    },
  };
}
