import { afterEach, describe, expect, it } from "vitest";
import { DEMO } from "../src/lib/ids.js";
import { auth, createTestKit, type TestKit } from "./helpers.js";

let kit: TestKit | undefined;

afterEach(async () => {
  if (kit) await kit.close();
  kit = undefined;
});

describe("README happy path", () => {
  it("visit → consent → audio → transcript → note sign → follow-up send/skip", async () => {
    kit = await createTestKit();
    const h = auth(kit.token);

    const denied = await kit.app.inject({
      method: "GET",
      url: `/v1/visits/${DEMO.visitAlexId}/recording-gate`,
      headers: h,
    });
    expect(denied.json()).toMatchObject({ allowed: false });

    const consent = await kit.app.inject({
      method: "POST",
      url: `/v1/visits/${DEMO.visitAlexId}/consent`,
      headers: h,
      payload: { type: "audio_capture", granted: true, disclosureScriptId: DEMO.audioDisclosureScriptId },
    });
    expect(consent.statusCode).toBe(200);

    const allowed = await kit.app.inject({
      method: "GET",
      url: `/v1/visits/${DEMO.visitAlexId}/recording-gate`,
      headers: h,
    });
    expect(allowed.json()).toMatchObject({ allowed: true, disclosureScriptId: DEMO.audioDisclosureScriptId });

    const audio = await kit.app.inject({
      method: "POST",
      url: `/v1/visits/${DEMO.visitAlexId}/audio`,
      headers: h,
      payload: { bytesBase64: Buffer.from("olive-demo-audio").toString("base64") },
    });
    expect(audio.statusCode).toBe(200);

    const jobs = await kit.app.inject({ method: "POST", url: "/v1/dev/process-jobs", headers: h });
    expect(jobs.json()).toMatchObject({ processed: 1 });

    const stream = await kit.app.inject({
      method: "GET",
      url: `/v1/visits/${DEMO.visitAlexId}/transcript/stream?cursor=0`,
      headers: h,
    });
    expect(stream.statusCode).toBe(200);
    expect(stream.headers["content-type"]).toContain("text/event-stream");
    expect(stream.body).toContain("event: segment");
    expect(stream.body).toContain("speaker_clinician");
    expect(stream.body).toContain("event: done");

    await kit.app.inject({
      method: "PATCH",
      url: `/v1/visits/${DEMO.visitAlexId}/note`,
      headers: h,
      payload: { body: "Post-op: conservative follow-up." },
    });
    const signed = await kit.app.inject({
      method: "POST",
      url: `/v1/visits/${DEMO.visitAlexId}/note/sign`,
      headers: h,
    });
    expect(signed.json()).toMatchObject({ status: "signed" });

    const created = await kit.app.inject({
      method: "POST",
      url: `/v1/visits/${DEMO.visitAlexId}/follow-ups`,
      headers: h,
      payload: { body: "Thanks for coming in.", messageClass: "clinical_transactional" },
    });
    const send = await kit.app.inject({
      method: "POST",
      url: `/v1/follow-ups/${(created.json() as { id: string }).id}/send`,
      headers: h,
    });
    expect(send.statusCode).toBe(200);
    expect(send.json()).toMatchObject({
      status: "sent",
      channelOfRecord: "secure",
      notifySms: { stub: true, containsPhi: false },
    });

    const createdSkip = await kit.app.inject({
      method: "POST",
      url: `/v1/visits/${DEMO.visitAlexId}/follow-ups`,
      headers: h,
      payload: { body: "Optional reminder" },
    });
    const skip = await kit.app.inject({
      method: "POST",
      url: `/v1/follow-ups/${(createdSkip.json() as { id: string }).id}/skip`,
      headers: h,
      payload: { reason: "patient prefers phone" },
    });
    expect(skip.json()).toMatchObject({ status: "skipped" });

    const ended = await kit.app.inject({
      method: "POST",
      url: `/v1/visits/${DEMO.visitAlexId}/end`,
      headers: h,
    });
    expect(ended.json()).toMatchObject({ status: "completed" });
    expect((ended.json() as { endedAt: string }).endedAt).toBeTruthy();
  });
});
