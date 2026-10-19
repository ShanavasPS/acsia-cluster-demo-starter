// F-03: limits, rates and timeouts come from docs/signals.csv.
describe("Signal spec", () => {
  const load = () => need("loadSignalSpec")(window.FILES["docs/signals.csv"]);

  it("TC-03-01 has every signal in signals.csv", () => {
    const spec = load();
    expect(Object.keys(spec).sort()).toEqual([
      "engine_rpm", "fuel_level_pct", "gear", "outside_temp_c", "tt_battery",
      "tt_engine_check", "tt_parking_brake", "tt_seatbelt", "vehicle_speed",
    ]);
  });

  it("TC-03-01 numeric limits, rate and timeout match the file", () => {
    const spec = load();
    expect(spec.vehicle_speed).toMatchObject({ name: "vehicle_speed", type: "float", unit: "km/h", min: 0, max: 260, rateHz: 10, timeoutMs: 500 });
    expect(spec.engine_rpm.max).toBe(8000);
    expect(spec.fuel_level_pct.timeoutMs).toBe(3000);
    expect(spec.outside_temp_c.min).toBe(-40);
    expect(spec.outside_temp_c.max).toBe(60);
    expect(spec.outside_temp_c.rateHz).toBe(0.2);
    expect(spec.outside_temp_c.timeoutMs).toBe(10000);
  });

  it("TC-03-01 signals without limits have null min and max", () => {
    const spec = load();
    expect(spec.gear.type).toBe("enum");
    expect(spec.gear.min).toBeNull();
    expect(spec.gear.max).toBeNull();
    expect(spec.gear.timeoutMs).toBe(1000);
    expect(spec.tt_seatbelt.type).toBe("bool");
    expect(spec.tt_seatbelt.timeoutMs).toBe(1000);
  });
});
