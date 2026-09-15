import { ParsedQs } from 'qs';

/**
 * Utility to safely extract string values from Express params and queries
 * which can be either strings, objects, or arrays of strings/objects
 */
export type QueryStringValue = string | string[] | ParsedQs | (string | ParsedQs)[] | undefined;

export function getString(value: QueryStringValue): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === 'string' ? first : undefined;
  }
  return undefined;
}

export function getStringRequired(value: QueryStringValue, fieldName: string): string {
  const str = getString(value);
  if (!str) {
    throw new Error(`${fieldName} is required`);
  }
  return str;
}
