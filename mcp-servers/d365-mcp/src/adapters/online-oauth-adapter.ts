import type { ResolvedD365Profile } from "../profiles/d365-profile.js";
import type { D365ConnectionAdapter } from "./d365-connection-adapter.js";
import { OnlineWebApiClient } from "./online-webapi-client.js";

export class OnlineOAuthAdapter implements D365ConnectionAdapter {
  private readonly client: OnlineWebApiClient;

  constructor(private readonly profile: ResolvedD365Profile) {
    this.client = new OnlineWebApiClient(profile);
  }

  async connect(): Promise<void> {
    await this.client.getAccessToken();
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

  private async requestJson<T>(relativePath: string): Promise<T> {
    return this.client.get<T>(relativePath);
  }
}
