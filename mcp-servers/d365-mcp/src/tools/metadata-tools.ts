import { z } from "zod";

import type { D365ToolDefinition, D365ToolRuntime } from "./tool-types.js";

const optionalProfileSchema = z.object({
  profileName: z.string().min(1).optional(),
});

const listEntitiesArgsSchema = optionalProfileSchema.extend({
  includeSystemEntities: z.boolean().optional().default(false),
  includeCustomEntitiesOnly: z.boolean().optional().default(false),
  nameFilter: z.string().min(1).optional(),
});

const getEntityArgsSchema = optionalProfileSchema.extend({
  entityLogicalName: z.string().min(1),
  includeAttributes: z.boolean().optional().default(true),
  includeRelationships: z.boolean().optional().default(true),
  includePrivileges: z.boolean().optional().default(false),
});

const getAttributeArgsSchema = optionalProfileSchema.extend({
  entityLogicalName: z.string().min(1),
  attributeLogicalName: z.string().min(1),
});

const getOptionSetArgsSchema = getAttributeArgsSchema.extend({
  languageCode: z.number().int().optional().default(1033),
});

const listRelationshipsArgsSchema = optionalProfileSchema.extend({
  entityLogicalName: z.string().min(1),
  relationshipType: z.enum(["oneToMany", "manyToOne", "manyToMany", "all"]).optional().default("all"),
});

const generateFieldDictionaryArgsSchema = optionalProfileSchema.extend({
  entities: z.array(z.string().min(1)).min(1),
  languageCode: z.number().int().optional().default(1033),
  includeSystemFields: z.boolean().optional().default(false),
  includeOptionSetValues: z.boolean().optional().default(true),
  outputFormat: z.enum(["json", "markdown", "csv"]).optional().default("json"),
});

interface LocalizedLabelShape {
  UserLocalizedLabel?: { Label?: string; LanguageCode?: number };
  LocalizedLabels?: Array<{ Label?: string; LanguageCode?: number }>;
}

interface DataverseEntityShape {
  LogicalName?: string;
  SchemaName?: string;
  EntitySetName?: string;
  PrimaryIdAttribute?: string;
  PrimaryNameAttribute?: string;
  IsCustomEntity?: boolean;
  OwnershipType?: string | { Value?: string };
  DisplayName?: LocalizedLabelShape;
  Description?: LocalizedLabelShape;
  IsActivity?: boolean;
  Attributes?: DataverseAttributeShape[];
  Relationships?: {
    OneToMany?: unknown[];
    ManyToOne?: unknown[];
    ManyToMany?: unknown[];
  };
}

interface DataverseAttributeShape {
  LogicalName?: string;
  SchemaName?: string;
  AttributeType?: string;
  AttributeTypeName?: { Value?: string };
  Format?: string;
  MaxLength?: number;
  RequiredLevel?: { Value?: string };
  DisplayName?: LocalizedLabelShape;
  Description?: LocalizedLabelShape;
  IsCustomAttribute?: boolean;
  IsValidForCreate?: boolean;
  IsValidForUpdate?: boolean;
  IsValidForRead?: boolean;
  OptionSet?: {
    Options?: Array<DataverseOptionShape>;
  };
  GlobalOptionSet?: {
    Options?: Array<DataverseOptionShape>;
  };
}

interface DataverseOptionShape {
  Value?: number;
  Label?: LocalizedLabelShape;
}

const internalEntityBlacklist = new Set([
  "audit",
  "privilege",
  "roletemplate",
  "savedqueryvisualization",
  "asyncoperation",
  "systemjob",
  "duplicaterecord",
  "workflowlog",
]);

const commonSystemFieldBlacklist = new Set([
  "createdon",
  "createdby",
  "createdonbehalfby",
  "modifiedon",
  "modifiedby",
  "modifiedonbehalfby",
  "versionnumber",
  "timezoneruleversionnumber",
  "utcconversiontimezonecode",
  "importsequencenumber",
  "overriddencreatedon",
  "owningbusinessunit",
  "ownerid",
  "owningteam",
  "owninguser",
  "statecode",
  "statuscode",
]);

function getLocalizedLabel(source: LocalizedLabelShape | undefined, languageCode = 1033): string {
  if (!source) {
    return "";
  }

  const exactLabel = source.LocalizedLabels?.find((item) => item.LanguageCode === languageCode)?.Label;
  if (exactLabel) {
    return exactLabel;
  }

  return source.UserLocalizedLabel?.Label || source.LocalizedLabels?.[0]?.Label || "";
}

function normalizeRequiredLevel(value: DataverseAttributeShape["RequiredLevel"]): string {
  return value?.Value || "None";
}

function normalizeOwnershipType(value: DataverseEntityShape["OwnershipType"]): string {
  if (typeof value === "string") {
    return value;
  }

  return value?.Value || "Unknown";
}

