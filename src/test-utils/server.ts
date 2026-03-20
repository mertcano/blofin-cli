// ---------------------------------------------------------------------------
// createMockServer — stateful mock HTTP server for BloFin API
// ---------------------------------------------------------------------------

import { createServer, type Server } from "node:http";
import { createInitialState, type MockState } from "./state.ts";
import { handlePublicRoute } from "./routes/public.ts";
import { handleAccountRoute } from "./routes/account.ts";
import { handleTradingRoute } from "./routes/trading.ts";
import { handleAssetRoute } from "./routes/asset.ts";

export interface MockServer {
  readonly url: string;
  readonly close: () => Promise<void>;
  readonly resetState: () => void;
}

type Body = Record<string, unknown> | Record<string, unknown>[];

function handleRoute(
  path: string,
  method: string,
  params: Record<string, string>,
  body: Body,
  state: MockState,
): { code: string; data: unknown; msg?: string } {
  const result =
    handlePublicRoute(path, params, state) ??
    handleAccountRoute(path, method, params, body, state) ??
    handleTradingRoute(path, method, params, body, state) ??
    handleAssetRoute(path, method, params, body, state);

  if (result) {
    return result;
  }

  return { code: "1", data: null, msg: `Unknown route: ${method} ${path}` };
}

export async function createMockServer(): Promise<MockServer> {
  let state = createInitialState();

  const server: Server = createServer((req, res) => {
    const url = new URL(req.url!, "http://localhost");
    const path = url.pathname;
    const params: Record<string, string> = Object.fromEntries(url.searchParams);

    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      let parsed: Body = {};
      if (body) {
        try {
          parsed = JSON.parse(body) as Body;
        } catch {
          // Ignore non-JSON request bodies in tests.
        }
      }

      const result = handleRoute(path, req.method!, params, parsed, state);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    });
  });

  return new Promise<MockServer>((resolve) => {
    server.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr !== null ? addr.port : 0;

      resolve({
        url: `http://localhost:${port}`,
        close: () =>
          new Promise<void>((res, rej) => {
            server.close((err) => (err ? rej(err) : res()));
          }),
        resetState: () => {
          state = createInitialState();
        },
      });
    });
  });
}
