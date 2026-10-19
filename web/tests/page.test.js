// F-01 checks on the real page and the app's files. Reading files from disk needs Chrome
// started with --allow-file-access-from-files, which tools/run-tests.sh does.
describe("Page and files", () => {
  function readFile(path) {
    const r = new XMLHttpRequest();
    try {
      r.open("GET", "../" + path, false);
      r.send();
    } catch (e) {
      throw new Error(`Cannot read ${path}: missing, or file access is off (run tools/run-tests.sh)`);
    }
    if (!r.responseText) throw new Error(`Cannot read ${path}: missing or empty`);
    return r.responseText;
  }
  // JavaScript with its comments and string literals blanked out, so words in them do not count.
  // One pass, so whichever starts first wins, as a tokenizer would (a // inside a string is text).
  const codeOnly = (js) => js.replace(
    /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g,
    (m) => (m[0] === "/" ? " " : '""'));

  it("TC-01-01 every app file loads", () => {
    expect(window.MISSING_APP_FILES).toEqual([]);
  });

  it("TC-01-01 index.html loads the same app files as the tests, in the same order", () => {
    const html = readFile("index.html").replace(/<!--[\s\S]*?-->/g, "");
    const scripts = Array.from(html.matchAll(/<script\s[^>]*src=["'](?:\.\/)?(app\/[^"']+)["']/g), (m) => m[1]);
    const styles = Array.from(html.matchAll(/<link\s[^>]*href=["'](?:\.\/)?(app\/[^"']+\.css)["']/g), (m) => m[1]);
    expect(scripts).toEqual(window.APP_FILES);
    expect(styles).toEqual(window.APP_STYLES);
  });

  it("TC-01-01 the real page opens from disk and shows the cluster", async () => {
    const frame = document.createElement("iframe");
    frame.style.cssText = "position:absolute;left:-10000px;width:800px;height:900px";
    document.body.appendChild(frame);
    try {
      await new Promise((resolve) => { frame.onload = resolve; frame.src = "../index.html?car=parked"; });
      await new Promise((resolve) => setTimeout(resolve, 2500));
      let doc;
      try { doc = frame.contentDocument; } catch (e) { doc = null; }
      if (!doc) throw new Error("Cannot look into the page: file access is off (run tools/run-tests.sh)");
      expect(doc.querySelector("#cluster svg")).toBeTruthy();
      expect(doc.querySelector('#cluster [data-role="speed-text"]')).toBeTruthy();
      expect(typeof frame.contentWindow.clusterDebug).toBe("object");
    } finally {
      frame.remove();
    }
  });

  it("TC-01-02 no app file uses import, fetch or workers", () => {
    const offenders = [];
    for (const path of window.APP_FILES) {
      const code = codeOnly(readFile(path));
      const usesImport = /(^|[;{}\s])import\s*[({*"']/m.test(code) || /(^|[;{}\s])import\s+[\w$]+\s+from\b/m.test(code);
      if (usesImport || /\bfetch\s*\(/.test(code) || /\bnew\s+(Shared)?Worker\b/.test(code)) offenders.push(path);
    }
    expect(offenders).toEqual([]);
  });

  it("TC-01-06 every app style is scoped under #cluster", () => {
    const sheet = Array.from(document.styleSheets).find((s) => s.href && s.href.endsWith("/app/cluster.css"));
    if (!sheet) throw new Error("app/cluster.css is not loaded in the test page");
    const unscoped = [];
    const scoped = /^#cluster(\s|$|[.:#[>+~])/;
    // Split a selector list on the commas between selectors, not those inside :is(), :not() or [a="b,c"].
    const selectors = (list) => {
      const out = []; let depth = 0, cur = "";
      for (const ch of list) {
        if (ch === "(" || ch === "[") depth++;
        else if (ch === ")" || ch === "]") depth--;
        if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; } else cur += ch;
      }
      out.push(cur.trim());
      return out;
    };
    (function walk(rules) {
      for (const r of rules) {
        // Decide by rule kind: in current Chrome every style rule has a cssRules list (CSS nesting),
        // so its presence says nothing. Nested rules are scoped by their parent, so no need to descend.
        if (r instanceof CSSStyleRule) {
          for (const s of selectors(r.selectorText)) if (!scoped.test(s)) unscoped.push(s);
        } else if (r instanceof CSSImportRule) {
          unscoped.push("@import " + r.href);   // the app's CSS is one file
        } else if (r instanceof CSSKeyframesRule || r instanceof CSSFontFaceRule) {
          continue;
        } else if (r.cssRules) {
          walk(r.cssRules);   // @media, @supports, @layer, @container
        }
      }
    })(sheet.cssRules);
    expect(unscoped).toEqual([]);
  });
});
