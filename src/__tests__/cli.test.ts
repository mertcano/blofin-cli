import { describe, it, expect, vi, beforeEach } from "vitest";
import { runCli } from "../index.js";

// ---------------------------------------------------------------------------
// Mock BlofinClient so runCli never hits the network
// ---------------------------------------------------------------------------

const mockPublicGet = vi.fn();
const mockPrivateGet = vi.fn();
const mockPrivatePost = vi.fn();

vi.mock("blofin-core", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;

  class MockBlofinClient {
    publicGet = mockPublicGet;
    privateGet = mockPrivateGet;
    privatePost = mockPrivatePost;
    brokerId = undefined;
  }

  return {
    ...actual,
    BlofinClient: MockBlofinClient,
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  mockPublicGet.mockResolvedValue({ code: "0", data: [] });
  mockPrivateGet.mockResolvedValue({ code: "0", data: [] });
  mockPrivatePost.mockResolvedValue({ code: "0", data: {} });
});

// ---------------------------------------------------------------------------
// Help & filtering
// ---------------------------------------------------------------------------

describe("CLI help and filtering", () => {
  it("--help lists groups", async () => {
    const { output, ok } = await runCli(["--help"]);
    expect(ok).toBe(true);
    expect(output).toContain("Groups:");
    expect(output).toContain("market");
    expect(output).toContain("account");
    expect(output).toContain("trade");
    expect(output).toContain("asset");
  });

  it("no args shows global help", async () => {
    const { output, ok } = await runCli([]);
    expect(ok).toBe(true);
    expect(output).toContain("Groups:");
  });

  it("group --help lists subcommands", async () => {
    const { output, ok } = await runCli(["market", "--help"]);
    expect(ok).toBe(true);
    expect(output).toContain("tickers");
    expect(output).toContain("instruments");
    expect(output).toContain("orderbook");
  });

  it("group with no subcommand shows group help", async () => {
    const { output, ok } = await runCli(["market"]);
    expect(ok).toBe(true);
    expect(output).toContain("tickers");
  });

  it("--read-only excludes dangerous tools", async () => {
    const { output, ok } = await runCli([
      "trade",
      "place",
      "--confirm",
      "--read-only",
      "--instId=BTC-USDT",
      "--side=buy",
      "--orderType=market",
      "--size=1",
      "--marginMode=cross",
      "--positionSide=net",
    ]);
    expect(ok).toBe(false);
    const outLower = output.toLowerCase();
    expect(outLower).toContain("not available");
  });
});

// ---------------------------------------------------------------------------
// --version
// ---------------------------------------------------------------------------

