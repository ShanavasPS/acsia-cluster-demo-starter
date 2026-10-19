// The app's files, in load order, for the test pages (index.html lists the same files for the
// real page). A file that does not exist yet is recorded in window.MISSING_APP_FILES.
// Paths are relative to tests/.
(function () {
  "use strict";
  window.APP_FILES = [
    "app/config.js",
    "app/lib/csv.js",
    "app/signals/spec.js",
    "app/signals/source.js",
    "app/signals/replay-source.js",
    "app/state/store.js",
    "app/state/derive.js",
    "app/debug.js",
    "app/view/svg.js",
    "app/view/background.js",
    "app/view/dial.js",
    "app/view/telltales.js",
    "app/view/gear.js",
    "app/view/fuel.js",
    "app/view/temperature.js",
    "app/startup.js",
    "app/render.js",
    "app/main.js",
  ];
  window.APP_STYLES = ["app/cluster.css"];
  window.MISSING_APP_FILES = [];
  window.CLUSTER_NO_AUTOSTART = true;   // main.js must not mount into the test page by itself
  const missing = (path) => `window.MISSING_APP_FILES.push(${JSON.stringify(path)})`;
  for (const path of window.APP_STYLES) document.write(`<link rel="stylesheet" href="../${path}">`);
  for (const path of window.APP_FILES) document.write(`<script src="../${path}" onerror='${missing(path)}'><\/script>`);
})();
