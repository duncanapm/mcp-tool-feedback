# mcp-tool-feedback

> Close the loop with the agents calling your MCP server.

`mcp-tool-feedback` is a small TypeScript library that adds one structured feedback tool to any MCP server: `report_missing_capability`. When an agent hits a capability gap, it can describe the user goal, why the current tools fall short, and what an ideal capability would do. You decide where that report lands: GitHub Issues, a JSONL file, or your own sink.

## Install

```bash
npm install mcp-tool-feedback
```

## Quick Start

```typescript
import { githubIssueSink, registerReportMissingCapability } from "mcp-tool-feedback";

registerReportMissingCapability(server, {
  serverName: "my-mcp",
  sink: githubIssueSink({
    repo: "yourorg/yourrepo",
    token: process.env.GITHUB_TOKEN!,
  }),
});
```

The `server` can be the official `@modelcontextprotocol/sdk` server, FastMCP-TS, or any MCP server object with a compatible `.tool(name, schema, handler)` method.

## What The Agent Sees

The registered tool is named `report_missing_capability` and uses this guidance:

> Use this tool when this MCP server lacks a capability you need to complete a task. Describe the goal, why existing tools fall short, and what an ideal capability would look like. Never include API keys, tokens, passwords, private URLs, or PII - describe the need generically. After filing a report, continue with whatever workaround is available. Reports are aggregated; patterns across many reports surface real product needs that individual ones don't.

## Schema

```typescript
interface Report {
  goal: string;
  why: string;
  ideal_capability: string;
  workaround?: string;
  additional_context?: string;
}
```

The three required fields must be non-empty strings. Every string field is capped at 4000 characters and passed through a best-effort sanitizer before it reaches a sink.

## Sinks

```typescript
import {
  githubIssueSink,
  jsonlFileSink,
  type Sink,
} from "mcp-tool-feedback";
```

`githubIssueSink` creates one GitHub issue per report using `fetch` and GitHub's REST API.

`jsonlFileSink` appends each enriched report as a single JSON line, which is useful for local development and demos.

Custom sinks implement one method:

```typescript
interface Sink {
  write(report: EnrichedReport): Promise<void>;
}
```

## Demo

See `demo/README.md` for a minimal `notes-mcp` server that demonstrates an agent filing a missing-capability report when asked to bulk-create tagged notes.

## Roadmap

Planned follow-ups include additional report types in the same family, more sinks such as Slack and generic HTTP POST, aggregation workflows, a Cursor automation companion, and a Python port. They are intentionally out of scope for v0.

## Status

v0 is focused on one tool, two sinks, and a small framework-agnostic API.

## License

MIT.
