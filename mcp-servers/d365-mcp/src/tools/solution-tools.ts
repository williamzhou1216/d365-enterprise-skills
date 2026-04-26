import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import type { D365ToolDefinition } from "./tool-types.js";

const analyzeArgsSchema = z.object({
  solutionFolder: z.string().min(1),
  includeXmlSummary: z.boolean().optional().default(true),
  includeRiskAnalysis: z.boolean().optional().default(true),
});

const compareArgsSchema = z.object({
  baseSolutionFolder: z.string().min(1),
  targetSolutionFolder: z.string().min(1),
});

const releaseNoteArgsSchema = z.object({
  solutionFolder: z.string().min(1),
  releaseVersion: z.string().min(1),
  outputFormat: z.enum(["markdown", "json"]).optional().default("markdown"),
  includeRollbackPlan: z.boolean().optional().default(true),
});

const deploymentChecklistArgsSchema = z.object({
  solutionFolder: z.string().min(1),
  environmentType: z.enum(["dev", "sit", "uat", "prod"]).optional().default("uat"),
  includePostDeploymentValidation: z.boolean().optional().default(true),
});

export interface SolutionFolderAnalysis {
  solutionFolder: string;
  solution: {
    uniqueName?: string;
    version?: string;
    localizedName?: string;
    publisher?: string;
  };
  entities: string[];
  attributes: string[];
  forms: string[];
  views: string[];
  webResources: string[];
  pluginAssemblies: string[];
  workflows: string[];
  environmentVariables: string[];
  connectionReferences: string[];
  xmlSummary?: {
    formCountHint: number;
    savedQueryCountHint: number;
    relationshipCountHint: number;
  };
  fileSummary: {
    totalFiles: number;
    topLevelFolders: string[];
    sampleFiles: string[];
  };
  risks: Array<{ level: "low" | "medium" | "high"; message: string }>;
}

function resolveFolderPath(folderPath: string): string {
  return path.isAbsolute(folderPath) ? folderPath : path.resolve(process.cwd(), folderPath);
}

async function collectFiles(folderPath: string): Promise<string[]> {
  const entries = await readdir(folderPath, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(folderPath, entry.name);
      if (entry.isDirectory()) {
        return collectFiles(fullPath);
      }

      return [fullPath];
    }),
  );

  return nestedFiles.flat();
}

function parseXmlValue(xmlContent: string, tagName: string): string | undefined {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, "i");
  return xmlContent.match(regex)?.[1]?.trim();
}

async function tryReadText(filePath?: string): Promise<string | undefined> {
  if (!filePath) {
    return undefined;
  }

  try {
    return await readFile(filePath, "utf8");
  } catch {
    return undefined;
  }
}

function extractComponentName(relativePath: string): string {
  const normalizedPath = relativePath.replace(/\\/g, "/");
  const fileName = normalizedPath.split("/").at(-1) || normalizedPath;
  return fileName.replace(/\.[^.]+$/, "");
}

function pushUnique(target: string[], value: string): void {
  if (!target.includes(value)) {
    target.push(value);
  }
}

