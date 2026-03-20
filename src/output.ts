// ---------------------------------------------------------------------------
// Output formatting — table (default) and JSON modes
// ---------------------------------------------------------------------------

import Table from "cli-table3";
import { toToolResponse, toToolError } from "blofin-core";

export type OutputFormat = "table" | "json";

// ---------------------------------------------------------------------------
// Table rendering
// ---------------------------------------------------------------------------

export function outputTable(
  rows: readonly Record<string, unknown>[],
  columns?: readonly string[],
  title?: string,
): string {
  if (rows.length === 0) return title ? `${title}\n(no data)` : "(no data)";

  const cols = columns ?? Object.keys(rows[0]);
  const table = new Table({ head: [...cols] });

  for (const row of rows) {
    table.push(cols.map((c) => String(row[c] ?? "")));
  }

  const rendered = table.toString();
  return title ? `${title}\n${rendered}` : rendered;
}

// ---------------------------------------------------------------------------
// Result output
// ---------------------------------------------------------------------------

export function outputResult(
  toolName: string,
  data: unknown,
  format: OutputFormat,
): string {
  if (format === "json") {
    return JSON.stringify(toToolResponse(toolName, data), null, 2);
  }

  // Table mode: unwrap API response envelope { code, data }
  const rows = extractRows(data);
  if (rows.length > 0) {
    return outputTable(rows);
  }

  // Fallback: pretty-print the raw data
  return JSON.stringify(data, null, 2);
}

// ---------------------------------------------------------------------------
// Error output
// ---------------------------------------------------------------------------

export function outputError(
  toolName: string,
  error: unknown,
  format: OutputFormat,
): string {
  if (format === "json") {
    return JSON.stringify(toToolError(toolName, error), null, 2);
  }

  // Table mode: plain text to stderr
  const msg =
    error instanceof Error ? error.message : String(error);
  return `Error: ${msg}`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractRows(data: unknown): Record<string, unknown>[] {
  if (data == null || typeof data !== "object") return [];

  // BloFin API envelope: { code: "0", data: [...] }
  const envelope = data as Record<string, unknown>;
  const inner = envelope.data;

  if (Array.isArray(inner) && inner.length > 0 && isRecord(inner[0])) {
    return inner as Record<string, unknown>[];
  }

  // data is a single object — wrap it
  if (isRecord(inner)) {
    return [inner as Record<string, unknown>];
  }

  // Top-level array
  if (Array.isArray(data) && data.length > 0 && isRecord(data[0])) {
    return data as Record<string, unknown>[];
  }

  return [];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}
