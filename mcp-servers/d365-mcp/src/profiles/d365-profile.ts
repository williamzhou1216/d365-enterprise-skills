import { z } from "zod";

export const deploymentTypeSchema = z.enum(["online", "onprem", "onprem-ifd"]);
export const authTypeSchema = z.enum([
  "oauth-client-credentials",
  "windows-integrated",
  "adfs-claims",
  "adfs-oauth",
]);
export const apiTypeSchema = z.enum(["webapi", "organization-service"]);

export const d365ProfileDefinitionSchema = z
  .object({
    displayName: z.string().min(1),
    deploymentType: deploymentTypeSchema,
    authType: authTypeSchema,
    apiType: apiTypeSchema,
    readonly: z.boolean().default(true),
    urlEnv: z.string().min(1).optional(),
    webApiUrlEnv: z.string().min(1).optional(),
    organizationServiceUrlEnv: z.string().min(1).optional(),
    tenantIdEnv: z.string().min(1).optional(),
    clientIdEnv: z.string().min(1).optional(),
    clientSecretEnv: z.string().min(1).optional(),
    usernameEnv: z.string().min(1).optional(),
    passwordEnv: z.string().min(1).optional(),
    domainEnv: z.string().min(1).optional(),
    adfsUrlEnv: z.string().min(1).optional(),
    adfsAuthorityEnv: z.string().min(1).optional(),
    redirectUriEnv: z.string().min(1).optional(),
    notes: z.string().optional(),
  })
  .superRefine((profile, ctx) => {
    if (profile.deploymentType === "online") {
      if (profile.authType !== "oauth-client-credentials") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Online profiles currently require authType oauth-client-credentials.",
          path: ["authType"],
        });
      }

      if (profile.apiType !== "webapi") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Online profiles currently require apiType webapi.",
          path: ["apiType"],
        });
      }
    }

    if (profile.authType === "oauth-client-credentials") {
      for (const requiredField of ["urlEnv", "tenantIdEnv", "clientIdEnv", "clientSecretEnv"] as const) {
        if (!profile[requiredField]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${requiredField} is required for oauth-client-credentials profiles.`,
            path: [requiredField],
          });
        }
      }
    }

    if (profile.authType === "windows-integrated") {
      for (const requiredField of [
        "organizationServiceUrlEnv",
        "usernameEnv",
        "passwordEnv",
      ] as const) {
        if (!profile[requiredField]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${requiredField} is required for windows-integrated profiles.`,
            path: [requiredField],
          });
        }
      }
    }

    if (profile.authType === "adfs-claims") {
      for (const requiredField of [
        "organizationServiceUrlEnv",
        "adfsUrlEnv",
        "usernameEnv",
        "passwordEnv",
      ] as const) {
        if (!profile[requiredField]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${requiredField} is required for adfs-claims profiles.`,
            path: [requiredField],
          });
        }
      }
    }

    if (profile.authType === "adfs-oauth") {
      for (const requiredField of ["webApiUrlEnv", "adfsAuthorityEnv"] as const) {
        if (!profile[requiredField]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${requiredField} is required for adfs-oauth profiles.`,
            path: [requiredField],
          });
        }
      }
    }
  });

export const d365ConnectionsSchema = z
  .object({
    defaultProfile: z.string().min(1).optional(),
    profiles: z.record(z.string().min(1), d365ProfileDefinitionSchema),
  })
  .superRefine((config, ctx) => {
    if (config.defaultProfile && !(config.defaultProfile in config.profiles)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `defaultProfile '${config.defaultProfile}' does not exist in profiles.`,
        path: ["defaultProfile"],
      });
    }
  });

export type DeploymentType = z.infer<typeof deploymentTypeSchema>;
export type AuthType = z.infer<typeof authTypeSchema>;
export type ApiType = z.infer<typeof apiTypeSchema>;
export type D365ProfileDefinition = z.infer<typeof d365ProfileDefinitionSchema>;
export type D365ConnectionsFile = z.infer<typeof d365ConnectionsSchema>;

export interface ResolvedD365Profile extends D365ProfileDefinition {
  profileName: string;
  url?: string;
  webApiUrl?: string;
  organizationServiceUrl?: string;
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
  domain?: string;
  adfsUrl?: string;
  adfsAuthority?: string;
  redirectUri?: string;
}

export interface SanitizedD365Profile extends D365ProfileDefinition {
  profileName: string;
}
