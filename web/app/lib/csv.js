// A small CSV parser: header row, quoted fields (with commas and doubled quotes), CRLF or LF.
// Returns one object per row, keyed by the header, every value a string.
"use strict";
window.Cluster = window.Cluster || {};
Cluster.parseCsv = function (text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  const endField = () => { row.push(field); field = ""; };
  const endRow = () => { endField(); rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") endField();
    else if (ch === "\n") endRow();
    else if (ch !== "\r") field += ch;
  }
  if (field !== "" || row.length) endRow();   // a last line without a newline
  const header = rows.shift() || [];
  return rows.filter((r) => r.length > 1 || r[0] !== "").map((r) => {
    const o = {};
    header.forEach((name, i) => { o[name] = r[i] === undefined ? "" : r[i]; });
    return o;
  });
};
