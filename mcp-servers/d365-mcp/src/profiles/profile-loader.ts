import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

import {
  type D365ConnectionsFile,
  d365ConnectionsSchema,
  type D365ProfileDefinition,
  type ResolvedD365Profile,
  type SanitizedD365Profile,
} from "./d365-profile.js";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(moduleDir, "../..");

let envLoaded = false;

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function resolveWorkspaceRoot(startDir = process.cwd()): Promise<string> {
  let currentDir = path.resolve(startDir);

  while (true) {
    if (await pathExists(path.join(currentDir, ".git"))) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return path.resolve(packageRoot, "../..");
    }

    currentDir = parentDir;
  }
}

export async function loadEnvironment(): Promise<string> {
  if (envLoaded) {
    return resolveWorkspaceRoot();
  }

  const workspaceRoot = await resolveWorkspaceRoot();
  const envPath = path.join(workspaceRoot, ".env");
  const envLocalPath = path.join(workspaceRoot, ".env.local");

  dotenv.config({ path: envPath, override: false });
  dotenv.config({ path: envLocalPath, override: true });

  envLoaded = true;
  return workspaceRoot;
}

function resolveConnectionsFilePath(workspaceRoot: string): string {
  const configuredPath = process.env.D365_CONNECTIONS_FILE || "./config/d365-connections.json";
  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(workspaceRoot, configuredPath);
}

function normalizeWebApiUrl(url: string): string {
  const trimmed = url.trim().replace(/\/$/, "");
  if (/\/api\/data\/v\d+(\.\d+)?$/i.test(trimmed)) {
    return trimmed;
  }

  return `${trimmed}/api/data/v9.2`;
}

function getRequiredEnvVar(envVarName: string, profileName: string): string {
  const value = process.env[envVarName]?.trim();
  if (!value) {
    throw new Error(`Environment variable '${envVarName}' is required for profile '${profileName}'.`);
  }

  return value;
}

function getOptionalEnvVar(envVarName?: string): string | undefined {
  if (!envVarName) {
    return undefined;
  }

  const value = process.env[envVarName]?.trim();
  return value || undefined;
}

function sanitizeProfile(profileName: string, profile: D365ProfileDefinition): SanitizedD365Profile {
  return {
    profileName,
    displayName: profile.displayName,
    deploymentType: profile.deploymentType,
    authType: profile.authType,
    apiType: profile.apiType,
    readonly: profile.readonly,
    urlEnv: profile.urlEnv,
    webApiUrlEnv: profile.webApiUrlEnv,
    organizationServiceUrlEnv: profile.organizationServiceUrlEnv,
    tenantIdEnv: profile.tenantIdEnv,
    clientIdEnv: profile.clientIdEnv,
    clientSecretEnv: profile.clientSecretEnv,
    usernameEnv: profile.usernameEnv,
    passwordEnv: profile.passwordEnv,
    domainEnv: profile.domainEnv,
    adfsUrlEnv: profile.adfsUrlEnv,
    adfsAuthorityEnv: profile.adfsAuthorityEnv,
    redirectUriEnv: profile.redirectUriEnv,
    notes: profile.notes,
  };
}

function resolveSelectedProfileDefinition(
  config: D365ConnectionsFile,
  requestedProfileName?: string,
): { profileName: string; profile: D365ProfileDefinition } {
  const currentProfileName = requestedProfileName || process.env.D365_PROFILE || config.defaultProfile;

  if (!currentProfileName) {
    throw new Error("No D365 profile selected. Set D365_PROFILE or defaultProfile in config/d365-connections.json.");
  }

  const selectedProfile = config.profiles[currentProfileName];
  if (!selectedProfile) {
    const availableProfiles = Object.keys(config.profiles).join(", ");
    throw new Error(`Profile '${currentProfileName}' was not found. Available profiles: ${availableProfiles}`);
  }

  return {
    profileName: currentProfileName,
    profile: selectedProfile,
  };
}

