// ---------------------------------------------------------------------------
// Trading routes (GET/POST /api/v1/trade/*)
// ---------------------------------------------------------------------------

import type { MockOrder, MockState, MockTpslOrder } from "../state.ts";

type RouteResult = { code: string; data: unknown; msg?: string } | null;

function createOrder(
  body: Record<string, unknown>,
  state: MockState,
): MockOrder {
  const orderId = String(state.nextOrderId);
  state.nextOrderId += 1;

  return {
    orderId,
    instId: String(body.instId ?? ""),
    side: String(body.side ?? ""),
    orderType: String(body.orderType ?? ""),
    price: String(body.price ?? "0"),
    size: String(body.size ?? "0"),
    state: "live",
    marginMode: String(body.marginMode ?? "cross"),
    positionSide: String(body.positionSide ?? "net"),
  };
}

function createTpslOrder(
  body: Record<string, unknown>,
  state: MockState,
): MockTpslOrder {
  const tpslId = String(state.nextTpslId);
  state.nextTpslId += 1;

  return {
    tpslId,
    instId: String(body.instId ?? ""),
    positionSide: String(body.positionSide ?? "net"),
    tpTriggerPrice: String(body.tpTriggerPrice ?? ""),
    tpOrderPrice: String(body.tpOrderPrice ?? ""),
    slTriggerPrice: String(body.slTriggerPrice ?? ""),
    slOrderPrice: String(body.slOrderPrice ?? ""),
    state: "live",
  };
}

export function handleTradingRoute(
  path: string,
  method: string,
  params: Record<string, string>,
  body: Record<string, unknown> | Record<string, unknown>[],
  state: MockState,
): RouteResult {
  void method;

  switch (path) {
    case "/api/v1/trade/order": {
      const obj = Array.isArray(body) ? body[0] ?? {} : body;
      const order = createOrder(obj, state);
      state.openOrders = [...state.openOrders, order];
      return { code: "0", data: [{ orderId: order.orderId }] };
    }

    case "/api/v1/trade/batch-orders": {
      // API expects array body: [{order1}, {order2}]
      if (!Array.isArray(body)) {
        return { code: "152004", data: [], msg: "JSON syntax error" };
      }

      const results = body.map((item) => {
        const order = createOrder(item, state);
        state.openOrders = [...state.openOrders, order];
        return { orderId: order.orderId };
      });

      return { code: "0", data: results };
    }

    case "/api/v1/trade/cancel-order": {
      const obj = Array.isArray(body) ? body[0] ?? {} : body;
      const orderId = String(obj.orderId ?? "");
      const found = state.openOrders.find((order) => order.orderId === orderId);
      if (!found) {
        return { code: "1", data: [], msg: "Order not found" };
      }

      const canceled = { ...found, state: "canceled" };
      state.openOrders = state.openOrders.filter((order) => order.orderId !== orderId);
      state.orderHistory = [...state.orderHistory, canceled];
      return { code: "0", data: [{ orderId }] };
    }

    case "/api/v1/trade/cancel-batch-orders": {
      // API expects array body: [{orderId: "1"}, {orderId: "2"}]
      if (!Array.isArray(body)) {
        return { code: "152004", data: [], msg: "JSON syntax error" };
      }

      const results = body.map((item) => {
        const orderId = String(item.orderId ?? "");
        const found = state.openOrders.find((order) => order.orderId === orderId);
        if (!found) {
          return { orderId, code: "1", msg: "Not found" };
        }

        const canceled = { ...found, state: "canceled" };
        state.openOrders = state.openOrders.filter((order) => order.orderId !== orderId);
        state.orderHistory = [...state.orderHistory, canceled];
        return { orderId, code: "0" };
      });

      return { code: "0", data: results };
    }

    case "/api/v1/trade/orders-pending": {
      const filtered = params.instId
        ? state.openOrders.filter((order) => order.instId === params.instId)
        : state.openOrders;
      return { code: "0", data: filtered };
    }

    case "/api/v1/trade/orders-history": {
      let filtered = state.orderHistory;
      if (params.instId) {
        filtered = filtered.filter((order) => order.instId === params.instId);
      }
      if (params.state) {
        const cancelVariants = new Set(["cancelled", "canceled"]);
        const requestedState = params.state;
        filtered = filtered.filter((order) =>
          cancelVariants.has(requestedState) && cancelVariants.has(order.state)
            ? true
            : order.state === requestedState,
        );
      }
      return { code: "0", data: filtered };
    }

    case "/api/v1/trade/order-detail": {
      const orderId = params.orderId ?? "";
      const found =
        state.openOrders.find((order) => order.orderId === orderId) ??
        state.orderHistory.find((order) => order.orderId === orderId);
      return { code: "0", data: found ? [found] : [] };
    }

    case "/api/v1/trade/close-position": {
      const obj = Array.isArray(body) ? body[0] ?? {} : body;
      const instId = String(obj.instId ?? "");
      state.positions = state.positions.filter((position) => position.instId !== instId);
      return { code: "0", data: [{ instId }] };
    }

    case "/api/v1/trade/order-tpsl": {
      const obj = Array.isArray(body) ? body[0] ?? {} : body;
      const tpsl = createTpslOrder(obj, state);
      state.tpslOrders = [...state.tpslOrders, tpsl];
      return { code: "0", data: [{ tpslId: tpsl.tpslId }] };
    }

    case "/api/v1/trade/cancel-tpsl": {
      // API expects array body: [{tpslId, instId}]
      if (!Array.isArray(body)) {
        return { code: "152004", data: [], msg: "JSON syntax error" };
      }

      const first = body[0] ?? {};
      const tpslId = String(first.tpslId ?? "");
      const found = state.tpslOrders.find((order) => order.tpslId === tpslId);
      if (!found) {
        return { code: "1", data: [], msg: "TP/SL order not found" };
      }

      const canceled = { ...found, state: "canceled" };
      state.tpslOrders = state.tpslOrders.filter((order) => order.tpslId !== tpslId);
      state.tpslHistory = [...state.tpslHistory, canceled];
      return { code: "0", data: [{ tpslId }] };
    }

    case "/api/v1/trade/orders-tpsl-pending": {
      const filtered = params.instId
        ? state.tpslOrders.filter((order) => order.instId === params.instId)
        : state.tpslOrders;
      return { code: "0", data: filtered };
    }

    case "/api/v1/trade/orders-tpsl-history": {
      const filtered = params.instId
        ? state.tpslHistory.filter((order) => order.instId === params.instId)
        : state.tpslHistory;
      return { code: "0", data: filtered };
    }

    case "/api/v1/trade/fills-history":
      return { code: "0", data: state.fills };

    case "/api/v1/trade/order-algo":
      return { code: "0", data: [{ algoId: "algo-001" }] };

    case "/api/v1/trade/cancel-algo": {
      const obj = Array.isArray(body) ? body[0] ?? {} : body;
      return { code: "0", data: [{ algoId: String(obj.algoId ?? "algo-001") }] };
    }

    case "/api/v1/trade/orders-algo-pending":
      return { code: "0", data: [] };

    case "/api/v1/trade/orders-algo-history":
      return { code: "0", data: [] };

    default:
      return null;
  }
}
