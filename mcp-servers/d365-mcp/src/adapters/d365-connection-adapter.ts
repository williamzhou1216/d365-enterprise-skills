import type { ResolvedD365Profile } from "../profiles/d365-profile.js";

export interface D365ConnectionAdapter {
  connect(): Promise<void>;
  testConnection(): Promise<unknown>;
  listEntities(): Promise<unknown[]>;
  getEntityMetadata(entityLogicalName: string): Promise<unknown>;
  getAttributeMetadata(entityLogicalName: string, attributeLogicalName: string): Promise<unknown>;
  getOptionSet(entityLogicalName: string, attributeLogicalName: string): Promise<unknown>;
  listRelationships(entityLogicalName: string): Promise<unknown[]>;
}

export interface D365NotImplementedDetails {
  status: "not_implemented";
  adapter: string;
  action: string;
  profileName: string;
  deploymentType: ResolvedD365Profile["deploymentType"];
  authType: ResolvedD365Profile["authType"];
  apiType: ResolvedD365Profile["apiType"];
  message: string;
  nextSteps: string[];
}

export class D365AdapterNotImplementedError extends Error {
  constructor(public readonly details: D365NotImplementedDetails) {
    super(details.message);
    this.name = "D365AdapterNotImplementedError";
  }
}

export function buildOnPremNotImplementedDetails(
  profile: ResolvedD365Profile,
  adapter: string,
  action: string,
): D365NotImplementedDetails {
  return {
    status: "not_implemented",
    adapter,
    action,
    profileName: profile.profileName,
    deploymentType: profile.deploymentType,
    authType: profile.authType,
    apiType: profile.apiType,
    message:
      "This profile type is reserved in the Node.js MCP layer. Complete Dynamics CRM On-Premises connectivity should be provided through a .NET Organization Service connector.",
    nextSteps: [
      "Implement connectors/d365-connector-dotnet as the Organization Service execution layer.",
      "Keep Node.js d365-mcp as the MCP protocol, profile routing, and tool orchestration layer.",
      "Use the current profile definition as the input contract between Node.js and the future .NET CLI.",
    ],
  };
}

export function throwOnPremNotImplemented(
  profile: ResolvedD365Profile,
  adapter: string,
  action: string,
): never {
  throw new D365AdapterNotImplementedError(buildOnPremNotImplementedDetails(profile, adapter, action));
}
