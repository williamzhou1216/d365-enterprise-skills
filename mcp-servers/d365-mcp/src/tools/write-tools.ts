import { z } from "zod";

import { OnlineWebApiClient } from "../adapters/online-webapi-client.js";
import { throwReadonlyViolation } from "../adapters/d365-connection-adapter.js";
import { notImplementedResult, throwToolError } from "../errors.js";
import type { ResolvedD365Profile, SanitizedD365Profile } from "../profiles/d365-profile.js";
import { getCurrentProfileSummary, loadProfile } from "../profiles/profile-loader.js";
import type { D365ToolDefinition } from "./tool-types.js";

const baseWriteArgsSchema = z.object({
  profileName: z.string().min(1).optional(),
  dryRun: z.boolean().optional().default(true),
});

const createEntityArgsSchema = baseWriteArgsSchema.extend({
  entityLogicalName: z.string().min(1),
  schemaName: z.string().min(1),
  displayName: z.string().min(1),
  pluralDisplayName: z.string().min(1),
  description: z.string().optional().default(""),
  ownershipType: z.enum(["UserOwned", "OrganizationOwned"]).optional().default("UserOwned"),
  primaryNameAttribute: z.object({
    logicalName: z.string().min(1),
    schemaName: z.string().min(1),
    displayName: z.string().min(1),
    maxLength: z.number().int().min(1).max(400).optional().default(100),
    requiredLevel: z.enum(["None", "SystemRequired", "ApplicationRequired", "Recommended"]).optional().default("ApplicationRequired"),
  }),
});

const createAttributeArgsSchema = baseWriteArgsSchema.extend({
  entityLogicalName: z.string().min(1),
  attributeLogicalName: z.string().min(1),
  schemaName: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string().optional().default(""),
  attributeType: z.enum(["string", "memo", "wholeNumber", "decimal", "boolean", "dateTime", "choice"]),
  requiredLevel: z.enum(["None", "SystemRequired", "ApplicationRequired", "Recommended"]).optional().default("None"),
  maxLength: z.number().int().min(1).max(4000).optional(),
  precision: z.number().int().min(0).max(10).optional(),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
  dateTimeBehavior: z.enum(["UserLocal", "DateOnly", "TimeZoneIndependent"]).optional().default("UserLocal"),
  trueLabel: z.string().min(1).optional(),
  falseLabel: z.string().min(1).optional(),
  options: z.array(
    z.object({
      value: z.number().int().optional(),
      label: z.string().min(1),
    }),
  ).optional(),
}).superRefine((value, ctx) => {
  if (value.attributeType === "string" && !value.maxLength) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["maxLength"], message: "maxLength is required for string attributes." });
  }
  if (value.attributeType === "memo" && !value.maxLength) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["maxLength"], message: "maxLength is required for memo attributes." });
  }
  if (value.attributeType === "decimal" && value.precision === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["precision"], message: "precision is required for decimal attributes." });
  }
  if (value.attributeType === "choice" && (!value.options || value.options.length === 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["options"], message: "At least one option is required for choice attributes." });
  }
  if (value.attributeType === "boolean" && (!value.trueLabel || !value.falseLabel)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["trueLabel"], message: "trueLabel and falseLabel are required for boolean attributes." });
  }
});

const createFormArgsSchema = baseWriteArgsSchema.extend({
  entityLogicalName: z.string().min(1),
  formName: z.string().min(1),
  formType: z.enum(["main", "quickCreate", "quickView", "card"]).optional().default("main"),
  tabs: z.array(z.object({
    name: z.string().min(1),
    label: z.string().min(1),
    sections: z.array(z.object({
      name: z.string().min(1),
      label: z.string().min(1),
      columns: z.number().int().min(1).max(4).optional().default(1),
      controls: z.array(z.object({
        logicalName: z.string().min(1),
        id: z.string().min(1).optional(),
        disabled: z.boolean().optional().default(false),
      })).optional().default([]),
    })).default([]),
  })).optional().default([]),
});

const updateFormArgsSchema = baseWriteArgsSchema.extend({
  entityLogicalName: z.string().min(1),
  formId: z.string().min(1),
  formName: z.string().min(1).optional(),
  addLibraries: z.array(z.string().min(1)).optional().default([]),
  addEventHandlers: z.array(z.object({ event: z.string().min(1), libraryName: z.string().min(1), functionName: z.string().min(1) })).optional().default([]),
  addControls: z.array(z.object({
    tabName: z.string().min(1),
    sectionName: z.string().min(1),
    logicalName: z.string().min(1),
    id: z.string().min(1).optional(),
    disabled: z.boolean().optional().default(false),
  })).optional().default([]),
});

