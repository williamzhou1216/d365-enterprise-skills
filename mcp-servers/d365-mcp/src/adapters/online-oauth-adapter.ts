import { fetch } from "undici";

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
    const whoAmI = await this.requestJson<Record<string, unknown>>("WhoAmI");

    return {
      status: "connected",
      profileName: this.profile.profileName,
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
      "EntityDefinitions?$select=LogicalName,SchemaName,EntitySetName,PrimaryIdAttribute,PrimaryNameAttribute,ObjectTypeCode,IsCustomEntity&$filter=IsIntersect eq false",
    );

    return response.value;
  }

  async getEntityMetadata(entityLogicalName: string): Promise<unknown> {
    return this.requestJson(
      `EntityDefinitions(LogicalName='${encodeURIComponent(entityLogicalName)}')?$select=LogicalName,SchemaName,EntitySetName,DisplayName,Description,ObjectTypeCode,PrimaryIdAttribute,PrimaryNameAttribute,IsActivity,IsCustomEntity`,
    );
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
      throw new Error("Online OAuth profile is missing one or more resolved credentials.");
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
      throw new Error(`Failed to acquire Dataverse token. ${response.status} ${response.statusText}: ${errorBody}`);
    }

    const token = (await response.json()) as OAuthTokenResponse;
    this.accessToken = token.access_token;
    this.accessTokenExpiresAt = now + token.expires_in * 1000;
    return token.access_token;
  }

  private async requestJson<T>(relativePath: string): Promise<T> {
    if (!this.profile.webApiUrl) {
      throw new Error("Resolved profile is missing webApiUrl.");
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
      throw new Error(`Dataverse Web API request failed. ${response.status} ${response.statusText}: ${errorBody}`);
    }

    return (await response.json()) as T;
  }
}
