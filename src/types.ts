import type { EnrichedReport } from "./schema.js";

/**
 * A sink stores or forwards an enriched missing-capability report.
 */
export interface Sink {
  write(report: EnrichedReport): Promise<void>;
  readonly name?: string;
}

/**
 * Minimal surface required from an MCP server implementation.
 */
export interface McpServerLike {
  tool(
    name: string,
    schema: object,
    handler: (args: unknown) => Promise<{ content: Array<{ type: string; text: string }> }>,
  ): void;
}

/**
 * Options for registering the report_missing_capability tool.
 */
export interface RegisterOptions {
  sink: Sink;
  serverName: string;
  toolName?: string;
  description?: string;
  sanitize?: (text: string) => string;
  metadata?: Record<string, string>;
  logger?: {
    error: (msg: string, err?: unknown) => void;
  };
}
