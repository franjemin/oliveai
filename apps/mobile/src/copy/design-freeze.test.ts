import assert from "node:assert/strict";
import { test } from "node:test";

import { AUDIO_DISCLOSURE } from "./consent";
import {
  EDGE,
  batchSignedLine,
  draftSavedDetail,
  draftsWaitingLabel,
  notesProgress,
  notesToSignCount,
  signDraftsBody,
} from "./edges";
import { SECURE_SEND_MICROCOPY, SWIPE_HINT, VOICE_LEARNING_TOAST } from "./messaging";
import { AUDIO_RETENTION } from "./retention";
import { CORE_WALKTHROUGH } from "../api/walkthrough";
import { color, radius } from "../theme/tokens";

test("Design freeze: primary copy has no PHIPA chips, record of truth, Send SMS, or 24h wipe", () => {
  const primary = [
    AUDIO_DISCLOSURE.eyebrow,
    AUDIO_DISCLOSURE.shortTitle,
    AUDIO_DISCLOSURE.whyLink,
    AUDIO_DISCLOSURE.startCta,
    AUDIO_DISCLOSURE.agreeMicrocopy,
    AUDIO_DISCLOSURE.refuseCta,
    AUDIO_DISCLOSURE.lead,
    EDGE.signConfirm.oliveTruth,
    EDGE.signConfirm.audio,
    EDGE.postSign.title,
    EDGE.postSign.allSigned,
    EDGE.postSign.cta,
    EDGE.postSign.back,
    EDGE.postSign.batchChip,
    EDGE.draftSaved,
    EDGE.draftSavedHint,
    EDGE.finishDay,
    EDGE.endOfDay,
    EDGE.notesToSign.title,
    EDGE.notesToSign.cta,
    EDGE.notesToSign.hint,
    EDGE.notesToSign.chip,
    EDGE.notesToSign.skip,
    EDGE.live.viewFull,
    EDGE.live.pause,
    draftsWaitingLabel(3),
    signDraftsBody(3),
    notesToSignCount(3),
    notesProgress(1, 3),
    draftSavedDetail("Maya Rivera"),
    batchSignedLine(3),
    SECURE_SEND_MICROCOPY,
    SWIPE_HINT,
    VOICE_LEARNING_TOAST,
    AUDIO_RETENTION.short,
    AUDIO_RETENTION.body,
  ].join("\n");
  assert.match(AUDIO_DISCLOSURE.startCta, /Start recording/);
  assert.match(AUDIO_DISCLOSURE.agreeMicrocopy, /I confirmed the patient agrees/);
  assert.match(EDGE.signConfirm.oliveTruth, /clinical record/);
  assert.match(EDGE.draftSaved, /Draft saved/);
  assert.match(EDGE.finishDay, /Finish day/);
  assert.match(EDGE.postSign.allSigned, /All signed/);
  assert.match(EDGE.notesToSign.cta, /Review & sign/);
  assert.match(EDGE.notesToSign.hint, /One note at a time/);
  assert.match(EDGE.live.viewFull, /View full transcript/);
  assert.match(draftSavedDetail("Maya Rivera"), /sign at end of day/);
  assert.match(notesProgress(1, 3), /1 of 3/);
  assert.match(SECURE_SEND_MICROCOPY, /We’ll text them a link to open it securely/);
  assert.match(SWIPE_HINT, /Swipe right to send/);
  assert.doesNotMatch(primary, /PHIPA|CA·ON|record of truth|Send SMS|deleted within 24|24h wipe|audio TTL/i);
});

test("Catch Up draft body is the seeded Alex paragraph", () => {
  assert.match(CORE_WALKTHROUGH.followUpBody, /Hi Alex — after today's perio visit/);
  assert.match(CORE_WALKTHROUGH.followUpBody, /feels tender/);
  assert.ok(CORE_WALKTHROUGH.followUpBody.length > 80);
});

test("Design freeze tokens: cream / sage / olive / charcoal, radius 24–28", () => {
  assert.equal(color.paper, "#FFFEFA");
  assert.equal(color.paperAlt, "#F7F5F0");
  assert.equal(color.sage, "#7A9E7E");
  assert.equal(color.olive, "#6B8F71");
  assert.equal(color.charcoal, "#2C2B28");
  assert.equal(color.stone, "#EDEAE3");
  assert.equal(radius.lg, 24);
  assert.equal(radius.xl, 28);
});
