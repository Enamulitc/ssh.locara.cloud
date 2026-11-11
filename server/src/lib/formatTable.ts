/** Renders rows as a simple ASCII table, similar to psql/mysql CLI default output. */
export function formatTable(columns: string[], rows: unknown[][]): string {
  if (columns.length === 0) return "(no columns)\r\n";

  const cellText = (v: unknown) => (v === null || v === undefined ? "NULL" : String(v));
  const widths = columns.map((col, i) =>
    Math.max(col.length, ...rows.map((row) => cellText(row[i]).length), 4)
  );

  const sep = "+" + widths.map((w) => "-".repeat(w + 2)).join("+") + "+";
  const formatRow = (cells: string[]) =>
    "| " + cells.map((c, i) => c.padEnd(widths[i])).join(" | ") + " |";

  const lines = [sep, formatRow(columns), sep];
  for (const row of rows) {
    lines.push(formatRow(row.map((v) => cellText(v))));
  }
  lines.push(sep);
  lines.push(`(${rows.length} row${rows.length === 1 ? "" : "s"})`);
  return lines.join("\r\n") + "\r\n";
}
