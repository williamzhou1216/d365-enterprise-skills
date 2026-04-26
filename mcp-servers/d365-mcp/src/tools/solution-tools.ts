import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import type { D365ToolDefinition } from "./tool-types.js";

const analyzeArgsSchema = z.object({
  folderPath: z.string().min(1),
});

const compareArgsSchema = z.object({
  currentFolderPath: z.string().min(1),
  previousFolderPath: z.string().min(1),
});

const releaseNoteArgsSchema = z.object({
  folderPath: z.string().min(1),
  previousFolderPath: z.string().min(1).optional(),
});

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

function countByGroup(relativeFilePaths: string[]): Record<string, number> {
  const groups: Record<string, number> = {
    entities: 0,
    webResources: 0,
    pluginCode: 0,
    workflows: 0,
    security: 0,
    dashboards: 0,
    other: 0,
  };

  for (const relativeFilePath of relativeFilePaths) {
    const normalizedPath = relativeFilePath.replace(/\\/g, "/");

    if (/\/Entities\//i.test(normalizedPath)) {
      groups.entities += 1;
      continue;
    }

    if (/\/WebResources\//i.test(normalizedPath) || /\.(js|ts|html|css)$/i.test(normalizedPath)) {
      groups.webResources += 1;
      continue;
    }

    if (/\.(cs|csproj|dll)$/i.test(normalizedPath) || /plugin/i.test(normalizedPath)) {
      groups.pluginCode += 1;
      continue;
    }

    if (/workflow|cloudflow|powerautomate/i.test(normalizedPath)) {
      groups.workflows += 1;
      continue;
    }

    if (/security|role|fieldsecurity/i.test(normalizedPath)) {
      groups.security += 1;
      continue;
    }

    if (/dashboard/i.test(normalizedPath)) {
      groups.dashboards += 1;
      continue;
    }

    groups.other += 1;
  }

  return groups;
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

async function analyzeSolutionFolder(folderPath: string): Promise<unknown> {
  const absoluteFolderPath = resolveFolderPath(folderPath);
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

  const risks: string[] = [];
  if (!solutionXmlPath) {
    risks.push("Solution.xml was not found. Verify that the folder is an unpacked solution or exported artifact.");
  }
  if (!customizationsXmlPath) {
    risks.push("Customizations.xml was not found. Component coverage may be incomplete.");
  }
  if (!relativeFiles.some((filePath) => /\.(cs|js|ts)$/i.test(filePath))) {
    risks.push("No code artifacts were detected. If plugins or web resources are expected, verify the unpack folder.");
  }

  return {
    folderPath: absoluteFolderPath,
    solution: {
      uniqueName: solutionXml ? parseXmlValue(solutionXml, "UniqueName") : undefined,
      version: solutionXml ? parseXmlValue(solutionXml, "Version") : undefined,
      localizedName: solutionXml ? parseXmlValue(solutionXml, "LocalizedName") : undefined,
      publisher: solutionXml ? parseXmlValue(solutionXml, "PublisherName") : undefined,
    },
    files: {
      total: relativeFiles.length,
      sample: relativeFiles.slice(0, 30),
      topLevelFolders: Array.from(topLevelFolders),
    },
    components: countByGroup(relativeFiles),
    indicators: {
      hasSolutionXml: Boolean(solutionXmlPath),
      hasCustomizationsXml: Boolean(customizationsXmlPath),
      formCountHint: customizationsXml ? (customizationsXml.match(/<form /gi) || []).length : 0,
      savedQueryCountHint: customizationsXml ? (customizationsXml.match(/<savedquery /gi) || []).length : 0,
      relationshipCountHint: customizationsXml ? (customizationsXml.match(/<relationship /gi) || []).length : 0,
    },
    risks,
    recommendations: [
      "Use d365_compare_solution_folders before release packaging to isolate added, removed, and changed artifacts.",
      "Validate plugin field references against d365_get_attribute_metadata before deployment.",
      "Keep PROD profiles readonly=true and run metadata-only checks from MCP.",
    ],
  };
}

async function compareSolutionFolders(currentFolderPath: string, previousFolderPath: string): Promise<unknown> {
  const currentAbsolutePath = resolveFolderPath(currentFolderPath);
  const previousAbsolutePath = resolveFolderPath(previousFolderPath);

  const [currentFileMap, previousFileMap, currentAnalysis, previousAnalysis] = await Promise.all([
    buildFileMap(currentAbsolutePath),
    buildFileMap(previousAbsolutePath),
    analyzeSolutionFolder(currentAbsolutePath),
    analyzeSolutionFolder(previousAbsolutePath),
  ]);

  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];

  for (const [relativePath, currentHash] of currentFileMap.entries()) {
    const previousHash = previousFileMap.get(relativePath);
    if (!previousHash) {
      added.push(relativePath);
      continue;
    }

    if (previousHash !== currentHash) {
      changed.push(relativePath);
    }
  }

  for (const relativePath of previousFileMap.keys()) {
    if (!currentFileMap.has(relativePath)) {
      removed.push(relativePath);
    }
  }

  return {
    currentFolderPath: currentAbsolutePath,
    previousFolderPath: previousAbsolutePath,
    summary: {
      addedCount: added.length,
      removedCount: removed.length,
      changedCount: changed.length,
    },
    added,
    removed,
    changed,
    currentAnalysis,
    previousAnalysis,
    risks: [
      ...(removed.length > 0 ? ["Removed artifacts detected. Verify downstream dependencies and managed property implications."] : []),
      ...(changed.some((filePath) => /plugin|\.cs$/i.test(filePath))
        ? ["Plugin or C# changes detected. Re-check step registration, images, and deployment sequence."]
        : []),
      ...(changed.some((filePath) => /customizations\.xml/i.test(filePath))
        ? ["Customizations.xml changed. Re-run metadata smoke checks before deployment."]
        : []),
    ],
  };
}

