// ---------------------------------------------------------------------------
// CLI integration tests — real HTTP calls against mock server
// ---------------------------------------------------------------------------

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "vitest";
import type { CliResult } from "../index.js";
import { createMockServer, type MockServer } from "../test-utils/index.js";

// ---------------------------------------------------------------------------
// Mock server lifecycle
// ---------------------------------------------------------------------------

let server: MockServer;
let savedEnv: Record<string, string | undefined>;

beforeAll(async () => {
  server = await createMockServer();
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  server.resetState();
  // Save env vars we'll override
  savedEnv = {
    BLOFIN_BASE_URL: process.env.BLOFIN_BASE_URL,
    BLOFIN_API_KEY: process.env.BLOFIN_API_KEY,
    BLOFIN_API_SECRET: process.env.BLOFIN_API_SECRET,
    BLOFIN_PASSPHRASE: process.env.BLOFIN_PASSPHRASE,
    BLOFIN_BROKER_ID: process.env.BLOFIN_BROKER_ID,
  };
  // Point at mock server; mock server ignores auth headers
  process.env.BLOFIN_BASE_URL = server.url;
  process.env.BLOFIN_API_KEY = "test-key";
  process.env.BLOFIN_API_SECRET = "test-secret";
  process.env.BLOFIN_PASSPHRASE = "test-pass";
  process.env.BLOFIN_BROKER_ID = "none";
});

afterEach(() => {
  // Restore original env
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

// ---------------------------------------------------------------------------
// Dynamic import — loadConfig reads env vars at call time inside runCli,
// so each test gets fresh config without needing to bust the module cache.
// ---------------------------------------------------------------------------

async function runCli(args: string[]): Promise<CliResult> {
  const { runCli: fn } = await import("../index.js");
  return fn(args);
}

// ---------------------------------------------------------------------------
// Public tools (grouped syntax)
// ---------------------------------------------------------------------------

describe("CLI integration: public tools", () => {
  it("market tickers returns data in json mode", async () => {
    const { output, ok } = await runCli(["market", "tickers", "--output=json"]);
    expect(ok).toBe(true);
    const parsed = JSON.parse(output);
    expect(parsed.ok).toBe(true);
    expect(parsed.tool).toBe("get_tickers");
    expect(parsed.data).toBeDefined();
  });

  it("market tickers with instId filter works", async () => {
    const { output, ok } = await runCli([
      "market",
      "tickers",
      "--instId=BTC-USDT",
      "--output=json",
    ]);
    expect(ok).toBe(true);
    const parsed = JSON.parse(output);
    expect(parsed.ok).toBe(true);
    const innerData = parsed.data.data;
    expect(innerData).toBeInstanceOf(Array);
    expect(innerData.length).toBe(1);
    expect(innerData[0].instId).toBe("BTC-USDT");
  });

  it("market instruments returns instruments list", async () => {
    const { output, ok } = await runCli(["market", "instruments", "--output=json"]);
    expect(ok).toBe(true);
    const parsed = JSON.parse(output);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.data).toBeInstanceOf(Array);
    expect(parsed.data.data.length).toBeGreaterThan(0);
  });

  it("table output is default format", async () => {
    const { output, ok } = await runCli(["market", "tickers"]);
    expect(ok).toBe(true);
    // Default should be table — not valid JSON
    expect(output).toContain("instId");
    expect(() => JSON.parse(output)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Authenticated tools
// ---------------------------------------------------------------------------

describe("CLI integration: authenticated tools", () => {
  it("account balance returns balance data", async () => {
    const { output, ok } = await runCli(["account", "balance", "--output=json"]);
    expect(ok).toBe(true);
    const parsed = JSON.parse(output);
    expect(parsed.ok).toBe(true);
    expect(parsed.tool).toBe("get_balance");
  });

  it("account positions returns positions", async () => {
    const { output, ok } = await runCli(["account", "positions", "--output=json"]);
    expect(ok).toBe(true);
    const parsed = JSON.parse(output);
    expect(parsed.ok).toBe(true);
    expect(parsed.tool).toBe("get_positions");
  });
});

// ---------------------------------------------------------------------------
// Dangerous tools + --confirm gate
// ---------------------------------------------------------------------------

describe("CLI integration: dangerous tools", () => {
  it("trade place without --confirm is blocked", async () => {
    const { output, ok } = await runCli([
      "trade",
      "place",
      "--instId=BTC-USDT",
      "--side=buy",
      "--orderType=limit",
      "--price=50000",
      "--size=1",
      "--marginMode=cross",
      "--positionSide=net",
    ]);
    expect(ok).toBe(false);
    expect(output.toLowerCase()).toContain("--confirm");
  });

  it("trade place with --confirm executes against mock server", async () => {
    const { output, ok } = await runCli([
      "trade",
      "place",
      "--confirm",
      "--instId=BTC-USDT",
      "--side=buy",
      "--orderType=limit",
      "--price=50000",
      "--size=1",
      "--marginMode=cross",
      "--positionSide=net",
      "--output=json",
    ]);
    expect(ok).toBe(true);
    const parsed = JSON.parse(output);
    expect(parsed.ok).toBe(true);
    expect(parsed.tool).toBe("place_order");
    const innerData = parsed.data.data;
    expect(innerData).toBeInstanceOf(Array);
    expect(innerData[0].orderId).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Module filtering
// ---------------------------------------------------------------------------

describe("CLI integration: module filtering", () => {
  it("--modules=public hides trading tools", async () => {
    const { ok } = await runCli([
      "trade",
      "place",
      "--confirm",
      "--instId=BTC-USDT",
      "--modules=public",
    ]);
    expect(ok).toBe(false);
  });

  it("--modules=invalid returns validation error", async () => {
    const { ok } = await runCli([
      "market",
      "tickers",
      "--modules=invalid",
    ]);
    expect(ok).toBe(false);
  });
});
