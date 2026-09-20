import assert from "node:assert/strict";
import { test } from "node:test";

import { DEMO, isAiAssistedDraft } from "./types";
import { mapDayFeed, mapInbox, tokenFromInboxPath, unwrapFollowUps, unwrapPatients } from "./map";
import { clinicDayDates, CORE_WALKTHROUGH, ensureSeededVisit } from "./walkthrough";

test("mapDayFeed flattens nested OpenAPI DayPatients", () => {
  const feed = mapDayFeed({
    date: "2026-09-19",
    followUpRelease: "after_sign",
    patients: [
      {
        visitId: "visit-1",
        visitStatus: "in_progress",
        startedAt: "2026-09-19T13:00:00.000Z",
        endedAt: null,
        unsignedDraft: true,
        patient: { id: "p-1", displayName: "Alex Rivera", phone: null, source: "local" },
      },
    ],
  });
  assert.equal(feed.date, "2026-09-19");
  assert.equal(feed.patients[0]?.patientId, "p-1");
  assert.equal(feed.patients[0]?.displayName, "Alex Rivera");
  assert.equal(feed.patients[0]?.visitId, "visit-1");
  assert.equal(feed.patients[0]?.visitStatus, "in_progress");
  assert.equal(feed.patients[0]?.source, "local");
  assert.equal(feed.patients[0]?.unsignedDraft, true);
  assert.equal(feed.followUpRelease, "after_sign");
  assert.ok(feed.patients[0]?.time);
});

test("unwrap helpers accept envelopes or bare arrays", () => {
  assert.equal(unwrapPatients({ patients: [{ id: "a" } as never] }).length, 1);
  assert.equal(unwrapPatients([]).length, 0);
  assert.equal(unwrapFollowUps({ followUps: [] }).length, 0);
});

test("mapInbox builds a message from the contract body", () => {
  const inbox = mapInbox("tok-1", {
    channelOfRecord: "secure",
    secureMessageId: "msg-1",
    body: "Hi Alex — keep brushing.",
    stub: true,
  });
  assert.equal(inbox.channelOfRecord, "secure");
  assert.equal(inbox.messages[0]?.body, "Hi Alex — keep brushing.");
  assert.equal(inbox.messages[0]?.id, "msg-1");
  assert.equal(tokenFromInboxPath("/inbox/abc"), "abc");
});

test("Core walkthrough pins seeded visit 005 and tries today plus contract date", () => {
  assert.equal(CORE_WALKTHROUGH.loginEmail, "od@demo.olive.local");
  assert.equal(CORE_WALKTHROUGH.loginPassword, "demo");
  assert.equal(CORE_WALKTHROUGH.visitId, DEMO.visitAlexId);
  const dates = clinicDayDates(new Date("2026-09-22T12:00:00.000Z"));
  assert.ok(dates.includes("2026-09-22"));
  assert.ok(dates.includes(DEMO.date));
  const pinned = ensureSeededVisit(
    { date: "2026-09-22", patients: [] },
    {
      id: DEMO.visitAlexId,
      clinicId: DEMO.clinicId,
      patientId: DEMO.patientAlexId,
      providerId: DEMO.userId,
      status: "in_progress",
      startedAt: "2026-09-22T13:00:00.000Z",
      endedAt: null,
    },
  );
  assert.equal(pinned.patients[0]?.visitId, DEMO.visitAlexId);
  assert.equal(pinned.patients[0]?.displayName, "Alex Rivera");
  const afterEnd = ensureSeededVisit(
    {
      date: "2026-09-22",
      followUpRelease: "after_sign",
      patients: [
        {
          patientId: DEMO.patientAlexId,
          displayName: "Alex Rivera",
          visitId: DEMO.visitAlexId,
          visitStatus: "completed",
          unsignedDraft: true,
          recording: "captured",
        },
      ],
    },
    {
      id: DEMO.visitAlexId,
      clinicId: DEMO.clinicId,
      patientId: DEMO.patientAlexId,
      providerId: DEMO.userId,
      status: "completed",
      startedAt: "2026-09-22T13:00:00.000Z",
      endedAt: "2026-09-22T13:12:00.000Z",
    },
  );
  assert.equal(afterEnd.patients[0]?.unsignedDraft, true);
});

test("isAiAssistedDraft falls back to note body when the contract omits the flag", () => {
  assert.equal(
    isAiAssistedDraft({
      id: "n",
      visitId: "v",
      body: "AI drafted this note from the visit audio. Review before signing.",
      status: "draft",
      signedAt: null,
      signedBy: null,
      snapshot: null,
      retentionUntil: "2036-01-01T00:00:00.000Z",
    }),
    true,
  );
  assert.equal(
    isAiAssistedDraft(
      {
        id: "n",
        visitId: "v",
        body: "AI drafted this note from the visit audio.",
        status: "draft",
        signedAt: null,
        signedBy: null,
        snapshot: null,
        retentionUntil: "2036-01-01T00:00:00.000Z",
        aiAssisted: true,
      },
      true,
    ),
    false,
  );
});