describe("--version", () => {
  it("returns version string", async () => {
    const { output, ok } = await runCli(["--version"]);
    expect(ok).toBe(true);
    expect(output).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("--version takes priority over group/subcommand", async () => {
    const { output, ok } = await runCli(["--version", "market", "tickers"]);
    expect(ok).toBe(true);
    expect(output).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

// ---------------------------------------------------------------------------
// --modules validation
// ---------------------------------------------------------------------------

describe("--modules validation", () => {
  it("invalid module returns error with ok=false", async () => {
    const { ok } = await runCli(["market", "tickers", "--modules=invalid"]);
    expect(ok).toBe(false);
  });

  it("partially invalid modules returns error", async () => {
    const { ok } = await runCli(["market", "tickers", "--modules=public,bad"]);
    expect(ok).toBe(false);
  });

  it("valid modules work correctly", async () => {
    const { output, ok } = await runCli(["market", "--help", "--modules=public,trading"]);
    expect(ok).toBe(true);
    expect(output).toContain("tickers");
  });
});

// ---------------------------------------------------------------------------
// Unknown group/subcommand
// ---------------------------------------------------------------------------

describe("unknown command handling", () => {
  it("returns error for unknown group", async () => {
    const { ok } = await runCli(["nonexistent"]);
    expect(ok).toBe(false);
  });

  it("returns error for unknown subcommand", async () => {
    const { ok } = await runCli(["market", "nonexistent"]);
    expect(ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// --confirm gate
// ---------------------------------------------------------------------------

describe("--confirm gate", () => {
  it("dangerous command without --confirm returns error", async () => {
    const { output, ok } = await runCli(["trade", "place", "--instId=BTC-USDT"]);
    expect(ok).toBe(false);
    expect(output.toLowerCase()).toContain("--confirm");
  });

  it("dangerous command with --confirm executes handler", async () => {
    mockPrivatePost.mockResolvedValue({
      code: "0",
      data: [{ orderId: "123" }],
    });

    const { ok } = await runCli([
      "trade",
      "place",
      "--confirm",
      "--instId=BTC-USDT",
      "--side=buy",
      "--orderType=market",
      "--size=1",
      "--marginMode=cross",
      "--positionSide=net",
    ]);
    expect(ok).toBe(true);
  });

  it("read command does not require --confirm", async () => {
    const { ok } = await runCli(["market", "tickers", "--instId=BTC-USDT"]);
    expect(ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Param parsing
// ---------------------------------------------------------------------------

describe("param parsing", () => {
  it("passes --key=value params to handler", async () => {
    await runCli(["market", "tickers", "--instId=BTC-USDT"]);
    expect(mockPublicGet).toHaveBeenCalledWith(
      "/api/v1/market/tickers",
      expect.objectContaining({ instId: "BTC-USDT" }),
    );
  });

  it("strips CLI-only flags from tool params", async () => {
    await runCli(["market", "tickers", "--instId=BTC-USDT"]);
    const callArgs = mockPublicGet.mock.calls[0][1] as Record<string, unknown>;
    expect(callArgs).not.toHaveProperty("help");
    expect(callArgs).not.toHaveProperty("confirm");
    expect(callArgs).not.toHaveProperty("read-only");
    expect(callArgs).not.toHaveProperty("modules");
    expect(callArgs).not.toHaveProperty("version");
    expect(callArgs).not.toHaveProperty("output");
    expect(callArgs).not.toHaveProperty("demo");
  });
});

// ---------------------------------------------------------------------------
// Output format
// ---------------------------------------------------------------------------

describe("output format", () => {
  it("json output has correct envelope shape", async () => {
    mockPublicGet.mockResolvedValue({
      code: "0",
      data: [{ instId: "BTC-USDT", last: "50000" }],
    });

    const { output, ok } = await runCli([
      "market",
      "tickers",
      "--instId=BTC-USDT",
      "--output=json",
    ]);
    expect(ok).toBe(true);
    const parsed = JSON.parse(output);
    expect(parsed.tool).toBe("get_tickers");
    expect(parsed.ok).toBe(true);
    expect(parsed.data).toBeDefined();
    expect(parsed.timestamp).toBeTypeOf("number");
  });

  it("table output renders table by default", async () => {
    mockPublicGet.mockResolvedValue({
      code: "0",
      data: [{ instId: "BTC-USDT", last: "50000" }],
    });

    const { output, ok } = await runCli(["market", "tickers", "--instId=BTC-USDT"]);
    expect(ok).toBe(true);
    expect(output).toContain("BTC-USDT");
    // Table output should NOT be valid JSON
    expect(() => JSON.parse(output)).toThrow();
  });

  it("-o json shorthand works", async () => {
    mockPublicGet.mockResolvedValue({ code: "0", data: [] });
    const { output, ok } = await runCli([
      "market",
      "tickers",
      "-o",
      "json",
    ]);
    expect(ok).toBe(true);
    const parsed = JSON.parse(output);
    expect(parsed.ok).toBe(true);
  });

  it("API error returns structured error in json mode", async () => {
    const { BlofinApiError } = await import("blofin-core");
    mockPublicGet.mockRejectedValue(
      new BlofinApiError("Invalid instrument", "51001", "Invalid instrument"),
    );

    const { output, ok } = await runCli([
      "market",
      "tickers",
      "--instId=INVALID",
      "--output=json",
    ]);
    expect(ok).toBe(false);
    const parsed = JSON.parse(output);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.type).toBe("BlofinApiError");
  });
});
