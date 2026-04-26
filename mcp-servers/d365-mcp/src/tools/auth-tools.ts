import { z } from "zod";

import type { D365ToolDefinition, D365ToolRuntime } from "./tool-types.js";

const currentProfileArgsSchema = z
  .object({
    profileName: z.string().min(1).optional(),
  })
  .default({});

export function getAuthTools(runtime: D365ToolRuntime): D365ToolDefinition[] {
  return [
    {
      name: "d365_get_current_profile",
      description: "Return the current Dynamics 365 connection profile without secrets.",
      inputSchema: {
        type: "object",
        properties: {
          profileName: {
            type: "string",
            description: "Optional profile override. Defaults to D365_PROFILE or defaultProfile.",
          },
        },
        additionalProperties: false,
      },
      async handler(argumentsObject) {
        const args = currentProfileArgsSchema.parse(argumentsObject || {});
        return runtime.getCurrentProfileSummary(args.profileName);
      },
    },
    {
      name: "d365_list_profiles",
      description: "List all configured Dynamics 365 connection profiles without secrets.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      async handler() {
        return runtime.listProfiles();
      },
    },
    {
      name: "d365_test_connection",
      description: "Test the current Dynamics 365 connection profile and return JSON output.",
      inputSchema: {
        type: "object",
        properties: {
          profileName: {
            type: "string",
            description: "Optional profile override. Defaults to D365_PROFILE or defaultProfile.",
          },
        },
        additionalProperties: false,
      },
      async handler(argumentsObject) {
        const args = currentProfileArgsSchema.parse(argumentsObject || {});
        return runtime.testConnection(args.profileName);
      },
    },
  ];
}