export async function analyzeSolutionFolder(solutionFolder: string, options?: { includeXmlSummary?: boolean; includeRiskAnalysis?: boolean }): Promise<SolutionFolderAnalysis> {
  const absoluteFolderPath = resolveFolderPath(solutionFolder);
  const folderStats = await stat(absoluteFolderPath);
  if (!folderStats.isDirectory()) {
    throw new Error(`'${absoluteFolderPath}' is not a directory.`);
  }

  const files = await collectFiles(absoluteFolderPath);
  const relativeFiles = files.map((filePath) => path.relative(absoluteFolderPath, filePath));
  const topLevelFolders = new Set(relativeFiles.map((filePath) => filePath.split(path.sep)[0]).filter(Boolean));
  const solutionXmlPath = files.find((filePath) => /(^|\\|\/)solution\.xml$/i.test(filePath));
  const customizationsXmlPath = files.find((filePath) => /(^|\\|\/)customizations\.xml$/i.test(filePath));
  const solutionXml = await tryReadText(solutionXmlPath);
  const customizationsXml = await tryReadText(customizationsXmlPath);

  const entities: string[] = [];
  const attributes: string[] = [];
  const forms: string[] = [];
  const views: string[] = [];
  const webResources: string[] = [];
  const pluginAssemblies: string[] = [];
  const workflows: string[] = [];
  const environmentVariables: string[] = [];
  const connectionReferences: string[] = [];

  for (const relativePath of relativeFiles) {
    const normalizedPath = relativePath.replace(/\\/g, "/");
    const componentName = extractComponentName(relativePath);

    if (/\/Entities\//i.test(normalizedPath)) {
      pushUnique(entities, componentName);
    }

    if (/attribute/i.test(normalizedPath)) {
      pushUnique(attributes, componentName);
    }

    if (/\/Forms\//i.test(normalizedPath) || /formxml/i.test(normalizedPath)) {
      pushUnique(forms, componentName);
    }

    if (/\/Views\//i.test(normalizedPath) || /savedquery/i.test(normalizedPath)) {
      pushUnique(views, componentName);
    }

    if (/\/WebResources\//i.test(normalizedPath) || /\.(js|ts|html|css|resx)$/i.test(normalizedPath)) {
      pushUnique(webResources, normalizedPath);
    }

    if (/\.(dll|csproj|cs)$/i.test(normalizedPath) || /plugin/i.test(normalizedPath)) {
      pushUnique(pluginAssemblies, componentName);
    }

    if (/workflow|cloudflow|powerautomate/i.test(normalizedPath)) {
      pushUnique(workflows, componentName);
    }

    if (/environmentvariable/i.test(normalizedPath)) {
      pushUnique(environmentVariables, componentName);
    }

    if (/connectionreference/i.test(normalizedPath)) {
      pushUnique(connectionReferences, componentName);
    }
  }

  const risks: SolutionFolderAnalysis["risks"] = [];

  if (options?.includeRiskAnalysis !== false) {
    if (!solutionXmlPath) {
      risks.push({ level: "high", message: "Solution.xml was not found. Verify that the folder is an unpacked solution." });
    }
    if (!customizationsXmlPath) {
      risks.push({ level: "medium", message: "Customizations.xml was not found. UI and metadata coverage may be incomplete." });
    }
    if (pluginAssemblies.length > 0) {
      risks.push({ level: "medium", message: "Plugin artifacts detected. Re-check step registration, images, assembly versioning, and deployment sequence." });
    }
    if (connectionReferences.length > 0) {
      risks.push({ level: "medium", message: "Connection references detected. Validate target environment bindings before deployment." });
    }
    if (environmentVariables.length > 0) {
      risks.push({ level: "medium", message: "Environment variables detected. Verify values for each target environment." });
    }
    if (webResources.some((item) => /xrm\.page/i.test(item))) {
      risks.push({ level: "low", message: "Potential legacy Web Resource naming detected. Review UCI compatibility if needed." });
    }
  }

  return {
    solutionFolder: absoluteFolderPath,
    solution: {
      uniqueName: solutionXml ? parseXmlValue(solutionXml, "UniqueName") : undefined,
      version: solutionXml ? parseXmlValue(solutionXml, "Version") : undefined,
      localizedName: solutionXml ? parseXmlValue(solutionXml, "LocalizedName") : undefined,
      publisher: solutionXml ? parseXmlValue(solutionXml, "PublisherName") : undefined,
    },
    entities,
    attributes,
    forms,
    views,
    webResources,
    pluginAssemblies,
    workflows,
    environmentVariables,
    connectionReferences,
    ...(options?.includeXmlSummary === false
      ? {}
      : {
          xmlSummary: {
            formCountHint: customizationsXml ? (customizationsXml.match(/<form /gi) || []).length : 0,
            savedQueryCountHint: customizationsXml ? (customizationsXml.match(/<savedquery /gi) || []).length : 0,
            relationshipCountHint: customizationsXml ? (customizationsXml.match(/<relationship /gi) || []).length : 0,
          },
        }),
    fileSummary: {
      totalFiles: relativeFiles.length,
      topLevelFolders: Array.from(topLevelFolders),
      sampleFiles: relativeFiles.slice(0, 30),
    },
    risks,
  };
}

