// Wires the cluster together inside a root element and runs it.
//   Cluster.mount(root)                                  the real thing: replay, real clock, requestAnimationFrame
//   Cluster.mount(root, { source, clock, manual: true }) for tests: given source and clock, draw with app.frame()
// Mounting into a root that already has an app destroys that app first. On load it mounts into
// #cluster, unless window.CLUSTER_NO_AUTOSTART is set.
"use strict";
window.Cluster = window.Cluster || {};
(function () {
  const NEEDED = ["config", "parseCsv", "loadSignalSpec", "assertSource", "realClock", "ReplaySource", "SignalStore",
    "derive", "createDebug", "svg", "createBackground", "createDial", "createTelltales", "createGear", "createFuel",
    "createTemperature", "Startup", "Renderer"];
  const FILES_NEEDED = ["docs/signals.csv", "sim/drive-cycle.csv"];
  // Kept on Cluster, not in this closure, so a page that loads main.js twice still has one registry.
  Cluster.apps = Cluster.apps || new WeakMap();   // root → the app running in it
  Cluster.mounts = Cluster.mounts || 0;

  Cluster.mount = function (root, options = {}) {
    const missing = NEEDED.filter((n) => Cluster[n] === undefined);
    if (missing.length) throw new Error("Cluster: missing modules " + missing.join(", ") + " (check the script list in index.html)");
    const missingFiles = FILES_NEEDED.filter((f) => !window.FILES || typeof window.FILES[f] !== "string");
    if (missingFiles.length) throw new Error("Cluster: missing data files " + missingFiles.join(", ") + " (their .csv.js scripts must load first)");
    if (Cluster.apps.has(root)) Cluster.apps.get(root).destroy();

    const cfg = Cluster.config;
    const clock = options.clock || Cluster.realClock;
    const spec = Cluster.loadSignalSpec(window.FILES["docs/signals.csv"]);
    const store = new Cluster.SignalStore(spec, { clock });
    const source = Cluster.assertSource(options.source || new Cluster.ReplaySource(window.FILES["sim/drive-cycle.csv"], { clock }));

    const { el } = Cluster.svg;
    const idPrefix = "cluster" + (++Cluster.mounts) + "-";   // gradient ids are document-wide
    root.innerHTML = "";
    const svg = el("svg", { viewBox: `0 0 ${cfg.width} ${cfg.height}`, width: "100%", height: "100%", "font-family": cfg.font }, root);
    const defs = el("defs", {}, svg);
    Cluster.createBackground(svg, defs, idPrefix);
    const views = {
      telltales: Cluster.createTelltales(svg),
      speed: Cluster.createDial(svg, defs, idPrefix, Object.assign({ role: "speed" }, cfg.speed)),
      gear: Cluster.createGear(svg),
      rpm: Cluster.createDial(svg, defs, idPrefix, Object.assign({ role: "rpm" }, cfg.rpm)),
      fuel: Cluster.createFuel(svg, defs, idPrefix),
      temperature: Cluster.createTemperature(svg),
    };
    const startup = new Cluster.Startup({ clock });
    const renderer = new Cluster.Renderer({ store, startup, views, clock });

    let raf = null, running = true;
    const app = {
      frame() { if (running) renderer.frame(); },
      get firstLiveAt() { return renderer.firstLiveAt; },
      debug: Cluster.createDebug(store),
      destroy() {
        if (!running) return;
        running = false;
        source.stop();
        if (raf != null) cancelAnimationFrame(raf);
        if (Cluster.apps.get(root) === app) Cluster.apps.delete(root);
        if (window.clusterDebug === app.debug) delete window.clusterDebug;
      },
    };
    Cluster.apps.set(root, app);

    source.onSignal((name, value) => store.update(name, value));
    source.start();
    if (options.manual) {
      try { renderer.frame(); } catch (e) { app.destroy(); throw e; }   // no app to destroy for the caller otherwise
    } else {
      // The next frame is requested before drawing, so an error in one frame is logged and the
      // cluster keeps running rather than freezing on its last frame.
      const loop = () => { if (!running) return; raf = requestAnimationFrame(loop); renderer.frame(); };
      raf = requestAnimationFrame(loop);
    }
    return app;
  };

  if (!window.CLUSTER_NO_AUTOSTART && !Cluster.autostarted) {
    Cluster.autostarted = true;
    window.addEventListener("load", () => {
      const root = document.getElementById("cluster");
      if (!root) return;
      window.clusterDebug = Cluster.mount(root).debug;
    });
  }
})();
