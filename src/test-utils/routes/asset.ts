// ---------------------------------------------------------------------------
// Asset + User routes (/api/v1/asset/*, /api/v1/user/*)
// ---------------------------------------------------------------------------

import type { MockState } from "../state.ts";

type RouteResult = { code: string; data: unknown; msg?: string } | null;

export function handleAssetRoute(
  path: string,
  method: string,
  params: Record<string, string>,
  body: Record<string, unknown> | Record<string, unknown>[],
  state: MockState,
): RouteResult {
  void method;
  void params;

  // Asset routes never receive array bodies
  const obj = Array.isArray(body) ? {} : body;

  switch (path) {
    case "/api/v1/asset/balances":
      return {
        code: "0",
        data: [
          {
            currency: "USDT",
            balance: state.balance.totalEquity,
            availableBalance: state.balance.availableBalance,
            frozenBalance: "0",
          },
        ],
      };

    case "/api/v1/asset/transfer": {
      const transfer = {
        transferId: `txn-${Date.now()}`,
        currency: String(obj.currency ?? "USDT"),
        amount: String(obj.amount ?? "0"),
        fromAccount: String(obj.fromAccount ?? ""),
        toAccount: String(obj.toAccount ?? ""),
      };
      state.transfers = [...state.transfers, transfer];
      return { code: "0", data: [{ transferId: transfer.transferId }] };
    }

    case "/api/v1/asset/transfer-history":
      return { code: "0", data: state.transfers };

    case "/api/v1/asset/bills":
      return { code: "0", data: [] };

    case "/api/v1/asset/deposit-history":
      return { code: "0", data: [] };

    case "/api/v1/asset/withdrawal-history":
      return { code: "0", data: [] };

    case "/api/v1/user/query-apikey":
      return {
        code: "0",
        data: [
          {
            label: "test",
            apiKey: "mock-api-key",
            readOnly: "0",
            permissions: "read_only,trade",
            ip: "",
          },
        ],
      };

    default:
      return null;
  }
}
