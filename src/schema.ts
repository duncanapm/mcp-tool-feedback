/**
 * The structured payload an agent sends when an MCP server lacks a needed capability.
 */
export interface Report {
  goal: string;
  why: string;
  ideal_capability: string;
  workaround?: string;
  additional_context?: string;
}

/**
 * A report after library-owned enrichment has been applied.
 */
export interface EnrichedReport extends Report {
  id: string;
  received_at: string;
  server_name: string;
  metadata?: Record<string, string>;
}

/**
 * Validate and normalize unknown tool input into a Report.
 */
export function validateReport(_args: unknown): Report {
  throw new Error("[mcp-tool-feedback] validateReport is not implemented yet");
}
