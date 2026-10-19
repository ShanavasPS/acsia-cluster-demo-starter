// One frame: read the store once, derive the display values, write them to the views.
// Only the two needles are smoothed; everything else follows the store on the next frame.
"use strict";
window.Cluster = window.Cluster || {};
Cluster.Renderer = class Renderer {
  constructor({ store, startup, views, clock }) {
    this.store = store; this.startup = startup; this.views = views; this.clock = clock;
    this.lastAt = clock.now();
    this.speedShown = 0;    // the needles as shown, 0..1
    this.rpmShown = 0;
    this.lowFuel = false;   // the low-fuel warning, with hysteresis
    this.firstLiveAt = undefined;
    this.live = false;
  }

  // Exponential smoothing: covers 63 % of the remaining distance every τ, and snaps the last
  // sliver so a settled needle stops moving (and stops writing to the DOM).
  smooth(shown, target, dt) {
    if (!Number.isFinite(target)) return shown;
    if (!Number.isFinite(shown)) return target;
    const n = Cluster.config.needle;
    const next = shown + (target - shown) * (1 - Math.exp(-dt / n.tauMs));
    return Math.abs(target - next) < n.settleFraction ? target : next;
  }

  frame() {
    const now = this.clock.now();
    const dt = Math.max(0, now - this.lastAt);
    this.lastAt = now;
    if (!this.live) {
      const st = this.startup.state();
      if (!st.live) { this.drawStartup(st); return; }
      this.live = true;
      this.firstLiveAt = performance.now();
    }
    this.drawLive(dt);
  }

  drawStartup(st) {
    const v = this.views, d = Cluster.derive, t = Cluster.config.telltales;
    this.speedShown = st.needle;   // the sweep is shown directly, not smoothed
    this.rpmShown = st.needle;
    v.speed.update({ fraction: st.needle, text: d.speedText(0), red: false });
    v.rpm.update({ fraction: st.needle, text: d.rpmText(0), red: false });
    v.gear.update("");
    v.fuel.update({ text: "", fraction: 0, low: false });
    v.temperature.update("");
    const telltales = {};
    for (const name of t.order) telltales[name] = st.telltalesOn ? t.kind[name] : "off";
    v.telltales.update(telltales);
  }

  drawLive(dt) {
    const v = this.views, d = Cluster.derive;
    const s = this.store.snapshot();
    this.speedShown = this.smooth(this.speedShown, d.speedFraction(s.vehicle_speed), dt);
    this.rpmShown = this.smooth(this.rpmShown, d.rpmFraction(s.engine_rpm), dt);
    v.speed.update({ fraction: this.speedShown, text: d.speedText(s.vehicle_speed), red: false });
    v.rpm.update({ fraction: this.rpmShown, text: d.rpmText(s.engine_rpm), red: d.isRedZone(s.engine_rpm) });
    v.gear.update(d.gear(s.gear));
    this.lowFuel = d.lowFuel(this.lowFuel, s.fuel_level_pct);
    v.fuel.update({ text: d.fuelText(s.fuel_level_pct), fraction: d.fuelFraction(s.fuel_level_pct), low: this.lowFuel });
    v.temperature.update(d.tempText(s.outside_temp_c));
    v.telltales.update(d.telltales(s, this.lowFuel));
  }
};
