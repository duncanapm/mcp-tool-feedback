/**
 * Redact common secrets and PII from a report string before it reaches a sink.
 */
export function defaultSanitize(text: string): string {
  return text
    .replace(/Bearer\s+[A-Za-z0-9._~+/\-=]{20,}/g, "[redacted]")
    .replace(/\b(?:sk-|pk_|ghp_|gho_|xoxb-|xoxp-|AKIA)[A-Za-z0-9_+/\-=]{20,}/g, "[redacted]")
    .replace(/\b[A-Fa-f0-9]{40,}\b/g, "[redacted]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted]")
    .replace(/([?&](?:token|api_key|key)=)[^&#\s]+/gi, "$1[redacted]");
}
