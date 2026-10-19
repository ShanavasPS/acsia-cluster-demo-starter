// The SignalSource contract: the only way vehicle signals enter the app.
//
//   source.onSignal(cb)   cb(name, value) for every value, typed (number, gear letter, boolean)
//   source.start()        begin; the first values are sent inside this call, so subscribe first
//   source.stop()         end; no more callbacks
//
// A source gets its time from a Clock: { now(), setTimeout(fn, ms) → id, clearTimeout(id) }.
"use strict";
window.Cluster = window.Cluster || {};

Cluster.assertSource = function (source) {
  for (const m of ["start", "stop", "onSignal"]) {
    if (!source || typeof source[m] !== "function") throw new Error("Not a SignalSource: missing " + m + "()");
  }
  return source;
};

// The browser's clock as a Clock. The window functions must be called on window, so wrap them.
Cluster.realClock = {
  now: () => performance.now(),
  setTimeout: (fn, ms) => window.setTimeout(fn, ms),
  clearTimeout: (id) => window.clearTimeout(id),
};
