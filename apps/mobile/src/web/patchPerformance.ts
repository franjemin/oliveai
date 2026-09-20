/**
 * React 19.2 DEV `performance.measure` (Components ⚛ / Performance Tracks)
 * structured-clones fiber props into the user-timing buffer. The clone
 * succeeds, so try/catch on DataCloneError cannot help — the browser
 * retains tens of MB until OOM. Strip `detail` before the native call
 * (keep start/end timing) and cap the timeline so empty entries cannot
 * accumulate without bound.
 *
 * Must run before React mounts (custom entry + inline <head> script).
 */
const PATCHED = "__olivePatchedPerformanceMeasure";
const BUDGET = 16384;

type Perf = Performance & { [PATCHED]?: boolean };

function isReactDevtoolsMeasure(
  name: string,
  options: PerformanceMeasureOptions | null,
): boolean {
  const detail = options?.detail as { devtools?: unknown } | undefined;
  if (detail != null && typeof detail === "object" && "devtools" in detail) return true;
  return typeof name === "string" && name.includes("\u269B");
}

export function patchPerformanceMeasure(perf: Performance = globalThis.performance): boolean {
  if (!perf || typeof perf.measure !== "function") return false;
  const tagged = perf as Perf;
  if (tagged[PATCHED]) return false;
  tagged[PATCHED] = true;

  const original = perf.measure.bind(perf);
  const clear = typeof perf.clearMeasures === "function" ? perf.clearMeasures.bind(perf) : null;
  let count = 0;

  perf.measure = function olivePatchedMeasure(
    name: string,
    startOrOptions?: string | PerformanceMeasureOptions,
    endMark?: string,
  ): PerformanceMeasure {
    const options =
      startOrOptions && typeof startOrOptions === "object" ? (startOrOptions as PerformanceMeasureOptions) : null;
    if (options && isReactDevtoolsMeasure(name, options)) {
      count += 1;
      if (clear && count >= BUDGET) {
        count = 0;
        try {
          clear();
        } catch {
          /* ignore */
        }
      }
      return original(name, Object.assign({}, options, { detail: null }), endMark);
    }
    return original(name, startOrOptions as never, endMark);
  } as typeof perf.measure;

  return true;
}

/** Inline <head> copy — identical algorithm, runs before the JS bundle parses. */
export const PERFORMANCE_MEASURE_PATCH_SCRIPT = `(function(){
  var p=typeof performance!=="undefined"?performance:null;
  if(!p||typeof p.measure!=="function"||p.__olivePatchedPerformanceMeasure)return;
  p.__olivePatchedPerformanceMeasure=true;
  var original=p.measure.bind(p);
  var clear=typeof p.clearMeasures==="function"?p.clearMeasures.bind(p):null;
  var count=0;
  var BUDGET=16384;
  p.measure=function(name,startOrOptions,endMark){
    var options=startOrOptions&&typeof startOrOptions==="object"?startOrOptions:null;
    var detail=options&&options.detail;
    var isReact=(detail&&typeof detail==="object"&&"devtools" in detail)||(typeof name==="string"&&name.indexOf("\\u269B")!==-1);
    if(isReact&&options){
      count+=1;
      if(clear&&count>=BUDGET){count=0;try{clear();}catch(e){}}
      return original(name,Object.assign({},options,{detail:null}),endMark);
    }
    return original.apply(p,arguments);
  };
})();`;

if (typeof globalThis !== "undefined" && typeof globalThis.performance !== "undefined") {
  patchPerformanceMeasure(globalThis.performance);
}
