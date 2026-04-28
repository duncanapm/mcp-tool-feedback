import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "vitest";
import type { EnrichedReport } from "../../src/schema.js";
import { jsonlFileSink } from "../../src/sinks/jsonl.js";

const pathsToCleanup = new Set<string>();

afterEach(async () => {
  await Promise.all(
    Array.from(pathsToCleanup).map(async (path) => {
      await rm(path, { recursive: true, force: true });
    }),
  );
  pathsToCleanup.clear();
});

test("jsonlFileSink writes a report as a single JSON line", async () => {
  const { filePath } = await makeTempPath("single");
  const sink = jsonlFileSink({ path: filePath });
  const report = buildReport("report-1");

  await sink.write(report);

  const content = await readFile(filePath, "utf8");
  const lines = content.split("\n").filter((line) => line.length > 0);

  expect(lines).toHaveLength(1);
  expect(JSON.parse(lines[0] as string)).toEqual(report);
});

test("jsonlFileSink appends multiple reports as separate lines", async () => {
  const { filePath } = await makeTempPath("multi");
  const sink = jsonlFileSink({ path: filePath });
  const reports = [buildReport("r1"), buildReport("r2"), buildReport("r3")];

  for (const report of reports) {
    await sink.write(report);
  }

  const content = await readFile(filePath, "utf8");
  const lines = content.split("\n").filter((line) => line.length > 0);

  expect(lines).toHaveLength(3);
  expect(lines.map((line) => JSON.parse(line) as EnrichedReport)).toEqual(reports);
});

test("jsonlFileSink creates parent directories when createIfMissing is true", async () => {
  const baseDir = await mkdtemp(join(tmpdir(), "mcp-tool-feedback-jsonl-nested-"));
  pathsToCleanup.add(baseDir);
  const filePath = join(baseDir, "nested/dir/that/does/not/exist/reports.jsonl");
  const sink = jsonlFileSink({ path: filePath, createIfMissing: true });
  const report = buildReport("nested");

  await sink.write(report);

  const fileInfo = await stat(filePath);
  const content = await readFile(filePath, "utf8");
  const firstLine = content.split("\n").find((line) => line.length > 0);

  expect(fileInfo.isFile()).toBe(true);
  expect(firstLine).toBeDefined();
  expect(JSON.parse(firstLine as string)).toEqual(report);
});

test("jsonlFileSink throws when createIfMissing is false and file is absent", async () => {
  const { filePath } = await makeTempPath("missing");
  const sink = jsonlFileSink({ path: filePath, createIfMissing: false });

  await expect(sink.write(buildReport("missing"))).rejects.toThrow(
    /\[mcp-tool-feedback\].*file not found/,
  );
});

test("jsonlFileSink rejects empty paths", () => {
  expect(() => jsonlFileSink({ path: "" })).toThrow(
    /\[mcp-tool-feedback\].*non-empty string/,
  );
});

async function makeTempPath(tag: string): Promise<{ rootDir: string; filePath: string }> {
  const rootDir = await mkdtemp(join(tmpdir(), `mcp-tool-feedback-jsonl-${tag}-`));
  pathsToCleanup.add(rootDir);
  const filePath = join(rootDir, "reports.jsonl");
  return { rootDir, filePath };
}

function buildReport(id: string): EnrichedReport {
  return {
    id,
    received_at: "2026-04-28T12:00:00.000Z",
    server_name: "notes-mcp",
    goal: `goal-${id}`,
    why: `why-${id}`,
    ideal_capability: `ideal-${id}`,
    workaround: `workaround-${id}`,
    additional_context: `context-${id}`,
  };
}
