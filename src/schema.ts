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

export const REPORT_FIELD_MAX_LENGTH = 4000;

export const REPORT_MISSING_CAPABILITY_INPUT_SCHEMA = {
  type: "object",
  properties: {
    goal: {
      type: "string",
      description: "What the user was trying to accomplish, one sentence.",
      maxLength: REPORT_FIELD_MAX_LENGTH,
    },
    why: {
      type: "string",
      description: "Why existing tools didn't work or weren't sufficient.",
      maxLength: REPORT_FIELD_MAX_LENGTH,
    },
    ideal_capability: {
      type: "string",
      description: "What a tool that solved this would do, in plain language.",
      maxLength: REPORT_FIELD_MAX_LENGTH,
    },
    workaround: {
      type: "string",
      description: "What the agent did instead, if anything.",
      maxLength: REPORT_FIELD_MAX_LENGTH,
    },
    additional_context: {
      type: "string",
      description: "Anything else useful, without secrets or PII.",
      maxLength: REPORT_FIELD_MAX_LENGTH,
    },
  },
  required: ["goal", "why", "ideal_capability"],
  additionalProperties: false,
} as const;

/**
 * Validate and normalize unknown tool input into a Report.
 */
export function validateReport(args: unknown): Report {
  if (!isRecord(args)) {
    throw validationError("report payload must be an object");
  }

  const goal = readRequiredString(args, "goal");
  const why = readRequiredString(args, "why");
  const idealCapability = readRequiredString(args, "ideal_capability");
  const workaround = readOptionalString(args, "workaround");
  const additionalContext = readOptionalString(args, "additional_context");

  const report: Report = {
    goal,
    why,
    ideal_capability: idealCapability,
  };

  if (workaround !== undefined) {
    report.workaround = workaround;
  }

  if (additionalContext !== undefined) {
    report.additional_context = additionalContext;
  }

  return report;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredString(args: Record<string, unknown>, field: keyof Report): string {
  const value = args[field];

  if (typeof value !== "string") {
    throw validationError(`${field} is required and must be a string`);
  }

  if (value.trim().length === 0) {
    throw validationError(`${field} must be a non-empty string`);
  }

  assertMaxLength(field, value);
  return value;
}

function readOptionalString(args: Record<string, unknown>, field: keyof Report): string | undefined {
  const value = args[field];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw validationError(`${field} must be a string when provided`);
  }

  assertMaxLength(field, value);
  return value;
}

function assertMaxLength(field: keyof Report, value: string): void {
  if (value.length > REPORT_FIELD_MAX_LENGTH) {
    throw validationError(`${field} must be ${REPORT_FIELD_MAX_LENGTH} characters or fewer`);
  }
}

function validationError(message: string): Error {
  return new Error(`[mcp-tool-feedback] Invalid report_missing_capability payload: ${message}`);
}
