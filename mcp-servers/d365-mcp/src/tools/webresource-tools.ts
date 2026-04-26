import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { buildPlannedToolResult, type D365ToolDefinition, type D365ToolRuntime } from "./tool-types.js";

const listWebResourcesArgsSchema = z.object({
  nameFilter: z.string().min(1).optional(),
  type: z.enum(["javascript", "html", "css", "all"]).optional().default("all"),
  profileName: z.string().min(1).optional(),
});

const analyzeWebResourceArgsSchema = z.object({
  filePath: z.string().min(1),
  entityLogicalName: z.string().min(1),
});

const generateTypingsArgsSchema = z.object({
  entityLogicalName: z.string().min(1),
  outputPath: z.string().min(1),
  includeOptionSets: z.boolean().optional().default(true),
  profileName: z.string().min(1).optional(),
});

const generateWebResourceTemplateArgsSchema = z.object({
  entityLogicalName: z.string().min(1),
  namespace: z.string().min(1),
  events: z.array(z.string().min(1)).min(1),
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

function normalizeTsType(attributeType: string): string {
  const normalized = attributeType.toLowerCase();
  if (normalized.includes("picklist") || normalized.includes("state") || normalized.includes("status") || normalized.includes("int")) {
    return "number | null";
  }
  if (normalized.includes("decimal") || normalized.includes("double") || normalized.includes("money")) {
    return "number | null";
  }
  if (normalized.includes("boolean")) {
    return "boolean | null";
  }
  if (normalized.includes("datetime")) {
    return "Date | null";
  }
  if (normalized.includes("lookup") || normalized.includes("customer") || normalized.includes("owner")) {
    return "string | null";
  }
  return "string | null";
}

export function getWebResourceTools(runtime: D365ToolRuntime): D365ToolDefinition[] {
  return [
    {
      name: "d365_list_webresources",
      category: "WebResource/PCF",
      status: "Planned",
      description: "List Web Resources from the target CRM environment.",
      inputSchema: {
        type: "object",
        properties: {
          nameFilter: { type: "string" },
          type: { type: "string", enum: ["javascript", "html", "css", "all"], default: "all" },
          profileName: { type: "string" },
        },
        additionalProperties: false,
      },
      outputSchema: { type: "object" },
      promptExample: "列出包含 case 的 JavaScript Web Resource，并检查是否被窗体引用。",
      async handler(argumentsObject) {
        listWebResourcesArgsSchema.parse(argumentsObject || {});
        return buildPlannedToolResult("OnlineOAuthAdapter", "Web Resource discovery from CRM metadata is planned for a later phase.");
      },
    },
    {
      name: "d365_analyze_webresource_js",
      category: "WebResource/PCF",
      status: "Implemented",
      description: "Analyze local JavaScript Web Resources for UCI and formContext readiness.",
      inputSchema: {
        type: "object",
        required: ["filePath", "entityLogicalName"],
        properties: {
          filePath: { type: "string" },
          entityLogicalName: { type: "string" },
        },
        additionalProperties: false,
      },
      outputSchema: { type: "object" },
      promptExample: "检查这个 Web Resource JS 是否符合 UCI 规范，是否还在使用 Xrm.Page。",
      async handler(argumentsObject) {
        const args = analyzeWebResourceArgsSchema.parse(argumentsObject || {});
        const absolutePath = path.isAbsolute(args.filePath) ? args.filePath : path.resolve(process.cwd(), args.filePath);
        const content = await readFile(absolutePath, "utf8");

        const detectedXrmApis = [
          ...detectQuotedValues(content, /(Xrm\.[A-Za-z0-9_.]+)/g),
          ...(content.includes("Xrm.Page") ? ["Xrm.Page"] : []),
        ].filter((value, index, array) => array.indexOf(value) === index);

        const detectedAttributes = [
          ...detectQuotedValues(content, /getAttribute\("([^"]+)"\)/g),
          ...detectQuotedValues(content, /getControl\("([^"]+)"\)/g),
        ].filter((value, index, array) => array.indexOf(value) === index);

        const risks: Array<{ level: "low" | "medium" | "high"; message: string }> = [];
        if (/Xrm\.Page/.test(content)) {
          risks.push({ level: "medium", message: "Xrm.Page is deprecated; use executionContext.getFormContext()." });
        }
        if (!/getFormContext\(/.test(content)) {
          risks.push({ level: "medium", message: "No formContext usage detected. Review UCI compatibility." });
        }
        if (!/executionContext/.test(content)) {
          risks.push({ level: "low", message: "executionContext parameter was not detected. Event handler signatures may be incomplete." });
        }

        return {
          filePath: absolutePath,
          entityLogicalName: args.entityLogicalName,
          detectedXrmApis,
          detectedAttributes,
          risks,
          recommendations: [
            "Use executionContext.getFormContext() for form scripts.",
            "Keep field logical names synchronized with metadata-generated typings.",
            "Avoid deprecated Xrm.Page patterns in UCI implementations.",
          ],
        };
      },
    },
    {
      name: "d365_generate_xrm_typings",
      category: "WebResource/PCF",
      status: "Implemented",
      description: "Generate TypeScript typings from Dataverse entity metadata for Web Resource or PCF development.",
      inputSchema: {
        type: "object",
        required: ["entityLogicalName", "outputPath"],
        properties: {
          entityLogicalName: { type: "string" },
          outputPath: { type: "string" },
          includeOptionSets: { type: "boolean", default: true },
          profileName: { type: "string" },
        },
        additionalProperties: false,
      },
      outputSchema: { type: "object" },
      promptExample: "根据 incident 元数据生成 TypeScript 类型定义，方便 Web Resource 开发。",
      async handler(argumentsObject) {
        const args = generateTypingsArgsSchema.parse(argumentsObject || {});
        const rawEntity = (await runtime.getEntityMetadata(args.entityLogicalName, args.profileName)) as {
          Attributes?: Array<{ LogicalName?: string; AttributeType?: string; AttributeTypeName?: { Value?: string } }>;
        };

        const lines = [
          `export interface ${args.entityLogicalName[0].toUpperCase()}${args.entityLogicalName.slice(1)}Attributes {`,
        ];
        for (const attribute of rawEntity.Attributes || []) {
          const logicalName = attribute.LogicalName;
          if (!logicalName) {
            continue;
          }
          const attributeType = attribute.AttributeTypeName?.Value || attribute.AttributeType || "String";
          lines.push(`  ${logicalName}?: ${normalizeTsType(attributeType)};`);
        }
        lines.push("}");

        return {
          outputPath: args.outputPath,
          content: lines.join("\n"),
        };
      },
    },
    {
      name: "d365_generate_webresource_template",
      category: "WebResource/PCF",
      status: "Implemented",
      description: "Generate a standard JavaScript Web Resource template for UCI forms.",
      inputSchema: {
        type: "object",
        required: ["entityLogicalName", "namespace", "events"],
        properties: {
          entityLogicalName: { type: "string" },
          namespace: { type: "string" },
          events: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
      outputSchema: { type: "object" },
      promptExample: "生成一个 incident 主窗体使用的 JavaScript Web Resource 模板，包含 onLoad、onSave 和字段 onChange。",
      async handler(argumentsObject) {
        const args = generateWebResourceTemplateArgsSchema.parse(argumentsObject || {});
        const eventFunctions = args.events
          .map((eventName) => {
            const functionName = eventName.replace(/[^A-Za-z0-9_]/g, "_");
            return `  ${functionName}: function (executionContext) {\n    var formContext = executionContext.getFormContext();\n    void formContext;\n    // TODO: Implement ${eventName} logic for ${args.entityLogicalName}.\n  }`;
          })
          .join(",\n");

        const code = `var ${args.namespace.split(".")[0]} = ${args.namespace.split(".")[0]} || {};\n${args.namespace} = {\n${eventFunctions}\n};\n`;
        return {
          fileName: `${args.entityLogicalName}_form.js`,
          code,
        };
      },
    },
  ];
}
