import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { buildPlannedToolResult, type D365ToolDefinition, type D365ToolRuntime } from "./tool-types.js";

const listPluginStepsArgsSchema = z.object({
  entityLogicalName: z.string().min(1).optional(),
  messageName: z.string().min(1).optional(),
  profileName: z.string().min(1).optional(),
});

const analyzePluginCodeArgsSchema = z.object({
  codePath: z.string().min(1),
  entityLogicalName: z.string().min(1),
  messageName: z.string().min(1),
  profileName: z.string().min(1).optional(),
});

const generatePluginTemplateArgsSchema = z.object({
  entityLogicalName: z.string().min(1),
  messageName: z.string().min(1),
  stage: z.string().min(1),
  mode: z.string().min(1),
  filteringAttributes: z.array(z.string()).default([]),
  preImageAttributes: z.array(z.string()).default([]),
  namespace: z.string().min(1),
  className: z.string().min(1),
});

const generateRegistrationArgsSchema = z.object({
  entityLogicalName: z.string().min(1),
  messageName: z.string().min(1),
  stage: z.string().min(1),
  mode: z.string().min(1),
  filteringAttributes: z.array(z.string()).default([]),
  preImageAttributes: z.array(z.string()).default([]),
  assemblyName: z.string().min(1),
  pluginTypeName: z.string().min(1),
});

function detectQuotedValues(content: string, regex: RegExp): string[] {
  const matches = new Set<string>();
  for (const match of content.matchAll(regex)) {
    if (match[1]) {
      matches.add(match[1]);
    }
  }

  return Array.from(matches);
}

