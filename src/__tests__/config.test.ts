import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// ---------------------------------------------------------------------------
// Mock os.homedir() so config resolves to a temp path
// ---------------------------------------------------------------------------

let tempDir: string;

vi.mock("node:os", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import("node:os");
  return {
    ...actual,
    homedir: () => tempDir,
  };
});

beforeEach(() => {
  tempDir = join(
    tmpdir(),
    `blofin-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(tempDir, { recursive: true });
});

afterEach(() => {
  if (existsSync(tempDir)) {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// loadCliConfig
// ---------------------------------------------------------------------------

describe("loadCliConfig", () => {
  it("returns defaults when no config file exists", async () => {
    const { loadCliConfig } = await import("../config.js");
    const config = loadCliConfig();
    expect(config).toEqual({
      apiKey: "",
      secretKey: "",
      passphrase: "",
      demo: false,
    });
  });

  it("reads config from file", async () => {
    const configDir = join(tempDir, ".config", "blofin");
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      join(configDir, "config.json"),
      JSON.stringify({
        apiKey: "my-key",
        secretKey: "my-secret",
        passphrase: "my-pass",
        demo: true,
      }),
    );

    const { loadCliConfig } = await import("../config.js");
    const config = loadCliConfig();
    expect(config.apiKey).toBe("my-key");
    expect(config.secretKey).toBe("my-secret");
    expect(config.passphrase).toBe("my-pass");
    expect(config.demo).toBe(true);
  });

  it("handles malformed JSON gracefully", async () => {
    const configDir = join(tempDir, ".config", "blofin");
    mkdirSync(configDir, { recursive: true });
    writeFileSync(join(configDir, "config.json"), "not json");

    const { loadCliConfig } = await import("../config.js");
    const config = loadCliConfig();
    expect(config.apiKey).toBe("");
  });
});

// ---------------------------------------------------------------------------
// saveCliConfig
// ---------------------------------------------------------------------------

describe("saveCliConfig", () => {
  it("creates config directory and file", async () => {
    const { saveCliConfig, loadCliConfig } = await import("../config.js");
    saveCliConfig({
      apiKey: "k",
      secretKey: "s",
      passphrase: "p",
      demo: true,
    });

    const loaded = loadCliConfig();
    expect(loaded.apiKey).toBe("k");
    expect(loaded.demo).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// resolveCredentials
// ---------------------------------------------------------------------------

describe("resolveCredentials", () => {
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    savedEnv = {
      BLOFIN_API_KEY: process.env.BLOFIN_API_KEY,
      BLOFIN_API_SECRET: process.env.BLOFIN_API_SECRET,
      BLOFIN_PASSPHRASE: process.env.BLOFIN_PASSPHRASE,
      BLOFIN_BASE_URL: process.env.BLOFIN_BASE_URL,
    };
    delete process.env.BLOFIN_API_KEY;
    delete process.env.BLOFIN_API_SECRET;
    delete process.env.BLOFIN_PASSPHRASE;
    delete process.env.BLOFIN_BASE_URL;
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("env vars take priority over config file", async () => {
    const configDir = join(tempDir, ".config", "blofin");
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      join(configDir, "config.json"),
      JSON.stringify({
        apiKey: "file-key",
        secretKey: "file-sec",
        passphrase: "file-pass",
        demo: false,
      }),
    );

    process.env.BLOFIN_API_KEY = "env-key";

    const { resolveCredentials } = await import("../config.js");
    const creds = resolveCredentials({});
    expect(creds.apiKey).toBe("env-key");
    expect(creds.secretKey).toBe("file-sec");
  });

  it("demo flag from CLI overrides config file", async () => {
    const configDir = join(tempDir, ".config", "blofin");
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      join(configDir, "config.json"),
      JSON.stringify({
        apiKey: "",
        secretKey: "",
        passphrase: "",
        demo: false,
      }),
    );

    const { resolveCredentials } = await import("../config.js");
    const creds = resolveCredentials({ demo: true });
    expect(creds.baseUrl).toContain("demo");
  });

  it("uses prod URL when demo is false", async () => {
    const { resolveCredentials } = await import("../config.js");
    const creds = resolveCredentials({ demo: false });
    expect(creds.baseUrl).toContain("openapi.blofin.com");
    expect(creds.baseUrl).not.toContain("demo");
  });
});