async function generateReleaseNote(folderPath: string, previousFolderPath?: string): Promise<unknown> {
  const analysis = await analyzeSolutionFolder(folderPath);
  const comparison = previousFolderPath
    ? await compareSolutionFolders(folderPath, previousFolderPath)
    : undefined;

  const releaseNoteLines = [
    "## Summary",
    `- Solution folder: ${resolveFolderPath(folderPath)}`,
  ];

  if (comparison && typeof comparison === "object" && comparison) {
    const comparisonSummary = (comparison as { summary: { addedCount: number; removedCount: number; changedCount: number } }).summary;
    releaseNoteLines.push(
      `- Added artifacts: ${comparisonSummary.addedCount}`,
      `- Removed artifacts: ${comparisonSummary.removedCount}`,
      `- Changed artifacts: ${comparisonSummary.changedCount}`,
    );
  }

  releaseNoteLines.push(
    "",
    "## Delivery Checks",
    "- Confirm current profile is readonly for PROD verification.",
    "- Validate plugin field references against CRM metadata.",
    "- Review removed artifacts and rollback path before import.",
    "",
    "## Rollback Suggestions",
    "- Keep the prior managed/unmanaged package available for rollback.",
    "- Export environment settings and connection references before deployment.",
    "- Re-run smoke tests for entity forms, plugins, and flows after rollback.",
  );

  return {
    analysis,
    comparison,
    releaseNoteMarkdown: releaseNoteLines.join("\n"),
  };
}

export function getSolutionTools(): D365ToolDefinition[] {
  return [
    {
      name: "d365_analyze_solution_folder",
      description: "Analyze an unpacked Dynamics solution folder and summarize delivery risks.",
      inputSchema: {
        type: "object",
        required: ["folderPath"],
        properties: {
          folderPath: { type: "string" },
        },
        additionalProperties: false,
      },
      async handler(argumentsObject) {
        const args = analyzeArgsSchema.parse(argumentsObject || {});
        return analyzeSolutionFolder(args.folderPath);
      },
    },
    {
      name: "d365_compare_solution_folders",
      description: "Compare two unpacked Dynamics solution folders and list changed artifacts.",
      inputSchema: {
        type: "object",
        required: ["currentFolderPath", "previousFolderPath"],
        properties: {
          currentFolderPath: { type: "string" },
          previousFolderPath: { type: "string" },
        },
        additionalProperties: false,
      },
      async handler(argumentsObject) {
        const args = compareArgsSchema.parse(argumentsObject || {});
        return compareSolutionFolders(args.currentFolderPath, args.previousFolderPath);
      },
    },
    {
      name: "d365_generate_release_note",
      description: "Generate a release note draft from an unpacked solution folder.",
      inputSchema: {
        type: "object",
        required: ["folderPath"],
        properties: {
          folderPath: { type: "string" },
          previousFolderPath: { type: "string" },
        },
        additionalProperties: false,
      },
      async handler(argumentsObject) {
        const args = releaseNoteArgsSchema.parse(argumentsObject || {});
        return generateReleaseNote(args.folderPath, args.previousFolderPath);
      },
    },
  ];
}
