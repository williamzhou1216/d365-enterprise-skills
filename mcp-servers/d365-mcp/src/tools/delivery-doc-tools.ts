import { z } from "zod";

import { generateDeploymentChecklist, analyzeSolutionFolder } from "./solution-tools.js";
import type { D365ToolDefinition } from "./tool-types.js";

const designDocArgsSchema = z.object({
  projectName: z.string().min(1),
  modules: z.array(z.string().min(1)).min(1),
  entities: z.array(z.string().min(1)).min(1),
  includeIntegration: z.boolean().optional().default(true),
  includeSecurity: z.boolean().optional().default(true),
  outputFormat: z.enum(["markdown", "json"]).optional().default("markdown"),
});

const securityMatrixArgsSchema = z.object({
  roles: z.array(z.string().min(1)).min(1),
  entities: z.array(z.string().min(1)).min(1),
  outputFormat: z.enum(["markdown", "json"]).optional().default("markdown"),
});

const cutoverArgsSchema = z.object({
  projectName: z.string().min(1),
  environmentFrom: z.string().min(1),
  environmentTo: z.string().min(1),
  solutionFolder: z.string().min(1),
  includeRollback: z.boolean().optional().default(true),
});

export function getDeliveryDocTools(): D365ToolDefinition[] {
  return [
    {
      name: "d365_generate_solution_design_doc",
      category: "Delivery Docs",
      status: "Implemented",
      description: "Generate a Dynamics 365 solution design document skeleton.",
      inputSchema: {
        type: "object",
        required: ["projectName", "modules", "entities"],
        properties: {
          projectName: { type: "string" },
          modules: { type: "array", items: { type: "string" } },
          entities: { type: "array", items: { type: "string" } },
          includeIntegration: { type: "boolean", default: true },
          includeSecurity: { type: "boolean", default: true },
          outputFormat: { type: "string", enum: ["markdown", "json"], default: "markdown" },
        },
        additionalProperties: false,
      },
      outputSchema: { type: "object" },
      promptExample: "基于当前 CRM 元数据和项目模块生成一份 Dynamics 365 Customer Service 技术方案文档。",
      async handler(argumentsObject) {
        const args = designDocArgsSchema.parse(argumentsObject || {});
        const markdown = [
          `## Solution Design Document - ${args.projectName}`,
          "",
          "### Scope",
          `- Modules: ${args.modules.join(", ")}`,
          `- Entities: ${args.entities.join(", ")}`,
          "",
          "### Data Model",
          ...args.entities.map((entity) => `- ${entity}`),
          ...(args.includeIntegration ? ["", "### Integration", "- Define upstream and downstream systems, interfaces, and error handling."] : []),
          ...(args.includeSecurity ? ["", "### Security", "- Define business units, teams, roles, field security, and access model."] : []),
        ].join("\n");

        return { markdown };
      },
    },
    {
      name: "d365_generate_security_matrix",
      category: "Delivery Docs",
      status: "Implemented",
      description: "Generate a security role matrix for Dynamics CRM entities.",
      inputSchema: {
        type: "object",
        required: ["roles", "entities"],
        properties: {
          roles: { type: "array", items: { type: "string" } },
          entities: { type: "array", items: { type: "string" } },
          outputFormat: { type: "string", enum: ["markdown", "json"], default: "markdown" },
        },
        additionalProperties: false,
      },
      outputSchema: { type: "object" },
      promptExample: "为客服系统管理员、座席主管、座席生成 Dynamics CRM 权限矩阵。",
      async handler(argumentsObject) {
        const args = securityMatrixArgsSchema.parse(argumentsObject || {});
        const matrix = args.roles.map((role) => ({
          role,
          permissions: args.entities.map((entity) => ({
            entity,
            read: true,
            create: role.toLowerCase().includes("admin") || role.toLowerCase().includes("supervisor"),
            update: true,
            delete: role.toLowerCase().includes("admin"),
          })),
        }));

        const markdown = [
          "## Security Role Matrix",
          "",
          "| Role | Entity | Read | Create | Update | Delete |",
          "|---|---|---|---|---|---|",
          ...matrix.flatMap((row) =>
            row.permissions.map(
              (permission) =>
                `| ${row.role} | ${permission.entity} | ${permission.read ? "Y" : "N"} | ${permission.create ? "Y" : "N"} | ${permission.update ? "Y" : "N"} | ${permission.delete ? "Y" : "N"} |`,
            ),
          ),
        ].join("\n");

        return {
          matrix,
          ...(args.outputFormat === "markdown" ? { markdown } : {}),
        };
      },
    },
    {
      name: "d365_generate_cutover_plan",
      category: "Delivery Docs",
      status: "Implemented",
      description: "Generate a cutover plan including rollback and validation tasks.",
      inputSchema: {
        type: "object",
        required: ["projectName", "environmentFrom", "environmentTo", "solutionFolder"],
        properties: {
          projectName: { type: "string" },
          environmentFrom: { type: "string" },
          environmentTo: { type: "string" },
          solutionFolder: { type: "string" },
          includeRollback: { type: "boolean", default: true },
        },
        additionalProperties: false,
      },
      outputSchema: { type: "object" },
      promptExample: "基于当前 Solution 生成正式环境上线切换计划，包括回滚步骤和上线后验证。",
      async handler(argumentsObject) {
        const args = cutoverArgsSchema.parse(argumentsObject || {});
        const analysis = await analyzeSolutionFolder(args.solutionFolder, { includeXmlSummary: true, includeRiskAnalysis: true });
        const checklist = await generateDeploymentChecklist(args.solutionFolder, "prod", { includePostDeploymentValidation: true });

        const cutoverTasks = [
          `Confirm ${args.environmentFrom} sign-off and deployment window approval for ${args.projectName}.`,
          "Freeze configuration changes before production import.",
          "Deploy solution package and validate environment variables / connection references.",
        ];
        const rollbackTasks = args.includeRollback
          ? [
              "Keep previous stable package ready for rollback.",
              "Revert configuration references and validate smoke tests after rollback.",
            ]
          : [];
        const validationTasks = (checklist.postDeployment as string[]) || [];

        const markdown = [
          `## Cutover Plan - ${args.projectName}`,
          `- From: ${args.environmentFrom}`,
          `- To: ${args.environmentTo}`,
          `- Solution: ${analysis.solution.localizedName || analysis.solution.uniqueName || analysis.solutionFolder}`,
          "",
          "### Cutover Tasks",
          ...cutoverTasks.map((task) => `- ${task}`),
          ...(rollbackTasks.length > 0 ? ["", "### Rollback Tasks", ...rollbackTasks.map((task) => `- ${task}`)] : []),
          "",
          "### Validation Tasks",
          ...validationTasks.map((task) => `- ${task}`),
        ].join("\n");

        return {
          cutoverTasks,
          rollbackTasks,
          validationTasks,
          markdown,
        };
      },
    },
  ];
}
