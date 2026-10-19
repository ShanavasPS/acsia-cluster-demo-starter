// Replays a recorded drive (sim/drive-cycle.csv: t_ms, then one column per signal) in a loop.
// Every column of every row is sent at the row's t_ms, unchanged values too: the row cadence is
// the heartbeat that keeps constant signals from timing out. After the last row the first plays
// again one step later (the last row's own step).
//
// Rows are scheduled at absolute clock times, and each timer plays the row that is due *now*:
// a late timer does not push the drive back, and after a long stall (a background tab throttles
// timers to once a second) the replay jumps to where the drive should be instead of racing
// through every missed row. The next timer is set before the row is sent, so a listener that
// throws, or stops and restarts the source, cannot leave the replay without a timer or with two.
"use strict";
window.Cluster = window.Cluster || {};
Cluster.ReplaySource = class ReplaySource {
  constructor(csvText, { clock = Cluster.realClock } = {}) {
    this.clock = clock;
    this.listeners = [];
    const rows = Cluster.parseCsv(csvText).map((row) => {
      const tText = row.t_ms, t = tText.trim() === "" ? NaN : Number(tText);
      const values = {};
      for (const name of Object.keys(row)) {
        if (name === "t_ms") continue;
        const v = ReplaySource.typed(name, row[name]);
        if (v !== undefined) values[name] = v;   // an empty or unreadable cell is a missing value
      }
      return { t, tText, values };
    });
    if (!rows.length) throw new Error("ReplaySource: the recording has no rows");
    rows.forEach((r, i) => { if (!Number.isFinite(r.t)) throw new Error(`ReplaySource: t_ms must be a number; row ${i + 1} has "${r.tText}"`); });
    for (let i = 1; i < rows.length; i++) {
      if (rows[i].t <= rows[i - 1].t) throw new Error(`ReplaySource: t_ms must increase; row ${i + 1} has ${rows[i].t} after ${rows[i - 1].t}`);
    }
    const first = rows[0].t;
    this.rows = rows.map((r) => ({ t: r.t - first, values: r.values }));   // the first row plays at 0
    const last = this.rows[this.rows.length - 1];
    const step = this.rows.length > 1 ? last.t - this.rows[this.rows.length - 2].t : Cluster.config.replay.defaultStepMs;
    this.periodMs = last.t + step;
    this.timer = null;
    this.running = false;
  }

  // Columns are typed by name: tt_* are booleans ("1"/"0"), gear is a letter, the rest numbers.
  static typed(name, text) {
    const s = text.trim();
    if (s === "") return undefined;
    if (name.startsWith("tt_")) return s === "1" || s.toLowerCase() === "true";
    if (name === "gear") return s;
    const n = Number(s);
    return Number.isFinite(n) ? n : undefined;
  }

  onSignal(cb) { this.listeners.push(cb); }

  start() {
    if (this.running) return;
    this.running = true;
    this.t0 = this.clock.now();
    this.dueOffset = 0;   // the offset into the drive the pending timer was set for
    this.generation = (this.generation || 0) + 1;   // tells a restart apart from the run before it
    this.play();
  }

  stop() {
    this.running = false;
    if (this.timer != null) this.clock.clearTimeout(this.timer);
    this.timer = null;
  }

  // The index of the last row at or before offset ms into the drive.
  rowAt(offset) {
    let lo = 0, hi = this.rows.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.rows[mid].t <= offset) lo = mid; else hi = mid - 1;
    }
    return lo;
  }

  play() {
    const now = this.clock.now();
    // A timer never fires early, but the clock can say so: setTimeout truncates the delay to whole
    // ms, and t0 + offset - t0 can round a hair short. Read such a timer as on time, or the row
    // plays twice (and a fake clock with a 0 ms timer loops for ever).
    const elapsed = Math.max(now - this.t0, this.dueOffset);
    let loop = Math.floor(elapsed / this.periodMs);
    const i = this.rowAt(elapsed - loop * this.periodMs);
    let next = i + 1;
    if (next >= this.rows.length) { next = 0; loop++; }
    this.dueOffset = loop * this.periodMs + this.rows[next].t;
    this.timer = this.clock.setTimeout(() => this.play(), Math.max(0, this.t0 + this.dueOffset - now));
    // Deliver the row, unless a listener stops the source (or restarts it) meanwhile.
    const row = this.rows[i], gen = this.generation;
    for (const name of Object.keys(row.values)) {
      for (const cb of this.listeners) {
        if (!this.running || this.generation !== gen) return;
        cb(name, row.values[name]);
      }
    }
  }
};
