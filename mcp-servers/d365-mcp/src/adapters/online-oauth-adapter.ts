import { fetch } from "undici";

import { D365ToolError } from "../errors.js";
import type { ResolvedD365Profile } from "../profiles/d365-profile.js";
import type { D365ConnectionAdapter } from "./d365-connection-adapter.js";

interface OAuthTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export class OnlineOAuthAdapter implements D365ConnectionAdapter {
  private accessToken?: string;
  private accessTokenExpiresAt = 0;

  constructor(private readonly profile: ResolvedD365Profile) {}

  async connect(): Promise<void> {
    await this.getAccessToken();
  }

  async testConnection(): Promise<unknown> {
    const whoAmI = await this.requestJson<Record<string, unknown>>("WhoAmI()");
    const organizationName = this.profile.url ? new URL(this.profile.url).hostname.split(".")[0] : undefined;
    let version = "unknown";

    try {
      const versionResponse = await this.requestJson<{ Version?: string }>("RetrieveVersion()");
      if (typeof versionResponse.Version === "string" && versionResponse.Version.trim()) {
        version = versionResponse.Version;
      }
    } catch {
      version = "unknown";
    }

    return {
      success: true,
      profileName: this.profile.profileName,
      organizationName,
      version,
      user: "application-user",
      deploymentType: this.profile.deploymentType,
      authType: this.profile.authType,
      apiType: this.profile.apiType,
      webApiUrl: this.profile.webApiUrl,
      organizationId: whoAmI.OrganizationId,
      businessUnitId: whoAmI.BusinessUnitId,
      userId: whoAmI.UserId,
    };
  }

  async listEntities(): Promise<unknown[]> {
    const response = await this.requestJson<{ value: unknown[] }>(
      "EntityDefinitions?$select=LogicalName,SchemaName,EntitySetName,PrimaryIdAttribute,PrimaryNameAttribute,ObjectTypeCode,IsCustomEntity,OwnershipType,DisplayName,Description,IsActivity&$filter=IsIntersect eq false",
    );

    return response.value;
  }

  async getEntityMetadata(entityLogicalName: string): Promise<unknown> {
    const encodedEntityLogicalName = encodeURIComponent(entityLogicalName);
    const [entity, attributes, oneToMany, manyToOne, manyToMany] = await Promise.all([
      this.requestJson<Record<string, unknown>>(
        `EntityDefinitions(LogicalName='${encodedEntityLogicalName}')?$select=LogicalName,SchemaName,EntitySetName,DisplayName,Description,ObjectTypeCode,PrimaryIdAttribute,PrimaryNameAttribute,IsActivity,IsCustomEntity,OwnershipType`,
      ),
      this.requestJson<{ value: unknown[] }>(
        `EntityDefinitions(LogicalName='${encodedEntityLogicalName}')/Attributes?$select=LogicalName,SchemaName,AttributeType,AttributeTypeName,Format,MaxLength,RequiredLevel,DisplayName,Description,IsCustomAttribute,IsValidForRead,IsValidForCreate,IsValidForUpdate`,
      ),
      this.requestJson<{ value: unknown[] }>(
        `EntityDefinitions(LogicalName='${encodedEntityLogicalName}')/OneToManyRelationships?$select=SchemaName,ReferencedEntity,ReferencingEntity,ReferencingAttribute`,
      ),
      this.requestJson<{ value: unknown[] }>(
        `EntityDefinitions(LogicalName='${encodedEntityLogicalName}')/ManyToOneRelationships?$select=SchemaName,ReferencedEntity,ReferencingEntity,ReferencingAttribute`,
      ),
      this.requestJson<{ value: unknown[] }>(
        `EntityDefinitions(LogicalName='${encodedEntityLogicalName}')/ManyToManyRelationships?$select=SchemaName,Entity1LogicalName,Entity2LogicalName,IntersectEntityName`,
      ),
    ]);

    return {
      ...entity,
      Attributes: attributes.value,
      Relationships: {
        OneToMany: oneToMany.value,
        ManyToOne: manyToOne.value,
        ManyToMany: manyToMany.value,
      },
    };
  }

