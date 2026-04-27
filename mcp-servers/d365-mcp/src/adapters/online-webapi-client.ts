import { fetch } from "undici";

import { D365ToolError } from "../errors.js";
import type { ResolvedD365Profile } from "../profiles/d365-profile.js";

interface OAuthTokenResponse {
  access_token: string;
  expires_in: number;
}

export class OnlineWebApiClient {
  private accessToken?: string;
  private accessTokenExpiresAt = 0;

  constructor(private readonly profile: ResolvedD365Profile) {}

  async get<T>(relativePath: string): Promise<T> {
    const response = await this.requestJson<T>("GET", relativePath);
    return response.data as T;
  }

  async tryGet<T>(relativePath: string): Promise<T | null> {
    try {
      return await this.get<T>(relativePath);
    } catch (error) {
      if (
        error instanceof D365ToolError &&
        error.errorCode === "connection_failed" &&
        typeof error.details === "object" &&
        error.details &&
        "status" in error.details &&
        (error.details as { status?: unknown }).status === 404
      ) {
        return null;
      }

      throw error;
    }
  }

  async post<T>(relativePath: string, body: unknown): Promise<{ data: T | null; headers: Record<string, string> }> {
    return this.requestJson<T>("POST", relativePath, body);
  }

  async patch<T>(relativePath: string, body: unknown): Promise<{ data: T | null; headers: Record<string, string> }> {
    return this.requestJson<T>("PATCH", relativePath, body);
  }

  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.accessTokenExpiresAt - 60_000) {
      return this.accessToken;
    }

    if (!this.profile.url || !this.profile.tenantId || !this.profile.clientId || !this.profile.clientSecret) {
      throw new D365ToolError("missing_env_var", "Online OAuth profile is missing one or more resolved credentials.", {
        profileName: this.profile.profileName,
      });
    }

    const tokenUrl = `https://login.microsoftonline.com/${this.profile.tenantId}/oauth2/v2.0/token`;
    const dataverseOrigin = new URL(this.profile.url).origin;

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.profile.clientId,
      client_secret: this.profile.clientSecret,
      scope: `${dataverseOrigin}/.default`,
    });

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new D365ToolError(
        "connection_failed",
        `Failed to acquire Dataverse token. ${response.status} ${response.statusText}.`,
        {
          profileName: this.profile.profileName,
          status: response.status,
          statusText: response.statusText,
          responsePreview: errorBody.slice(0, 1000),
        },
      );
    }

    const token = (await response.json()) as OAuthTokenResponse;
    this.accessToken = token.access_token;
    this.accessTokenExpiresAt = now + token.expires_in * 1000;
    return token.access_token;
  }

  private async requestJson<T>(
    method: "GET" | "POST" | "PATCH",
    relativePath: string,
    body?: unknown,
  ): Promise<{ data: T | null; headers: Record<string, string> }> {
    if (!this.profile.webApiUrl) {
      throw new D365ToolError("configuration_error", "Resolved profile is missing webApiUrl.", {
        profileName: this.profile.profileName,
      });
    }

    const accessToken = await this.getAccessToken();
    const webApiBaseUrl = this.profile.webApiUrl.replace(/\/$/, "");
    const requestUrl = `${webApiBaseUrl}/${relativePath.replace(/^\//, "")}`;

    const response = await fetch(requestUrl, {
      method,
      headers: {
        authorization: `Bearer ${accessToken}`,
        accept: "application/json",
        "content-type": "application/json",
        "odata-version": "4.0",
        "odata-maxversion": "4.0",
        prefer: 'return=representation,odata.include-annotations="*"',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

    const responseHeaders = Object.fromEntries(response.headers.entries());
    if (!response.ok) {
      const errorBody = await response.text();
      throw new D365ToolError(
        "connection_failed",
        `Dataverse Web API request failed. ${response.status} ${response.statusText}.`,
        {
          profileName: this.profile.profileName,
          requestUrl,
          method,
          status: response.status,
          statusText: response.statusText,
          responsePreview: errorBody.slice(0, 2000),
        },
      );
    }

    if (response.status === 204) {
      return { data: null, headers: responseHeaders };
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return { data: null, headers: responseHeaders };
    }

    return {
      data: (await response.json()) as T,
      headers: responseHeaders,
    };
  }
}
