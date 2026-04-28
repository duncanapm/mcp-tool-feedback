# mcp-tool-feedback demo

This demo runs a toy MCP server called `notes-mcp` with two real tools:

- `create_note(title: string, body: string)` stores one note in memory.
- `search_notes(query: string)` returns matching notes.

It also registers `report_missing_capability` via `mcp-tool-feedback`, with reports sent to GitHub Issues.

## Run Locally

1. Install dependencies and build the package.

   ```bash
   npm install
   npm run build
   ```

2. Set a GitHub token with permission to create issues.

   ```bash
   export GITHUB_TOKEN=...
   ```

3. Edit `demo/.cursor/mcp.json` so the command points at your local checkout.

4. Restart Cursor and ask:

   > Bulk-create 50 meeting notes, each tagged with the project name.

5. The agent should call `report_missing_capability`, then a GitHub issue should appear with the structured report.

If GitHub is unavailable, switch the demo server to `jsonlFileSink` and inspect `demo/reports.jsonl`.
