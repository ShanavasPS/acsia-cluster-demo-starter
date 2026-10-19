// Values derived for display: F-05 speed, F-06 rpm, F-07 gear, F-08 fuel, F-09 temperature.
// null stands for a signal that has timed out.
describe("Derived values", () => {
  const d = (name) => need("derive." + name);

  describe("speed", () => {
    it("TC-05-01 converts km/h to whole mph", () => {
      const speedText = d("speedText");
      expect([0, 64.4, 128.7, 257.5].map(speedText)).toEqual(["0", "40", "80", "160"]);
      expect(d("kmhToMph")(1.609344)).toBeCloseTo(1);
    });

    it("TC-05-02 rounds to the nearest mph", () => {
      expect(d("speedText")(0.8)).toBe("0");
      expect(d("speedText")(1.6)).toBe("1");
    });

    it("TC-05-03 the needle stops at the end of the scale, the digits do not", () => {
      expect(d("speedFraction")(260)).toBe(1);
      expect(d("speedFraction")(257.5)).toBe(1);
      expect(d("speedText")(260)).toBe("162");
    });

    it("TC-05-04 80 mph is the middle of the scale", () => {
      expect(d("speedFraction")(128.7)).toBeCloseTo(0.5, 0.001);
      expect(d("speedFraction")(0)).toBe(0);
    });

    it("TC-04-01 support: a timed-out speed shows -- and the needle at 0", () => {
      expect(d("speedText")(null)).toBe("--");
      expect(d("speedFraction")(null)).toBe(0);
    });
  });

  describe("rpm", () => {
    it("TC-06-01 shows thousands with one decimal", () => {
      expect(d("rpmText")(3236)).toBe("3.2");
    });

    it("TC-06-05 zero and full scale", () => {
      expect(d("rpmText")(0)).toBe("0.0");
      expect(d("rpmText")(8000)).toBe("8.0");
      expect(d("rpmFraction")(0)).toBe(0);
      expect(d("rpmFraction")(8000)).toBe(1);
    });

    it("TC-06-02 TC-06-03 TC-06-04 red only above 6500", () => {
      const red = d("isRedZone");
      expect(red(6501)).toBe(true);
      expect(red(7000)).toBe(true);
      expect(red(6500)).toBe(false);
      expect(red(4000)).toBe(false);
      expect(red(null)).toBe(false);
    });

    it("TC-04-05 support: a timed-out rpm shows -- and the needle at 0", () => {
      expect(d("rpmText")(null)).toBe("--");
      expect(d("rpmFraction")(null)).toBe(0);
    });
  });

  describe("gear", () => {
    it("TC-07-01 P, R, N and D pass through", () => {
      expect(["P", "R", "N", "D"].map(d("gear"))).toEqual(["P", "R", "N", "D"]);
    });

    it("TC-07-02 an unknown gear shows –", () => {
      expect(d("gear")("X")).toBe("–");
    });

    it("TC-07-04 a timed-out gear shows --", () => {
      expect(d("gear")(null)).toBe("--");
    });
  });

  describe("fuel", () => {
    it("TC-08-01 percentage and bar fraction", () => {
      expect(d("fuelText")(24)).toBe("24 %");
      expect(d("fuelFraction")(24)).toBeCloseTo(0.24);
    });

    it("TC-08-08 empty and full", () => {
      expect(d("fuelText")(0)).toBe("0 %");
      expect(d("fuelText")(100)).toBe("100 %");
      expect(d("fuelFraction")(0)).toBe(0);
      expect(d("fuelFraction")(100)).toBe(1);
    });

    it("TC-04-06 support: a timed-out fuel level shows -- and an empty bar", () => {
      expect(d("fuelText")(null)).toBe("--");
      expect(d("fuelFraction")(null)).toBe(0);
    });

    it("TC-08-02 low fuel turns on at 8 %", () => {
      expect(d("lowFuel")(false, 8)).toBe(true);
    });

    it("TC-08-03 stays on at 11 %", () => {
      expect(d("lowFuel")(true, 11)).toBe(true);
    });

    it("TC-08-04 turns off above 12 %", () => {
      expect(d("lowFuel")(true, 12.5)).toBe(false);
    });

    it("TC-08-05 exactly 10 % turns it on", () => {
      expect(d("lowFuel")(false, 10)).toBe(true);
    });

    it("TC-08-06 exactly 12 % keeps it on", () => {
      expect(d("lowFuel")(true, 12)).toBe(true);
    });

    it("TC-08-07 falling to 11 % from above does not turn it on", () => {
      expect(d("lowFuel")(false, 11)).toBe(false);
    });

    it("TC-04-06 support: a timed-out fuel level keeps the telltale's state", () => {
      expect(d("lowFuel")(true, null)).toBe(true);
      expect(d("lowFuel")(false, null)).toBe(false);
    });
  });

  describe("temperature", () => {
    it("TC-09-01 one decimal and °C", () => {
      expect(d("tempText")(-2.5)).toBe("-2.5 °C");
    });

    it("TC-09-02 whole numbers keep the decimal", () => {
      expect(d("tempText")(18)).toBe("18.0 °C");
    });

    it("TC-09-03 support: a timed-out temperature shows --", () => {
      expect(d("tempText")(null)).toBe("--");
    });
  });
});
