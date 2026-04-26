import { z } from "zod";

import type { D365ToolDefinition, D365ToolRuntime } from "./tool-types.js";

const optionalProfileSchema = z.object({
  profileName: z.string().min(1).optional(),
});

const entityArgsSchema = optionalProfileSchema.extend({
  entityLogicalName: z.string().min(1),
});

const attributeArgsSchema = entityArgsSchema.extend({
  attributeLogicalName: z.string().min(1),
});

export function getMetadataTools(runtime: D365ToolRuntime): D365ToolDefinition[] {
  return [
    {
      name: "d365_list_entities",
      description: "List Dataverse entities for the active profile.",
      inputSchema: {
        type: "object",
        properties: {
          profileName: { type: "string" },
        },
        additionalProperties: false,
      },
      async handler(argumentsObject) {
        const args = optionalProfileSchema.parse(argumentsObject || {});
        return runtime.listEntities(args.profileName);
      },
    },
    {
      name: "d365_get_entity_metadata",
      description: "Get metadata for a Dataverse entity logical name.",
      inputSchema: {
        type: "object",
        required: ["entityLogicalName"],
        properties: {
          entityLogicalName: { type: "string" },
          profileName: { type: "string" },
        },
        additionalProperties: false,
      },
      async handler(argumentsObject) {
        const args = entityArgsSchema.parse(argumentsObject || {});
        return runtime.getEntityMetadata(args.entityLogicalName, args.profileName);
      },
    },
    {
      name: "d365_get_attribute_metadata",
      description: "Get metadata for a Dataverse attribute logical name.",
      inputSchema: {
        type: "object",
        required: ["entityLogicalName", "attributeLogicalName"],
        properties: {
          entityLogicalName: { type: "string" },
          attributeLogicalName: { type: "string" },
          profileName: { type: "string" },
        },
        additionalProperties: false,
      },
      async handler(argumentsObject) {
        const args = attributeArgsSchema.parse(argumentsObject || {});
        return runtime.getAttributeMetadata(
          args.entityLogicalName,
          args.attributeLogicalName,
          args.profileName,
        );
      },
    },
    {
      name: "d365_get_option_set",
      description: "Get option set metadata for a Dataverse attribute.",
      inputSchema: {
        type: "object",
        required: ["entityLogicalName", "attributeLogicalName"],
        properties: {
          entityLogicalName: { type: "string" },
          attributeLogicalName: { type: "string" },
          profileName: { type: "string" },
        },
        additionalProperties: false,
      },
      async handler(argumentsObject) {
        const args = attributeArgsSchema.parse(argumentsObject || {});
        return runtime.getOptionSet(args.entityLogicalName, args.attributeLogicalName, args.profileName);
      },
    },
    {
      name: "d365_list_relationships",
      description: "List Dataverse relationships for a given entity.",
      inputSchema: {
        type: "object",
        required: ["entityLogicalName"],
        properties: {
          entityLogicalName: { type: "string" },
          profileName: { type: "string" },
        },
        additionalProperties: false,
      },
      async handler(argumentsObject) {
        const args = entityArgsSchema.parse(argumentsObject || {});
        return runtime.listRelationships(args.entityLogicalName, args.profileName);
      },
    },
  ];
}
