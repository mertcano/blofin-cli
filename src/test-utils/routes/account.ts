// ---------------------------------------------------------------------------
// Account routes (GET/POST /api/v1/account/*)
// ---------------------------------------------------------------------------

import type { MockState } from "../state.ts";

type RouteResult = { code: string; data: unknown; msg?: string } | null;

export function handleAccountRoute(
  path: string,
  method: string,
  params: Record<string, string>,
  body: Record<string, unknown> | Record<string, unknown>[],
  state: MockState,
): RouteResult {
  void method;

  // Account routes never receive array bodies
  const obj = Array.isArray(body) ? {} : body;

  switch (path) {
    case "/api/v1/account/balance":
      return {
        code: "0",
        data: [
          {
            totalEquity: state.balance.totalEquity,
            availableBalance: state.balance.availableBalance,
            frozenBalance: "0",
            unrealizedPnl: "0",
          },
        ],
      };

    case "/api/v1/account/positions": {
      const filtered = params.instId
        ? state.positions.filter((position) => position.instId === params.instId)
        : state.positions;
      return { code: "0", data: filtered };
    }

    case "/api/v1/account/batch-leverage-info": {
      const instId = params.instId ?? "";
      const entry = state.leverage[instId];
      if (entry) {
        return {
          code: "0",
          data: [{ instId, leverage: entry.leverage, marginMode: entry.marginMode }],
        };
      }

      return {
        code: "0",
        data: [{ instId, leverage: "10", marginMode: params.marginMode ?? "cross" }],
      };
    }

    case "/api/v1/account/set-leverage": {
      const instId = String(obj.instId ?? "");
      const leverage = String(obj.leverage ?? "10");
      const marginMode = String(obj.marginMode ?? "cross");
      state.leverage = {
        ...state.leverage,
        [instId]: { leverage, marginMode },
      };
      return {
        code: "0",
        data: [{ instId, leverage, marginMode }],
      };
    }

    case "/api/v1/account/margin-mode":
      return {
        code: "0",
        data: [{ marginMode: state.marginMode }],
      };

    case "/api/v1/account/set-margin-mode": {
      const newMode = String(obj.marginMode ?? state.marginMode);
      state.marginMode = newMode;
      return {
        code: "0",
        data: [{ marginMode: newMode }],
      };
    }

    case "/api/v1/account/position-mode":
      return {
        code: "0",
        data: [{ positionMode: state.positionMode }],
      };

    case "/api/v1/account/set-position-mode": {
      const newMode = String(obj.positionMode ?? state.positionMode);
      state.positionMode = newMode;
      return {
        code: "0",
        data: [{ positionMode: newMode }],
      };
    }

    case "/api/v1/account/config":
      return {
        code: "0",
        data: [
          {
            marginMode: state.marginMode,
            positionMode: state.positionMode,
            accountLevel: "1",
          },
        ],
      };

    default:
      return null;
  }
}
