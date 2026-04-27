import type { D365ToolDefinition, D365ToolRuntime } from "./tool-types.js";
import { getAuthTools } from "./auth-tools.js";
import { getDeliveryDocTools } from "./delivery-doc-tools.js";
import { getFormViewTools } from "./form-view-tools.js";
import { getMetadataTools } from "./metadata-tools.js";
import { getPluginTools } from "./plugin-tools.js";
import { getPowerAutomateTools } from "./powerautomate-tools.js";
import { getSolutionTools } from "./solution-tools.js";
import { getTestingTools } from "./testing-tools.js";
import { getWebResourceTools } from "./webresource-tools.js";
import { getWriteTools } from "./write-tools.js";

export function getAllTools(runtime: D365ToolRuntime): D365ToolDefinition[] {
  return [
    ...getAuthTools(runtime),
    ...getMetadataTools(runtime),
    ...getFormViewTools(),
    ...getSolutionTools(),
    ...getPluginTools(runtime),
    ...getWebResourceTools(runtime),
    ...getPowerAutomateTools(),
    ...getTestingTools(),
    ...getDeliveryDocTools(),
    ...getWriteTools(),
  ];
}
