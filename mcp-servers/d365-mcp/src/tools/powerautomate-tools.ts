import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import type { D365ToolDefinition } from "./tool-types.js";

const validateFilterArgsSchema = z.object({
  entityLogicalName: z.string().min(1),
  filter: z.string().min(1),
});

const generateFilterArgsSchema = z.object({
  entityLogicalName: z.string().min(1),
  conditions: z.array(
    z.object({
      field: z.string().min(1),
      operator: z.enum(["eq", "ne", "gt", "ge", "lt", "le", "contains", "startswith", "endswith"]),
      value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
      type: z.enum(["string", "number", "boolean", "null"]),
    }),
  ).min(1),
});

const analyzeFlowArgsSchema = z.object({
  flowJsonPath: z.string().min(1),
});

function extractDetectedFields(filter: string): string[] {
  const regex = /([A-Za-z_][A-Za-z0-9_]*)\s+(eq|ne|gt|ge|lt|le)\s+/g;
  const fields = new Set<string>();
  for (const match of filter.matchAll(regex)) {
    fields.add(match[1]);
  }
  return Array.from(fields);
}

function normalizeConditionValue(type: string, value: string | number | boolean | null): string {
  if (type === "string") {
    return `'${String(value).replaceAll("'", "''")}'`;
  }
  if (type === "boolean") {
    return String(value).toLowerCase();
  }
  if (type === "null") {
    return "null";
  }
  return String(value);
}

function flattenObjectKeys(node: unknown, results: string[], prefix = ""): void {
  if (Array.isArray(node)) {
    node.forEach((item, index) => flattenObjectKeys(item, results, `${prefix}[${index}]`));
    return;
  }

  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      results.push(nextPrefix);
      flattenObjectKeys(value, results, nextPrefix);
    }
  }
}

function collectMatchingValues(node: unknown, predicate: (key: string, value: unknown) => boolean, matches: unknown[]): void {
  if (Array.isArray(node)) {
    node.forEach((item) => collectMatchingValues(item, predicate, matches));
    return;
  }

  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (predicate(key, value)) {
        matches.push(value);
      }
      collectMatchingValues(value, predicate, matches);
    }
  }
}

export function getPowerAutomateTools(): D365ToolDefinition[] {
  return [
    {
      name: "d365_validate_odata_filter",
      category: "Power Automate/OData",
      status: "Implemented",
      description: "Validate a Dataverse OData Filter Rows expression.",
      inputSchema: {
        type: "object",
        required: ["entityLogicalName", "filter"],
        properties: {
          entityLogicalName: { type: "string" },
          filter: { type: "string" },
        },
        additionalProperties: false,
      },
      outputSchema: { type: "object" },
      promptExample: "帮我检查这个 Power Automate Dataverse Filter Rows 是否写法正确。",
      async handler(argumentsObject) {
        const args = validateFilterArgsSchema.parse(argumentsObject || {});
        const normalizedFilter = args.filter.replace(/\s+/g, " ").trim();
        const risks: Array<{ level: "low" | "medium" | "high"; message: string }> = [];
        const singleQuotesCount = (normalizedFilter.match(/'/g) || []).length;

        if (singleQuotesCount % 2 !== 0) {
          risks.push({ level: "high", message: "Single quotes appear to be unbalanced." });
        }
        if (/\b(or)\b/i.test(normalizedFilter) && /\b(and)\b/i.test(normalizedFilter) && !/[()]/.test(normalizedFilter)) {
          risks.push({ level: "medium", message: "Mixed and/or logic detected without parentheses. Review operator precedence." });
        }
        if (/contains\(/i.test(normalizedFilter)) {
          risks.push({ level: "low", message: "contains() can be expensive for large datasets. Verify index and selectivity." });
        }

        return {
          isValid: singleQuotesCount % 2 === 0,
          entityLogicalName: args.entityLogicalName,
          detectedFields: extractDetectedFields(normalizedFilter),
          risks,
          normalizedFilter,
        };
      },
    },
    {
      name: "d365_generate_odata_filter",
      category: "Power Automate/OData",
      status: "Implemented",
      description: "Generate a Dataverse OData Filter Rows expression from structured conditions.",
      inputSchema: {
        type: "object",
        required: ["entityLogicalName", "conditions"],
        properties: {
          entityLogicalName: { type: "string" },
          conditions: { type: "array", items: { type: "object" } },
        },
        additionalProperties: false,
      },
      outputSchema: { type: "object" },
      promptExample: "根据电话号码生成 Power Automate Dataverse List rows 的 Filter Rows 条件。",
      async handler(argumentsObject) {
        const args = generateFilterArgsSchema.parse(argumentsObject || {});
        const filter = args.conditions
          .map((condition) => {
            if (["contains", "startswith", "endswith"].includes(condition.operator)) {
              return `${condition.operator}(${condition.field}, ${normalizeConditionValue(condition.type, condition.value)})`;
            }

            return `${condition.field} ${condition.operator} ${normalizeConditionValue(condition.type, condition.value)}`;
          })
          .join(" and ");

        return {
          entityLogicalName: args.entityLogicalName,
          filter,
          notes: [
            "Use parentheses manually if you later combine and/or precedence.",
            "Quote escaping for string literals is handled automatically.",
          ],
        };
      },
    },
    {
      name: "d365_analyze_power_automate_flow",
      category: "Power Automate/OData",
      status: "Implemented",
      description: "Analyze an exported Power Automate flow JSON for Dataverse delivery risks.",
      inputSchema: {
        type: "object",
        required: ["flowJsonPath"],
        properties: {
          flowJsonPath: { type: "string" },
        },
        additionalProperties: false,
      },
      outputSchema: { type: "object" },
      promptExample: "分析这个 Power Automate Flow 的 Dataverse 操作和连接引用，生成部署风险说明。",
      async handler(argumentsObject) {
        const args = analyzeFlowArgsSchema.parse(argumentsObject || {});
        const absolutePath = path.isAbsolute(args.flowJsonPath)
          ? args.flowJsonPath
          : path.resolve(process.cwd(), args.flowJsonPath);
        const rawContent = await readFile(absolutePath, "utf8");
        const flow = JSON.parse(rawContent) as Record<string, unknown>;

        const objectKeys: string[] = [];
        flattenObjectKeys(flow, objectKeys);
        const actionKeys = objectKeys.filter((key) => /actions/i.test(key));
        const triggerKeys = objectKeys.filter((key) => /triggers/i.test(key));
        const connectionReferences: unknown[] = [];
        const environmentVariables: unknown[] = [];
        collectMatchingValues(flow, (key) => /connectionreference/i.test(key), connectionReferences);
        collectMatchingValues(flow, (key, value) => /environmentvariable/i.test(key) || (typeof value === "string" && /environmentvariable/i.test(value)), environmentVariables);

        const risks: Array<{ level: "low" | "medium" | "high"; message: string }> = [];
        if (connectionReferences.length > 0) {
          risks.push({ level: "medium", message: "Connection references were detected. Validate rebinding in the target environment." });
        }
        if (objectKeys.some((key) => /filter|filterarray|filterrows/i.test(key))) {
          risks.push({ level: "low", message: "Filter-related steps detected. Review OData expressions during deployment validation." });
        }

        return {
          flowName: String((flow.properties as { displayName?: string } | undefined)?.displayName || path.basename(absolutePath, path.extname(absolutePath))),
          triggers: triggerKeys,
          actions: actionKeys,
          connectionReferences,
          environmentVariables,
          risks,
        };
      },
    },
  ];
}
