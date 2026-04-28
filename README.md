# mcp-tool-feedback

We have mature ways to observe MCP servers when agents call tools: logs, traces, OpenTelemetry spans, and error monitoring. That stack tells you what happened. It does not tell you what the agent was trying to do when no existing tool matched the task.

`mcp-tool-feedback` adds that missing channel. It registers one structured tool, `report_missing_capability`, that an agent can call when it hits a capability gap. The report is routed to a configurable sink: GitHub Issues, a local JSONL file, or your own sink implementation.

## Install

```bash
npm install mcp-tool-feedback
```

## Quick Start

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { githubIssueSink, registerReportMissingCapability } from "mcp-tool-feedback";

const server = new McpServer({ name: "notes-mcp", version: "1.0.0" });

// Register your normal MCP tools first...

registerReportMissingCapability(server, {
  serverName: "notes-mcp",
  sink: githubIssueSink({
    repo: "duncanapm/mcp-tool-feedback-demo",
    token: process.env.GITHUB_TOKEN!,
  }),
});
```

The registration surface is framework-agnostic: official MCP SDK, FastMCP-TS, or any server exposing a compatible `.tool(name, schema, handler)` method.

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

Every string field is run through a best-effort sanitiser that redacts common API key prefixes, bearer tokens, AWS access keys, emails, and tokens in URL query parameters before reaching the sink.

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

Sinks should be best-effort and never throw out of `write()` — the library catches sink failures, logs them, and still returns a successful acknowledgement to the agent. The agent must never see sink failures.

## Demo

The demo wires a minimal `notes-mcp` server with `create_note`, `search_notes`, and `report_missing_capability`. When an agent is asked for a capability the server cannot fulfill (for example, bulk note creation with tags), the library captures the report, sanitises it, enriches it, and routes it through the configured sink so a GitHub issue appears in the demo repo.

<!-- TODO: embed screencast GIF here once recorded -->

Setup and run instructions live in `demo/README.md`.

## Roadmap

`mcp-tool-feedback` starts a small family of agent-experience instrumentation tools. They share the same `report_*` shape and the same sink interface.

- `report_missing_capability` (v0, shipped) — tool does not exist.
- `report_tool_limitation` — tool exists but the result is functionally wrong.
- `report_tool_optimisation` — tool works but the path is wasteful (verbose output, too many calls). This is the most agent-native signal: it captures cost and friction patterns only the agent can observe.
- `report_difficulty` — tool errored, broke, or was circumvented. It includes a `fallback_taken` field to capture real-time vendor-switching at the moment of failure.

Additional planned work includes more sinks (Slack, generic HTTP), aggregation workflows, a Cursor automation companion, and a Python port.

## License

MIT.