const viewLinkEntitySchema: z.ZodType<{
  name: string;
  from: string;
  to: string;
  alias?: string;
  linkType?: "inner" | "outer";
  columns?: string[];
  conditions?: Array<{ attribute: string; operator: string; value?: string | number | boolean | null }>;
}> = z.lazy(() => z.object({
  name: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  alias: z.string().min(1).optional(),
  linkType: z.enum(["inner", "outer"]).optional().default("inner"),
  columns: z.array(z.string().min(1)).optional().default([]),
  conditions: z.array(z.object({
    attribute: z.string().min(1),
    operator: z.string().min(1),
    value: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  })).optional().default([]),
}));

const createViewArgsSchema = baseWriteArgsSchema.extend({
  entityLogicalName: z.string().min(1),
  viewName: z.string().min(1),
  description: z.string().optional().default(""),
  columns: z.array(z.object({ logicalName: z.string().min(1), width: z.number().int().min(40).max(600).optional().default(120) })).min(1),
  conditions: z.array(z.object({
    attribute: z.string().min(1),
    operator: z.string().min(1),
    value: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  })).optional().default([]),
  orders: z.array(z.object({ attribute: z.string().min(1), descending: z.boolean().optional().default(false) })).optional().default([]),
  linkedEntities: z.array(viewLinkEntitySchema).optional().default([]),
  objectTypeCode: z.number().int().min(0).optional(),
  jumpAttribute: z.string().min(1).optional(),
  isDefault: z.boolean().optional().default(false),
});

const updateViewArgsSchema = createViewArgsSchema.extend({
  viewId: z.string().min(1),
});

function getPlannedAdapter(profile: Pick<SanitizedD365Profile, "deploymentType" | "authType">): string {
  if (profile.deploymentType === "online") {
    return "OnlineOAuthAdapter";
  }
  if (profile.deploymentType === "onprem" && profile.authType === "windows-integrated") {
    return "OnPremADAdapter";
  }
  if (profile.deploymentType === "onprem" && profile.authType === "adfs-claims") {
    return "OnPremADFSAdapter";
  }
  return "OnPremIFDAdapter";
}

async function getWritableProfile(profileName: string | undefined, toolName: string): Promise<SanitizedD365Profile> {
  const profile = await getCurrentProfileSummary(profileName);
  if (profile.readonly) {
    throwReadonlyViolation(profile, toolName);
  }
  return profile;
}

async function getWritableResolvedProfile(profileName: string | undefined, toolName: string): Promise<ResolvedD365Profile> {
  const profile = await loadProfile(profileName);
  if (profile.readonly) {
    throwReadonlyViolation(profile, toolName);
  }
  return profile;
}

function assertOnlineWriteProfile(profile: Pick<ResolvedD365Profile, "deploymentType" | "authType" | "apiType">, toolName: string): void {
  if (profile.deploymentType !== "online" || profile.authType !== "oauth-client-credentials" || profile.apiType !== "webapi") {
    throwToolError(
      "not_implemented",
      `Tool '${toolName}' currently supports only Online OAuth profiles using Dataverse Web API for real execution.`,
      {
        deploymentType: profile.deploymentType,
        authType: profile.authType,
        apiType: profile.apiType,
      },
      getPlannedAdapter(profile as Pick<SanitizedD365Profile, "deploymentType" | "authType">),
    );
  }
}

function toLabel(label: string, languageCode = 1033): Record<string, unknown> {
  return {
    LocalizedLabels: [
      {
        Label: label,
        LanguageCode: languageCode,
      },
    ],
  };
}

function toNullableValue(value: string | number | boolean | null | undefined): string {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value === "boolean") {
    return value ? "1" : "0";
  }
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function buildConditionXml(condition: { attribute: string; operator: string; value?: string | number | boolean | null }): string {
  if (condition.value === undefined || condition.value === null) {
    return `<condition attribute="${condition.attribute}" operator="${condition.operator}" />`;
  }
  return `<condition attribute="${condition.attribute}" operator="${condition.operator}" value="${toNullableValue(condition.value)}" />`;
}

function buildLinkEntityXml(linkEntity: z.infer<typeof viewLinkEntitySchema>): string {
  const attributeXml = (linkEntity.columns || []).map((column) => `<attribute name="${column}" />`).join("");
  const filterXml = (linkEntity.conditions || []).length > 0
    ? `<filter type="and">${(linkEntity.conditions || []).map((condition) => buildConditionXml(condition)).join("")}</filter>`
    : "";

  return `<link-entity name="${linkEntity.name}" from="${linkEntity.from}" to="${linkEntity.to}" alias="${linkEntity.alias || linkEntity.name}" link-type="${linkEntity.linkType || "inner"}">${attributeXml}${filterXml}</link-entity>`;
}

