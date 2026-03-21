#!/usr/bin/env node
// ---------------------------------------------------------------------------
// blofin CLI — grouped command interface over blofin-core
// Usage: blofin [global-flags] <group> <subcommand> [--param=value ...]
// ---------------------------------------------------------------------------

import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import {
  ALL_MODULES,
  buildTools,
  loadConfig,
  BlofinClient,
} from "blofin-core";
import type { ModuleId, ToolSpec } from "blofin-core";
import { resolveCredentials } from "./config.js";
import { COMMAND_GROUPS, resolveCommand, groupNames } from "./commands.js";

export { COMMAND_GROUPS, resolveCommand, groupNames } from "./commands.js";
export type { CommandDef, CommandGroup } from "./commands.js";
import {
  outputResult,
  outputError,
  type OutputFormat,
} from "./output.js";

// ---------------------------------------------------------------------------
// Version — read once from package.json at import time
// ---------------------------------------------------------------------------

const CLI_VERSION: string = (() => {
  const pkgPath = new URL("../package.json", import.meta.url);
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version: string };
  return pkg.version;
})();

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_MODULES: ReadonlySet<string> = new Set(ALL_MODULES);

const CLI_FLAGS = new Set([
  "help",
  "version",
  "read-only",
  "confirm",
  "modules",
  "output",
  "demo",
]);

// ---------------------------------------------------------------------------
// Help formatters
// ---------------------------------------------------------------------------

function formatGlobalHelp(): string {
  const lines = [
    `blofin-cli v${CLI_VERSION}`,
    "",
    "Usage: blofin [flags] <group> <subcommand> [--param=value ...]",
    "",
    "Groups:",
  ];

  for (const [name, group] of COMMAND_GROUPS) {
    lines.push(`  ${name.padEnd(12)} ${group.description}`);
  }

  lines.push(
    "",
    "Commands:",
    "  setup          Configure API credentials",
    "",
    "Global flags:",
    "  --help         Show help",
    "  --version      Show version",
    "  -o, --output   Output format: table (default) | json",
    "  --demo         Use demo trading environment",
    "  --read-only    Exclude write/dangerous tools",
    "  --confirm      Allow dangerous operations",
    "  --modules      Comma-separated module filter",
    "",
    "Run 'blofin <group> --help' for subcommand details.",
  );

  return lines.join("\n");
}

