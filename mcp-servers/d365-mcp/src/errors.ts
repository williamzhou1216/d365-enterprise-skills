import { ZodError } from "zod";

export type D365ErrorCode =
  | "profile_not_found"
  | "missing_env_var"
  | "unsupported_auth_type"
  | "connection_failed"
  | "not_implemented"
  | "readonly_violation"
  | "configuration_error"
  | "invalid_arguments"
  | "internal_error";

export interface D365ErrorPayload {
  success: false;
  errorCode: D365ErrorCode;
  message: string;
  details?: unknown;
  plannedAdapter?: string;
}

export class D365ToolError extends Error {
  constructor(
    public readonly errorCode: D365ErrorCode,
    message: string,
    public readonly details?: unknown,
    public readonly plannedAdapter?: string,
  ) {
    super(message);
    this.name = "D365ToolError";
  }
}

export function buildErrorPayload(
  errorCode: D365ErrorCode,
  message: string,
  details?: unknown,
  plannedAdapter?: string,
): D365ErrorPayload {
  return {
    success: false,
    errorCode,
    message,
    ...(details ? { details } : {}),
    ...(plannedAdapter ? { plannedAdapter } : {}),
  };
}

export function notImplementedResult(message: string, plannedAdapter: string): D365ErrorPayload {
  return buildErrorPayload("not_implemented", message, undefined, plannedAdapter);
}

export function mapErrorToPayload(error: unknown): D365ErrorPayload {
  if (error instanceof D365ToolError) {
    return buildErrorPayload(error.errorCode, error.message, error.details, error.plannedAdapter);
  }

  if (error instanceof ZodError) {
    return buildErrorPayload("invalid_arguments", "Tool arguments failed validation.", {
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  if (error instanceof Error) {
    return buildErrorPayload("internal_error", error.message);
  }

  return buildErrorPayload("internal_error", String(error));
}

export function throwToolError(
  errorCode: D365ErrorCode,
  message: string,
  details?: unknown,
  plannedAdapter?: string,
): never {
  throw new D365ToolError(errorCode, message, details, plannedAdapter);
}
