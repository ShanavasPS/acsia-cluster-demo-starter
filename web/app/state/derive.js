// Display values from signal values. null in means the signal has timed out.
"use strict";
window.Cluster = window.Cluster || {};
(function () {
  const cfg = () => Cluster.config;
  const clamp01 = (x) => Math.min(1, Math.max(0, x));
  const fixed = (x, digits) => {                 // toFixed without "-0.0"
    const r = Number(x.toFixed(digits));
    return (r === 0 ? 0 : r).toFixed(digits);
  };

  Cluster.derive = {
    kmhToMph: (kmh) => kmh / cfg().kmhPerMph,
    speedText(kmh) { return kmh == null ? "--" : String(Math.round(Cluster.derive.kmhToMph(kmh)) || 0); },
    speedFraction(kmh) { return kmh == null ? 0 : clamp01(Cluster.derive.kmhToMph(kmh) / cfg().speed.max); },

    rpmText: (rpm) => (rpm == null ? "--" : fixed(rpm / cfg().rpm.digitsPer, 1)),
    rpmFraction: (rpm) => (rpm == null ? 0 : clamp01(rpm / cfg().rpm.max)),
    isRedZone: (rpm) => rpm != null && rpm > cfg().rpm.redFrom,

    gear(g) {
      if (g == null) return "--";
      return cfg().gear.letters.includes(g) ? g : "–";
    },

    fuelText: (pct) => (pct == null ? "--" : (Math.round(pct) || 0) + " %"),
    fuelFraction: (pct) => (pct == null ? 0 : clamp01(pct / cfg().fuel.max)),
    // Hysteresis: on at or below lowOn, off above lowOff, unchanged between (and while timed out).
    lowFuel(wasOn, pct) {
      if (pct == null) return wasOn;
      if (pct <= cfg().fuel.lowOn) return true;
      if (pct > cfg().fuel.lowOff) return false;
      return wasOn;
    },

    tempText: (c) => (c == null ? "--" : fixed(c, 1) + " °C"),

    // The state of every telltale ("off" | "amber" | "red") from a snapshot: each follows its
    // boolean signal from config.telltales.signal; low fuel follows the derived warning.
    telltales(snapshot, lowFuelOn) {
      const t = cfg().telltales, out = {};
      for (const name of t.order) {
        const signal = t.signal[name];
        const on = signal ? snapshot[signal] === true : lowFuelOn;
        out[name] = on ? t.kind[name] : "off";
      }
      return out;
    },
  };
})();
