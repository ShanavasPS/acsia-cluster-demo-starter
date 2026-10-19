// F-11: the startup sequence on its own: bulb check, needle sweep, then live.
// Timing (config.startup, see tests/README.md): telltales on 0-1.5 s; the needle sweeps up over
// 0-0.7 s, holds full scale until 0.9 s, is back at 0 by 1.6 s; live at 1.7 s.
// state() returns { live, telltalesOn, needle }: needle is 0..1 during startup, null once live.
describe("Startup sequence", () => {
  function startup() {
    const clock = new FakeClock();
    const Startup = need("Startup");
    return { clock, s: new Startup({ clock }) };
  }

  it("TC-11-01 all telltales on for 1.5 s", () => {
    const { clock, s } = startup();
    expect(s.state().telltalesOn).toBe(true);
    clock.advance(1400);
    expect(s.state().telltalesOn).toBe(true);
    clock.advance(200);   // 1600 ms
    expect(s.state().telltalesOn).toBe(false);
  });

  it("TC-11-02 the needle sweeps to full scale, holds, and is back at 0 before live", () => {
    const { clock, s } = startup();
    let max = 0;
    for (let t = 0; t < 1700; t += 16) {
      max = Math.max(max, s.state().needle);
      clock.advance(16);
    }
    expect(max).toBeGreaterThanOrEqual(0.99);
    const { clock: c2, s: s2 } = startup();
    c2.advance(800);                                  // inside the hold
    expect(s2.state().needle).toBeCloseTo(1, 0.001);
    c2.advance(800);                                  // 1600 ms: back at 0, not yet live
    expect(s2.state().live).toBe(false);
    expect(s2.state().needle).toBeLessThanOrEqual(0.01);
  });

  it("TC-11-04 then goes live", () => {
    const { clock, s } = startup();
    expect(s.state().live).toBe(false);
    clock.advance(2000);
    expect(s.state().live).toBe(true);
    expect(s.state().needle).toBeNull();
    expect(s.state().telltalesOn).toBe(false);
  });

  it("TC-13-03 support: live at 1.7 s", () => {
    const { clock, s } = startup();
    clock.advance(1690);
    expect(s.state().live).toBe(false);
    clock.advance(10);
    expect(s.state().live).toBe(true);
  });
});
