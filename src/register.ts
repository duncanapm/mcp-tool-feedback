import { v4 as uuidv4 } from "uuid";
import {
  REPORT_MISSING_CAPABILITY_INPUT_SCHEMA,
  type Report,
  validateReport,
} from "./schema.js";
import { defaultSanitize } from "./sanitize.js";
import type { McpServerLike, RegisterOptions } from "./types.js";

export const REPORT_MISSING_CAPABILITY_TOOL_NAME = "report_missing_capability";

export const REPORT_MISSING_CAPABILITY_DESCRIPTION =
  "Use this tool when this MCP server lacks a capability you need to complete a task. Describe the goal, why existing tools fall short, and what an ideal capability would look like. Never include API keys, tokens, passwords, private URLs, or PII - describe the need generically. After filing a report, continue with whatever workaround is available. Reports are aggregated; patterns across many reports surface real product needs that individual ones don't.";

const ACKNOWLEDGEMENT_TEXT =
  "Thanks — your report has been recorded. Continue with whatever workaround is available.";

/**
 * Register report_missing_capability on an MCP server.
 */
export function registerReportMissingCapability(
  server: McpServerLike,
  options: RegisterOptions,
): () => void {
  const toolName = options.toolName ?? REPORT_MISSING_CAPABILITY_TOOL_NAME;
  const description = options.description ?? REPORT_MISSING_CAPABILITY_DESCRIPTION;
  const sanitize = options.sanitize ?? defaultSanitize;
  const logger = options.logger ?? {
    error: (msg: string, err?: unknown) => {
      console.error(msg, err);
    },
  };

  const schema = {
    ...REPORT_MISSING_CAPABILITY_INPUT_SCHEMA,
    description,
    properties: {
      ...REPORT_MISSING_CAPABILITY_INPUT_SCHEMA.properties,
      goal: {
        ...REPORT_MISSING_CAPABILITY_INPUT_SCHEMA.properties.goal,
        minLength: 1,
      },
      why: {
        ...REPORT_MISSING_CAPABILITY_INPUT_SCHEMA.properties.why,
        minLength: 1,
      },
      ideal_capability: {
        ...REPORT_MISSING_CAPABILITY_INPUT_SCHEMA.properties.ideal_capability,
        minLength: 1,
      },
    },
  };

  server.tool(toolName, schema, async (args) => {
    let report: Report;

    try {
      report = validateReport(args);
    } catch (error) {
      return {
        content: [{ type: "text", text: getErrorMessage(error) }],
      };
    }

    const sanitizedReport = sanitizeReport(report, sanitize);

    const enrichedReport = {
      ...sanitizedReport,
      id: uuidv4(),
      received_at: new Date().toISOString(),
      server_name: options.serverName,
      ...(options.metadata ? { metadata: options.metadata } : {}),
    };

    try {
      await options.sink.write(enrichedReport);
    } catch (error) {
      logger.error("[mcp-tool-feedback] Failed to write report to sink", error);
    }

    return {
      content: [{ type: "text", text: ACKNOWLEDGEMENT_TEXT }],
    };
  });

  return () => {};
}

function sanitizeReport(
  report: Report,
  sanitize: (text: string) => string,
): Report {
  const sanitized: Report = {
    goal: sanitize(report.goal),
    why: sanitize(report.why),
    ideal_capability: sanitize(report.ideal_capability),
  };

  if (report.workaround !== undefined) {
    sanitized.workaround = sanitize(report.workaround);
  }

  if (report.additional_context !== undefined) {
    sanitized.additional_context = sanitize(report.additional_context);
  }

  return sanitized;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
