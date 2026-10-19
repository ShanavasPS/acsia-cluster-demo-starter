// The latest value of every signal, with the type and range check, the timeout and the test
// overrides. No DOM. snapshot() is what the cluster draws from, timeout already applied.
"use strict";
window.Cluster = window.Cluster || {};
Cluster.SignalStore = class SignalStore {
  constructor(spec, { clock = Cluster.realClock } = {}) {
    this.spec = spec;
    this.clock = clock;
    this.signalNames = Object.keys(spec);
    this.latest = {};       // name → { value, at }
    this.overrides = {};    // name → value; holds until cleared
    this.warned = {};       // key → true once a problem was logged
  }

  names() { return this.signalNames; }

  warnOnce(key, message) {
    if (this.warned[key]) return;
    this.warned[key] = true;
    console.warn(message);
  }

  // The value as the signal's type and within its limits (F-03), or undefined when it is not a
  // value of that type at all. Clamping warns once per signal; a wrong type from a source warns
  // once per signal (an override's caller reports its own mistakes).
  checked(name, value, { warnType = true } = {}) {
    const s = this.spec[name];
    if (s.type === "bool") {
      if (typeof value === "boolean") return value;
    } else if (s.type === "enum") {
      if (typeof value === "string" && value.trim() !== "") return value;
    } else if (typeof value === "number" && Number.isFinite(value)) {
      let v = value;
      if (s.min !== null && v < s.min) v = s.min;
      if (s.max !== null && v > s.max) v = s.max;
      if (v !== value) this.warnOnce("range:" + name, `${name}: ${value} is outside ${s.min}..${s.max} ${s.unit}; clamped to ${v}`);
      return v;
    }
    if (warnType) this.warnOnce("type:" + name, `${name}: ${JSON.stringify(value)} is not a ${s.type}; ignored`);
    return undefined;
  }

  update(name, value) {
    if (!this.spec[name]) { this.warnOnce("unknown:" + name, `Unknown signal ${name}; ignored`); return; }
    const v = this.checked(name, value);
    if (v !== undefined) this.latest[name] = { value: v, at: this.clock.now() };
  }

  setOverride(name, value) {
    if (!this.spec[name]) return false;
    const v = this.checked(name, value, { warnType: false });
    if (v === undefined) return false;
    this.overrides[name] = v;
    return true;
  }
  clearOverride(name) { delete this.overrides[name]; }
  clearOverrides() { this.overrides = {}; }

  // Telltales keep their last state; every other signal reads null once it is older than its
  // timeout (a signal without one never times out).
  snapshot() {
    const now = this.clock.now();
    const out = {};
    for (const name of this.signalNames) {
      if (name in this.overrides) { out[name] = this.overrides[name]; continue; }
      const l = this.latest[name];
      if (!l) { out[name] = null; continue; }
      const s = this.spec[name];
      out[name] = s.type !== "bool" && s.timeoutMs !== null && now - l.at > s.timeoutMs ? null : l.value;
    }
    return out;
  }
};
