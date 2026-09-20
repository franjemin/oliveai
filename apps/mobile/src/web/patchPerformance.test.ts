import assert from "node:assert/strict";
import { test } from "node:test";

import { patchPerformanceMeasure } from "./patchPerformance";

function fakePerf() {
  const calls: Array<{ name: string; options: unknown }> = [];
  let clears = 0;
  const perf = {
    measure(name: string, options?: unknown) {
      calls.push({ name, options });
      return { name } as PerformanceMeasure;
    },
    clearMeasures() {
      clears += 1;
    },
  } as unknown as Performance;
  return {
    perf,
    calls,
    get clears() {
      return clears;
    },
  };
}

test("React Components ⚛ measures drop detail so props are not structured-cloned", () => {
  const { perf, calls } = fakePerf();
  assert.equal(patchPerformanceMeasure(perf), true);
  const props = { body: "x".repeat(50_000), nested: { visit: { id: "005" } } };
  const options = {
    start: 1,
    end: 2,
    detail: { devtools: { track: "Components \u269B", properties: props } },
  };
  perf.measure("OliveProvider", options);
  assert.equal(calls.length, 1);
  assert.equal((calls[0]?.options as { detail: unknown }).detail, null);
  assert.equal((calls[0]?.options as { start: number }).start, 1);
  assert.notEqual(calls[0]?.options, options);
  assert.equal((options.detail as { devtools: { properties: unknown } }).devtools.properties, props);
});

test("non-React measures keep detail and are not counted toward the clear budget", () => {
  const { perf, calls, clears } = fakePerf();
  patchPerformanceMeasure(perf);
  const options = { start: 0, end: 1, detail: { source: "olive-test" } };
  perf.measure("app-timing", options);
  assert.deepEqual(calls[0]?.options, options);
  assert.equal(clears, 0);
});

test("patch is idempotent", () => {
  const { perf } = fakePerf();
  assert.equal(patchPerformanceMeasure(perf), true);
  assert.equal(patchPerformanceMeasure(perf), false);
});