function buildFetchXml(args: z.infer<typeof createViewArgsSchema> | z.infer<typeof updateViewArgsSchema>): string {
  const attributesXml = args.columns.map((column) => `<attribute name="${column.logicalName}" />`).join("");
  const filtersXml = args.conditions.length > 0
    ? `<filter type="and">${args.conditions.map((condition) => buildConditionXml(condition)).join("")}</filter>`
    : "";
  const ordersXml = args.orders.map((order) => `<order attribute="${order.attribute}" descending="${order.descending ? "true" : "false"}" />`).join("");
  const linkedEntitiesXml = args.linkedEntities.map((linkEntity) => buildLinkEntityXml(linkEntity)).join("");

  return `<fetch version="1.0" mapping="logical" distinct="false"><entity name="${args.entityLogicalName}">${attributesXml}${filtersXml}${ordersXml}${linkedEntitiesXml}</entity></fetch>`;
}

function buildLayoutXml(args: z.infer<typeof createViewArgsSchema> | z.infer<typeof updateViewArgsSchema>): string {
  const jumpAttribute = args.jumpAttribute || args.columns[0]?.logicalName || `${args.entityLogicalName}id`;
  const rowXml = args.columns
    .map((column) => `<cell name="${column.logicalName}" width="${column.width || 120}" />`)
    .join("");

  return `<grid name="resultset" object="${args.objectTypeCode ?? 0}" jump="${jumpAttribute}" select="1" icon="1" preview="1"><row name="result" id="${args.entityLogicalName}id">${rowXml}</row></grid>`;
}

function buildAttributePayload(args: z.infer<typeof createAttributeArgsSchema>): Record<string, unknown> {
  const basePayload: Record<string, unknown> = {
    SchemaName: args.schemaName,
    LogicalName: args.attributeLogicalName,
    DisplayName: toLabel(args.displayName),
    Description: toLabel(args.description || ""),
    RequiredLevel: {
      Value: args.requiredLevel,
    },
  };

  if (args.attributeType === "string") {
    return {
      "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
      ...basePayload,
      MaxLength: args.maxLength,
      FormatName: {
        Value: "Text",
      },
    };
  }

  if (args.attributeType === "memo") {
    return {
      "@odata.type": "Microsoft.Dynamics.CRM.MemoAttributeMetadata",
      ...basePayload,
      MaxLength: args.maxLength,
      FormatName: {
        Value: "TextArea",
      },
    };
  }

  if (args.attributeType === "wholeNumber") {
    return {
      "@odata.type": "Microsoft.Dynamics.CRM.IntegerAttributeMetadata",
      ...basePayload,
      MinValue: args.minValue ?? -2147483648,
      MaxValue: args.maxValue ?? 2147483647,
      Format: "None",
    };
  }

  if (args.attributeType === "decimal") {
    return {
      "@odata.type": "Microsoft.Dynamics.CRM.DecimalAttributeMetadata",
      ...basePayload,
      Precision: args.precision,
      MinValue: args.minValue ?? -100000000000,
      MaxValue: args.maxValue ?? 100000000000,
    };
  }

  if (args.attributeType === "boolean") {
    return {
      "@odata.type": "Microsoft.Dynamics.CRM.BooleanAttributeMetadata",
      ...basePayload,
      OptionSet: {
        TrueOption: {
          Value: 1,
          Label: toLabel(args.trueLabel || "Yes"),
        },
        FalseOption: {
          Value: 0,
          Label: toLabel(args.falseLabel || "No"),
        },
      },
    };
  }

  if (args.attributeType === "dateTime") {
    return {
      "@odata.type": "Microsoft.Dynamics.CRM.DateTimeAttributeMetadata",
      ...basePayload,
      Format: args.dateTimeBehavior === "DateOnly" ? "DateOnly" : "DateAndTime",
      DateTimeBehavior: {
        Value: args.dateTimeBehavior,
      },
    };
  }

  return {
    "@odata.type": "Microsoft.Dynamics.CRM.PicklistAttributeMetadata",
    ...basePayload,
    OptionSet: {
      Options: (args.options || []).map((option, index) => ({
        Value: option.value ?? 100000000 + index,
        Label: toLabel(option.label),
      })),
    },
  };
}

function buildWriteDryRunResult(profile: SanitizedD365Profile, toolName: string, payload: Record<string, unknown>): Record<string, unknown> {
  return {
    success: true,
    toolName,
    executionMode: "dry_run",
    dryRun: true,
    profileName: profile.profileName,
    deploymentType: profile.deploymentType,
    authType: profile.authType,
    apiType: profile.apiType,
    readonly: profile.readonly,
    plannedAdapter: getPlannedAdapter(profile),
    ...payload,
  };
}

function buildWriteExecutedResult(profile: ResolvedD365Profile, toolName: string, payload: Record<string, unknown>): Record<string, unknown> {
  return {
    success: true,
    toolName,
    executionMode: "executed",
    dryRun: false,
    profileName: profile.profileName,
    deploymentType: profile.deploymentType,
    authType: profile.authType,
    apiType: profile.apiType,
    readonly: profile.readonly,
    plannedAdapter: getPlannedAdapter(profile),
    ...payload,
  };
}

