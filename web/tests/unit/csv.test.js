// CSV parsing, which the signal spec (F-03) and the replay (F-02) are built on.
describe("CSV parser", () => {
  it("TC-03-01 support: reads a header and rows as objects", () => {
    const parseCsv = need("parseCsv");
    const rows = parseCsv("a,b\n1,x\n2,y\n");
    expect(rows).toEqual([{ a: "1", b: "x" }, { a: "2", b: "y" }]);
  });

  it("TC-03-01 support: keeps commas inside quoted fields", () => {
    const parseCsv = need("parseCsv");
    const rows = parseCsv('name,description\ngear,"P, R, N or D"\n');
    expect(rows[0].description).toBe("P, R, N or D");
  });

  it("TC-03-01 support: keeps empty fields and ignores a trailing newline", () => {
    const parseCsv = need("parseCsv");
    const rows = parseCsv("a,b,c\n1,,3\n");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ a: "1", b: "", c: "3" });
  });
});
