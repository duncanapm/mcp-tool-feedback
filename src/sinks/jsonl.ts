import type { Sink } from "../types.js";

/**
 * Options for appending reports to a JSONL file.
 */
export interface JsonlFileSinkOptions {
  path: string;
  createIfMissing?: boolean;
}

/**
 * Create a sink that appends each report as one JSON line.
 */
export function jsonlFileSink(_options: JsonlFileSinkOptions): Sink {
  throw new Error("[mcp-tool-feedback] jsonlFileSink is not implemented yet");
}
