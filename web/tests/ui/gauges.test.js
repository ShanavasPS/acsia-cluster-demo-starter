// F-05 speed gauge, F-06 rev counter, and how F-02, F-03 and F-04 show on them.
describe("Gauges", () => {
  let rig;
  afterEach(() => rig && rig.destroy());
  const RED = "#e2574c";

  describe("speed", () => {
    it("TC-05-01 shows km/h as mph", () => {
      rig = createRig();
      const shown = [0, 64.4, 128.7, 257.5].map((kmh) => {
        rig.source.hold("vehicle_speed", kmh);
        rig.run(1000);
        return rig.text("speed-text");
      });
      expect(shown).toEqual(["0", "40", "80", "160"]);
    });

    it("TC-05-03 the needle stops at the end of the scale", () => {
      rig = createRig();
      rig.source.hold("vehicle_speed", 260);
      rig.run(1000);
      expect(rig.text("speed-text")).toBe("162");
      expect(rig.fraction("speed-needle")).toBeCloseTo(1, 0.01);
    });

    it("TC-03-02 speed above the maximum is clamped, with one warning", () => {
      rig = createRig();
      const warn = captureConsole("warn", () => {
        rig.source.hold("vehicle_speed", 300);
        rig.run(1000);
      });
      expect(rig.text("speed-text")).toBe("162");
      expect(rig.fraction("speed-needle")).toBeCloseTo(1, 0.01);
      expect(warn.calls).toHaveLength(1);
    });

    it("TC-03-04 back in range displays normally", () => {
      rig = createRig();
      captureConsole("warn", () => { rig.source.hold("vehicle_speed", 300); rig.run(500); });
      rig.source.hold("vehicle_speed", 64.4);
      rig.run(1000);
      expect(rig.text("speed-text")).toBe("40");
    });

    it("TC-05-04 80 mph points at the middle of the arc", () => {
      rig = createRig();
      rig.source.hold("vehicle_speed", 128.7);
      rig.run(1000);
      expect(rig.fraction("speed-needle")).toBeCloseTo(0.5, 0.01);
      expect(rotationOf(rig.el("speed-needle"))).toBeCloseTo(dialAngle(0.5), 1.5);   // straight up
    });

    it("TC-05-05 the needle moves smoothly between updates, with no jumps", () => {
      rig = createRig();
      let kmh = 50;
      rig.source.hold("vehicle_speed", kmh);
      rig.run(1000);
      const samples = [rig.fraction("speed-needle")];
      for (let i = 0; i < 10; i++) {
        kmh += 5;
        rig.source.hold("vehicle_speed", kmh);
        rig.run(100, () => samples.push(rig.fraction("speed-needle")));
      }
      const step = 5 / 1.609344 / 160;   // one update's change, as a fraction of the scale
      const deltas = samples.slice(1).map((v, i) => v - samples[i]);
      expect(Math.min(...deltas)).toBeGreaterThanOrEqual(0);                       // never backwards
      expect(Math.max(...deltas)).toBeLessThanOrEqual(step + 1e-6);                // never a whole update at once
      const moving = deltas.filter((d) => d > 0).length;
      expect(moving).toBeGreaterThanOrEqual(Math.ceil(deltas.length * 0.7));        // an unsmoothed needle moves on 1 frame in 7
    });

    it("TC-05-06 9 ticks and the mph label", () => {
      rig = createRig();
      expect(rig.all("speed-tick")).toHaveLength(9);
      expect(rig.text("speed-unit")).toBe("mph");
    });

    it("TC-02-04 another source drives the cluster", () => {
      rig = createRig();
      expect(() => need("assertSource")(rig.source)).not.toThrow();
      rig.source.hold("vehicle_speed", 80);
      rig.run(1000);
      expect(rig.text("speed-text")).toBe("50");
    });
  });

  describe("rpm", () => {
    it("TC-06-01 shows ×1000 rpm with one decimal", () => {
      rig = createRig();
      rig.source.hold("engine_rpm", 3236);
      rig.run(500);
      expect(rig.text("rpm-text")).toBe("3.2");
    });

    it("TC-06-02 the arc turns red above 6500", () => {
      rig = createRig();
      rig.source.hold("engine_rpm", 6501);
      rig.run(500);
      expect(rig.el("rpm-arc").getAttribute("data-red")).toBe("true");
      expect(lower(rig.el("rpm-arc").getAttribute("stroke"))).toBe(RED);
    });

    it("TC-06-03 back below the red zone the arc is the gradient again", () => {
      rig = createRig();
      rig.source.hold("engine_rpm", 7000);
      rig.run(500);
      rig.source.hold("engine_rpm", 4000);
      rig.run(500);
      expect(rig.el("rpm-arc").getAttribute("data-red")).toBe("false");
      expect(rig.el("rpm-arc").getAttribute("stroke")).toContain("url(");
    });

    it("TC-06-04 exactly 6500 is not red", () => {
      rig = createRig();
      rig.source.hold("engine_rpm", 6500);
      rig.run(500);
      expect(rig.el("rpm-arc").getAttribute("data-red")).toBe("false");
    });

    it("TC-06-05 zero and full scale", () => {
      rig = createRig();
      rig.source.hold("engine_rpm", 0);
      rig.run(1000);
      expect(rig.text("rpm-text")).toBe("0.0");
      expect(rig.fraction("rpm-needle")).toBeLessThan(0.01);
      expect(rotationOf(rig.el("rpm-needle"))).toBeCloseTo(dialAngle(0), 1.5);
      rig.source.hold("engine_rpm", 8000);
      rig.run(1000);
      expect(rig.text("rpm-text")).toBe("8.0");
      expect(rig.fraction("rpm-needle")).toBeGreaterThan(0.99);
      expect(rotationOf(rig.el("rpm-needle"))).toBeCloseTo(dialAngle(1), 1.5);
    });

    it("TC-06-06 17 equal ticks and a red zone", () => {
      rig = createRig();
      const ticks = rig.all("rpm-tick");
      expect(ticks).toHaveLength(17);
      const length = (t) => Math.hypot(t.x2.baseVal.value - t.x1.baseVal.value, t.y2.baseVal.value - t.y1.baseVal.value);
      const lengths = ticks.map(length);
      expect(Math.max(...lengths) - Math.min(...lengths)).toBeLessThan(0.5);
      expect(rig.el("rpm-redzone")).toBeTruthy();
    });
  });

  describe("timeouts", () => {
    it("TC-04-01 speed shows -- after 500 ms and the needle drops to 0", () => {
      rig = createRig();
      rig.source.hold("vehicle_speed", 64.4);
      rig.run(1000);
      rig.source.release("vehicle_speed");
      rig.run(480);
      expect(rig.text("speed-text")).not.toBe("--");
      rig.run(80);
      expect(rig.text("speed-text")).toBe("--");
      expect(rig.fraction("speed-needle")).toBeGreaterThan(0.05);   // not a snap: still on its way down from 40 mph (0.25)
      rig.run(500);   // the needle moves to 0 with its usual smoothing
      expect(rig.fraction("speed-needle")).toBeLessThan(0.01);
    });

    it("TC-04-02 speed comes back", () => {
      rig = createRig();
      rig.source.release("vehicle_speed");
      rig.run(1000);
      rig.source.hold("vehicle_speed", 64.4);
      rig.run(1000);
      expect(rig.text("speed-text")).toBe("40");
    });

    it("TC-04-05 rpm times out", () => {
      rig = createRig();
      rig.source.release("engine_rpm");
      rig.run(560);
      expect(rig.text("rpm-text")).toBe("--");
      rig.run(500);
      expect(rig.fraction("rpm-needle")).toBeLessThan(0.01);
    });

    it("TC-04-04 each signal uses its own timeout", () => {
      rig = createRig();
      rig.source.releaseAll();
      rig.run(560);
      expect(rig.text("speed-text")).toBe("--");
      expect(rig.text("rpm-text")).toBe("--");
      expect(rig.text("gear-text")).not.toBe("--");
      rig.run(500);     // about 1060 ms
      expect(rig.text("gear-text")).toBe("--");
      expect(rig.text("fuel-text")).not.toBe("--");
      rig.run(2000);    // about 3060 ms
      expect(rig.text("fuel-text")).toBe("--");
      expect(rig.text("temperature")).not.toBe("--");
      rig.run(7000);    // about 10060 ms
      expect(rig.text("temperature")).toBe("--");
    });

    it("TC-04-07 one signal timing out leaves the others", () => {
      rig = createRig();
      rig.source.release("vehicle_speed");
      rig.run(1000);
      expect(rig.text("speed-text")).toBe("--");
      expect(rig.text("rpm-text")).toBe("0.8");
      expect(rig.text("fuel-text")).toBe("24 %");
      expect(rig.text("temperature")).toBe("18.0 °C");
      expect(rig.gear("P").getAttribute("data-active")).toBe("true");
    });
  });
});