function buildOnlineAttributeWritePlan(profile: SanitizedD365Profile, args: z.infer<typeof createAttributeArgsSchema>): Record<string, unknown> {
  const attributePayload = buildAttributePayload(args);
  const requestPath = `/EntityDefinitions(LogicalName='${args.entityLogicalName}')/Attributes`;

  return buildWriteDryRunResult(profile, "d365_create_attribute", {
    operation: "create_attribute",
    entityLogicalName: args.entityLogicalName,
    attributeLogicalName: args.attributeLogicalName,
    request: {
      method: "POST",
      path: requestPath,
      body: attributePayload,
    },
    notes: [
      "This is a dry-run payload only. Switch dryRun to false to execute against an Online profile.",
      "Review attribute metadata carefully before promoting to managed solutions.",
    ],
  });
}

function buildSavedQueryPayload(args: z.infer<typeof createViewArgsSchema> | z.infer<typeof updateViewArgsSchema>, fetchXml: string, layoutXml: string): Record<string, unknown> {
  return {
    name: args.viewName,
    description: args.description,
    returnedtypecode: args.entityLogicalName,
    querytype: 0,
    fetchxml: fetchXml,
    layoutxml: layoutXml,
    isdefault: args.isDefault,
  };
}

function buildCreateEntityPayload(args: z.infer<typeof createEntityArgsSchema>): Record<string, unknown> {
  return {
    Entity: {
      "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",
      SchemaName: args.schemaName,
      LogicalName: args.entityLogicalName,
      DisplayName: toLabel(args.displayName),
      DisplayCollectionName: toLabel(args.pluralDisplayName),
      Description: toLabel(args.description || ""),
      OwnershipType: args.ownershipType,
      IsActivity: false,
    },
    PrimaryAttribute: {
      "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
      SchemaName: args.primaryNameAttribute.schemaName,
      LogicalName: args.primaryNameAttribute.logicalName,
      DisplayName: toLabel(args.primaryNameAttribute.displayName),
      RequiredLevel: {
        Value: args.primaryNameAttribute.requiredLevel,
      },
      MaxLength: args.primaryNameAttribute.maxLength,
      FormatName: {
        Value: "Text",
      },
    },
    HasActivities: false,
    HasNotes: true,
  };
}

async function validateEntityDoesNotExist(client: OnlineWebApiClient, entityLogicalName: string, toolName: string): Promise<void> {
  const existing = await client.tryGet<Record<string, unknown>>(
    `/EntityDefinitions(LogicalName='${entityLogicalName}')?$select=LogicalName`,
  );
  if (existing) {
    throwToolError("configuration_error", `Entity '${entityLogicalName}' already exists.`, {
      entityLogicalName,
      toolName,
    });
  }
}

async function validateEntityExists(client: OnlineWebApiClient, entityLogicalName: string, toolName: string): Promise<void> {
  const existing = await client.tryGet<Record<string, unknown>>(
    `/EntityDefinitions(LogicalName='${entityLogicalName}')?$select=LogicalName`,
  );
  if (!existing) {
    throwToolError("configuration_error", `Entity '${entityLogicalName}' was not found.`, {
      entityLogicalName,
      toolName,
    });
  }
}

async function validateAttributeDoesNotExist(
  client: OnlineWebApiClient,
  entityLogicalName: string,
  attributeLogicalName: string,
): Promise<void> {
  const existing = await client.tryGet<Record<string, unknown>>(
    `/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes(LogicalName='${attributeLogicalName}')?$select=LogicalName`,
  );
  if (existing) {
    throwToolError("configuration_error", `Attribute '${entityLogicalName}.${attributeLogicalName}' already exists.`, {
      entityLogicalName,
      attributeLogicalName,
    });
  }
}

async function validateViewNameDoesNotExist(
  client: OnlineWebApiClient,
  entityLogicalName: string,
  viewName: string,
): Promise<void> {
  const escapedName = viewName.replaceAll("'", "''");
  const response = await client.get<{ value?: Array<Record<string, unknown>> }>(
    `/savedqueries?$select=savedqueryid,name,returnedtypecode&$filter=returnedtypecode eq '${entityLogicalName}' and name eq '${escapedName}'`,
  );
  if ((response.value || []).length > 0) {
    throwToolError("configuration_error", `View '${viewName}' already exists for entity '${entityLogicalName}'.`, {
      entityLogicalName,
      viewName,
    });
  }
}

async function validateViewExists(client: OnlineWebApiClient, viewId: string): Promise<void> {
  const existing = await client.tryGet<Record<string, unknown>>(`/savedqueries(${viewId})?$select=savedqueryid,name`);
  if (!existing) {
    throwToolError("configuration_error", `View '${viewId}' was not found.`, {
      viewId,
    });
  }
}