function normalizeRelationshipItem(
  relationshipType: "oneToMany" | "manyToOne" | "manyToMany",
  item: Record<string, unknown>,
): Record<string, unknown> {
  if (relationshipType === "manyToMany") {
    return {
      relationshipType,
      schemaName: item.SchemaName,
      entity1LogicalName: item.Entity1LogicalName,
      entity2LogicalName: item.Entity2LogicalName,
      intersectEntityName: item.IntersectEntityName,
    };
  }

  return {
    relationshipType,
    schemaName: item.SchemaName,
    referencedEntity: item.ReferencedEntity,
    referencingEntity: item.ReferencingEntity,
    referencingAttribute: item.ReferencingAttribute,
  };
}

function normalizeEntity(entity: DataverseEntityShape, languageCode = 1033): Record<string, unknown> {
  return {
    logicalName: entity.LogicalName,
    displayName: getLocalizedLabel(entity.DisplayName, languageCode),
    description: getLocalizedLabel(entity.Description, languageCode),
    schemaName: entity.SchemaName,
    entitySetName: entity.EntitySetName,
    primaryIdAttribute: entity.PrimaryIdAttribute,
    primaryNameAttribute: entity.PrimaryNameAttribute,
    isCustomEntity: Boolean(entity.IsCustomEntity),
    ownershipType: normalizeOwnershipType(entity.OwnershipType),
    isActivity: Boolean(entity.IsActivity),
  };
}

function normalizeAttribute(attribute: DataverseAttributeShape, languageCode = 1033): Record<string, unknown> {
  return {
    logicalName: attribute.LogicalName,
    displayName: getLocalizedLabel(attribute.DisplayName, languageCode),
    description: getLocalizedLabel(attribute.Description, languageCode),
    schemaName: attribute.SchemaName,
    attributeType: attribute.AttributeTypeName?.Value || attribute.AttributeType || "Unknown",
    maxLength: attribute.MaxLength ?? null,
    requiredLevel: normalizeRequiredLevel(attribute.RequiredLevel),
    isCustomAttribute: Boolean(attribute.IsCustomAttribute),
    isValidForCreate: Boolean(attribute.IsValidForCreate),
    isValidForUpdate: Boolean(attribute.IsValidForUpdate),
    isValidForRead: Boolean(attribute.IsValidForRead),
    format: attribute.Format || null,
  };
}

function normalizeOptionSet(attribute: DataverseAttributeShape, entityLogicalName: string, languageCode = 1033): Record<string, unknown> {
  const options = attribute.OptionSet?.Options || attribute.GlobalOptionSet?.Options || [];

  return {
    entityLogicalName,
    attributeLogicalName: attribute.LogicalName,
    options: options.map((option) => ({
      value: option.Value,
      label: getLocalizedLabel(option.Label, languageCode),
      languageCode,
    })),
  };
}

function buildMarkdownFieldDictionary(
  entities: Array<{ entityLogicalName: string; displayName: string; fields: Array<Record<string, unknown>> }>,
): string {
  const sections: string[] = ["# Field Dictionary"];

  for (const entity of entities) {
    sections.push("", `## ${entity.displayName || entity.entityLogicalName}`, "");
    sections.push("| Logical Name | Display Name | Type | Required | Description |", "|---|---|---|---|---|");
    for (const field of entity.fields) {
      sections.push(
        `| ${String(field.logicalName || "")} | ${String(field.displayName || "")} | ${String(field.type || "")} | ${String(field.requiredLevel || "")} | ${String(field.description || "")} |`,
      );
    }
  }

  return sections.join("\n");
}

function buildCsvFieldDictionary(
  entities: Array<{ entityLogicalName: string; displayName: string; fields: Array<Record<string, unknown>> }>,
): string {
  const lines = ["Entity Logical Name,Entity Display Name,Field Logical Name,Field Display Name,Type,Required Level,Description"];

  for (const entity of entities) {
    for (const field of entity.fields) {
      const values = [
        entity.entityLogicalName,
        entity.displayName,
        String(field.logicalName || ""),
        String(field.displayName || ""),
        String(field.type || ""),
        String(field.requiredLevel || ""),
        String(field.description || ""),
      ].map((value) => `"${String(value).replaceAll('"', '""')}"`);
      lines.push(values.join(","));
    }
  }

  return lines.join("\n");
}