function resolveProfile(profileName: string, profile: D365ProfileDefinition): ResolvedD365Profile {
  const resolvedProfile: ResolvedD365Profile = {
    profileName,
    ...profile,
    url: getOptionalEnvVar(profile.urlEnv),
    webApiUrl: getOptionalEnvVar(profile.webApiUrlEnv),
    organizationServiceUrl: getOptionalEnvVar(profile.organizationServiceUrlEnv),
    tenantId: getOptionalEnvVar(profile.tenantIdEnv),
    clientId: getOptionalEnvVar(profile.clientIdEnv),
    clientSecret: getOptionalEnvVar(profile.clientSecretEnv),
    username: getOptionalEnvVar(profile.usernameEnv),
    password: getOptionalEnvVar(profile.passwordEnv),
    domain: getOptionalEnvVar(profile.domainEnv),
    adfsUrl: getOptionalEnvVar(profile.adfsUrlEnv),
    adfsAuthority: getOptionalEnvVar(profile.adfsAuthorityEnv),
    redirectUri: getOptionalEnvVar(profile.redirectUriEnv),
  };

  if (profile.authType === "oauth-client-credentials") {
    resolvedProfile.url = getRequiredEnvVar(profile.urlEnv as string, profileName);
    resolvedProfile.tenantId = getRequiredEnvVar(profile.tenantIdEnv as string, profileName);
    resolvedProfile.clientId = getRequiredEnvVar(profile.clientIdEnv as string, profileName);
    resolvedProfile.clientSecret = getRequiredEnvVar(profile.clientSecretEnv as string, profileName);
    resolvedProfile.webApiUrl = normalizeWebApiUrl(resolvedProfile.webApiUrl || resolvedProfile.url);
  }

  if (profile.authType === "windows-integrated") {
    resolvedProfile.organizationServiceUrl = getRequiredEnvVar(
      profile.organizationServiceUrlEnv as string,
      profileName,
    );
    resolvedProfile.username = getRequiredEnvVar(profile.usernameEnv as string, profileName);
    resolvedProfile.password = getRequiredEnvVar(profile.passwordEnv as string, profileName);
  }

  if (profile.authType === "adfs-claims") {
    resolvedProfile.organizationServiceUrl = getRequiredEnvVar(
      profile.organizationServiceUrlEnv as string,
      profileName,
    );
    resolvedProfile.adfsUrl = getRequiredEnvVar(profile.adfsUrlEnv as string, profileName);
    resolvedProfile.username = getRequiredEnvVar(profile.usernameEnv as string, profileName);
    resolvedProfile.password = getRequiredEnvVar(profile.passwordEnv as string, profileName);
  }

  if (profile.authType === "adfs-oauth") {
    resolvedProfile.webApiUrl = normalizeWebApiUrl(
      getRequiredEnvVar(profile.webApiUrlEnv as string, profileName),
    );
    resolvedProfile.adfsAuthority = getRequiredEnvVar(profile.adfsAuthorityEnv as string, profileName);
    resolvedProfile.clientId = getOptionalEnvVar(profile.clientIdEnv);
    resolvedProfile.redirectUri = getOptionalEnvVar(profile.redirectUriEnv);
    resolvedProfile.username = getOptionalEnvVar(profile.usernameEnv);
    resolvedProfile.password = getOptionalEnvVar(profile.passwordEnv);
  }

  return resolvedProfile;
}

export async function loadConnectionsConfig(): Promise<{
  workspaceRoot: string;
  connectionsFilePath: string;
  config: D365ConnectionsFile;
}> {
  const workspaceRoot = await loadEnvironment();
  const connectionsFilePath = resolveConnectionsFilePath(workspaceRoot);

  if (!(await pathExists(connectionsFilePath))) {
    throw new Error(
      `Connections file not found at '${connectionsFilePath}'. Copy 'config/d365-connections.example.json' to 'config/d365-connections.json' first.`,
    );
  }

  const rawContent = await readFile(connectionsFilePath, "utf8");
  const parsedContent = JSON.parse(rawContent) as unknown;
  const config = d365ConnectionsSchema.parse(parsedContent);

  return {
    workspaceRoot,
    connectionsFilePath,
    config,
  };
}

export async function listProfiles(): Promise<SanitizedD365Profile[]> {
  const { config } = await loadConnectionsConfig();
  return Object.entries(config.profiles).map(([profileName, profile]) => sanitizeProfile(profileName, profile));
}

export async function loadProfile(profileName?: string): Promise<ResolvedD365Profile> {
  const { config } = await loadConnectionsConfig();
  const { profileName: selectedProfileName, profile: selectedProfile } = resolveSelectedProfileDefinition(
    config,
    profileName,
  );
  return resolveProfile(selectedProfileName, selectedProfile);
}

export async function getCurrentProfileSummary(profileName?: string): Promise<SanitizedD365Profile> {
  const { config } = await loadConnectionsConfig();
  const { profileName: selectedProfileName, profile: selectedProfile } = resolveSelectedProfileDefinition(
    config,
    profileName,
  );
  return sanitizeProfile(selectedProfileName, selectedProfile);
}