async function validateColumnsExist(
  client: OnlineWebApiClient,
  entityLogicalName: string,
  columns: Array<{ logicalName: string }>,
  linkedEntities: Array<z.infer<typeof viewLinkEntitySchema>>,
): Promise<void> {
  const entity = await client.get<{ Attributes?: Array<{ LogicalName?: string }> }>(
    `/EntityDefinitions(LogicalName='${entityLogicalName}')?$expand=Attributes($select=LogicalName)`,
  );
  const entityAttributes = new Set((entity.Attributes || []).map((item) => item.LogicalName).filter(Boolean));

  for (const column of columns) {
    if (!entityAttributes.has(column.logicalName)) {
      throwToolError("configuration_error", `Column '${column.logicalName}' does not exist on entity '${entityLogicalName}'.`, {
        entityLogicalName,
        column: column.logicalName,
      });
    }
  }

  for (const linkEntity of linkedEntities) {
    const linked = await client.get<{ Attributes?: Array<{ LogicalName?: string }> }>(
      `/EntityDefinitions(LogicalName='${linkEntity.name}')?$expand=Attributes($select=LogicalName)`,
    );
    const linkedAttributes = new Set((linked.Attributes || []).map((item) => item.LogicalName).filter(Boolean));
    for (const column of linkEntity.columns || []) {
      if (!linkedAttributes.has(column)) {
        throwToolError("configuration_error", `Column '${column}' does not exist on linked entity '${linkEntity.name}'.`, {
          linkedEntity: linkEntity.name,
          column,
        });
      }
    }
  }
}

