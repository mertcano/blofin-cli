// ---------------------------------------------------------------------------
// Command group mapping — tool name → group/subcommand
// ---------------------------------------------------------------------------

import type { RiskLevel } from "blofin-core";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CommandDef {
  readonly toolName: string;
  readonly description: string;
  readonly riskLevel: RiskLevel;
}

export interface CommandGroup {
  readonly description: string;
  readonly commands: ReadonlyMap<string, CommandDef>;
}

// ---------------------------------------------------------------------------
// Group definitions
// ---------------------------------------------------------------------------

function group(
  description: string,
  commands: ReadonlyArray<readonly [string, string, string, RiskLevel]>,
): CommandGroup {
  const map = new Map<string, CommandDef>();
  for (const [sub, toolName, desc, risk] of commands) {
    map.set(sub, { toolName, description: desc, riskLevel: risk });
  }
  return { description, commands: map };
}

export const COMMAND_GROUPS: ReadonlyMap<string, CommandGroup> = new Map([
  [
    "market",
    group("Market data (public)", [
      ["instruments", "get_instruments", "List available instruments", "read"],
      ["tickers", "get_tickers", "Get ticker prices", "read"],
      ["orderbook", "get_order_book", "Get order book depth", "read"],
      ["trades", "get_market_trades", "Get recent trades", "read"],
      ["candles", "get_candlesticks", "Get candlestick/kline data", "read"],
      ["mark-price", "get_mark_price", "Get mark price", "read"],
      ["funding-rate", "get_funding_rate", "Get funding rate", "read"],
      ["position-tiers", "get_position_tiers", "Get position tier info (leverage/margin per tier)", "read"],
    ]),
  ],
  [
    "account",
    group("Account information", [
      ["balance", "get_balance", "Get account balance", "read"],
      ["positions", "get_positions", "Get open positions", "read"],
      ["config", "get_account_config", "Get account configuration", "read"],
      ["leverage", "manage_leverage", "Get or set leverage", "write"],
      ["margin-mode", "manage_margin_mode", "Get or set margin mode", "write"],
      ["position-mode", "manage_position_mode", "Get or set position mode", "write"],
    ]),
  ],
  [
    "trade",
    group("Trading operations", [
      ["place", "place_order", "Place a new order", "dangerous"],
      ["cancel", "cancel_order", "Cancel an order", "dangerous"],
      ["close", "close_position", "Close a position", "dangerous"],
      ["orders", "get_orders", "Get order list", "read"],
      ["tpsl", "place_tpsl", "Place take-profit/stop-loss", "write"],
      ["cancel-tpsl", "cancel_tpsl", "Cancel TP/SL order", "write"],
      ["tpsl-orders", "get_tpsl_orders", "Get TP/SL orders", "read"],
      ["algo", "place_algo_order", "Place an algo order", "write"],
      ["cancel-algo", "cancel_algo_order", "Cancel an algo order", "write"],
      ["algo-orders", "get_algo_orders", "Get algo orders", "read"],
      ["fills", "get_fills_history", "Get fill history", "read"],
    ]),
  ],
  [
    "asset",
    group("Asset management", [
      ["balances", "get_asset_balances", "Get asset balances", "read"],
      ["transfer", "fund_transfer", "Transfer between accounts", "dangerous"],
      ["bills", "get_transfer_history", "Get transfer history", "read"],
      ["deposits", "get_deposit_history", "Get deposit history", "read"],
      ["withdrawals", "get_withdrawal_history", "Get withdrawal history", "read"],
      ["apikey-info", "get_apikey_info", "Get API key info", "read"],
      ["currencies", "get_currencies", "Get supported currencies info", "read"],
    ]),
  ],
]);

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/** Resolve group + subcommand to a tool name. Returns undefined if not found. */
export function resolveCommand(
  groupName: string,
  subcommand: string,
): CommandDef | undefined {
  return COMMAND_GROUPS.get(groupName)?.commands.get(subcommand);
}

/** Get all group names. */
export function groupNames(): readonly string[] {
  return [...COMMAND_GROUPS.keys()];
}
