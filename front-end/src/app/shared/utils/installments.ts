/** Divide `totalCents` em `n` parcelas; o resto vai na última. */
export function splitTotalIntoParcelCents(totalCents: number, n: number): number[] {
  if (n < 1) return [];
  const base = Math.floor(totalCents / n);
  const remainder = totalCents - base * n;
  const out = new Array<number>(n).fill(base);
  out[n - 1] += remainder;
  return out;
}

/** `isoDate` yyyy-MM-dd + meses (respeita virada de mês). */
export function addMonthsToIsoDate(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setMonth(dt.getMonth() + months);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
