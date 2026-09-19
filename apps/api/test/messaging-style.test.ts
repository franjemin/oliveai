import { afterEach, describe, expect, it } from "vitest";
import { DEMO } from "../src/lib/ids.js";
import { notifySmsCopy } from "../src/vendors/messaging.js";
import { applyStyle, recordStyleFromEdit } from "../src/services/style.js";
import { createFollowUp, recordFollowUpEdit } from "../src/services/followups.js";
import { signNote } from "../src/services/notes.js";
import { createTestKit, type TestKit } from "./helpers.js";

let kit: TestKit | undefined;

afterEach(async () => {
  if (kit) await kit.close();
  kit = undefined;
});

describe("messaging + clinician style", () => {
  it("notify SMS copy never includes the secure follow-up body", () => {
    const clinical = "Post-op: sensitivity on the upper right; call if chewing stays sore.";
    const copy = notifySmsCopy("Harbourfront Dental", "/v1/inbox/abc");
    expect(copy).toContain("secure message");
    expect(copy).not.toContain(clinical);
    expect(copy).not.toMatch(/sensitivity|upper right/i);
  });

  it("consumes follow-up edits as per-clinician style for the next draft", async () => {
    kit = await createTestKit();
    await signNote(kit.ctx, {
      clinicId: DEMO.clinicId,
      actorId: DEMO.userId,
      visitId: DEMO.visitAlexId,
    });
    const first = await createFollowUp(kit.ctx, {
      clinicId: DEMO.clinicId,
      actorId: DEMO.userId,
      visitId: DEMO.visitAlexId,
      body: "Hello there, thank you so much for coming in today we wanted to write a very long note.",
    });
    await recordFollowUpEdit(kit.ctx, {
      clinicId: DEMO.clinicId,
      actorId: DEMO.userId,
      id: first.id,
      before: first.body,
      after: "Thanks for coming in. Call if chewing is sore.",
    });
    const next = await createFollowUp(kit.ctx, {
      clinicId: DEMO.clinicId,
      actorId: DEMO.userId,
      visitId: DEMO.visitAlexId,
      body: "Please floss nightly.",
    });
    expect(next.body.startsWith("Thanks for coming in")).toBe(true);

    const profile = await recordStyleFromEdit(kit.ctx.db, {
      clinicId: DEMO.clinicId,
      clinicianId: DEMO.userId,
      before: "aaaa",
      after: "b",
    });
    expect(profile.preferShorter).toBe(true);
    expect(applyStyle("x".repeat(400), profile).length).toBeLessThan(400);
  });
});
