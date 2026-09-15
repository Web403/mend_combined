export function extractHours(text: string): number | null {
  const match = text.match(/(\d+)\s*(?:hours?|hrs?|h)\b/i);
  return match ? Number(match[1]) : null;
}