export function getPluginTools(runtime: D365ToolRuntime): D365ToolDefinition[] {
  return [
    {
      name: "d365_list_plugin_steps",
      category: "Plugin",
      status: "Planned",
      description: "List plugin steps registered in the target CRM environment.",
      inputSchema: {
        type: "object",
        properties: {
          entityLogicalName: { type: "string" },
          messageName: { type: "string" },
          profileName: { type: "string" },
        },
        additionalProperties: false,
      },
      outputSchema: { type: "object" },
      promptExample: "查询 incident Update 上注册了哪些插件步骤，并分析递归触发风险。",
      async handler(argumentsObject) {
        listPluginStepsArgsSchema.parse(argumentsObject || {});
        return buildPlannedToolResult("OnPremADAdapter", "Plugin step discovery is planned for the .NET Organization Service connector.");
      },
    },
    {
      name: "d365_analyze_plugin_code",
      category: "Plugin",
      status: "Implemented",
      description: "Analyze local C# plugin code for Dynamics CRM plugin delivery risks.",
      inputSchema: {
        type: "object",
        required: ["codePath", "entityLogicalName", "messageName"],
        properties: {
          codePath: { type: "string" },
          entityLogicalName: { type: "string" },
          messageName: { type: "string" },
          profileName: { type: "string" },
        },
        additionalProperties: false,
      },
      outputSchema: { type: "object" },
      promptExample: "检查这个插件代码是否符合 Dynamics CRM 插件开发规范，并根据当前 CRM 元数据验证字段名是否正确。",
      async handler(argumentsObject) {
        const args = analyzePluginCodeArgsSchema.parse(argumentsObject || {});
        const absolutePath = path.isAbsolute(args.codePath) ? args.codePath : path.resolve(process.cwd(), args.codePath);
        const content = await readFile(absolutePath, "utf8");

        const detectedEntities = detectQuotedValues(content, /new\s+Entity\("([^"]+)"\)/g);
        const detectedAttributes = [
          ...detectQuotedValues(content, /GetAttributeValue<[^>]+>\("([^"]+)"\)/g),
          ...detectQuotedValues(content, /Contains\("([^"]+)"\)/g),
          ...detectQuotedValues(content, /\["([^"]+)"\]/g),
        ].filter((value, index, array) => array.indexOf(value) === index);

        const risks: Array<{ level: "low" | "medium" | "high"; message: string }> = [];
        if (!/context\.Depth|pluginExecutionContext\.Depth|executionContext\.Depth/.test(content)) {
          risks.push({ level: "high", message: "Plugin does not check context.Depth; recursive execution risk may exist." });
        }
        if (!/ITracingService|Trace\(/.test(content)) {
          risks.push({ level: "medium", message: "Plugin does not appear to use ITracingService for diagnostics." });
        }
        if (!/InvalidPluginExecutionException/.test(content)) {
          risks.push({ level: "medium", message: "Plugin does not throw InvalidPluginExecutionException explicitly; error handling may be weak." });
        }
        if (!/Target/.test(content)) {
          risks.push({ level: "high", message: "Target entity validation was not detected in the plugin code." });
        }
        if (!/PreEntityImages|PostEntityImages/.test(content) && /Update/i.test(args.messageName)) {
          risks.push({ level: "low", message: "No pre/post image usage detected. Verify whether old values are required for update logic." });
        }

        const recommendations = [
          "Validate filtering attributes and images during plugin step registration.",
          "Use tracing logs around business-critical decisions and external calls.",
          "Keep field logical names aligned with CRM metadata before deployment.",
        ];

        const metadataValidationNotes: string[] = [];
        try {
          const entityMetadata = (await runtime.getEntityMetadata(args.entityLogicalName, args.profileName)) as {
            Attributes?: Array<{ LogicalName?: string }>;
          };
          const validAttributes = new Set((entityMetadata.Attributes || []).map((item) => String(item.LogicalName || "")).filter(Boolean));
          const missingAttributes = detectedAttributes.filter((attribute) => !validAttributes.has(attribute));
          if (missingAttributes.length > 0) {
            risks.push({
              level: "medium",
              message: `Some detected field names were not found in CRM metadata: ${missingAttributes.join(", ")}.`,
            });
          }
        } catch {
          metadataValidationNotes.push("CRM metadata validation could not be completed. Local code analysis still succeeded.");
        }

        return {
          codePath: absolutePath,
          detectedEntities,
          detectedAttributes,
          risks,
          recommendations,
          metadataValidationNotes,
        };
      },
    },
    {
      name: "d365_generate_plugin_template",
      category: "Plugin",
      status: "Implemented",
      description: "Generate a standard Dynamics CRM plugin template in C#.",
      inputSchema: {
        type: "object",
        required: ["entityLogicalName", "messageName", "stage", "mode", "namespace", "className"],
        properties: {
          entityLogicalName: { type: "string" },
          messageName: { type: "string" },
          stage: { type: "string" },
          mode: { type: "string" },
          filteringAttributes: { type: "array", items: { type: "string" } },
          preImageAttributes: { type: "array", items: { type: "string" } },
          namespace: { type: "string" },
          className: { type: "string" },
        },
        additionalProperties: false,
      },
      outputSchema: { type: "object" },
      promptExample: "基于 incident Update PreOperation 生成一个标准插件模板，包括 Depth 检查、Target 校验、PreImage 读取和 Tracing 日志。",
      async handler(argumentsObject) {
        const args = generatePluginTemplateArgsSchema.parse(argumentsObject || {});
        const code = `using System;\nusing Microsoft.Xrm.Sdk;\n\nnamespace ${args.namespace}\n{\n    public class ${args.className} : IPlugin\n    {\n        public void Execute(IServiceProvider serviceProvider)\n        {\n            var context = (IPluginExecutionContext)serviceProvider.GetService(typeof(IPluginExecutionContext));\n            var tracingService = (ITracingService)serviceProvider.GetService(typeof(ITracingService));\n\n            if (context.Depth > 1)\n            {\n                tracingService.Trace(\"Skip recursive execution. Depth={0}\", context.Depth);\n                return;\n            }\n\n            if (!context.InputParameters.Contains(\"Target\") || context.InputParameters[\"Target\"] is not Entity target)\n            {\n                tracingService.Trace(\"Target entity is missing.\");\n                return;\n            }\n\n            if (!string.Equals(target.LogicalName, \"${args.entityLogicalName}\", StringComparison.OrdinalIgnoreCase))\n            {\n                tracingService.Trace(\"Unexpected entity {0}.\", target.LogicalName);\n                return;\n            }\n\n            Entity? preImage = null;\n            if (context.PreEntityImages.Contains(\"PreImage\"))\n            {\n                preImage = context.PreEntityImages[\"PreImage\"];\n            }\n\n            tracingService.Trace(\"Executing ${args.className} for ${args.entityLogicalName} ${args.messageName} ${args.stage}/${args.mode}.\");\n\n            try\n            {\n                // TODO: Implement business logic.\n                // Filtering attributes: ${args.filteringAttributes.join(", ") || "(none specified)"}\n                // PreImage attributes: ${args.preImageAttributes.join(", ") || "(none specified)"}\n            }\n            catch (Exception ex)\n            {\n                tracingService.Trace(\"${args.className} failed: {0}\", ex);\n                throw new InvalidPluginExecutionException(\"${args.className} failed.\", ex);\n            }\n        }\n    }\n}\n`;

        return {
          fileName: `${args.className}.cs`,
          code,
        };
      },
    },
    {
      name: "d365_generate_plugin_registration_note",
      category: "Plugin",
      status: "Implemented",
      description: "Generate plugin registration notes for delivery and deployment teams.",
      inputSchema: {
        type: "object",
        required: ["entityLogicalName", "messageName", "stage", "mode", "assemblyName", "pluginTypeName"],
        properties: {
          entityLogicalName: { type: "string" },
          messageName: { type: "string" },
          stage: { type: "string" },
          mode: { type: "string" },
          filteringAttributes: { type: "array", items: { type: "string" } },
          preImageAttributes: { type: "array", items: { type: "string" } },
          assemblyName: { type: "string" },
          pluginTypeName: { type: "string" },
        },
        additionalProperties: false,
      },
      outputSchema: { type: "object" },
      promptExample: "为这个插件生成 Plugin Registration Tool 注册说明。",
      async handler(argumentsObject) {
        const args = generateRegistrationArgsSchema.parse(argumentsObject || {});
        const markdown = [
          "## Plugin Registration",
          `- Assembly: ${args.assemblyName}`,
          `- Plugin Type: ${args.pluginTypeName}`,
          `- Message: ${args.messageName}`,
          `- Primary Entity: ${args.entityLogicalName}`,
          `- Stage: ${args.stage}`,
          `- Mode: ${args.mode}`,
          `- Filtering Attributes: ${args.filteringAttributes.join(", ") || "(none)"}`,
          `- Pre Image Attributes: ${args.preImageAttributes.join(", ") || "(none)"}`,
          "- Registration Note: Verify depth control, tracing, and image aliases before deployment.",
        ].join("\n");

        return { markdown };
      },
    },
  ];
}
