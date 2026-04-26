import { z } from "zod";

import { buildPlannedToolResult, type D365ToolDefinition } from "./tool-types.js";

const generateUatArgsSchema = z.object({
  module: z.string().min(1),
  entities: z.array(z.string().min(1)).min(1),
  scenario: z.string().min(1),
  outputFormat: z.enum(["markdown", "json"]).optional().default("markdown"),
});

const fitGapArgsSchema = z.object({
  requirementsPath: z.string().min(1),
  targetProducts: z.array(z.string().min(1)).min(1),
  outputFormat: z.enum(["markdown", "json"]).optional().default("markdown"),
});

export function getTestingTools(): D365ToolDefinition[] {
  return [
    {
      name: "d365_generate_uat_test_cases",
      category: "Testing",
      status: "Implemented",
      description: "Generate UAT test cases for Dynamics CRM delivery scenarios.",
      inputSchema: {
        type: "object",
        required: ["module", "entities", "scenario"],
        properties: {
          module: { type: "string" },
          entities: { type: "array", items: { type: "string" } },
          scenario: { type: "string" },
          outputFormat: { type: "string", enum: ["markdown", "json"], default: "markdown" },
        },
        additionalProperties: false,
      },
      outputSchema: { type: "object" },
      promptExample: "基于 incident/account/contact 生成客户服务模块 UAT 测试用例。",
      async handler(argumentsObject) {
        const args = generateUatArgsSchema.parse(argumentsObject || {});
        const testCases = [
          {
            testCaseId: `UAT-${args.module.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase()}-001`,
            title: `Validate ${args.scenario}`,
            preconditions: ["User has required security role.", "Target reference data exists."],
            steps: [
              `Open the ${args.module} process entry point.`,
              `Execute the scenario using entities: ${args.entities.join(", ")}.`,
              "Save or submit the transaction.",
            ],
            expectedResult: "The business transaction completes successfully and all expected records or assignments are created.",
            priority: "High",
          },
        ];

        const markdown = [
          "## UAT Test Cases",
          ...testCases.flatMap((testCase) => [
            "",
            `### ${testCase.testCaseId} ${testCase.title}`,
            `- Priority: ${testCase.priority}`,
            `- Preconditions: ${testCase.preconditions.join("; ")}`,
            `- Steps: ${testCase.steps.join(" -> ")}`,
            `- Expected Result: ${testCase.expectedResult}`,
          ]),
        ].join("\n");

        return {
          testCases,
          ...(args.outputFormat === "markdown" ? { markdown } : {}),
        };
      },
    },
    {
      name: "d365_generate_fit_gap_analysis",
      category: "Testing",
      status: "Planned",
      description: "Generate a fit-gap analysis from a requirements source file.",
      inputSchema: {
        type: "object",
        required: ["requirementsPath", "targetProducts"],
        properties: {
          requirementsPath: { type: "string" },
          targetProducts: { type: "array", items: { type: "string" } },
          outputFormat: { type: "string", enum: ["markdown", "json"], default: "markdown" },
        },
        additionalProperties: false,
      },
      outputSchema: { type: "object" },
      promptExample: "读取需求清单，基于 Dynamics 365 Customer Service 和 Power Platform 生成 Fit-Gap 分析。",
      async handler(argumentsObject) {
        fitGapArgsSchema.parse(argumentsObject || {});
        return buildPlannedToolResult("OnlineOAuthAdapter", "Fit-gap generation from spreadsheet sources is planned for a later phase.");
      },
    },
  ];
}
