import { githubIssueSink, registerReportMissingCapability } from "../src/index.js";

type Note = {
  title: string;
  body: string;
};

const notes: Note[] = [];

const server = {
  tool(
    _name: string,
    _schema: object,
    _handler: (args: unknown) => Promise<{ content: Array<{ type: string; text: string }> }>,
  ): void {
    // The real demo server implementation is added in the demo phase.
  },
};

server.tool("create_note", {}, async (args) => {
  const note = args as Note;
  notes.push(note);

  return {
    content: [{ type: "text", text: `Created note: ${note.title}` }],
  };
});

server.tool("search_notes", {}, async (args) => {
  const { query } = args as { query: string };
  const matches = notes.filter((note) => `${note.title}\n${note.body}`.includes(query));

  return {
    content: [{ type: "text", text: JSON.stringify(matches) }],
  };
});

registerReportMissingCapability(server, {
  serverName: "notes-mcp",
  sink: githubIssueSink({
    repo: process.env.GITHUB_REPOSITORY ?? "yourorg/tool-feedback-demo",
    token: process.env.GITHUB_TOKEN ?? "",
  }),
});
