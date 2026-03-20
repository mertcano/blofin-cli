// ---------------------------------------------------------------------------
// MockState — in-memory state for the mock BloFin API server
// ---------------------------------------------------------------------------

export interface MockPosition {
  readonly instId: string;
  readonly positionSide: string;
  readonly size: string;
  readonly avgPrice: string;
  readonly leverage: string;
  readonly marginMode: string;
}

export interface MockOrder {
  readonly orderId: string;
  readonly instId: string;
  readonly side: string;
  readonly orderType: string;
  readonly price: string;
  readonly size: string;
  readonly state: string;
  readonly marginMode: string;
  readonly positionSide: string;
}

export interface MockTpslOrder {
  readonly tpslId: string;
  readonly instId: string;
  readonly positionSide: string;
  readonly tpTriggerPrice: string;
  readonly tpOrderPrice: string;
  readonly slTriggerPrice: string;
  readonly slOrderPrice: string;
  readonly state: string;
}

export interface MockState {
  balance: { totalEquity: string; availableBalance: string };
  positions: MockPosition[];
  openOrders: MockOrder[];
  orderHistory: MockOrder[];
  leverage: Record<string, { leverage: string; marginMode: string }>;
  marginMode: string;
  positionMode: string;
  nextOrderId: number;
  tpslOrders: MockTpslOrder[];
  tpslHistory: MockTpslOrder[];
  nextTpslId: number;
  fills: Array<Record<string, string>>;
  transfers: Array<Record<string, string>>;
}

export function createInitialState(): MockState {
  return {
    balance: { totalEquity: "10000.00", availableBalance: "10000.00" },
    positions: [],
    openOrders: [],
    orderHistory: [],
    leverage: { "BTC-USDT": { leverage: "10", marginMode: "cross" } },
    marginMode: "cross",
    positionMode: "net_mode",
    nextOrderId: 1000,
    tpslOrders: [],
    tpslHistory: [],
    nextTpslId: 5000,
    fills: [],
    transfers: [],
  };
}
