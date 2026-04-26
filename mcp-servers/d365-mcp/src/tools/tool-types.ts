import type { D365AdapterNotImplementedError } from "../adapters/d365-connection-adapter.js";
import { createConnectionAdapter } from "../adapters/adapter-factory.js";
import {
  getCurrentProfileSummary,
  listProfiles,
  loadConnectionsConfig,
  loadProfile,
} from "../profiles/profile-loader.js";

export interface D365ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (argumentsObject: Record<string, unknown>) => Promise<unknown>;
}

export interface D365ToolRuntime {
  getCurrentProfileSummary(profileName?: string): Promise<unknown>;
  listProfiles(): Promise<unknown>;
  testConnection(profileName?: string): Promise<unknown>;
  listEntities(profileName?: string): Promise<unknown>;
  getEntityMetadata(entityLogicalName: string, profileName?: string): Promise<unknown>;
  getAttributeMetadata(entityLogicalName: string, attributeLogicalName: string, profileName?: string): Promise<unknown>;
  getOptionSet(entityLogicalName: string, attributeLogicalName: string, profileName?: string): Promise<unknown>;
  listRelationships(entityLogicalName: string, profileName?: string): Promise<unknown>;
}

export function jsonToolResult(payload: unknown): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

export async function createRuntime(): Promise<D365ToolRuntime> {
  await loadConnectionsConfig();

  return {
    async getCurrentProfileSummary(profileName?: string) {
      return getCurrentProfileSummary(profileName);
    },
    async listProfiles() {
      return listProfiles();
    },
    async testConnection(profileName?: string) {
      const profile = await loadProfile(profileName);
      const adapter = createConnectionAdapter(profile);
      await adapter.connect();
      return adapter.testConnection();
    },
    async listEntities(profileName?: string) {
      const profile = await loadProfile(profileName);
      return createConnectionAdapter(profile).listEntities();
    },
    async getEntityMetadata(entityLogicalName: string, profileName?: string) {
      const profile = await loadProfile(profileName);
      return createConnectionAdapter(profile).getEntityMetadata(entityLogicalName);
    },
    async getAttributeMetadata(entityLogicalName: string, attributeLogicalName: string, profileName?: string) {
      const profile = await loadProfile(profileName);
      return createConnectionAdapter(profile).getAttributeMetadata(entityLogicalName, attributeLogicalName);
    },
    async getOptionSet(entityLogicalName: string, attributeLogicalName: string, profileName?: string) {
      const profile = await loadProfile(profileName);
      return createConnectionAdapter(profile).getOptionSet(entityLogicalName, attributeLogicalName);
    },
    async listRelationships(entityLogicalName: string, profileName?: string) {
      const profile = await loadProfile(profileName);
      return createConnectionAdapter(profile).listRelationships(entityLogicalName);
    },
  };
}

export function mapToolError(error: unknown): unknown {
  if (typeof error === "object" && error && (error as Error).name === "D365AdapterNotImplementedError") {
    return (error as D365AdapterNotImplementedError).details;
  }

  return {
    status: "error",
    message: error instanceof Error ? error.message : String(error),
  };
}
