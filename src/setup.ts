// ---------------------------------------------------------------------------
// Interactive setup wizard — `blofin setup`
// Uses Node built-in readline/promises (zero new dependencies)
// ---------------------------------------------------------------------------

import { createInterface } from "node:readline/promises";
import { loadCliConfig, saveCliConfig, getConfigPath } from "./config.js";
import type { CliResult } from "./index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mask(value: string): string {
  if (value.length <= 4) return value ? "****" : "(not set)";
  return `...${value.slice(-4)}`;
}

// ---------------------------------------------------------------------------
// Setup flow
// ---------------------------------------------------------------------------

export async function runSetup(): Promise<CliResult> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stderr,
  });

  try {
    const current = loadCliConfig();

    process.stderr.write("\nBloFin CLI Setup\n");
    process.stderr.write(`Config file: ${getConfigPath()}\n\n`);

    const apiKey = await promptField(rl, "API Key", current.apiKey);
    const secretKey = await promptField(rl, "Secret Key", current.secretKey);
    const passphrase = await promptField(rl, "Passphrase", current.passphrase);

    const demoAnswer = await rl.question(
      `Use demo trading? [${current.demo ? "Y/n" : "y/N"}]: `,
    );
    const demo =
      demoAnswer.trim() === ""
        ? current.demo
        : demoAnswer.trim().toLowerCase().startsWith("y");

    const config = { apiKey, secretKey, passphrase, demo };
    saveCliConfig(config);

    const msg = `\nConfig saved to ${getConfigPath()}\n`;
    process.stderr.write(msg);

    return { output: "", ok: true };
  } finally {
    rl.close();
  }
}

async function promptField(
  rl: ReturnType<typeof createInterface>,
  label: string,
  current: string,
): Promise<string> {
  const answer = await rl.question(
    `${label} [${mask(current)}]: `,
  );
  return answer.trim() || current;
}
