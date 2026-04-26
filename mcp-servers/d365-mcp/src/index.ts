import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { getAuthTools } from "./tools/auth-tools.js";
import { getMetadataTools } from "./tools/metadata-tools.js";
import { getSolutionTools } from "./tools/solution-tools.js";
import { createRuntime, jsonToolResult, mapToolError } from "./tools/tool-types.js";

async function runCliCommand(command: "profile" | "test-connection"): Promise<void> {
  const runtime = await createRuntime();

  const payload =
    command === "profile"
      ? await runtime.getCurrentProfileSummary()
      : await runtime.testConnection();

  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

async function startMcpServer(): Promise<void> {
  const runtime = await createRuntime();
  const toolDefinitions = [...getAuthTools(runtime), ...getMetadataTools(runtime), ...getSolutionTools()];
  const toolsByName = new Map(toolDefinitions.map((tool) => [tool.name, tool]));

  const server = new Server(
    {
      name: "d365-mcp",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: toolDefinitions.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const tool = toolsByName.get(toolName);

    if (!tool) {
      return jsonToolResult({
        status: "error",
        message: `Unknown tool '${toolName}'.`,
      });
    }

    try {
      const payload = await tool.handler((request.params.arguments as Record<string, unknown>) || {});
      return jsonToolResult(payload);
    } catch (error) {
      return jsonToolResult(mapToolError(error));
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));

  if (args.has("--profile")) {
    await runCliCommand("profile");
    return;
  }

  if (args.has("--test-connection")) {
    await runCliCommand("test-connection");
    return;
  }

  await startMcpServer();
}

main().catch((error) => {
  const payload = mapToolError(error);
  process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exitCode = 1;
});
