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
      category: "Auth/Profile",
      status: "Implemented",
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
      outputSchema: { type: "object" },
      promptExample: "读取当前 Dynamics CRM 连接 Profile，告诉我当前连接的是 Online 还是 On-Premises，是否只读。",
      async handler(argumentsObject) {
        const args = currentProfileArgsSchema.parse(argumentsObject || {});
        return runtime.getCurrentProfileSummary(args.profileName);
      },
    },
    {
      name: "d365_list_profiles",
      category: "Auth/Profile",
      status: "Implemented",
      description: "List all configured Dynamics 365 connection profiles without secrets.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      outputSchema: { type: "object" },
      promptExample: "列出当前项目配置的所有 Dynamics CRM 环境 Profile。",
      async handler() {
        return runtime.listProfiles();
      },
    },
    {
      name: "d365_test_connection",
      category: "Auth/Profile",
      status: "Partial",
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
      outputSchema: { type: "object" },
      promptExample: "测试当前 Dynamics CRM 环境连接是否正常。",
      async handler(argumentsObject) {
        const args = currentProfileArgsSchema.parse(argumentsObject || {});
        return runtime.testConnection(args.profileName);
      },
    },
  ];
}