function toFormTypeCode(formType: "main" | "quickCreate" | "quickView" | "card"): number {
  if (formType === "main") {
    return 2;
  }
  if (formType === "quickCreate") {
    return 7;
  }
  if (formType === "quickView") {
    return 6;
  }
  return 11;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function buildCreateFormXml(args: z.infer<typeof createFormArgsSchema>): string {
  const tabsXml = args.tabs
    .map((tab, tabIndex) => {
      const sectionsXml = tab.sections
        .map((section, sectionIndex) => {
          const rowsXml = (section.controls || [])
            .map(
              (control, controlIndex) =>
                `<row><cell id="${escapeXml(control.id || `${section.name}_${control.logicalName}_${controlIndex + 1}`)}" showlabel="true" locklevel="${control.disabled ? "true" : "false"}"><labels><label description="${escapeXml(control.logicalName)}" languagecode="1033" /></labels><control id="${escapeXml(control.id || control.logicalName)}" classid="{4273EDBD-AC1D-40d3-9FB2-095C621B552D}" datafieldname="${escapeXml(control.logicalName)}" disabled="${control.disabled ? "true" : "false"}" /></cell></row>`,
            )
            .join("");

          return `<section name="${escapeXml(section.name)}" showlabel="true" showbar="false" columns="${section.columns || 1}" id="{${tabIndex + 1}${sectionIndex + 1}000000-0000-0000-0000-000000000000}"><labels><label description="${escapeXml(section.label)}" languagecode="1033" /></labels><rows>${rowsXml}</rows></section>`;
        })
        .join("");

      return `<tab name="${escapeXml(tab.name)}" verticallayout="true" id="{${tabIndex + 1}0000000-0000-0000-0000-000000000000}"><labels><label description="${escapeXml(tab.label)}" languagecode="1033" /></labels><columns><column><sections>${sectionsXml}</sections></column></columns></tab>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="utf-8"?><form><tabs>${tabsXml}</tabs><header id="form-header" /><footer id="form-footer" /><events /></form>`;
}

function buildUpdateFormXmlPatch(args: z.infer<typeof updateFormArgsSchema>): string {
  const librariesXml = args.addLibraries
    .map((libraryName, index) => `<Library name="${escapeXml(libraryName)}" libraryUniqueId="{LIB-${index + 1}}" />`)
    .join("");
  const handlersXml = args.addEventHandlers
    .map(
      (handler, index) =>
        `<Event name="${escapeXml(handler.event)}"><Handlers><Handler handlerUniqueId="{HANDLER-${index + 1}}" functionName="${escapeXml(handler.functionName)}" libraryName="${escapeXml(handler.libraryName)}" enabled="true" parameters="" passExecutionContext="true" /></Handlers></Event>`,
    )
    .join("");
  const controlsXml = args.addControls
    .map(
      (control) =>
        `<AddControl tab="${escapeXml(control.tabName)}" section="${escapeXml(control.sectionName)}"><control id="${escapeXml(control.id || control.logicalName)}" datafieldname="${escapeXml(control.logicalName)}" disabled="${control.disabled ? "true" : "false"}" /></AddControl>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="utf-8"?><formPatch><libraries>${librariesXml}</libraries><events>${handlersXml}</events><controls>${controlsXml}</controls></formPatch>`;
}

export function getWriteTools(): D365ToolDefinition[] {
  return [
    {
      name: "d365_create_entity",
      category: "Customization/Write",
      status: "Partial",
      description: "Create a Dataverse entity in dry-run mode and generate a planned payload contract.",
      inputSchema: {
        type: "object",
        required: ["entityLogicalName", "schemaName", "displayName", "pluralDisplayName", "primaryNameAttribute"],
        properties: {
          profileName: { type: "string" },
          dryRun: { type: "boolean", default: true },
          entityLogicalName: { type: "string" },
          schemaName: { type: "string" },
          displayName: { type: "string" },
          pluralDisplayName: { type: "string" },
          description: { type: "string" },
          ownershipType: { type: "string", enum: ["UserOwned", "OrganizationOwned"], default: "UserOwned" },
          primaryNameAttribute: { type: "object" },
        },
        additionalProperties: false,
      },
      outputSchema: { type: "object" },
      promptExample: "为 account 扩展方案生成一个新自定义实体的 dry-run 创建计划和 Online Web API payload。",
      async handler(argumentsObject) {
        const args = createEntityArgsSchema.parse(argumentsObject || {});
        const profile = await getWritableProfile(args.profileName, "d365_create_entity");
        const onlinePayload = buildCreateEntityPayload(args);

        if (args.dryRun) {
          return buildWriteDryRunResult(profile, "d365_create_entity", {
            operation: "create_entity",
            entityLogicalName: args.entityLogicalName,
            request: {
              method: "POST",
              path: "/CreateEntity",
              body: onlinePayload,
            },
            notes: [
              "Primary attribute creation metadata is included in the CreateEntity action payload.",
              "Switch dryRun to false to execute against an Online profile.",
            ],
          });
        }

        const resolvedProfile = await getWritableResolvedProfile(args.profileName, "d365_create_entity");
        assertOnlineWriteProfile(resolvedProfile, "d365_create_entity");
        const client = new OnlineWebApiClient(resolvedProfile);
        await validateEntityDoesNotExist(client, args.entityLogicalName, "d365_create_entity");
        const response = await client.post<Record<string, unknown>>("/CreateEntity", onlinePayload);

        return buildWriteExecutedResult(resolvedProfile, "d365_create_entity", {
          operation: "create_entity",
          entityLogicalName: args.entityLogicalName,
          request: {
            method: "POST",
            path: "/CreateEntity",
          },
          response: {
            body: response.data,
            odataEntityId: response.headers["odata-entityid"] || null,
            location: response.headers.location || null,
          },
        });
      },
    },
    {
      name: "d365_create_attribute",
      category: "Customization/Write",
      status: "Partial",
      description: "Create a Dataverse attribute in dry-run mode and generate an Online Web API payload.",
      inputSchema: {
        type: "object",
        required: ["entityLogicalName", "attributeLogicalName", "schemaName", "displayName", "attributeType"],
        properties: {
          profileName: { type: "string" },
          dryRun: { type: "boolean", default: true },
          entityLogicalName: { type: "string" },
          attributeLogicalName: { type: "string" },
          schemaName: { type: "string" },
          displayName: { type: "string" },
          description: { type: "string" },
          attributeType: { type: "string", enum: ["string", "memo", "wholeNumber", "decimal", "boolean", "dateTime", "choice"] },
          requiredLevel: { type: "string", enum: ["None", "SystemRequired", "ApplicationRequired", "Recommended"], default: "None" },
          maxLength: { type: "number" },
          precision: { type: "number" },
          minValue: { type: "number" },
          maxValue: { type: "number" },
          dateTimeBehavior: { type: "string", enum: ["UserLocal", "DateOnly", "TimeZoneIndependent"], default: "UserLocal" },
          trueLabel: { type: "string" },
          falseLabel: { type: "string" },
          options: { type: "array", items: { type: "object" } },
        },
        additionalProperties: false,
      },
      outputSchema: { type: "object" },
      promptExample: "为 incident 生成一个新字段的 dry-run 创建计划，并输出 Online Web API metadata payload。",
      async handler(argumentsObject) {
        const args = createAttributeArgsSchema.parse(argumentsObject || {});
        const profile = await getWritableProfile(args.profileName, "d365_create_attribute");

        if (args.dryRun) {
          return buildOnlineAttributeWritePlan(profile, args);
        }

        const resolvedProfile = await getWritableResolvedProfile(args.profileName, "d365_create_attribute");
        assertOnlineWriteProfile(resolvedProfile, "d365_create_attribute");
        const client = new OnlineWebApiClient(resolvedProfile);
        await validateEntityExists(client, args.entityLogicalName, "d365_create_attribute");
        await validateAttributeDoesNotExist(client, args.entityLogicalName, args.attributeLogicalName);
        const requestPath = `/EntityDefinitions(LogicalName='${args.entityLogicalName}')/Attributes`;
        const requestBody = buildAttributePayload(args);
        const response = await client.post<Record<string, unknown>>(requestPath, requestBody);

        return buildWriteExecutedResult(resolvedProfile, "d365_create_attribute", {
          operation: "create_attribute",
          entityLogicalName: args.entityLogicalName,
          attributeLogicalName: args.attributeLogicalName,
          request: {
            method: "POST",
            path: requestPath,
          },
          response: {
            body: response.data,
            odataEntityId: response.headers["odata-entityid"] || null,
            location: response.headers.location || null,
          },
        });
      },
    },
    {
      name: "d365_create_form",
      category: "Customization/Write",
      status: "Partial",
      description: "Create a form in dry-run mode and generate a planned customization contract.",
      inputSchema: {
        type: "object",
        required: ["entityLogicalName", "formName"],
        properties: {
          profileName: { type: "string" },
          dryRun: { type: "boolean", default: true },
          entityLogicalName: { type: "string" },
          formName: { type: "string" },
          formType: { type: "string", enum: ["main", "quickCreate", "quickView", "card"], default: "main" },
          tabs: { type: "array", items: { type: "object" } },
        },
        additionalProperties: false,
      },
      outputSchema: { type: "object" },
      promptExample: "为 incident 设计一个新主窗体，先给我 dry-run 的结构计划和实施说明。",
      async handler(argumentsObject) {
        const args = createFormArgsSchema.parse(argumentsObject || {});
        const profile = await getWritableProfile(args.profileName, "d365_create_form");
        if (!args.dryRun) {
          return notImplementedResult("Form creation execution is planned but not implemented yet.", getPlannedAdapter(profile));
        }

        const formXml = buildCreateFormXml(args);

        return buildWriteDryRunResult(profile, "d365_create_form", {
          operation: "create_form",
          entityLogicalName: args.entityLogicalName,
          formName: args.formName,
          formType: args.formType,
          formTypeCode: toFormTypeCode(args.formType),
          formXml,
          plannedStructure: {
            tabCount: args.tabs.length,
            tabs: args.tabs,
          },
          notes: [
            "This tool now generates a draft FormXml artifact for design review.",
            "Use this dry-run output as a design-review contract before implementation.",
          ],
        });
      },
    },
    {
      name: "d365_update_form",
      category: "Customization/Write",
      status: "Partial",
      description: "Update a form in dry-run mode and generate a planned customization contract.",
      inputSchema: {
        type: "object",
        required: ["entityLogicalName", "formId"],
        properties: {
          profileName: { type: "string" },
          dryRun: { type: "boolean", default: true },
          entityLogicalName: { type: "string" },
          formId: { type: "string" },
          formName: { type: "string" },
          addLibraries: { type: "array", items: { type: "string" } },
          addEventHandlers: { type: "array", items: { type: "object" } },
        },
        additionalProperties: false,
      },
      outputSchema: { type: "object" },
      promptExample: "为 incident 现有主窗体生成一次更新的 dry-run 计划，包括新增 JS 库和事件处理器。",
      async handler(argumentsObject) {
        const args = updateFormArgsSchema.parse(argumentsObject || {});
        const profile = await getWritableProfile(args.profileName, "d365_update_form");
        if (!args.dryRun) {
          return notImplementedResult("Form update execution is planned but not implemented yet.", getPlannedAdapter(profile));
        }

        const formXmlPatch = buildUpdateFormXmlPatch(args);

        return buildWriteDryRunResult(profile, "d365_update_form", {
          operation: "update_form",
          entityLogicalName: args.entityLogicalName,
          formId: args.formId,
          formXmlPatch,
          updatePlan: {
            formName: args.formName,
            addLibraries: args.addLibraries,
            addEventHandlers: args.addEventHandlers,
            addControls: args.addControls,
          },
          notes: [
            "This tool now generates a FormXml patch draft for design review.",
            "Review event ordering, execution context, and dependency libraries before deployment.",
          ],
        });
      },
    },
    {
      name: "d365_create_view",
      category: "Customization/Write",
      status: "Partial",
      description: "Create a view in dry-run mode and generate FetchXML, LayoutXML, and a planned savedquery payload.",
      inputSchema: {
        type: "object",
        required: ["entityLogicalName", "viewName", "columns"],
        properties: {
          profileName: { type: "string" },
          dryRun: { type: "boolean", default: true },
          entityLogicalName: { type: "string" },
          viewName: { type: "string" },
          description: { type: "string" },
          columns: { type: "array", items: { type: "object" } },
          conditions: { type: "array", items: { type: "object" } },
          orders: { type: "array", items: { type: "object" } },
          linkedEntities: { type: "array", items: { type: "object" } },
          objectTypeCode: { type: "number" },
          jumpAttribute: { type: "string" },
          isDefault: { type: "boolean", default: false },
        },
        additionalProperties: false,
      },
      outputSchema: { type: "object" },
      promptExample: "为 account 生成一个新系统视图的 dry-run 输出，包括 FetchXML 和 LayoutXML。",
      async handler(argumentsObject) {
        const args = createViewArgsSchema.parse(argumentsObject || {});
        const profile = await getWritableProfile(args.profileName, "d365_create_view");
        const fetchXml = buildFetchXml(args);
        const layoutXml = buildLayoutXml(args);
        const requestBody = buildSavedQueryPayload(args, fetchXml, layoutXml);

        if (args.dryRun) {
          return buildWriteDryRunResult(profile, "d365_create_view", {
            operation: "create_view",
            entityLogicalName: args.entityLogicalName,
            viewName: args.viewName,
            fetchXml,
            layoutXml,
            request: {
              entityName: "savedquery",
              body: requestBody,
            },
            notes: [
              "ObjectTypeCode defaults to 0 when not provided. Replace it before real deployment if needed.",
              "Switch dryRun to false to execute against an Online profile.",
            ],
          });
        }

        const resolvedProfile = await getWritableResolvedProfile(args.profileName, "d365_create_view");
        assertOnlineWriteProfile(resolvedProfile, "d365_create_view");
        const client = new OnlineWebApiClient(resolvedProfile);
        await validateEntityExists(client, args.entityLogicalName, "d365_create_view");
        await validateViewNameDoesNotExist(client, args.entityLogicalName, args.viewName);
        await validateColumnsExist(client, args.entityLogicalName, args.columns, args.linkedEntities);
        const response = await client.post<Record<string, unknown>>("/savedqueries", requestBody);

        return buildWriteExecutedResult(resolvedProfile, "d365_create_view", {
          operation: "create_view",
          entityLogicalName: args.entityLogicalName,
          viewName: args.viewName,
          fetchXml,
          layoutXml,
          request: {
            method: "POST",
            path: "/savedqueries",
          },
          response: {
            body: response.data,
            odataEntityId: response.headers["odata-entityid"] || null,
            location: response.headers.location || null,
          },
        });
      },
    },
    {
      name: "d365_update_view",
      category: "Customization/Write",
      status: "Partial",
      description: "Update a view in dry-run mode and generate FetchXML, LayoutXML, and a planned savedquery update payload.",
      inputSchema: {
        type: "object",
        required: ["entityLogicalName", "viewId", "viewName", "columns"],
        properties: {
          profileName: { type: "string" },
          dryRun: { type: "boolean", default: true },
          viewId: { type: "string" },
          entityLogicalName: { type: "string" },
          viewName: { type: "string" },
          description: { type: "string" },
          columns: { type: "array", items: { type: "object" } },
          conditions: { type: "array", items: { type: "object" } },
          orders: { type: "array", items: { type: "object" } },
          linkedEntities: { type: "array", items: { type: "object" } },
          objectTypeCode: { type: "number" },
          jumpAttribute: { type: "string" },
          isDefault: { type: "boolean", default: false },
        },
        additionalProperties: false,
      },
      outputSchema: { type: "object" },
      promptExample: "更新 account 现有系统视图，先输出 dry-run 的 FetchXML 和 LayoutXML 更新计划。",
      async handler(argumentsObject) {
        const args = updateViewArgsSchema.parse(argumentsObject || {});
        const profile = await getWritableProfile(args.profileName, "d365_update_view");
        const fetchXml = buildFetchXml(args);
        const layoutXml = buildLayoutXml(args);
        const requestBody = buildSavedQueryPayload(args, fetchXml, layoutXml);

        if (args.dryRun) {
          return buildWriteDryRunResult(profile, "d365_update_view", {
            operation: "update_view",
            viewId: args.viewId,
            entityLogicalName: args.entityLogicalName,
            viewName: args.viewName,
            fetchXml,
            layoutXml,
            request: {
              entityName: "savedquery",
              id: args.viewId,
              body: requestBody,
            },
            notes: [
              "Switch dryRun to false to execute against an Online profile.",
              "Review jump attribute, linked entities, and sort columns before applying to production.",
            ],
          });
        }

        const resolvedProfile = await getWritableResolvedProfile(args.profileName, "d365_update_view");
        assertOnlineWriteProfile(resolvedProfile, "d365_update_view");
        const client = new OnlineWebApiClient(resolvedProfile);
        await validateEntityExists(client, args.entityLogicalName, "d365_update_view");
        await validateViewExists(client, args.viewId);
        await validateColumnsExist(client, args.entityLogicalName, args.columns, args.linkedEntities);
        const response = await client.patch<Record<string, unknown>>(`/savedqueries(${args.viewId})`, requestBody);

        return buildWriteExecutedResult(resolvedProfile, "d365_update_view", {
          operation: "update_view",
          viewId: args.viewId,
          entityLogicalName: args.entityLogicalName,
          viewName: args.viewName,
          fetchXml,
          layoutXml,
          request: {
            method: "PATCH",
            path: `/savedqueries(${args.viewId})`,
          },
          response: {
            body: response.data,
            odataEntityId: response.headers["odata-entityid"] || null,
            location: response.headers.location || null,
          },
        });
      },
    },
  ];
}
