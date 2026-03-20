import { describe, it, expect } from "vitest";
import { outputResult, outputError, outputTable } from "../output.js";
import { tsToStr, fmtNumber } from "../format.js";

// ---------------------------------------------------------------------------
// outputTable
// ---------------------------------------------------------------------------

describe("outputTable", () => {
  it("renders a table from row objects", () => {
    const rows = [
      { instId: "BTC-USDT", last: "50000" },
      { instId: "ETH-USDT", last: "3000" },
    ];
    const result = outputTable(rows);
    expect(result).toContain("BTC-USDT");
    expect(result).toContain("ETH-USDT");
    expect(result).toContain("instId");
    expect(result).toContain("last");
  });

  it("returns '(no data)' for empty array", () => {
    expect(outputTable([])).toBe("(no data)");
  });

  it("includes title when provided", () => {
    const result = outputTable(
      [{ a: "1" }],
      undefined,
      "My Title",
    );
    expect(result).toContain("My Title");
  });

  it("uses custom columns when specified", () => {
    const rows = [{ a: "1", b: "2", c: "3" }];
    const result = outputTable(rows, ["a", "c"]);
    expect(result).toContain("a");
    expect(result).toContain("c");
    expect(result).not.toContain("│ b");
  });
});

// ---------------------------------------------------------------------------
// outputResult
// ---------------------------------------------------------------------------

describe("outputResult", () => {
  it("json format returns JSON envelope", () => {
    const data = { code: "0", data: [{ instId: "BTC-USDT" }] };
    const result = outputResult("get_tickers", data, "json");
    const parsed = JSON.parse(result);
    expect(parsed.ok).toBe(true);
    expect(parsed.tool).toBe("get_tickers");
  });

  it("table format renders table from API response", () => {
    const data = { code: "0", data: [{ instId: "BTC-USDT", last: "50000" }] };
    const result = outputResult("get_tickers", data, "table");
    expect(result).toContain("BTC-USDT");
    expect(result).toContain("instId");
  });

  it("table format falls back to JSON for non-array data", () => {
    const data = { code: "0", msg: "something" };
    const result = outputResult("test", data, "table");
    // Should be JSON fallback since no rows extractable
    expect(result).toContain("something");
  });
});

// ---------------------------------------------------------------------------
// outputError
// ---------------------------------------------------------------------------

describe("outputError", () => {
  it("json format returns structured error JSON", () => {
    const result = outputError("test", new Error("fail"), "json");
    const parsed = JSON.parse(result);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.message).toContain("fail");
  });

  it("table format returns plain text error", () => {
    const result = outputError("test", new Error("fail"), "table");
    expect(result).toBe("Error: fail");
  });
});

// ---------------------------------------------------------------------------
// tsToStr
// ---------------------------------------------------------------------------

describe("tsToStr", () => {
  it("converts millisecond timestamp to UTC string", () => {
    // 2024-01-15 12:30:45 UTC = 1705321845000
    const result = tsToStr(1705321845000);
    expect(result).toBe("2024-01-15 12:30:45");
  });

  it("handles string timestamps", () => {
    const result = tsToStr("1705321845000");
    expect(result).toBe("2024-01-15 12:30:45");
  });

  it("returns raw value for non-finite input", () => {
    expect(tsToStr("not-a-number")).toBe("not-a-number");
  });
});

// ---------------------------------------------------------------------------
// fmtNumber
// ---------------------------------------------------------------------------

describe("fmtNumber", () => {
  it("adds thousands separators", () => {
    expect(fmtNumber("1234567")).toBe("1,234,567");
  });

  it("formats with fixed decimals", () => {
    expect(fmtNumber("1234.5", 2)).toBe("1,234.50");
  });

  it("returns raw value for non-finite input", () => {
    expect(fmtNumber("N/A")).toBe("N/A");
  });

  it("handles small numbers without separators", () => {
    expect(fmtNumber("42")).toBe("42");
  });
});
