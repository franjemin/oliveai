import assert from "node:assert/strict";
import { test } from "node:test";

import { isAiAssistedDraft } from "./types";
import { mapDayFeed, mapInbox, tokenFromInboxPath, unwrapFollowUps, unwrapPatients } from "./map";

test("mapDayFeed flattens nested OpenAPI DayPatients", () => {
  const feed = mapDayFeed({
    date: "2026-09-19",
    patients: [
      {
        visitId: "visit-1",
        visitStatus: "in_progress",
        startedAt: "2026-09-19T13:00:00.000Z",
        endedAt: null,
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
