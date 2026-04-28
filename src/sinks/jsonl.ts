import { access, appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { EnrichedReport } from "../schema.js";
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
export function jsonlFileSink(options: JsonlFileSinkOptions): Sink {
  if (typeof options.path !== "string" || options.path.trim().length === 0) {
    throw new Error("[mcp-tool-feedback] path must be a non-empty string");
  }

  const path = options.path;
  const createIfMissing = options.createIfMissing ?? true;
  let ensuredParentDirectory = false;

  return {
    name: "jsonl-file",
    async write(report: EnrichedReport): Promise<void> {
      try {
        if (createIfMissing) {
          if (!ensuredParentDirectory) {
            await mkdir(dirname(path), { recursive: true });
            ensuredParentDirectory = true;
          }
        } else {
          await ensureFileExists(path);
        }

        await appendFile(path, `${JSON.stringify(report)}\n`);
      } catch (error) {
        if (!createIfMissing && isFileNotFoundError(error)) {
          throw new Error(`[mcp-tool-feedback] file not found: ${path}`);
        }

        throw new Error(
          `[mcp-tool-feedback] Failed to write to ${path}: ${getErrorMessage(error)}`,
        );
      }
    },
  };
}

async function ensureFileExists(path: string): Promise<void> {
  await access(path);
}

function isFileNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ENOENT"
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
