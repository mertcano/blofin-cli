// ---------------------------------------------------------------------------
// Config file support — ~/.config/blofin/config.json
// Credential resolution: env vars > config file > defaults
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync, mkdirSync, chmodSync } from "node:fs";
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
  let raw: string;
  try {
    raw = readFileSync(configFile(), "utf-8");
  } catch (err) {
    // A missing config file is the normal first-run state and is not an error.
    // Anything else (permissions, EISDIR, etc.) is worth surfacing, because
    // silently returning defaults would look like "no credentials configured"
    // and send the user down the wrong debugging path.
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      process.stderr.write(
        `Warning: could not read config at ${configFile()}: ${
          err instanceof Error ? err.message : String(err)
        }\n`,
      );
    }
    return defaultConfig();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    // Malformed JSON previously fell back silently to empty credentials, which
    // presented as an authentication failure instead of a corrupt config file.
    process.stderr.write(
      `Warning: config file ${configFile()} is not valid JSON: ${
        err instanceof Error ? err.message : String(err)
      }\n`,
    );
    return defaultConfig();
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    process.stderr.write(
      `Warning: config file ${configFile()} must contain a JSON object.\n`,
    );
    return defaultConfig();
  }

  const cfg = parsed as Partial<CliConfig>;
  return {
    apiKey: typeof cfg.apiKey === "string" ? cfg.apiKey : "",
    secretKey: typeof cfg.secretKey === "string" ? cfg.secretKey : "",
    passphrase: typeof cfg.passphrase === "string" ? cfg.passphrase : "",
    demo: typeof cfg.demo === "boolean" ? cfg.demo : false,
  };
}

export function saveCliConfig(config: CliConfig): void {
  mkdirSync(configDir(), { recursive: true, mode: 0o700 });
  const target = configFile();
  writeFileSync(target, JSON.stringify(config, null, 2) + "\n", {
    mode: 0o600,
  });
  // `mode` in writeFileSync only applies when the file is created. Re-applying
  // it explicitly keeps the permissions tight when overwriting a pre-existing
  // file (or one written by an older version with looser permissions).
  // chmodSync is a no-op on Windows, where the ACLs are inherited instead.
  try {
    chmodSync(target, 0o600);
  } catch {
    // Non-fatal: on platforms without POSIX permission bits there is nothing
    // to tighten, and failing to save the config would be worse.
  }
}

// ---------------------------------------------------------------------------
// Credential resolution
// ---------------------------------------------------------------------------

/**
 * Resolve a credential from the environment, falling back to the config file.
 *
 * An environment variable that is set but empty must not shadow a stored
 * credential. `??` only guards against null/undefined, so a variable exported
 * as an empty string (common in CI systems that define optional secrets as "")
 * previously wiped out a perfectly good config-file value and produced a
 * confusing authentication failure.
 */
function pickCredential(envName: string, fromFile: string): string {
  const raw = process.env[envName];
  if (raw !== undefined && raw.trim() !== "") return raw;
  return fromFile;
}

export function resolveCredentials(flags: {
  demo?: boolean;
}): ResolvedCredentials {
  const fileConfig = loadCliConfig();

  const apiKey = pickCredential("BLOFIN_API_KEY", fileConfig.apiKey);
  const secretKey = pickCredential("BLOFIN_API_SECRET", fileConfig.secretKey);
  const passphrase = pickCredential("BLOFIN_PASSPHRASE", fileConfig.passphrase);

  // demo: CLI flag > config file
  const demo = flags.demo ?? fileConfig.demo;
  const baseUrl =
    process.env.BLOFIN_BASE_URL || (demo ? DEMO_BASE_URL : PROD_BASE_URL);

  return { apiKey, secretKey, passphrase, baseUrl };
}
