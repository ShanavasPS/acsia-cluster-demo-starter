// Test helpers: a fake clock, a fake signal source, spies, and a rig that mounts the app
// into a test #cluster and runs frames by hand. The app contract they rely on is in tests/README.md.
(function () {
  "use strict";

  // Cluster.<path>, or a clear failure while the feature does not exist yet.
  window.need = function (path) {
    let v = window.Cluster;
    for (const part of path.split(".")) {
      if (v == null || v[part] === undefined) throw new Error("Not implemented yet: Cluster." + path);
      v = v[part];
    }
    return v;
  };

  window.spy = function (impl) {
    const f = function (...args) { f.calls.push(args); return impl ? impl(...args) : undefined; };
    f.calls = [];
    return f;
  };

  // Runs fn with console[method] replaced by a spy; returns the spy.
  window.captureConsole = function (method, fn) {
    const original = console[method];
    const s = spy();
    console[method] = s;
    try { fn(); } finally { console[method] = original; }
    return s;
  };

  // A Clock (see tests/README.md) whose time only moves when a test says so. lateness makes every
  // timer fire that many ms late, like a busy browser, to show up schedules that drift.
  window.FakeClock = class FakeClock {
    constructor({ start = 0, lateness = 0 } = {}) {
      this.t = start; this.lateness = lateness; this.timers = []; this.nextId = 1;
    }
    now() { return this.t; }
    setTimeout(fn, ms) {
      const id = this.nextId++;
      this.timers.push({ id, fn, at: this.t + Math.max(0, ms || 0) + this.lateness });
      return id;
    }
    clearTimeout(id) { this.timers = this.timers.filter((t) => t.id !== id); }
    advance(ms) {
      const target = this.t + ms;
      let fired = 0;
      for (;;) {
        const due = this.timers.filter((t) => t.at <= target).sort((a, b) => a.at - b.at || a.id - b.id)[0];
        if (!due) break;
        if (++fired > 100000) throw new Error("FakeClock: over 100000 timers in one advance(); does something reschedule itself at 0 ms?");
        this.timers = this.timers.filter((t) => t !== due);
        this.t = Math.max(this.t, due.at);
        due.fn();
      }
      this.t = target;
    }
  };

  // The values most UI tests start from: a car at rest in P with no warnings, so each test
  // changes one thing. (Not the first row of the recording, which has rpm 0 and three warnings.)
  window.PARKED = {
    vehicle_speed: 0, engine_rpm: 800, gear: "P", fuel_level_pct: 24, outside_temp_c: 18,
    tt_engine_check: false, tt_battery: false, tt_seatbelt: false, tt_parking_brake: false,
  };

  // A SignalSource for tests: hold(name, value) sends a value and keeps re-sending it every 100 ms,
  // as a live feed would; release(name) stops sending it, so it can time out.
  window.FakeSource = class FakeSource {
    constructor(clock, initial = PARKED) {
      this.clock = clock; this.held = Object.assign({}, initial); this.listeners = [];
      this.timer = null; this.running = false;
    }
    onSignal(cb) { this.listeners.push(cb); }
    start() {
      if (this.running) return;
      this.running = true;
      const tick = () => {
        this.timer = null;
        this.emitAll();
        if (this.running) this.timer = this.clock.setTimeout(tick, 100);
      };
      tick();
    }
    stop() {
      this.running = false;
      if (this.timer != null) this.clock.clearTimeout(this.timer);
      this.timer = null;
    }
    emit(name, value) { for (const cb of this.listeners) cb(name, value); }
    emitAll() { for (const name of Object.keys(this.held)) this.emit(name, this.held[name]); }
    hold(name, value) { this.held[name] = value; if (this.running) this.emit(name, value); }
    release(name) { delete this.held[name]; }
    releaseAll() { this.held = {}; }
  };

  // The rotation a needle shows, read from transform="rotate(a cx cy)".
  window.rotationOf = function (el) {
    const m = /rotate\(\s*([-+]?[\d.]+(?:e[-+]?\d+)?)/i.exec(el.getAttribute("transform") || "");
    if (!m) throw new Error(`${el.getAttribute("data-role")} has no rotate() transform`);
    return parseFloat(m[1]);
  };
  // The angle for a fraction of a 270° dial that starts at -135° (see tests/README.md).
  window.dialAngle = (fraction) => -135 + 270 * fraction;

  // Mounts the app into a fresh #cluster in the test page, driven by a FakeClock and FakeSource.
  window.createRig = function ({ initial = PARKED, skipStartup = true } = {}) {
    const mount = need("mount");
    const slot = document.getElementById("cluster-slot");
    slot.innerHTML = "";
    const root = document.createElement("div");
    root.id = "cluster";
    slot.appendChild(root);
    const clock = new FakeClock();
    const source = new FakeSource(clock, initial);
    const app = mount(root, { source, clock, manual: true });
    if (!app || typeof app.frame !== "function") throw new Error("Not implemented yet: mount() must return an app with frame()");
    const rig = {
      root, clock, source, app,
      // Advances time in 16 ms frames, drawing each one. onFrame runs after every frame.
      run(ms, onFrame) {
        for (let done = 0; done < ms; done += 16) {
          clock.advance(Math.min(16, ms - done));
          app.frame();
          if (onFrame) onFrame();
        }
      },
      el(role) {
        const e = root.querySelector(`[data-role="${role}"]`);
        if (!e) throw new Error(`No element with data-role="${role}" in #cluster`);
        return e;
      },
      all(role) { return Array.from(root.querySelectorAll(`[data-role="${role}"]`)); },
      text(role) { return rig.el(role).textContent.trim(); },
      fraction(role) {
        const v = parseFloat(rig.el(role).getAttribute("data-fraction"));
        if (Number.isNaN(v)) throw new Error(`data-role="${role}" has no data-fraction`);
        return v;
      },
      telltale(name) {
        const e = root.querySelector(`[data-telltale="${name}"]`);
        if (!e) throw new Error(`No telltale data-telltale="${name}" in #cluster`);
        return e;
      },
      gear(letter) {
        const e = root.querySelector(`[data-gear="${letter}"]`);
        if (!e) throw new Error(`No gear letter data-gear="${letter}" in #cluster`);
        return e;
      },
      destroy() { if (app.destroy) app.destroy(); slot.innerHTML = ""; },
    };
    if (skipStartup) rig.run(2100);   // past the startup sequence (live at 1.7 s)
    return rig;
  };

  window.TELLTALES = ["low_fuel", "engine_check", "battery", "seatbelt", "parking_brake"];
  window.lower = (s) => (s == null ? s : String(s).toLowerCase());
})();
