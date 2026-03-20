// ---------------------------------------------------------------------------
// Formatting utilities — timestamps and numbers
// ---------------------------------------------------------------------------

/**
 * Convert a millisecond timestamp to `YYYY-MM-DD HH:MM:SS` UTC string.
 * Returns the raw value unchanged if it cannot be parsed.
 */
export function tsToStr(ts: string | number): string {
  const ms = typeof ts === "string" ? Number(ts) : ts;
  if (!Number.isFinite(ms)) return String(ts);

  const d = new Date(ms);
  const pad = (n: number): string => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  );
}

/**
 * Format a numeric string with thousands separators and fixed decimal places.
 * Returns the raw value unchanged if it cannot be parsed.
 */
export function fmtNumber(value: string, decimals?: number): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return value;

  const fixed = decimals !== undefined ? num.toFixed(decimals) : value;
  const [intPart, decPart] = fixed.split(".");
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decPart !== undefined ? `${withCommas}.${decPart}` : withCommas;
}
