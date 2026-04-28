import { beforeEach, expect, test, vi } from "vitest";
import type { EnrichedReport } from "../../src/schema.js";
import { githubIssueSink } from "../../src/sinks/github.js";

const report: EnrichedReport = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  received_at: "2026-04-28T12:00:00.000Z",
  server_name: "notes-mcp",
  goal: "Bulk-create meeting notes with project tags",
  why: "The server only supports creating one note at a time and has no tag field.",
  ideal_capability: "A bulk_create_notes tool that accepts an array of notes and tags.",
  workaround: "Created a few notes manually.",
  additional_context: "This came from weekly standup notes.",
};

beforeEach(() => {
  vi.unstubAllGlobals();
});

test("githubIssueSink posts the expected issue payload", async () => {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status: 201 }));
  vi.stubGlobal("fetch", fetchMock);

  const sink = githubIssueSink({
    repo: "duncanapm/mcp-tool-feedback",
    token: "ghp_test",
  });

  await sink.write(report);

  expect(fetchMock).toHaveBeenCalledOnce();

  const call = fetchMock.mock.calls[0];
  if (call === undefined) {
    throw new Error("expected fetch to be called");
  }

  const [url, init] = call;
  const requestInit = init as RequestInit;

  expect(url).toBe("https://api.github.com/repos/duncanapm/mcp-tool-feedback/issues");
  expect(requestInit.method).toBe("POST");
  expect(requestInit.headers).toMatchObject({
    Authorization: "Bearer ghp_test",
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "mcp-tool-feedback",
    "Content-Type": "application/json",
  });

  const body = JSON.parse(requestInit.body as string) as {
    title: string;
    body: string;
    labels: string[];
  };

  expect(body.title).toMatch(/^\[agent-report\]/);
  expect(body.title).toContain(report.goal);
  expect(body.body).toContain(report.goal);
  expect(body.body).toContain(report.why);
  expect(body.body).toContain(report.ideal_capability);
  expect(body.body).toContain(
    "*Filed by [mcp-tool-feedback](https://github.com/duncanapm/mcp-tool-feedback)*",
  );
  expect(body.labels).toEqual(["mcp-tool-feedback", "agent-report"]);
});

test("githubIssueSink reports GitHub API failures to the caller", async () => {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(JSON.stringify({ message: "Validation failed" }), { status: 422 }),
  );
  vi.stubGlobal("fetch", fetchMock);

  const sink = githubIssueSink({
    repo: "duncanapm/mcp-tool-feedback",
    token: "ghp_test",
  });

  await expect(sink.write(report)).rejects.toThrow(
    /\[mcp-tool-feedback\].*422.*Validation failed/,
  );
});

test("githubIssueSink reports network failures to the caller", async () => {
  const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error("connection refused"));
  vi.stubGlobal("fetch", fetchMock);

  const sink = githubIssueSink({
    repo: "duncanapm/mcp-tool-feedback",
    token: "ghp_test",
  });

  await expect(sink.write(report)).rejects.toThrow(
    /\[mcp-tool-feedback\].*Failed to reach GitHub API.*connection refused/,
  );
});
