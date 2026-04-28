import type { McpServerLike, RegisterOptions } from "./types.js";

export const REPORT_MISSING_CAPABILITY_TOOL_NAME = "report_missing_capability";

export const REPORT_MISSING_CAPABILITY_DESCRIPTION =
  "Use this tool when this MCP server lacks a capability you need to complete a task. Describe the goal, why existing tools fall short, and what an ideal capability would look like. Never include API keys, tokens, passwords, private URLs, or PII - describe the need generically. After filing a report, continue with whatever workaround is available. Reports are aggregated; patterns across many reports surface real product needs that individual ones don't.";

/**
 * Register report_missing_capability on an MCP server.
 */
export function registerReportMissingCapability(
  _server: McpServerLike,
  _options: RegisterOptions,
): () => void {
  throw new Error("[tool-feedback] registerReportMissingCapability is not implemented yet");
}