async function hashFile(filePath: string): Promise<string> {
  const fileBuffer = await readFile(filePath);
  return createHash("sha1").update(fileBuffer).digest("hex");
}

async function buildFileMap(folderPath: string): Promise<Map<string, string>> {
  const files = await collectFiles(folderPath);
  const pairs = await Promise.all(
    files.map(async (filePath) => [path.relative(folderPath, filePath), await hashFile(filePath)] as const),
  );
  return new Map(pairs);
}

function classifyRelativePath(relativePath: string): { componentType: string; componentName: string; path: string } {
  const normalizedPath = relativePath.replace(/\\/g, "/");

  if (/\/Entities\//i.test(normalizedPath)) {
    return { componentType: "Entity", componentName: extractComponentName(relativePath), path: normalizedPath };
  }
  if (/\/Forms\//i.test(normalizedPath) || /formxml/i.test(normalizedPath)) {
    return { componentType: "Form", componentName: extractComponentName(relativePath), path: normalizedPath };
  }
  if (/\/Views\//i.test(normalizedPath) || /savedquery/i.test(normalizedPath)) {
    return { componentType: "View", componentName: extractComponentName(relativePath), path: normalizedPath };
  }
  if (/\/WebResources\//i.test(normalizedPath) || /\.(js|ts|html|css|resx)$/i.test(normalizedPath)) {
    return { componentType: "WebResource", componentName: extractComponentName(relativePath), path: normalizedPath };
  }
  if (/\.(dll|csproj|cs)$/i.test(normalizedPath) || /plugin/i.test(normalizedPath)) {
    return { componentType: "Plugin", componentName: extractComponentName(relativePath), path: normalizedPath };
  }
  if (/workflow|cloudflow|powerautomate/i.test(normalizedPath)) {
    return { componentType: "Flow", componentName: extractComponentName(relativePath), path: normalizedPath };
  }
  if (/environmentvariable/i.test(normalizedPath)) {
    return { componentType: "EnvironmentVariable", componentName: extractComponentName(relativePath), path: normalizedPath };
  }
  if (/connectionreference/i.test(normalizedPath)) {
    return { componentType: "ConnectionReference", componentName: extractComponentName(relativePath), path: normalizedPath };
  }

  return { componentType: "Other", componentName: extractComponentName(relativePath), path: normalizedPath };
}

export async function compareSolutionFolders(baseSolutionFolder: string, targetSolutionFolder: string): Promise<Record<string, unknown>> {
  const baseAbsolutePath = resolveFolderPath(baseSolutionFolder);
  const targetAbsolutePath = resolveFolderPath(targetSolutionFolder);

  const [baseFileMap, targetFileMap] = await Promise.all([
    buildFileMap(baseAbsolutePath),
    buildFileMap(targetAbsolutePath),
  ]);

  const added: Array<Record<string, unknown>> = [];
  const modified: Array<Record<string, unknown>> = [];
  const removed: Array<Record<string, unknown>> = [];

  for (const [relativePath, targetHash] of targetFileMap.entries()) {
    const baseHash = baseFileMap.get(relativePath);
    if (!baseHash) {
      added.push(classifyRelativePath(relativePath));
      continue;
    }

    if (baseHash !== targetHash) {
      modified.push(classifyRelativePath(relativePath));
    }
  }

  for (const relativePath of baseFileMap.keys()) {
    if (!targetFileMap.has(relativePath)) {
      removed.push(classifyRelativePath(relativePath));
    }
  }

  const riskSummary = [
    ...(removed.length > 0 ? ["Removed components detected. Validate dependencies and rollback strategy."] : []),
    ...(modified.some((item) => item.componentType === "Plugin")
      ? ["Plugin-related changes detected. Re-check step registration, depth protection, and assembly version handling."]
      : []),
    ...(modified.some((item) => item.componentType === "Flow")
      ? ["Power Automate changes detected. Validate connection references and environment variables in the target environment."]
      : []),
  ];

  return {
    baseSolutionFolder: baseAbsolutePath,
    targetSolutionFolder: targetAbsolutePath,
    added,
    modified,
    removed,
    riskSummary,
  };
}