  async getAttributeMetadata(entityLogicalName: string, attributeLogicalName: string): Promise<unknown> {
    return this.requestJson(
      `EntityDefinitions(LogicalName='${encodeURIComponent(entityLogicalName)}')/Attributes(LogicalName='${encodeURIComponent(attributeLogicalName)}')?$select=LogicalName,SchemaName,AttributeType,Format,RequiredLevel,DisplayName,Description,IsCustomAttribute,IsValidForRead,IsValidForCreate,IsValidForUpdate`,
    );
  }

  async getOptionSet(entityLogicalName: string, attributeLogicalName: string): Promise<unknown> {
    return this.requestJson(
      `EntityDefinitions(LogicalName='${encodeURIComponent(entityLogicalName)}')/Attributes(LogicalName='${encodeURIComponent(attributeLogicalName)}')?$select=LogicalName,AttributeType&$expand=OptionSet($select=Options),GlobalOptionSet($select=Options)`,
    );
  }

  async listRelationships(entityLogicalName: string): Promise<unknown[]> {
    const encodedLogicalName = encodeURIComponent(entityLogicalName);
    const [manyToOne, oneToMany, manyToMany] = await Promise.all([
      this.requestJson<{ value?: unknown[]; [key: string]: unknown }>(
        `EntityDefinitions(LogicalName='${encodedLogicalName}')/ManyToOneRelationships?$select=SchemaName,ReferencedEntity,ReferencingEntity,ReferencingAttribute`,
      ),
      this.requestJson<{ value?: unknown[]; [key: string]: unknown }>(
        `EntityDefinitions(LogicalName='${encodedLogicalName}')/OneToManyRelationships?$select=SchemaName,ReferencedEntity,ReferencingEntity,ReferencingAttribute`,
      ),
      this.requestJson<{ value?: unknown[]; [key: string]: unknown }>(
        `EntityDefinitions(LogicalName='${encodedLogicalName}')/ManyToManyRelationships?$select=SchemaName,Entity1LogicalName,Entity2LogicalName,IntersectEntityName`,
      ),
    ]);

    return [
      ...(manyToOne.value || []),
      ...(oneToMany.value || []),
      ...(manyToMany.value || []),
    ];
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.accessTokenExpiresAt - 60_000) {
      return this.accessToken;
    }

    if (!this.profile.url || !this.profile.tenantId || !this.profile.clientId || !this.profile.clientSecret) {
      throw new D365ToolError("missing_env_var", "Online OAuth profile is missing one or more resolved credentials.", {
        profileName: this.profile.profileName,
      });
    }

    const tokenUrl = `https://login.microsoftonline.com/${this.profile.tenantId}/oauth2/v2.0/token`;
    const dataverseOrigin = new URL(this.profile.url).origin;

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.profile.clientId,
      client_secret: this.profile.clientSecret,
      scope: `${dataverseOrigin}/.default`,
    });

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new D365ToolError(
        "connection_failed",
        `Failed to acquire Dataverse token. ${response.status} ${response.statusText}.`,
        {
          profileName: this.profile.profileName,
          status: response.status,
          statusText: response.statusText,
          responsePreview: errorBody.slice(0, 1000),
        },
      );
    }

    const token = (await response.json()) as OAuthTokenResponse;
    this.accessToken = token.access_token;
    this.accessTokenExpiresAt = now + token.expires_in * 1000;
    return token.access_token;
  }

  private async requestJson<T>(relativePath: string): Promise<T> {
    if (!this.profile.webApiUrl) {
      throw new D365ToolError("configuration_error", "Resolved profile is missing webApiUrl.", {
        profileName: this.profile.profileName,
      });
    }

    const accessToken = await this.getAccessToken();
    const webApiBaseUrl = this.profile.webApiUrl.replace(/\/$/, "");
    const requestUrl = `${webApiBaseUrl}/${relativePath.replace(/^\//, "")}`;

    const response = await fetch(requestUrl, {
      method: "GET",
      headers: {
        authorization: `Bearer ${accessToken}`,
        accept: "application/json",
        "odata-version": "4.0",
        "odata-maxversion": "4.0",
        prefer: 'odata.include-annotations="*"',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new D365ToolError(
        "connection_failed",
        `Dataverse Web API request failed. ${response.status} ${response.statusText}.`,
        {
          profileName: this.profile.profileName,
          requestUrl,
          status: response.status,
          statusText: response.statusText,
          responsePreview: errorBody.slice(0, 1000),
        },
      );
    }

    return (await response.json()) as T;
  }
}
