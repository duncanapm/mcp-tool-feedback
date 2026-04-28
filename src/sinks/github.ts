import type { EnrichedReport } from "../schema.js";
import type { Sink } from "../types.js";

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
export function githubIssueSink(_options: GithubIssueSinkOptions): Sink {
  throw new Error("[tool-feedback] githubIssueSink is not implemented yet");
}
