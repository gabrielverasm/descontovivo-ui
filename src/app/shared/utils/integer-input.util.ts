const integerFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

export function parseIntegerInput(value: string | number | null | undefined): number | null {
  const digits = value == null ? '' : String(value).replace(/\D/g, '');
  return digits ? Number.parseInt(digits, 10) : null;
}

export function formatIntegerInput(value: string): string {
  const parsed = parseIntegerInput(value);
  return parsed == null ? '' : integerFormatter.format(parsed);
}