export async function generateReleaseNote(
  solutionFolder: string,
  releaseVersion: string,
  options?: { includeRollbackPlan?: boolean },
): Promise<Record<string, unknown>> {
  const analysis = await analyzeSolutionFolder(solutionFolder, { includeXmlSummary: true, includeRiskAnalysis: true });
  const markdownLines = [
    `## Release Note ${releaseVersion}`,
    "",
    "### Scope",
    `- Solution: ${analysis.solution.localizedName || analysis.solution.uniqueName || path.basename(analysis.solutionFolder)}`,
    `- Version: ${analysis.solution.version || releaseVersion}`,
    `- Entities: ${analysis.entities.length}`,
    `- Forms: ${analysis.forms.length}`,
    `- Views: ${analysis.views.length}`,
    `- Web Resources: ${analysis.webResources.length}`,
    `- Plugin Artifacts: ${analysis.pluginAssemblies.length}`,
    `- Workflows / Flows: ${analysis.workflows.length}`,
    "",
    "### Risks",
    ...(analysis.risks.length > 0
      ? analysis.risks.map((risk) => `- [${risk.level.toUpperCase()}] ${risk.message}`)
      : ["- No major solution-folder risks were detected from the local artifact structure."]),
  ];

  if (options?.includeRollbackPlan !== false) {
    markdownLines.push(
      "",
      "### Rollback Plan",
      "- Keep the previous solution package available for rollback.",
      "- Export current environment variables and connection references before import.",
      "- Re-run form, plugin, and flow smoke tests after any rollback.",
    );
  }

  return {
    releaseVersion,
    markdown: markdownLines.join("\n"),
    analysis,
  };
}

export async function generateDeploymentChecklist(
  solutionFolder: string,
  environmentType: "dev" | "sit" | "uat" | "prod",
  options?: { includePostDeploymentValidation?: boolean },
): Promise<Record<string, unknown>> {
  const analysis = await analyzeSolutionFolder(solutionFolder, { includeXmlSummary: true, includeRiskAnalysis: true });
  const preDeployment = [
    "Confirm the active D365 profile points to the intended target environment.",
    "Validate environment variables and connection references for the target environment.",
    "Export a backup solution or confirm rollback package availability.",
    ...(environmentType === "prod" ? ["Confirm PROD profile is readonly for all pre-checks."] : []),
  ];

  const deployment = [
    "Import the solution in the correct sequence with dependencies satisfied.",
    ...(analysis.pluginAssemblies.length > 0 ? ["Verify plugin assembly deployment and step registration order."] : []),
    ...(analysis.workflows.length > 0 ? ["Rebind or validate Power Automate connection references after import."] : []),
  ];

  const postDeployment = options?.includePostDeploymentValidation === false
    ? []
    : [
        "Run smoke tests for primary entities, forms, and views.",
        ...(analysis.pluginAssemblies.length > 0 ? ["Run plugin transaction and recursion smoke tests."] : []),
        ...(analysis.webResources.length > 0 ? ["Validate Web Resource loading and browser console errors."] : []),
        ...(analysis.workflows.length > 0 ? ["Trigger key flows and confirm successful execution history."] : []),
      ];

  const rollback = [
    "Stop deployment and capture logs if validation fails.",
    "Re-import the previous stable package or revert managed layer according to release governance.",
    "Re-validate forms, plugins, and flows after rollback.",
  ];

  return {
    preDeployment,
    deployment,
    postDeployment,
    rollback,
    analysis,
  };
}

