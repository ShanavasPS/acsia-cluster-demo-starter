// The page around the app: scales the cluster window to fit, and wires the car's controls.
//   index.html                the car drives in a loop
//   index.html?car=parked     the car starts parked
//   index.html?car=off        no car at all (see car.js)
//   index.html?view=cluster   only the window at 528 × 692, for screenshots
(function () {
  "use strict";
  const params = new URLSearchParams(location.search);
  const $ = (id) => document.getElementById(id);

  if (params.get("view") === "cluster") document.documentElement.classList.add("cluster-only");

  function fit() {
    const screen = $("screen");
    if (document.documentElement.classList.contains("cluster-only")) return;
    const room = window.innerHeight - $("controls").offsetHeight - 68;
    const scale = Math.min(1, room / 692, (window.innerWidth - 32) / 528);
    screen.style.transform = `scale(${Math.max(scale, 0.3)})`;
    screen.style.marginBottom = `${692 * (Math.max(scale, 0.3) - 1)}px`;  // take back the space scaling frees
  }
  window.addEventListener("resize", fit);
  fit();

  const car = window.car;
  if (!car) {
    $("drive").disabled = $("park").disabled = true;
    $("readout").textContent = "No car (car=off): the app replays its recording";
    return;
  }

  function showState() {
    $("drive").setAttribute("aria-pressed", car.driving);
    $("park").setAttribute("aria-pressed", !car.driving);
  }
  $("drive").onclick = () => { car.drive(); showState(); };
  $("park").onclick = () => { car.park(); showState(); };

  setInterval(() => {
    const mph = Math.round(car.get("vehicle_speed") / 1.609344);
    $("readout").textContent = `Car: ${mph} mph · ${car.get("gear")} · ${car.get("engine_rpm")} rpm · fuel ${car.get("fuel_level_pct")} %`;
  }, 250);

  if (params.get("car") !== "parked") car.drive();
  showState();
})();
