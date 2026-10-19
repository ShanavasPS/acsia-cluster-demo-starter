// A small test runner: describe, it, beforeEach, afterEach and expect. No packages.
// Tests may be async (return a promise). Results go to <pre id="results"> as they come in, and to
// window.testResults; the last line is "RESULT: <passed> passed, <failed> failed", which
// tools/run-tests.sh reads. A test file that fails to load counts as a failure.
(function () {
  "use strict";
  const tests = [];
  const stack = [];        // enclosing describe blocks: { name, before: [], after: [] }
  const loadErrors = [];   // uncaught errors while the scripts load, and scripts that fail to load
  // Capture phase: a script that fails to load fires a plain Event on its <script>, which does not bubble.
  window.addEventListener("error", (e) => {
    if (document.readyState === "complete") return;
    if (e instanceof ErrorEvent) {
      loadErrors.push(`${e.message} (${(e.filename || "").split("/").pop()}:${e.lineno})`);
    } else if (e.target && (e.target.src || e.target.href)) {
      const url = e.target.src || e.target.href;
      if (!/\/app\//.test(url)) loadErrors.push("failed to load " + url.split("/").slice(-2).join("/"));   // app files: TC-01-01
    }
  }, true);

  window.describe = function (name, body) {
    stack.push({ name, before: [], after: [] });
    try { body(); } finally { stack.pop(); }
  };
  const block = (what) => {
    if (!stack.length) throw new Error(`${what} must be inside describe()`);
    return stack[stack.length - 1];
  };
  window.beforeEach = (fn) => block("beforeEach").before.push(fn);
  window.afterEach = (fn) => block("afterEach").after.push(fn);
  window.it = function (name, fn) {
    // Hooks are resolved when the test runs, so a hook registered after it() still applies.
    tests.push({ name: stack.map((d) => d.name).concat(name).join(" › "), fn, blocks: stack.slice() });
  };

  const show = (v) => {
    if (Object.is(v, -0)) return "-0";
    if (typeof v === "number" || v === undefined || typeof v === "symbol") return String(v);
    if (typeof v === "function") return "[function " + (v.name || "anonymous") + "]";
    if (v instanceof Date) return "Date(" + v.toISOString() + ")";
    if (v instanceof Map || v instanceof Set) return v.constructor.name + "(" + JSON.stringify(Array.from(v)) + ")";
    try { return JSON.stringify(v); } catch (e) { return String(v); }
  };

  // Structural equality: same keys in any order, arrays by index, Object.is for the rest.
  function deepEqual(a, b) {
    if (Object.is(a, b)) return true;
    if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
    if (a.constructor !== b.constructor) return false;
    if (a instanceof Date) return a.getTime() === b.getTime();
    if (a instanceof RegExp) return String(a) === String(b);
    if (a instanceof Map || a instanceof Set) return deepEqual(Array.from(a), Array.from(b));
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]));
  }
  // Every key of expected is in actual with an equal value; actual may have more.
  function matchesObject(actual, expected) {
    if (typeof actual !== "object" || actual === null) return false;
    return Object.keys(expected).every((k) => deepEqual(actual[k], expected[k]));
  }

  function matchers(actual, negate) {
    const check = (ok, message) => {
      if (ok === negate) throw new Error((negate ? "Expected not: " : "") + message);
    };
    return {
      toBe: (x) => check(Object.is(actual, x), `expected ${show(actual)} to be ${show(x)}`),
      toEqual: (x) => check(deepEqual(actual, x), `expected ${show(actual)} to equal ${show(x)}`),
      toMatchObject: (x) => check(matchesObject(actual, x), `expected ${show(actual)} to match ${show(x)}`),
      toBeCloseTo: (x, eps = 1e-6) => check(typeof actual === "number" && Math.abs(actual - x) <= eps,
        `expected ${show(actual)} to be within ${eps} of ${x}`),
      toBeTruthy: () => check(!!actual, `expected ${show(actual)} to be truthy`),
      toBeFalsy: () => check(!actual, `expected ${show(actual)} to be falsy`),
      toBeNull: () => check(actual === null, `expected ${show(actual)} to be null`),
      toBeGreaterThan: (x) => check(actual > x, `expected ${show(actual)} > ${x}`),
      toBeGreaterThanOrEqual: (x) => check(actual >= x, `expected ${show(actual)} >= ${x}`),
      toBeLessThan: (x) => check(actual < x, `expected ${show(actual)} < ${x}`),
      toBeLessThanOrEqual: (x) => check(actual <= x, `expected ${show(actual)} <= ${x}`),
      toContain: (x) => check((typeof actual === "string" || Array.isArray(actual)) && actual.indexOf(x) !== -1,
        `expected ${show(actual)} to contain ${show(x)}`),
      toHaveLength: (n) => check(actual != null && actual.length === n,
        `expected length ${n}, got ${actual == null ? actual : actual.length}`),
      toThrow: () => {
        let threw = false, error;
        try { actual(); } catch (e) { threw = true; error = e; }
        check(threw, threw ? "the function threw: " + describeError(error) : "expected the function to throw");
      },
    };
  }
  window.expect = function (actual) {
    const m = matchers(actual, false);
    m.not = matchers(actual, true);
    return m;
  };

  function describeError(e) {
    if (e instanceof Error) return e.message || e.name;
    return show(e);
  }

  const TEST_TIMEOUT_MS = 5000;
  function withTimeout(fn, what) {
    let timer;
    const guard = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${what} timed out after ${TEST_TIMEOUT_MS} ms`)), TEST_TIMEOUT_MS);
    });
    return Promise.race([Promise.resolve().then(fn), guard]).finally(() => clearTimeout(timer));
  }
  async function run() {
    const out = document.getElementById("results");
    const lines = [];
    let passed = 0, failed = 0;
    const failures = [];
    const fail = (name, message) => {
      failed++;
      failures.push({ name, message });
      lines.push("FAIL " + name + "\n     " + message.replace(/\n/g, "\n     "));
    };
    const draw = (tail) => { out.textContent = lines.concat(tail ? [tail] : []).join("\n"); };

    for (const message of loadErrors) fail("load", message);
    for (const t of tests) {
      draw("Running… " + t.name);
      const before = t.blocks.flatMap((d) => d.before);
      const after = t.blocks.flatMap((d) => d.after).reverse();
      try {
        for (const fn of before) await withTimeout(fn, "beforeEach");
        await withTimeout(t.fn, "test");
        passed++;
        lines.push("PASS " + t.name);
      } catch (e) {
        fail(t.name, describeError(e));
      } finally {
        for (const fn of after) {
          try { await withTimeout(fn, "afterEach"); } catch (e) { fail(t.name + " (afterEach)", describeError(e)); }
        }
      }
    }
    if (!tests.length) fail("suite", "no tests were registered");
    lines.push(`RESULT: ${passed} passed, ${failed} failed`);
    window.testResults = { passed, failed, failures };
    draw();
    document.title = `${failed ? "FAIL" : "PASS"} ${passed}/${passed + failed}`;
  }
  window.addEventListener("load", () => setTimeout(run, 0));
})();
