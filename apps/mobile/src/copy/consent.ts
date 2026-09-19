import { DISCLOSURE_SCRIPT_ID } from "@/src/theme/tokens";
import { AUDIO_RETENTION } from "@/src/copy/retention";

export const AUDIO_DISCLOSURE = {
  id: DISCLOSURE_SCRIPT_ID,
  title: "AI scribe for this visit",
  shortTitle: "Record this visit?",
  lead: "Olive can listen to this appointment to draft a clinical note and a follow-up for you to review. Care is the same if you refuse.",
  shortLead: "Olive drafts a note from the audio. Care is the same if you refuse.",
  points: [
    {
      heading: "What is recorded",
      body: "Ambient audio of this visit only — clinician and anyone who speaks in the operatory.",
    },
    {
      heading: "Why",
      body: "To draft a clinical note and an optional secure follow-up. Olive does not decide treatment.",
    },
    {
      heading: "Who can see it",
      body: "Harbourfront Dental is the custodian. Olive is a vendor that processes the recording for the clinic.",
    },
    {
      heading: "Where it is stored",
      body: "Canada-first (ca-central-1). Some vendors may process outside Canada — we will say so when that applies.",
    },
    {
      heading: AUDIO_RETENTION.heading,
      body: AUDIO_RETENTION.body,
    },
    {
      heading: "AI limits",
      body: "Olive drafts. The dentist reviews and signs. Nothing enters the legal record until signed.",
    },
    {
      heading: "Right to refuse",
      body: "Refusing recording does not change care. The visit continues. The dentist can still write a note by hand in Olive.",
    },
  ],
} as const;
