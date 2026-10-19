// F-03 range check, F-04 timeouts and F-12 overrides, in the signal store.
describe("Signal store", () => {
  let clock, store;
  beforeEach(() => {
    clock = new FakeClock();
    const SignalStore = need("SignalStore");
    store = new SignalStore(need("loadSignalSpec")(window.FILES["docs/signals.csv"]), { clock });
  });
  const value = (name) => store.snapshot()[name];
  const updateAll = (values) => { for (const name in values) store.update(name, values[name]); };

  describe("range check", () => {
    it("TC-03-02 clamps speed above the maximum and warns", () => {
      const warn = captureConsole("warn", () => store.update("vehicle_speed", 300));
      expect(value("vehicle_speed")).toBe(260);
      expect(warn.calls).toHaveLength(1);
    });

    it("TC-03-03 warns only once per signal", () => {
      const warn = captureConsole("warn", () => {
        for (let i = 0; i < 21; i++) store.update("vehicle_speed", 300);
      });
      expect(warn.calls).toHaveLength(1);
    });

    it("TC-03-04 a value back in range is shown as it is", () => {
      captureConsole("warn", () => store.update("vehicle_speed", 300));
      store.update("vehicle_speed", 64.4);
      expect(value("vehicle_speed")).toBe(64.4);
    });

    it("TC-03-05 clamps below the minimum and warns", () => {
      const warn = captureConsole("warn", () => store.update("outside_temp_c", -50));
      expect(value("outside_temp_c")).toBe(-40);
      expect(warn.calls).toHaveLength(1);
    });

    it("TC-03-06 checks every numeric signal, one warning each", () => {
      const warn = captureConsole("warn", () => {
        store.update("engine_rpm", 9000);
        store.update("fuel_level_pct", 120);
        store.update("outside_temp_c", 61);
      });
      expect(value("engine_rpm")).toBe(8000);
      expect(value("fuel_level_pct")).toBe(100);
      expect(value("outside_temp_c")).toBe(60);
      expect(warn.calls).toHaveLength(3);
    });

    it("TC-03-07 values exactly at the limits are not warnings", () => {
      const warn = captureConsole("warn", () => {
        store.update("vehicle_speed", 0);
        store.update("vehicle_speed", 260);
      });
      expect(value("vehicle_speed")).toBe(260);
      expect(warn.calls).toHaveLength(0);
    });
  });

  describe("timeouts", () => {
    it("TC-04-01 speed times out after 500 ms, not before", () => {
      store.update("vehicle_speed", 64.4);
      clock.advance(499);
      expect(value("vehicle_speed")).toBe(64.4);
      clock.advance(21);
      expect(value("vehicle_speed")).toBeNull();
    });

    it("TC-04-02 speed comes back with the next update", () => {
      store.update("vehicle_speed", 10);
      clock.advance(600);
      store.update("vehicle_speed", 64.4);
      expect(value("vehicle_speed")).toBe(64.4);
    });

    it("TC-04-03 telltales keep their last state", () => {
      store.update("tt_parking_brake", true);
      clock.advance(2000);
      expect(value("tt_parking_brake")).toBe(true);
    });

    it("TC-04-04 each signal uses its own timeout", () => {
      updateAll(PARKED);
      clock.advance(490);
      expect(value("vehicle_speed")).toBe(0);
      clock.advance(30);    // 520 ms
      expect(value("vehicle_speed")).toBeNull();
      expect(value("engine_rpm")).toBeNull();
      expect(value("gear")).toBe("P");
      clock.advance(500);   // 1020 ms
      expect(value("gear")).toBeNull();
      expect(value("fuel_level_pct")).toBe(24);
      clock.advance(2000);  // 3020 ms
      expect(value("fuel_level_pct")).toBeNull();
      expect(value("outside_temp_c")).toBe(18);
      clock.advance(7000);  // 10020 ms
      expect(value("outside_temp_c")).toBeNull();
      expect(value("tt_engine_check")).toBe(false);
    });

    it("TC-04-07 one signal timing out leaves the others", () => {
      updateAll(PARKED);
      for (let i = 0; i < 10; i++) {
        clock.advance(100);
        const others = Object.assign({}, PARKED);
        delete others.vehicle_speed;
        updateAll(others);
      }
      expect(value("vehicle_speed")).toBeNull();
      expect(value("engine_rpm")).toBe(800);
      expect(value("gear")).toBe("P");
      expect(value("fuel_level_pct")).toBe(24);
    });

    it("TC-11-05 support: a signal never received has no value", () => {
      expect(value("vehicle_speed")).toBeNull();
    });
  });

  describe("overrides", () => {
    it("TC-12-02 an override beats the source", () => {
      store.setOverride("vehicle_speed", 64.4);
      store.update("vehicle_speed", 100);
      expect(value("vehicle_speed")).toBe(64.4);
    });

    it("TC-12-03 clearing one override restores the source value and keeps the others", () => {
      store.update("fuel_level_pct", 24);
      store.update("vehicle_speed", 0);
      store.setOverride("fuel_level_pct", 8);
      store.setOverride("vehicle_speed", 50);
      store.clearOverride("fuel_level_pct");
      expect(value("fuel_level_pct")).toBe(24);
      expect(value("vehicle_speed")).toBe(50);
    });

    it("TC-12-04 clearing all overrides restores every source value", () => {
      store.update("fuel_level_pct", 24);
      store.update("vehicle_speed", 0);
      store.setOverride("fuel_level_pct", 8);
      store.setOverride("vehicle_speed", 50);
      store.clearOverrides();
      expect(value("fuel_level_pct")).toBe(24);
      expect(value("vehicle_speed")).toBe(0);
    });

    it("TC-12-05 refuses an unknown signal", () => {
      expect(store.setOverride("turbo_boost", 1)).toBe(false);
      expect(store.snapshot().turbo_boost).toBe(undefined);
    });

    it("TC-12-06 overrides are range-checked", () => {
      const warn = captureConsole("warn", () => store.setOverride("vehicle_speed", 300));
      expect(value("vehicle_speed")).toBe(260);
      expect(warn.calls).toHaveLength(1);
    });

    it("TC-12-07 an override holds until it is cleared; it does not time out", () => {
      store.setOverride("fuel_level_pct", 8);
      clock.advance(60000);
      expect(value("fuel_level_pct")).toBe(8);
      store.clearOverride("fuel_level_pct");
      expect(value("fuel_level_pct")).toBeNull();   // the source never sent fuel
    });

    it("TC-12-02 support: the source keeps updating underneath an override", () => {
      store.setOverride("vehicle_speed", 64.4);
      store.update("vehicle_speed", 100);
      clock.advance(5000);
      expect(value("vehicle_speed")).toBe(64.4);
      store.clearOverride("vehicle_speed");
      expect(value("vehicle_speed")).toBeNull();    // the last update is 5 s old, so it has timed out
      store.update("vehicle_speed", 100);
      expect(value("vehicle_speed")).toBe(100);
    });
  });
});
