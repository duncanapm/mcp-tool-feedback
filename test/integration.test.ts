import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "vitest";
import { registerReportMissingCapability } from "../src/register.js";
import { jsonlFileSink } from "../src/sinks/jsonl.js";

type ToolResponse = { content: Array<{ type: string; text: string }> };
type ToolHandler = (args: unknown) => Promise<ToolResponse>;
type StoredReport = {
  goal: string;
  why: string;
  ideal_capability: string;
  workaround?: string;
  additional_context?: string;
  id: string;
  received_at: string;
  server_name: string;
};

const pathsToCleanup = new Set<string>();

afterEach(async () => {
  await Promise.all(
    Array.from(pathsToCleanup).map(async (path) => {
      await rm(path, { recursive: true, force: true });
    }),
  );
  pathsToCleanup.clear();
});

test("end-to-end: register, handle valid report, sink receives sanitised enriched report", async () => {
  const { filePath, handler } = await setup();
  const secret = "someone@example.com";
  const input = {
    goal: "Bulk-create meeting notes",
    why: "Existing tools are single-note only",
    ideal_capability: "Add bulk_create_notes",
    workaround: "Created several notes manually",
    additional_context: `User contact was ${secret}`,
  };

  await handler(input);

  const content = await readFile(filePath, "utf8");
  const lines = content.split("\n").filter((line) => line.length > 0);
  expect(lines).toHaveLength(1);
  const stored = JSON.parse(lines[0] as string) as StoredReport;

  expect(stored.goal).toBe(input.goal);
  expect(stored.why).toBe(input.why);
  expect(stored.ideal_capability).toBe(input.ideal_capability);
  expect(stored.workaround).toBe(input.workaround);
  expect(typeof stored.id).toBe("string");
  expect(stored.id.length).toBeGreaterThan(0);
  expect(Number.isNaN(new Date(stored.received_at).getTime())).toBe(false);
  expect(stored.server_name).toBe("integration-test");
  expect(stored.additional_context ?? "").toContain("[redacted]");
  expect(stored.additional_context ?? "").not.toContain(secret);
});

test("end-to-end: invalid report does not write to sink", async () => {
  const { filePath, handler } = await setup();

  const response = await handler({
    goal: "bulk create",
    ideal_capability: "bulk_create_notes",
  });

  const fileReadAttempt = readFile(filePath, "utf8");
  await expect(fileReadAttempt).rejects.toMatchObject({ code: "ENOENT" });
  expect(response.content[0]?.text).toContain("Invalid report_missing_capability payload");
});

async function setup(): Promise<{ filePath: string; handler: ToolHandler }> {
  const rootDir = await mkdtemp(join(tmpdir(), "mcp-tool-feedback-integration-"));
  pathsToCleanup.add(rootDir);
  const filePath = join(rootDir, "reports.jsonl");
  const sink = jsonlFileSink({ path: filePath });

  let handler: ToolHandler | undefined;
  const fakeServer = {
    tool(_name: string, _schema: object, registeredHandler: ToolHandler): void {
      handler = registeredHandler;
    },
  };

  registerReportMissingCapability(fakeServer, {
    sink,
    serverName: "integration-test",
  });

  if (handler === undefined) {
    throw new Error("handler was not registered");
  }

  return { filePath, handler };
}
