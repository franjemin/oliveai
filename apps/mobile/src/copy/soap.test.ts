import assert from "node:assert/strict";
import { test } from "node:test";

import { formatSoap, parseSoap, soapPreview } from "./soap";

const sample = `Perio maintenance — Alex Rivera

CC: Routine 3-month perio maintenance; mild tenderness LR posterior.

Exam: Generalized plaque at gingival margins.

Tx: Full-mouth debridement.

Plan: Continue 3-month recall.

AI drafted this note from the visit audio. Review before signing.`;

test("parseSoap maps dental CC/Exam/Tx/Plan into SOAP", () => {
  const soap = parseSoap(sample);
  assert.equal(soap.title, "Perio maintenance — Alex Rivera");
  assert.match(soap.subjective, /3-month perio/);
  assert.match(soap.objective, /plaque/);
  assert.match(soap.assessment, /debridement/);
  assert.match(soap.plan, /recall/);
  assert.match(soap.footer, /AI drafted/);
  assert.match(soapPreview(soap), /3-month perio/);
});

test("formatSoap round-trips section edits", () => {
  const soap = parseSoap(sample);
  soap.plan = "Recall in 3 months.";
  const again = parseSoap(formatSoap(soap));
  assert.equal(again.plan, "Recall in 3 months.");
  assert.match(again.subjective, /3-month perio/);
});
