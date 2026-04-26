import { z } from "zod";

import { buildPlannedToolResult, type D365ToolDefinition } from "./tool-types.js";

const listFormsArgsSchema = z.object({
  entityLogicalName: z.string().min(1),
  formType: z.enum(["main", "quickCreate", "quickView", "card", "all"]).optional().default("all"),
  profileName: z.string().min(1).optional(),
});

const getFormConfigArgsSchema = z.object({
  entityLogicalName: z.string().min(1),
  formId: z.string().min(1),
  includeEventHandlers: z.boolean().optional().default(true),
  profileName: z.string().min(1).optional(),
});

const listViewsArgsSchema = z.object({
  entityLogicalName: z.string().min(1),
  viewType: z.enum(["system", "personal", "all"]).optional().default("all"),
  profileName: z.string().min(1).optional(),
});

const analyzeViewArgsSchema = z.object({
  entityLogicalName: z.string().min(1),
  viewId: z.string().min(1),
  profileName: z.string().min(1).optional(),
});

export function getFormViewTools(): D365ToolDefinition[] {
  return [
    {
      name: "d365_list_forms",
      category: "Forms/Views",
      status: "Planned",
      description: "List entity forms for the current CRM profile.",
      inputSchema: {
        type: "object",
        required: ["entityLogicalName"],
        properties: {
          entityLogicalName: { type: "string" },
          formType: { type: "string", enum: ["main", "quickCreate", "quickView", "card", "all"], default: "all" },
          profileName: { type: "string" },
        },
        additionalProperties: false,
      },
      outputSchema: { type: "object" },
      promptExample: "列出 incident 实体的主窗体，并分析哪些窗体需要检查脚本事件。",
      async handler(argumentsObject) {
        listFormsArgsSchema.parse(argumentsObject || {});
        return buildPlannedToolResult("OnlineOAuthAdapter", "Form metadata querying is planned for a later phase.");
      },
    },
    {
      name: "d365_get_form_configuration",
      category: "Forms/Views",
      status: "Planned",
      description: "Read and analyze tabs, sections, controls, and handlers from a CRM form.",
      inputSchema: {
        type: "object",
        required: ["entityLogicalName", "formId"],
        properties: {
          entityLogicalName: { type: "string" },
          formId: { type: "string" },
          includeEventHandlers: { type: "boolean", default: true },
          profileName: { type: "string" },
        },
        additionalProperties: false,
      },
      outputSchema: { type: "object" },
      promptExample: "分析 incident 主窗体上的字段、控件和 JS 事件绑定，指出潜在风险。",
      async handler(argumentsObject) {
        getFormConfigArgsSchema.parse(argumentsObject || {});
        return buildPlannedToolResult("OnlineOAuthAdapter", "Form XML parsing through the CRM metadata layer is planned for a later phase.");
      },
    },
    {
      name: "d365_list_views",
      category: "Forms/Views",
      status: "Planned",
      description: "List system or personal views for an entity.",
      inputSchema: {
        type: "object",
        required: ["entityLogicalName"],
        properties: {
          entityLogicalName: { type: "string" },
          viewType: { type: "string", enum: ["system", "personal", "all"], default: "all" },
          profileName: { type: "string" },
        },
        additionalProperties: false,
      },
      outputSchema: { type: "object" },
      promptExample: "列出 account 的系统视图，并分析 Active Accounts 的过滤条件和展示列。",
      async handler(argumentsObject) {
        listViewsArgsSchema.parse(argumentsObject || {});
        return buildPlannedToolResult("OnlineOAuthAdapter", "Saved query discovery is planned for a later phase.");
      },
    },
    {
      name: "d365_analyze_view_fetchxml",
      category: "Forms/Views",
      status: "Planned",
      description: "Analyze a CRM view FetchXML definition for filters, joins, and risks.",
      inputSchema: {
        type: "object",
        required: ["entityLogicalName", "viewId"],
        properties: {
          entityLogicalName: { type: "string" },
          viewId: { type: "string" },
          profileName: { type: "string" },
        },
        additionalProperties: false,
      },
      outputSchema: { type: "object" },
      promptExample: "分析这个视图 FetchXML 是否存在性能风险。",
      async handler(argumentsObject) {
        analyzeViewArgsSchema.parse(argumentsObject || {});
        return buildPlannedToolResult("OnlineOAuthAdapter", "FetchXML view analysis is planned for a later phase.");
      },
    },
  ];
}
