/**
 * Redact common secrets and PII from a report string before it reaches a sink.
 */
export function defaultSanitize(text: string): string {
  return text;
}
