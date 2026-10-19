// F-07 gear, F-08 fuel and low fuel, F-09 temperature, F-10 telltales.
describe("Indicators", () => {
  let rig;
  afterEach(() => rig && rig.destroy());
  const AMBER = "#f2b43c", RED = "#e2574c", OFF = "#2c4266";
  const ACTIVE = "#6dc1ec", INACTIVE = "#4d6c96";
  const fill = (e) => lower(e.getAttribute("fill"));
  const state = (name) => rig.telltale(name).getAttribute("data-state");

  describe("gear", () => {
    it("TC-07-01 each gear highlights only its letter", () => {
      rig = createRig();
      for (const g of ["P", "R", "N", "D"]) {
        rig.source.hold("gear", g);
        rig.run(200);
        for (const letter of ["P", "R", "N", "D"]) {
          const e = rig.gear(letter);
          expect(e.getAttribute("data-active")).toBe(letter === g ? "true" : "false");
          expect(fill(e)).toBe(letter === g ? ACTIVE : INACTIVE);
        }
        expect(["bold", "700"]).toContain(rig.gear(g).getAttribute("font-weight"));
      }
    });

    it("TC-07-02 an unknown gear shows – and no letter", () => {
      rig = createRig();
      rig.source.hold("gear", "X");
      rig.run(200);
      expect(rig.text("gear-text")).toBe("–");
      for (const letter of ["P", "R", "N", "D"]) expect(rig.gear(letter).getAttribute("data-active")).toBe("false");
    });

    it("TC-07-03 the highlight follows the next frame after an update", () => {
      rig = createRig();
      rig.source.hold("gear", "D");
      rig.run(16);
      expect(rig.gear("D").getAttribute("data-active")).toBe("true");
      expect(rig.gear("P").getAttribute("data-active")).toBe("false");
    });

    it("TC-07-04 a timed-out gear shows -- and no letter", () => {
      rig = createRig();
      rig.source.release("gear");
      rig.run(1060);
      expect(rig.text("gear-text")).toBe("--");
      for (const letter of ["P", "R", "N", "D"]) expect(rig.gear(letter).getAttribute("data-active")).toBe("false");
    });
  });

  describe("fuel", () => {
    const setFuel = (pct, ms = 1000) => { rig.source.hold("fuel_level_pct", pct); rig.run(ms); };

    const barFill = () => rig.el("fuel-bar").width.baseVal.value / rig.el("fuel-track").width.baseVal.value;

    it("TC-08-01 bar and percentage", () => {
      rig = createRig();
      expect(rig.text("fuel-text")).toBe("24 %");
      expect(rig.fraction("fuel-bar")).toBeCloseTo(0.24, 0.001);
      expect(barFill()).toBeCloseTo(0.24, 0.01);   // the drawn bar, a quarter of its track
      expect(rig.el("fuel-bar").getAttribute("data-low")).toBe("false");
      expect(rig.el("fuel-bar").getAttribute("fill")).toContain("url(");
    });

    it("TC-08-02 8 % turns the telltale and the bar amber within 1 s", () => {
      rig = createRig();
      setFuel(8);
      expect(state("low_fuel")).toBe("amber");
      expect(fill(rig.telltale("low_fuel"))).toBe(AMBER);
      expect(rig.el("fuel-bar").getAttribute("data-low")).toBe("true");
      expect(fill(rig.el("fuel-bar"))).toBe(AMBER);
    });

    it("TC-08-03 stays on at 11 %", () => {
      rig = createRig();
      setFuel(8);
      setFuel(11);
      expect(state("low_fuel")).toBe("amber");
    });

    it("TC-08-04 turns off above 12 %", () => {
      rig = createRig();
      setFuel(8);
      setFuel(12.5);
      expect(state("low_fuel")).toBe("off");
      expect(rig.el("fuel-bar").getAttribute("fill")).toContain("url(");
    });

    it("TC-08-05 exactly 10 % turns it on", () => {
      rig = createRig();
      setFuel(10);
      expect(state("low_fuel")).toBe("amber");
    });

    it("TC-08-06 exactly 12 % keeps it on", () => {
      rig = createRig();
      setFuel(8);
      setFuel(12);
      expect(state("low_fuel")).toBe("amber");
    });

    it("TC-08-07 falling to 11 % from above does not turn it on", () => {
      rig = createRig();
      setFuel(11);
      expect(state("low_fuel")).toBe("off");
    });

    it("TC-08-08 empty and full", () => {
      rig = createRig();
      setFuel(0);
      expect(rig.text("fuel-text")).toBe("0 %");
      expect(rig.fraction("fuel-bar")).toBe(0);
      expect(barFill()).toBe(0);
      setFuel(100);
      expect(rig.text("fuel-text")).toBe("100 %");
      expect(rig.fraction("fuel-bar")).toBe(1);
      expect(barFill()).toBeCloseTo(1, 0.001);
    });

    it("TC-04-06 fuel times out: --, empty bar, telltale keeps its state", () => {
      rig = createRig();
      setFuel(8);
      rig.source.release("fuel_level_pct");
      rig.run(2960);
      expect(rig.text("fuel-text")).not.toBe("--");
      rig.run(100);
      expect(rig.text("fuel-text")).toBe("--");
      expect(rig.fraction("fuel-bar")).toBe(0);
      expect(state("low_fuel")).toBe("amber");
    });
  });

  describe("temperature", () => {
    it("TC-09-01 one decimal and °C", () => {
      rig = createRig();
      rig.source.hold("outside_temp_c", -2.5);
      rig.run(200);
      expect(rig.text("temperature")).toBe("-2.5 °C");
    });

    it("TC-09-02 whole numbers keep the decimal", () => {
      rig = createRig();
      expect(rig.text("temperature")).toBe("18.0 °C");
    });

    it("TC-09-03 times out after 10 s, not before", () => {
      rig = createRig();
      rig.source.release("outside_temp_c");
      rig.run(9900);
      expect(rig.text("temperature")).not.toBe("--");
      rig.run(200);
      expect(rig.text("temperature")).toBe("--");
    });
  });

  describe("telltales", () => {
    it("TC-10-01 order from left to right", () => {
      rig = createRig();
      const order = TELLTALES.slice().sort((a, b) =>
        rig.telltale(a).getBoundingClientRect().left - rig.telltale(b).getBoundingClientRect().left);
      expect(order).toEqual(TELLTALES);
    });

    it("TC-10-02 all off in the off colour", () => {
      rig = createRig();
      for (const name of TELLTALES) {
        expect(state(name)).toBe("off");
        expect(fill(rig.telltale(name))).toBe(OFF);
      }
    });

    it("TC-10-03 engine check is amber", () => {
      rig = createRig();
      rig.source.hold("tt_engine_check", true);
      rig.run(100);
      expect(state("engine_check")).toBe("amber");
      expect(fill(rig.telltale("engine_check"))).toBe(AMBER);
    });

    it("TC-10-04 battery, seatbelt and parking brake are red", () => {
      rig = createRig();
      for (const s of ["tt_battery", "tt_seatbelt", "tt_parking_brake"]) rig.source.hold(s, true);
      rig.run(100);
      for (const name of ["battery", "seatbelt", "parking_brake"]) {
        expect(state(name)).toBe("red");
        expect(fill(rig.telltale(name))).toBe(RED);
      }
    });

    it("TC-10-05 a telltale turns off on the next frame", () => {
      rig = createRig();
      rig.source.hold("tt_parking_brake", true);
      rig.run(100);
      rig.source.hold("tt_parking_brake", false);
      rig.run(16);
      expect(state("parking_brake")).toBe("off");
    });

    it("TC-10-06 each telltale is independent", () => {
      rig = createRig();
      rig.source.hold("tt_seatbelt", true);
      rig.run(100);
      for (const name of TELLTALES) expect(state(name)).toBe(name === "seatbelt" ? "red" : "off");
    });

    it("TC-04-03 a telltale keeps its state when its signal stops", () => {
      rig = createRig();
      rig.source.hold("tt_parking_brake", true);
      rig.run(100);
      rig.source.release("tt_parking_brake");
      rig.run(2000);
      expect(state("parking_brake")).toBe("red");
    });
  });
});
