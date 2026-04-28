import type { EnrichedReport } from "../schema.js";
import type { Sink } from "../types.js";

const DEFAULT_LABELS = ["mcp-tool-feedback", "agent-report"] as const;
const FOOTER = "*Filed by [mcp-tool-feedback](https://github.com/duncanapm/mcp-tool-feedback)*";
const GITHUB_API_VERSION = "2022-11-28";
const MAX_TITLE_GOAL_LENGTH = 80;

/**
 * Options for creating one GitHub issue per missing-capability report.
 */
export interface GithubIssueSinkOptions {
  repo: string;
  token: string;
  labels?: string[];
  titleFormat?: (report: EnrichedReport) => string;
  bodyFormat?: (report: EnrichedReport) => string;
}

/**
 * Create a sink that writes reports to GitHub Issues.
 */
export function githubIssueSink(options: GithubIssueSinkOptions): Sink {
  const { owner, repoName } = parseRepo(options.repo);
  const token = validateToken(options.token);
  const labels = options.labels ?? [...DEFAULT_LABELS];
  const titleFormat = options.titleFormat ?? defaultTitleFormat;
  const bodyFormat = options.bodyFormat ?? defaultBodyFormat;

  return {
    name: "github-issue",
    async write(report: EnrichedReport): Promise<void> {
      const response = await postIssue({
        owner,
        repoName,
        token,
        title: titleFormat(report),
        body: bodyFormat(report),
        labels,
      });

      if (!response.ok) {
        throw new Error(
          `[mcp-tool-feedback] GitHub API error ${response.status}: ${await readGitHubErrorMessage(
            response,
          )}`,
        );
      }
    },
  };
}

function parseRepo(repo: string): { owner: string; repoName: string } {
  if (!/^[^/\s]+\/[^/\s]+$/.test(repo)) {
    throw new Error("[mcp-tool-feedback] GitHub repo must use owner/repo format");
  }

  const [owner, repoName] = repo.split("/") as [string, string];
  return { owner, repoName };
}

function validateToken(token: string): string {
  const trimmed = token.trim();

  if (trimmed.length === 0) {
    throw new Error("[mcp-tool-feedback] GitHub token must be present and non-empty");
  }

  return trimmed;
}

function defaultTitleFormat(report: EnrichedReport): string {
  return `[agent-report] ${truncateGoal(report.goal)}`;
}

function truncateGoal(goal: string): string {
  if (goal.length <= MAX_TITLE_GOAL_LENGTH) {
    return goal;
  }

  return `${goal.slice(0, MAX_TITLE_GOAL_LENGTH)}…`;
}

function defaultBodyFormat(report: EnrichedReport): string {
  const rows: Array<[string, string]> = [
    ["Goal", report.goal],
    ["Why", report.why],
    ["Ideal capability", report.ideal_capability],
    ["Workaround", report.workaround ?? "—"],
    ["Additional context", report.additional_context ?? "—"],
    ["Server", report.server_name],
    ["Received", report.received_at],
    ["Report ID", report.id],
  ];

  return [
    "| Field | Value |",
    "|---|---|",
    ...rows.map(([field, value]) => `| ${field} | ${formatTableValue(value)} |`),
    "",
    "---",
    FOOTER,
  ].join("\n");
}

function formatTableValue(value: string): string {
  return value.replaceAll("|", "\\|").replace(/\r?\n/g, "<br>");
}

async function postIssue(params: {
  owner: string;
  repoName: string;
  token: string;
  title: string;
  body: string;
  labels: string[];
}): Promise<Response> {
  try {
    return await fetch(
      `https://api.github.com/repos/${encodeURIComponent(params.owner)}/${encodeURIComponent(
        params.repoName,
      )}/issues`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${params.token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": GITHUB_API_VERSION,
          "User-Agent": "mcp-tool-feedback",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: params.title,
          body: params.body,
          labels: params.labels,
        }),
      },
    );
  } catch (error) {
    throw new Error(
      `[mcp-tool-feedback] Failed to reach GitHub API: ${getErrorMessage(error)}`,
    );
  }
}

async function readGitHubErrorMessage(response: Response): Promise<string> {
  const text = await response.text();

  try {
    const parsed = JSON.parse(text) as { message?: unknown };

    if (typeof parsed.message === "string" && parsed.message.length > 0) {
      return parsed.message;
    }
  } catch {
    // Not JSON; fall through to the raw response text.
  }

  return text;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
