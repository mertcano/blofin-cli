import { describe, it, expect } from "vitest";
import { COMMAND_GROUPS, resolveCommand, groupNames } from "../commands.js";

// ---------------------------------------------------------------------------
// Group structure
// ---------------------------------------------------------------------------

describe("COMMAND_GROUPS", () => {
  it("has all four groups", () => {
    expect(groupNames()).toEqual(
      expect.arrayContaining(["market", "account", "trade", "asset"]),
    );
    expect(groupNames()).toHaveLength(4);
  });

  it("market group has expected subcommands", () => {
    const market = COMMAND_GROUPS.get("market")!;
    expect(market.commands.has("tickers")).toBe(true);
    expect(market.commands.has("instruments")).toBe(true);
    expect(market.commands.has("orderbook")).toBe(true);
    expect(market.commands.has("candles")).toBe(true);
  });

  it("trade group has expected subcommands", () => {
    const trade = COMMAND_GROUPS.get("trade")!;
    expect(trade.commands.has("place")).toBe(true);
    expect(trade.commands.has("cancel")).toBe(true);
    expect(trade.commands.has("orders")).toBe(true);
    expect(trade.commands.has("fills")).toBe(true);
  });

  it("every command has a toolName, description, and riskLevel", () => {
    for (const [, group] of COMMAND_GROUPS) {
      for (const [, cmd] of group.commands) {
        expect(cmd.toolName).toBeTruthy();
        expect(cmd.description).toBeTruthy();
        expect(["read", "write", "dangerous"]).toContain(cmd.riskLevel);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// resolveCommand
// ---------------------------------------------------------------------------

describe("resolveCommand", () => {
  it("resolves known group + subcommand", () => {
    const cmd = resolveCommand("market", "tickers");
    expect(cmd).toBeDefined();
    expect(cmd!.toolName).toBe("get_tickers");
  });

  it("returns undefined for unknown group", () => {
    expect(resolveCommand("unknown", "tickers")).toBeUndefined();
  });

  it("returns undefined for unknown subcommand", () => {
    expect(resolveCommand("market", "unknown")).toBeUndefined();
  });
});
