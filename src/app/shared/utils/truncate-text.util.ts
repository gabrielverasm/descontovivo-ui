export interface TruncatedText {
  text: string;
  truncated: boolean;
}

export function truncateText(value: string, maxLength: number): TruncatedText {
  if (value.length <= maxLength) return { text: value, truncated: false };
  if (maxLength <= 3) return { text: '.'.repeat(Math.max(0, maxLength)), truncated: true };

  const contentLimit = maxLength - 3;
  const candidate = value.slice(0, contentLimit);
  const lastSpace = candidate.lastIndexOf(' ');
  const text = (lastSpace > 0 ? candidate.slice(0, lastSpace) : candidate).trimEnd();
  return { text: `${text}...`, truncated: true };
}
