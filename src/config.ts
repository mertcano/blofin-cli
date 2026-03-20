// ---------------------------------------------------------------------------
// Config file support — ~/.config/blofin/config.json
// Credential resolution: env vars > config file > defaults
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { DEMO_BASE_URL, PROD_BASE_URL } from "blofin-core";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CliConfig {
  readonly apiKey: string;
  readonly secretKey: string;
  readonly passphrase: string;
  readonly demo: boolean;
}

export interface ResolvedCredentials {
  readonly apiKey: string;
  readonly secretKey: string;
  readonly passphrase: string;
  readonly baseUrl: string;
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

function configDir(): string {
  return join(homedir(), ".config", "blofin");
}

function configFile(): string {
  return join(configDir(), "config.json");
}

export function getConfigPath(): string {
  return configFile();
}

// ---------------------------------------------------------------------------
// Default config
// ---------------------------------------------------------------------------

function defaultConfig(): CliConfig {
  return { apiKey: "", secretKey: "", passphrase: "", demo: false };
}

// ---------------------------------------------------------------------------
// Load / Save
// ---------------------------------------------------------------------------

export function loadCliConfig(): CliConfig {
  try {
    const raw = readFileSync(configFile(), "utf-8");
    const parsed = JSON.parse(raw) as Partial<CliConfig>;
    return {
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
      secretKey: typeof parsed.secretKey === "string" ? parsed.secretKey : "",
      passphrase: typeof parsed.passphrase === "string" ? parsed.passphrase : "",
      demo: typeof parsed.demo === "boolean" ? parsed.demo : false,
    };
  } catch {
    return defaultConfig();
  }
}

export function saveCliConfig(config: CliConfig): void {
  mkdirSync(configDir(), { recursive: true, mode: 0o700 });
  writeFileSync(configFile(), JSON.stringify(config, null, 2) + "\n", {
    mode: 0o600,
  });
}

// ---------------------------------------------------------------------------
// Credential resolution
// ---------------------------------------------------------------------------

export function resolveCredentials(flags: {
  demo?: boolean;
}): ResolvedCredentials {
  const fileConfig = loadCliConfig();

  const apiKey = process.env.BLOFIN_API_KEY ?? fileConfig.apiKey ?? "";
  const secretKey = process.env.BLOFIN_API_SECRET ?? fileConfig.secretKey ?? "";
  const passphrase = process.env.BLOFIN_PASSPHRASE ?? fileConfig.passphrase ?? "";

  // demo: CLI flag > config file
  const demo = flags.demo ?? fileConfig.demo;
  const baseUrl =
    process.env.BLOFIN_BASE_URL ?? (demo ? DEMO_BASE_URL : PROD_BASE_URL);

  return { apiKey, secretKey, passphrase, baseUrl };
}
