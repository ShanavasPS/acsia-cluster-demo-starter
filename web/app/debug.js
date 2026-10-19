// The console override for testers (F-12). One per mounted app, as app.debug; the real page's is
// also window.clusterDebug. An override holds until cleared:
//   clusterDebug.set("fuel_level_pct", 8)   clusterDebug.clear("fuel_level_pct")
//   clusterDebug.clearAll()                 clusterDebug.list()
"use strict";
window.Cluster = window.Cluster || {};
Cluster.createDebug = function (store) {
  return {
    set(name, value) {
      const s = store.spec[name];
      if (!s) {
        console.error(`Unknown signal: ${name}. Signals: ${store.names().join(", ")}`);
        return false;
      }
      // The console hands over strings; make them the signal's type where that is unambiguous.
      let v = value;
      if (s.type === "float" && typeof v === "string" && v.trim() !== "") v = Number(v);
      if (s.type === "bool" && ["true", "false", "1", "0", 1, 0].includes(v)) v = v === "true" || v === "1" || v === 1;
      if (s.type === "enum" && typeof v === "string") v = v.trim().toUpperCase();
      if (store.setOverride(name, v)) return true;
      console.error(`${name}: ${JSON.stringify(value)} is not a ${s.type}${s.unit ? " in " + s.unit : ""}; not set`);
      return false;
    },
    clear(name) { store.clearOverride(name); },
    clearAll() { store.clearOverrides(); },
    list() { return store.names().slice(); },
  };
};
