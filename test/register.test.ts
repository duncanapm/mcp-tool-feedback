import { expect, test } from "vitest";
import type { EnrichedReport } from "../src/schema.js";
import {
  REPORT_MISSING_CAPABILITY_DESCRIPTION,
  REPORT_MISSING_CAPABILITY_TOOL_NAME,
  registerReportMissingCapability,
} from "../src/register.js";
import type { RegisterOptions, Sink } from "../src/types.js";

type ToolResponse = { content: Array<{ type: string; text: string }> };
type ToolHandler = (args: unknown) => Promise<ToolResponse>;

function setup(overrides?: Partial<RegisterOptions>): {
  handler: ToolHandler;
  writes: EnrichedReport[];
  errors: Array<{ msg: string; err: unknown }>;
  registeredName: string;
  registeredSchema: object;
  unregister: () => void;
} {
  let registeredName: string | undefined;
  let registeredSchema: object | undefined;
  let registeredHandler: ToolHandler | undefined;

  const writes: EnrichedReport[] = [];
  const sink: Sink = {
    name: "test",
    async write(report: EnrichedReport): Promise<void> {
      writes.push(report);
    },
  };

  const errors: Array<{ msg: string; err: unknown }> = [];
  const logger = {
    error: (msg: string, err?: unknown) => {
      errors.push({ msg, err });
    },
  };

  const fakeServer = {
    tool(name: string, schema: object, handler: ToolHandler): void {
      registeredName = name;
      registeredSchema = schema;
      registeredHandler = handler;
    },
  };

  const unregister = registerReportMissingCapability(fakeServer, {
    sink,
    serverName: "test-server",
    logger,
    ...overrides,
  });

  if (!registeredName || !registeredSchema || !registeredHandler) {
    throw new Error("tool was not registered");
  }

  return {
    handler: registeredHandler,
    writes,
    errors,
    registeredName,
    registeredSchema,
    unregister,
  };
}

const VALID_REPORT = {
  goal: "bulk-create notes",
  why: "tooling only supports single-note calls",
  ideal_capability: "bulk_create_notes that accepts an array",
  workaround: "created two notes manually",
  additional_context: "from standup transcript import",
};

test("registers tool with default name and description", async () => {
  const result = setup();

  expect(result.registeredName).toBe(REPORT_MISSING_CAPABILITY_TOOL_NAME);
  expect((result.registeredSchema as { description?: string }).description).toContain(
    REPORT_MISSING_CAPABILITY_DESCRIPTION.slice(0, 40),
  );
});

test("accepts custom toolName and description", async () => {
  const result = setup({
    toolName: "custom_name",
    description: "custom description",
  });

  expect(result.registeredName).toBe("custom_name");
  expect((result.registeredSchema as { description?: string }).description).toBe(
    "custom description",
  );
});

test("writes a valid report to the sink with enrichment", async () => {
  const { handler, writes } = setup();

  await handler(VALID_REPORT);

  expect(writes).toHaveLength(1);
  const stored = writes[0] as EnrichedReport;
  expect(stored.goal).toBe(VALID_REPORT.goal);
  expect(stored.why).toBe(VALID_REPORT.why);
  expect(stored.ideal_capability).toBe(VALID_REPORT.ideal_capability);
  expect(stored.workaround).toBe(VALID_REPORT.workaround);
  expect(stored.additional_context).toBe(VALID_REPORT.additional_context);
  expect(stored.server_name).toBe("test-server");
  expect(stored.id).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
  expect(new Date(stored.received_at).toISOString()).toBe(stored.received_at);
});

test("runs sanitiser over all string fields", async () => {
  const { handler, writes } = setup({
    sanitize: (text) => text.toUpperCase(),
  });

  await handler(VALID_REPORT);

  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatchObject({
    goal: VALID_REPORT.goal.toUpperCase(),
    why: VALID_REPORT.why.toUpperCase(),
    ideal_capability: VALID_REPORT.ideal_capability.toUpperCase(),
    workaround: VALID_REPORT.workaround.toUpperCase(),
    additional_context: VALID_REPORT.additional_context.toUpperCase(),
  });
});

test("rejects payload missing required fields", async () => {
  const { handler, writes } = setup();

  const response = await handler({ goal: "x" });

  expect(response.content[0]?.text).toContain("Invalid report_missing_capability payload");
  expect(writes).toHaveLength(0);
});

test("rejects payload with empty required strings", async () => {
  const { handler, writes } = setup();

  const response = await handler({
    goal: "",
    why: "",
    ideal_capability: "",
  });

  expect(response.content[0]?.text).toContain("Invalid report_missing_capability payload");
  expect(writes).toHaveLength(0);
});

test("sink failure does not propagate to the agent", async () => {
  const { handler, errors } = setup({
    sink: {
      name: "broken",
      async write(): Promise<void> {
        throw new Error("sink broken");
      },
    },
  });

  const response = await handler(VALID_REPORT);

  expect(response.content[0]?.text).toContain("Thanks");
  expect(errors).toHaveLength(1);
  expect(errors[0]?.msg).toContain("sink");
});

test("attaches metadata when provided", async () => {
  const { handler, writes } = setup({
    metadata: { env: "test", region: "eu" },
  });

  await handler(VALID_REPORT);

  expect(writes).toHaveLength(1);
  expect(writes[0]?.metadata).toEqual({ env: "test", region: "eu" });
});

test("unregister function is returned", () => {
  const { unregister } = setup();

  expect(typeof unregister).toBe("function");
});
