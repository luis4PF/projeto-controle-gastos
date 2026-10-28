const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatBrlFromCents(cents: number): string {
  return fmt.format(cents / 100);
}

/** Converte string digitada com máscara (ex: "1.234,56") para centavos */
export function parseBrlStringToCents(value: string): number | null {
  const cleaned = value.replace(/\s/g, '').replace(/R\$\s?/gi, '');
  if (!cleaned.trim()) return null;
  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  const n = Number(normalized);
  if (Number.isNaN(n)) return null;
  return Math.round(n * 100);
}
