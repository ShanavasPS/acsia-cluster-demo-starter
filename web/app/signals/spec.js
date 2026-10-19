// docs/signals.csv as a map: name → { name, type, unit, min, max, rateHz, timeoutMs, description }.
// Numbers are numbers; a missing limit is null.
"use strict";
window.Cluster = window.Cluster || {};
Cluster.loadSignalSpec = function (text) {
  const num = (s) => (s === "" || s === undefined ? null : Number(s));
  const spec = {};
  for (const row of Cluster.parseCsv(text)) {
    if (!row.name) continue;
    spec[row.name] = {
      name: row.name, type: row.type, unit: row.unit,
      min: num(row.min), max: num(row.max), rateHz: num(row.rate_hz), timeoutMs: num(row.timeout_ms),
      description: row.description,
    };
  }
  return spec;
};