function formatGroupHelp(groupName: string): string {
  const group = COMMAND_GROUPS.get(groupName);
  if (!group) return `Unknown group: ${groupName}`;

  const lines = [
    `blofin ${groupName} — ${group.description}`,
    "",
    "Subcommands:",
  ];

  const maxSub = Math.max(
    ...[...group.commands.keys()].map((k) => k.length),
  );

  for (const [sub, cmd] of group.commands) {
    const tag = `[${cmd.riskLevel}]`;
    lines.push(`  ${sub.padEnd(maxSub + 2)} ${tag.padEnd(14)} ${cmd.description}`);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Module validation
// ---------------------------------------------------------------------------

function parseModules(raw: string): ModuleId[] | string {
  const ids = raw.split(",");
  const invalid = ids.filter((id) => !VALID_MODULES.has(id));
  if (invalid.length > 0) {
    return `Invalid module(s): ${invalid.join(", ")}. Valid modules: ${ALL_MODULES.join(", ")}`;
  }
  return ids as ModuleId[];
}

// ---------------------------------------------------------------------------
// Short flag expansion — `-o json` → `--output=json`
// ---------------------------------------------------------------------------

const SHORT_VALUE_FLAGS: ReadonlyMap<string, string> = new Map([
  ["-o", "output"],
]);

function expandShortFlags(args: readonly string[]): string[] {
  const result: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const longName = SHORT_VALUE_FLAGS.get(args[i]);
    if (longName && i + 1 < args.length) {
      result.push(`--${longName}=${args[i + 1]}`);
      i++; // skip the value
    } else {
      result.push(args[i]);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Core logic — returns { output, ok } (no process.exit)
// ---------------------------------------------------------------------------

export interface CliResult {
  readonly output: string;
  readonly ok: boolean;
}

export async function runCli(args: string[]): Promise<CliResult> {
  // Expand `-o <value>` into `--output=<value>` since parseArgs strict:false
  // treats single-char flags as booleans
  const normalizedArgs = expandShortFlags(args);

  const { values, positionals } = parseArgs({
    args: normalizedArgs,
    strict: false,
    allowPositionals: true,
  });

  // Extract known flags
  const help = values["help"] === true;
  const version = values["version"] === true;
  const readOnly = values["read-only"] === true;
  const confirm = values["confirm"] === true;
  const demo = values["demo"] === true ? true : undefined;
  const modulesRaw =
    typeof values["modules"] === "string" ? values["modules"] : undefined;
  const outputFlag =
    typeof values["output"] === "string" ? values["output"] : undefined;
  const format: OutputFormat =
    outputFlag === "json" ? "json" : "table";

  // --version: return version string
  if (version) {
    return { output: CLI_VERSION, ok: true };
  }

  // Validate --modules
  let modules: ModuleId[] | undefined;
  if (modulesRaw) {
    const parsed = parseModules(modulesRaw);
    if (typeof parsed === "string") {
      return {
        output: outputError("cli", new Error(parsed), format),
        ok: false,
      };
    }
    modules = parsed;
  }

  // No positionals: global help
  if (positionals.length === 0 || (help && positionals.length === 0)) {
    return { output: formatGlobalHelp(), ok: true };
  }

  const first = positionals[0];

  // `blofin setup`
  if (first === "setup") {
    const { runSetup } = await import("./setup.js");
    return runSetup();
  }

  // Check if first positional is a known group
  const groupName = first;
  const group = COMMAND_GROUPS.get(groupName);

  if (!group) {
    // Not a known group — show global help with error
    return {
      output: outputError(
        "cli",
        new Error(`Unknown command: ${first}. Run 'blofin --help' for usage.`),
        format,
      ),
      ok: false,
    };
  }

  // `blofin <group> --help` or `blofin <group>` with no subcommand
  if (help || positionals.length < 2) {
    return { output: formatGroupHelp(groupName), ok: true };
  }

  const subcommand = positionals[1];
  const cmdDef = resolveCommand(groupName, subcommand);

  if (!cmdDef) {
    return {
      output: outputError(
        "cli",
        new Error(
          `Unknown subcommand: ${groupName} ${subcommand}. ` +
          `Run 'blofin ${groupName} --help' for available subcommands.`,
        ),
        format,
      ),
      ok: false,
    };
  }

  // Resolve credentials (env > config file > defaults)
  const creds = resolveCredentials({ demo });

  // Build config and tools
  const config = loadConfig({
    modules,
    readOnly,
    apiKey: creds.apiKey,
    secretKey: creds.secretKey,
    passphrase: creds.passphrase,
    baseUrl: creds.baseUrl,
  });
  const tools = buildTools(config);

  // Find the tool by name
  const tool = tools.find((t) => t.name === cmdDef.toolName);

  if (!tool) {
    return {
      output: outputError(
        cmdDef.toolName,
        new Error(
          `Tool '${cmdDef.toolName}' not available (may be excluded by --read-only or --modules).`,
        ),
        format,
      ),
      ok: false,
    };
  }

  // Safety gate for dangerous tools
  if (tool.riskLevel === "dangerous" && !confirm) {
    return {
      output: outputError(
        tool.name,
        new Error(
          `Command '${groupName} ${subcommand}' is dangerous. Use --confirm to execute.`,
        ),
        format,
      ),
      ok: false,
    };
  }

  // Collect remaining flags as tool parameters (strip CLI-only flags)
  const params: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (CLI_FLAGS.has(key)) continue;
    params[key] = value;
  }

  // Execute tool
  const client = new BlofinClient(config);
  const ctx = { client, config };

  try {
    const result = await tool.handler(params, ctx);
    return {
      output: outputResult(tool.name, result, format),
      ok: true,
    };
  } catch (error: unknown) {
    return {
      output: outputError(tool.name, error, format),
      ok: false,
    };
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

function isMainModule(): boolean {
  if (typeof process === "undefined" || !process.argv[1]) {
    return false;
  }
  const self = fileURLToPath(import.meta.url);
  const invoked = resolve(process.argv[1]);
  return self === invoked;
}

if (isMainModule()) {
  runCli(process.argv.slice(2))
    .then(({ output, ok }) => {
      if (output) console.log(output);
      if (!ok) process.exit(1);
    })
    .catch((err: unknown) => {
      console.error(err);
      process.exit(1);
    });
}
