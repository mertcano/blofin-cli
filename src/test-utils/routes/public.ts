// ---------------------------------------------------------------------------
// Public market-data routes (GET /api/v1/market/*)
// ---------------------------------------------------------------------------

import type { MockState } from "../state.ts";

const INSTRUMENTS = [
  {
    instId: "BTC-USDT",
    baseCurrency: "BTC",
    quoteCurrency: "USDT",
    contractValue: "0.001",
    listTime: "1609459200000",
    expireTime: "",
    lever: "125",
    minSize: "1",
    lotSize: "1",
    tickSize: "0.1",
    instType: "SWAP",
    contractType: "linear",
    state: "live",
  },
  {
    instId: "ETH-USDT",
    baseCurrency: "ETH",
    quoteCurrency: "USDT",
    contractValue: "0.01",
    listTime: "1609459200000",
    expireTime: "",
    lever: "100",
    minSize: "1",
    lotSize: "1",
    tickSize: "0.01",
    instType: "SWAP",
    contractType: "linear",
    state: "live",
  },
];

const TICKERS = [
  {
    instId: "BTC-USDT",
    last: "50000",
    lastSize: "1",
    askPrice: "50001",
    askSize: "10",
    bidPrice: "49999",
    bidSize: "10",
    open24h: "49000",
    high24h: "51000",
    low24h: "48500",
    volCurrency24h: "1000",
    vol24h: "50000000",
    ts: "1700000000000",
  },
  {
    instId: "ETH-USDT",
    last: "3000",
    lastSize: "1",
    askPrice: "3001",
    askSize: "50",
    bidPrice: "2999",
    bidSize: "50",
    open24h: "2900",
    high24h: "3100",
    low24h: "2850",
    volCurrency24h: "5000",
    vol24h: "15000000",
    ts: "1700000000000",
  },
];

const ORDER_BOOK = {
  asks: [
    ["50001", "10", "0", "3"],
    ["50002", "15", "0", "5"],
    ["50003", "20", "0", "8"],
  ],
  bids: [
    ["49999", "10", "0", "3"],
    ["49998", "15", "0", "5"],
    ["49997", "20", "0", "8"],
  ],
  ts: "1700000000000",
};

const TRADES = [
  {
    instId: "BTC-USDT",
    tradeId: "100001",
    price: "50000",
    size: "1",
    side: "buy",
    ts: "1700000000000",
  },
  {
    instId: "BTC-USDT",
    tradeId: "100002",
    price: "50001",
    size: "2",
    side: "sell",
    ts: "1700000001000",
  },
];

const MARK_PRICE = [
  {
    instId: "BTC-USDT",
    instType: "SWAP",
    markPrice: "50000",
    ts: "1700000000000",
  },
];

const FUNDING_RATE = [
  {
    instId: "BTC-USDT",
    instType: "SWAP",
    fundingRate: "0.0001",
    nextFundingRate: "0.00012",
    fundingTime: "1700000000000",
    nextFundingTime: "1700028800000",
  },
];

const FUNDING_RATE_HISTORY = [
  {
    instId: "BTC-USDT",
    instType: "SWAP",
    fundingRate: "0.0001",
    realizedRate: "0.0001",
    fundingTime: "1700000000000",
  },
  {
    instId: "BTC-USDT",
    instType: "SWAP",
    fundingRate: "0.00012",
    realizedRate: "0.00012",
    fundingTime: "1699971200000",
  },
];

const CANDLES = [
  ["1700000000000", "50000", "51000", "49500", "50500", "1000"],
  ["1699996400000", "49000", "50200", "48800", "50000", "950"],
  ["1699992800000", "48500", "49200", "48200", "49000", "880"],
];

type RouteResult = { code: string; data: unknown } | null;

function filterByInstId<T extends { instId: string }>(
  items: readonly T[],
  params: Record<string, string>,
): readonly T[] {
  if (params.instId) {
    return items.filter((item) => item.instId === params.instId);
  }

  return items;
}

export function handlePublicRoute(
  path: string,
  params: Record<string, string>,
  _state: MockState,
): RouteResult {
  switch (path) {
    case "/api/v1/market/instruments":
      return { code: "0", data: filterByInstId(INSTRUMENTS, params) };
    case "/api/v1/market/tickers":
      return { code: "0", data: filterByInstId(TICKERS, params) };
    case "/api/v1/market/books":
      return { code: "0", data: [ORDER_BOOK] };
    case "/api/v1/market/trades":
      return { code: "0", data: filterByInstId(TRADES, params) };
    case "/api/v1/market/mark-price":
      return { code: "0", data: filterByInstId(MARK_PRICE, params) };
    case "/api/v1/market/funding-rate":
      return { code: "0", data: filterByInstId(FUNDING_RATE, params) };
    case "/api/v1/market/funding-rate-history":
      return { code: "0", data: filterByInstId(FUNDING_RATE_HISTORY, params) };
    case "/api/v1/market/candles":
      return { code: "0", data: CANDLES };
    default:
      return null;
  }
}
