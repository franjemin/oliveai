import assert from "node:assert/strict";
import { test } from "node:test";

import {
  appendLearningEvent,
  followUpEditContractBody,
  httpLearningLog,
  learningEventPayload,
  styleHeuristicFromEvents,
} from "./learning";
import { httpApi } from "./http";

test("learning payloads keep before/after and match FollowUpEdit contract body", () => {
  const event = learningEventPayload({
    source: "follow_up_edit",
    before: "Hi Jordan — thanks for coming in today.",
    after: "Hi Jordan — as we talked about, here's a short note.",
    resourceId: "fu-1",
  });
  assert.equal(event.source, "follow_up_edit");
  assert.equal(event.before, "Hi Jordan — thanks for coming in today.");
  assert.equal(event.after, "Hi Jordan — as we talked about, here's a short note.");
  assert.deepEqual(followUpEditContractBody(event), {
    before: event.before,
    after: event.after,
  });
});

test("style heuristic is edit-count only — not a queue rewrite", () => {
  const style = styleHeuristicFromEvents([
    {
      source: "follow_up_edit",
      before: "Hello Jordan — a longer draft about the crown consult next steps.",
      after: "Hi Jordan — short note on the crown consult.",
      resourceId: "fu-1",
    },
  ]);
  assert.equal(style.editCount, 1);
  assert.equal(style.preferShorter, true);
  assert.equal(style.greeting, "Hi");
});

test("appendLearningEvent dedupes the same before/after payload", () => {
  const event = {
    source: "note_edit" as const,
    before: "draft",
    after: "edited",
    resourceId: "note-1",
  };
  const once = appendLearningEvent([], event, "2026-09-19T00:00:00.000Z");
  const twice = appendLearningEvent(once, event, "2026-09-19T00:00:01.000Z");
  assert.equal(twice.length, 1);
});

test("HTTP follow-up edit posts FollowUpEdit {before, after} and keeps the local event", async () => {
  httpLearningLog.reset();
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; body: unknown }> = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : null });
    return new Response(JSON.stringify({ id: "edit-1", followUpId: "fu-http", before: "a", after: "b" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  try {
    const saved = await httpApi.recordFollowUpEdit("fu-http", "before text", "after text");
    assert.equal(saved.before, "a");
    assert.equal(saved.after, "b");
    assert.equal(calls.length, 1);
    assert.match(calls[0]!.url, /\/v1\/follow-ups\/fu-http\/edits$/);
    assert.deepEqual(calls[0]!.body, { before: "before text", after: "after text" });
    const listed = await httpApi.listLearningEvents();
    assert.equal(listed[0]?.source, "follow_up_edit");
    assert.equal(listed[0]?.before, "before text");
    assert.equal(listed[0]?.after, "after text");
  } finally {
    globalThis.fetch = originalFetch;
    httpLearningLog.reset();
  }
});

test("HTTP recordLearningEvent never drops note_edit or note_sign payloads", async () => {
  httpLearningLog.reset();
  await httpApi.recordLearningEvent({
    source: "note_edit",
    before: "AI drafted this note.",
    after: "Clinician tightened the plan.",
    resourceId: "note-http",
  });
  await httpApi.recordLearningEvent({
    source: "note_sign",
    before: "Clinician tightened the plan.",
    after: "Clinician tightened the plan.",
    resourceId: "note-http",
  });
  const listed = await httpApi.listLearningEvents();
  assert.equal(listed.length, 2);
  assert.equal(listed[0]?.source, "note_edit");
  assert.equal(listed[0]?.before, "AI drafted this note.");
  assert.equal(listed[0]?.after, "Clinician tightened the plan.");
  assert.equal(listed[1]?.source, "note_sign");
  httpLearningLog.reset();
});
