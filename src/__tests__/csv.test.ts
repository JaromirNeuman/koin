import { describe, it, expect } from "vitest";
import { toCSV, parseCSV } from "@/lib/csv";

describe("toCSV", () => {
  it("returns empty string for empty rows and no headers", () => {
    expect(toCSV([])).toBe("");
  });

  it("returns header row when rows are empty and headers provided", () => {
    expect(toCSV([], ["Datum", "Popis", "Částka"])).toBe("Datum,Popis,Částka");
  });

  it("serialises a simple row", () => {
    const rows = [{ name: "Nákup", amount: 150 }];
    expect(toCSV(rows)).toBe("name,amount\nNákup,150");
  });

  it("respects explicit column order", () => {
    const rows = [{ amount: 99, name: "Test" }];
    expect(toCSV(rows, ["name", "amount"])).toBe("name,amount\nTest,99");
  });

  it("quotes cells that contain a comma", () => {
    const rows = [{ name: "Jídlo, pití", amount: 200 }];
    const csv = toCSV(rows);
    expect(csv).toContain('"Jídlo, pití"');
  });

  it("quotes cells that contain a double-quote, escaping it", () => {
    const rows = [{ name: 'Say "hello"', amount: 0 }];
    const csv = toCSV(rows);
    expect(csv).toContain('"Say ""hello"""');
  });

  it("prefixes formula-injection cells with apostrophe", () => {
    const rows = [
      { formula: "=SUM(A1)" },
      { formula: "+1+1" },
      { formula: "-1" },
      { formula: "@user" },
    ];
    for (const row of rows) {
      expect(toCSV([row])).toContain("'");
    }
  });

  it("does not prefix normal cells", () => {
    const rows = [{ value: "Supermarket" }];
    expect(toCSV(rows)).toBe("value\nSupermarket");
  });

  it("handles numeric zeros", () => {
    const rows = [{ amount: 0 }];
    expect(toCSV(rows)).toBe("amount\n0");
  });

  it("handles multiple rows", () => {
    const rows = [
      { a: "x", b: 1 },
      { a: "y", b: 2 },
    ];
    expect(toCSV(rows)).toBe("a,b\nx,1\ny,2");
  });
});

describe("parseCSV", () => {
  it("returns empty for empty string", () => {
    const { headers, rows } = parseCSV("");
    expect(headers).toEqual([]);
    expect(rows).toEqual([]);
  });

  it("parses comma-delimited CSV", () => {
    const text = "Datum,Popis,Částka\n2024-01-01,Plat,50000";
    const { headers, rows } = parseCSV(text);
    expect(headers).toEqual(["Datum", "Popis", "Částka"]);
    expect(rows).toEqual([["2024-01-01", "Plat", "50000"]]);
  });

  it("parses semicolon-delimited CSV (Czech bank export)", () => {
    const text = "Datum;Popis;Částka\n01.03.2024;Nájemné;-15000";
    const { headers, rows } = parseCSV(text);
    expect(headers).toEqual(["Datum", "Popis", "Částka"]);
    expect(rows[0]).toEqual(["01.03.2024", "Nájemné", "-15000"]);
  });

  it("handles quoted cells with embedded delimiter", () => {
    const text = `name,value\n"A, B",42`;
    const { rows } = parseCSV(text);
    expect(rows[0][0]).toBe("A, B");
  });

  it("handles escaped double-quotes inside quoted cells", () => {
    const text = `name,value\n"Say ""hi""",1`;
    const { rows } = parseCSV(text);
    expect(rows[0][0]).toBe('Say "hi"');
  });

  it("handles Windows CRLF line endings", () => {
    const text = "a,b\r\n1,2\r\n3,4";
    const { rows } = parseCSV(text);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual(["3", "4"]);
  });

  it("ignores blank lines", () => {
    const text = "a,b\n\n1,2\n\n";
    const { rows } = parseCSV(text);
    expect(rows).toHaveLength(1);
  });

  it("trims whitespace from cell values", () => {
    const text = "a , b \n x , y ";
    const { rows } = parseCSV(text);
    expect(rows[0]).toEqual(["x", "y"]);
  });
});