export function getSolutionTools(): D365ToolDefinition[] {
  return [
    {
      name: "d365_analyze_solution_folder",
      category: "Solution",
      status: "Implemented",
      description: "Analyze an unpacked Dynamics solution folder and produce a delivery-oriented component summary.",
      inputSchema: {
        type: "object",
        required: ["solutionFolder"],
        properties: {
          solutionFolder: { type: "string" },
          includeXmlSummary: { type: "boolean", default: true },
          includeRiskAnalysis: { type: "boolean", default: true },
        },
        additionalProperties: false,
      },
      outputSchema: { type: "object" },
      promptExample: "分析本地 unpacked solution，生成组件清单、发布风险和上线检查项。",
      async handler(argumentsObject) {
        const args = analyzeArgsSchema.parse(argumentsObject || {});
        return analyzeSolutionFolder(args.solutionFolder, {
          includeXmlSummary: args.includeXmlSummary,
          includeRiskAnalysis: args.includeRiskAnalysis,
        });
      },
    },
    {
      name: "d365_compare_solution_folders",
      category: "Solution",
      status: "Implemented",
      description: "Compare two unpacked solution folders and identify added, modified, and removed components.",
      inputSchema: {
        type: "object",
        required: ["baseSolutionFolder", "targetSolutionFolder"],
        properties: {
          baseSolutionFolder: { type: "string" },
          targetSolutionFolder: { type: "string" },
        },
        additionalProperties: false,
      },
      outputSchema: { type: "object" },
      promptExample: "对比 v1 和 v2 的 Solution 文件夹，告诉我这次发布改了哪些组件。",
      async handler(argumentsObject) {
        const args = compareArgsSchema.parse(argumentsObject || {});
        return compareSolutionFolders(args.baseSolutionFolder, args.targetSolutionFolder);
      },
    },
    {
      name: "d365_generate_release_note",
      category: "Solution",
      status: "Implemented",
      description: "Generate a release note draft from a solution folder.",
      inputSchema: {
        type: "object",
        required: ["solutionFolder", "releaseVersion"],
        properties: {
          solutionFolder: { type: "string" },
          releaseVersion: { type: "string" },
          outputFormat: { type: "string", enum: ["markdown", "json"], default: "markdown" },
          includeRollbackPlan: { type: "boolean", default: true },
        },
        additionalProperties: false,
      },
      outputSchema: { type: "object" },
      promptExample: "基于当前 Solution 生成一份客户可读的发布说明，包括发布范围、影响模块、风险和回滚建议。",
      async handler(argumentsObject) {
        const args = releaseNoteArgsSchema.parse(argumentsObject || {});
        return generateReleaseNote(args.solutionFolder, args.releaseVersion, {
          includeRollbackPlan: args.includeRollbackPlan,
        });
      },
    },
    {
      name: "d365_generate_deployment_checklist",
      category: "Solution",
      status: "Implemented",
      description: "Generate deployment, validation, and rollback checklists for a solution release.",
      inputSchema: {
        type: "object",
        required: ["solutionFolder"],
        properties: {
          solutionFolder: { type: "string" },
          environmentType: { type: "string", enum: ["dev", "sit", "uat", "prod"], default: "uat" },
          includePostDeploymentValidation: { type: "boolean", default: true },
        },
        additionalProperties: false,
      },
      outputSchema: { type: "object" },
      promptExample: "帮我为这个 Solution 生成 UAT 上线检查清单和上线后验证清单。",
      async handler(argumentsObject) {
        const args = deploymentChecklistArgsSchema.parse(argumentsObject || {});
        return generateDeploymentChecklist(args.solutionFolder, args.environmentType, {
          includePostDeploymentValidation: args.includePostDeploymentValidation,
        });
      },
    },
  ];
}
