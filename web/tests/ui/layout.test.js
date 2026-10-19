// F-01: the cluster window, its layout and the theme file.
describe("Cluster window", () => {
  let rig;
  afterEach(() => rig && rig.destroy());

  it("TC-01-01 support: mounting draws an SVG inside #cluster", () => {
    rig = createRig();
    expect(rig.root.querySelector("svg")).toBeTruthy();
  });

  it("TC-01-03 layout: telltales on top, speed dial in the middle, rpm lower left, fuel and temperature lower right", () => {
    rig = createRig();
    const box = (role) => rig.el(role).getBoundingClientRect();
    const root = rig.root.getBoundingClientRect();
    const mid = (r) => ({ x: (r.left + r.right) / 2 - root.left, y: (r.top + r.bottom) / 2 - root.top });
    const tt = box("telltales"), speed = box("speed-dial"), gear = box("gear"),
      rpm = box("rpm-dial"), fuel = box("fuel"), temp = box("temperature");

    expect(tt.bottom).toBeLessThanOrEqual(speed.top + 10);
    expect(mid(gear).x).toBeGreaterThan(speed.left - root.left);
    expect(mid(gear).x).toBeLessThan(speed.right - root.left);
    expect(gear.top).toBeGreaterThan((speed.top + speed.bottom) / 2);
    expect(gear.bottom).toBeLessThanOrEqual(speed.bottom + 40);   // in the open bottom of the dial
    expect(mid(rpm).x).toBeLessThan(264);
    expect(mid(rpm).y).toBeGreaterThan(mid(speed).y);
    expect(mid(fuel).x).toBeGreaterThan(264);
    expect(mid(temp).x).toBeGreaterThan(264);
    expect(mid(fuel).y).toBeGreaterThan(mid(speed).y);
    expect(temp.top).toBeGreaterThan(fuel.top);
  });

  it("TC-01-05 a colour changed in the theme file changes both dials", () => {
    const config = need("config");
    const original = config.colors.track;
    try {
      config.colors.track = "#123456";
      rig = createRig();
      expect(lower(rig.el("speed-track").getAttribute("stroke"))).toBe("#123456");
      expect(lower(rig.el("rpm-track").getAttribute("stroke"))).toBe("#123456");
    } finally {
      config.colors.track = original;
    }
  });

  it("TC-01-07 every layout group stays inside the middle 348 px", () => {
    rig = createRig();
    const root = rig.root.getBoundingClientRect();
    const outside = [];
    for (const role of ["telltales", "speed-dial", "gear", "rpm-dial", "fuel", "temperature"]) {
      const b = rig.el(role).getBoundingClientRect();
      if (b.left - root.left < 90 || b.right - root.left > 438) outside.push(`${role}: ${Math.round(b.left - root.left)}..${Math.round(b.right - root.left)}`);
    }
    expect(outside).toEqual([]);
  });

  it("TC-01-03 support: the window is 528 × 692 design px", () => {
    rig = createRig();
    const svg = rig.root.querySelector("svg");
    expect(svg.getAttribute("viewBox")).toBe("0 0 528 692");
  });
});
