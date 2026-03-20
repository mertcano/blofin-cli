import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMockServer, type MockServer } from "../test-utils/index.js";

describe("local test utils", () => {
  let server: MockServer;

  beforeAll(async () => {
    server = await createMockServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it("starts a local mock server", () => {
    expect(server.url).toContain("http://localhost:");
  });
});
