// Escapes a value for safe HTML insertion; undefined becomes "".
export function esc(s: string | undefined): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Ensures a URL has an http(s) scheme so it renders as an absolute link, not a relative path.
export function safeHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `http://${url}`;
}

// Minimal CSV parser. Handles quoted fields containing commas; does not handle escaped quotes.
export function parseCSV(text: string): Record<string, string>[] {
  const [headerLine, ...lines] = text.trim().split("\n");
  const headers = headerLine.split(",");
  return lines.map((line) => {
    const values: string[] = [];
    let cur = "";
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') {
        inQuote = !inQuote;
      } else if (ch === "," && !inQuote) {
        values.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    values.push(cur);
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
}