export function getMetadataTools(runtime: D365ToolRuntime): D365ToolDefinition[] {
  return [
    {
      name: "d365_list_entities",
      category: "Metadata",
      status: "Partial",
      description: "Query Dataverse or Dynamics CRM entities for the active profile.",
      inputSchema: {
        type: "object",
        properties: {
          profileName: { type: "string" },
          includeSystemEntities: { type: "boolean", default: false },
          includeCustomEntitiesOnly: { type: "boolean", default: false },
          nameFilter: { type: "string" },
        },
        additionalProperties: false,
      },
      outputSchema: {
        type: "object",
        properties: {
          entities: { type: "array" },
        },
      },
      promptExample: "列出当前 CRM 环境中的自定义实体，并说明每个实体的主键字段和主名称字段。",
      async handler(argumentsObject) {
        const args = listEntitiesArgsSchema.parse(argumentsObject || {});
        const rawEntities = (await runtime.listEntities(args.profileName)) as DataverseEntityShape[];
        const normalizedEntities = rawEntities
          .map((entity) => normalizeEntity(entity))
          .filter((entity) => {
            const logicalName = String(entity.logicalName || "").toLowerCase();
            const displayName = String(entity.displayName || "").toLowerCase();
            const isCustomEntity = Boolean(entity.isCustomEntity);

            if (args.includeCustomEntitiesOnly && !isCustomEntity) {
              return false;
            }

            if (!args.includeSystemEntities && internalEntityBlacklist.has(logicalName)) {
              return false;
            }

            if (args.nameFilter) {
              const filter = args.nameFilter.toLowerCase();
              return logicalName.includes(filter) || displayName.includes(filter);
            }

            return true;
          });

        return {
          entities: normalizedEntities,
        };
      },
    },
    {
      name: "d365_get_entity_metadata",
      category: "Metadata",
      status: "Partial",
      description: "Read metadata for a Dataverse entity and optionally include attributes and relationships.",
      inputSchema: {
        type: "object",
        required: ["entityLogicalName"],
        properties: {
          profileName: { type: "string" },
          entityLogicalName: { type: "string" },
          includeAttributes: { type: "boolean", default: true },
          includeRelationships: { type: "boolean", default: true },
          includePrivileges: { type: "boolean", default: false },
        },
        additionalProperties: false,
      },
      outputSchema: { type: "object" },
      promptExample: "读取 account 实体的元数据，生成字段字典和开发注意事项。",
      async handler(argumentsObject) {
        const args = getEntityArgsSchema.parse(argumentsObject || {});
        const rawEntity = (await runtime.getEntityMetadata(args.entityLogicalName, args.profileName)) as DataverseEntityShape;

        const attributes = args.includeAttributes
          ? (rawEntity.Attributes || []).map((attribute) => normalizeAttribute(attribute))
          : [];

        const relationships = args.includeRelationships
          ? [
              ...((rawEntity.Relationships?.OneToMany || []) as Record<string, unknown>[]).map((item) =>
                normalizeRelationshipItem("oneToMany", item),
              ),
              ...((rawEntity.Relationships?.ManyToOne || []) as Record<string, unknown>[]).map((item) =>
                normalizeRelationshipItem("manyToOne", item),
              ),
              ...((rawEntity.Relationships?.ManyToMany || []) as Record<string, unknown>[]).map((item) =>
                normalizeRelationshipItem("manyToMany", item),
              ),
            ]
          : [];

        return {
          ...normalizeEntity(rawEntity),
          attributes,
          relationships,
          privileges: args.includePrivileges ? [] : [],
          notes: args.includePrivileges
            ? ["Entity privileges are reserved for a later phase of metadata expansion."]
            : [],
        };
      },
    },
    {
      name: "d365_get_attribute_metadata",
      category: "Metadata",
      status: "Partial",
      description: "Read metadata for a Dataverse attribute.",
      inputSchema: {
        type: "object",
        required: ["entityLogicalName", "attributeLogicalName"],
        properties: {
          profileName: { type: "string" },
          entityLogicalName: { type: "string" },
          attributeLogicalName: { type: "string" },
        },
        additionalProperties: false,
      },
      outputSchema: { type: "object" },
      promptExample: "检查 account.telephone1 字段是否存在，它的类型、长度、是否必填分别是什么。",
      async handler(argumentsObject) {
        const args = getAttributeArgsSchema.parse(argumentsObject || {});
        const rawAttribute = (await runtime.getAttributeMetadata(
          args.entityLogicalName,
          args.attributeLogicalName,
          args.profileName,
        )) as DataverseAttributeShape;

        return {
          entityLogicalName: args.entityLogicalName,
          attributeLogicalName: args.attributeLogicalName,
          ...normalizeAttribute(rawAttribute),
        };
      },
    },
    {
      name: "d365_get_option_set",
      category: "Metadata",
      status: "Partial",
      description: "Query option set values for a Dataverse choice field.",
      inputSchema: {
        type: "object",
        required: ["entityLogicalName", "attributeLogicalName"],
        properties: {
          profileName: { type: "string" },
          entityLogicalName: { type: "string" },
          attributeLogicalName: { type: "string" },
          languageCode: { type: "integer", default: 1033 },
        },
        additionalProperties: false,
      },
      outputSchema: { type: "object" },
      promptExample: "查询 incident.statuscode 的所有选项值，并生成状态流转说明。",
      async handler(argumentsObject) {
        const args = getOptionSetArgsSchema.parse(argumentsObject || {});
        const rawAttribute = (await runtime.getOptionSet(
          args.entityLogicalName,
          args.attributeLogicalName,
          args.profileName,
        )) as DataverseAttributeShape;

        return normalizeOptionSet(rawAttribute, args.entityLogicalName, args.languageCode);
      },
    },
    {
      name: "d365_list_relationships",
      category: "Metadata",
      status: "Partial",
      description: "List relationships for a Dataverse entity.",
      inputSchema: {
        type: "object",
        required: ["entityLogicalName"],
        properties: {
          profileName: { type: "string" },
          entityLogicalName: { type: "string" },
          relationshipType: { type: "string", enum: ["oneToMany", "manyToOne", "manyToMany", "all"], default: "all" },
        },
        additionalProperties: false,
      },
      outputSchema: { type: "object" },
      promptExample: "分析 account 和 contact 的关系，生成数据模型说明。",
      async handler(argumentsObject) {
        const args = listRelationshipsArgsSchema.parse(argumentsObject || {});
        const rawRelationships = (await runtime.listRelationships(args.entityLogicalName, args.profileName)) as Array<
          Record<string, unknown>
        >;

        const normalizedRelationships = rawRelationships.map((item) => {
          if (item.IntersectEntityName) {
            return normalizeRelationshipItem("manyToMany", item);
          }

          const relationshipType =
            String(item.ReferencedEntity || "").toLowerCase() === args.entityLogicalName.toLowerCase()
              ? "oneToMany"
              : "manyToOne";
          return normalizeRelationshipItem(relationshipType as "oneToMany" | "manyToOne", item);
        });

        return {
          entityLogicalName: args.entityLogicalName,
          relationships:
            args.relationshipType === "all"
              ? normalizedRelationships
              : normalizedRelationships.filter((item) => item.relationshipType === args.relationshipType),
        };
      },
    },
    {
      name: "d365_generate_field_dictionary",
      category: "Metadata",
      status: "Partial",
      description: "Generate a field dictionary for delivery documentation from entity metadata.",
      inputSchema: {
        type: "object",
        required: ["entities"],
        properties: {
          profileName: { type: "string" },
          entities: { type: "array", items: { type: "string" } },
          languageCode: { type: "integer", default: 1033 },
          includeSystemFields: { type: "boolean", default: false },
          includeOptionSetValues: { type: "boolean", default: true },
          outputFormat: { type: "string", enum: ["json", "markdown", "csv"], default: "json" },
        },
        additionalProperties: false,
      },
      outputSchema: { type: "object" },
      promptExample: "基于 account/contact/incident 生成一份字段字典，适合放到客户交付文档中。",
      async handler(argumentsObject) {
        const args = generateFieldDictionaryArgsSchema.parse(argumentsObject || {});
        const generatedAt = new Date().toISOString();

        const entities = await Promise.all(
          args.entities.map(async (entityLogicalName) => {
            const rawEntity = (await runtime.getEntityMetadata(entityLogicalName, args.profileName)) as DataverseEntityShape;
            const fields = (rawEntity.Attributes || [])
              .filter((attribute) => {
                const logicalName = String(attribute.LogicalName || "").toLowerCase();
                if (args.includeSystemFields) {
                  return true;
                }

                return !commonSystemFieldBlacklist.has(logicalName);
              })
              .map((attribute) => ({
                logicalName: attribute.LogicalName,
                displayName: getLocalizedLabel(attribute.DisplayName, args.languageCode),
                type: attribute.AttributeTypeName?.Value || attribute.AttributeType || "Unknown",
                requiredLevel: normalizeRequiredLevel(attribute.RequiredLevel),
                description: getLocalizedLabel(attribute.Description, args.languageCode),
                optionValues: args.includeOptionSetValues
                  ? normalizeOptionSet(attribute, entityLogicalName, args.languageCode).options
                  : [],
              }));

            return {
              entityLogicalName,
              displayName: getLocalizedLabel(rawEntity.DisplayName, args.languageCode),
              fields,
            };
          }),
        );

        const payload: Record<string, unknown> = {
          generatedAt,
          entities,
        };

        if (args.outputFormat === "markdown") {
          payload.markdown = buildMarkdownFieldDictionary(entities);
        }

        if (args.outputFormat === "csv") {
          payload.csv = buildCsvFieldDictionary(entities);
        }

        return payload;
      },
    },
  ];
}
