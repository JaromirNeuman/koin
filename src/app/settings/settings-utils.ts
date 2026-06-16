export function normalizeDate(raw: string): string | null {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  
  const m = s.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})/);
  if (m) {
    const [, d, mo, yRaw] = m;
    const y = yRaw.length === 2 ? "20" + yRaw : yRaw;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10);
}

export function parseAmount(raw: string): number | null {
  const cleaned = raw
    .replace(/\s/g, "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}\b)/g, "") 
    .replace(",", ".");
  
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}