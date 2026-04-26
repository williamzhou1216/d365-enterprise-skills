import type { ResolvedD365Profile } from "../profiles/d365-profile.js";
import {
  buildOnPremNotImplementedDetails,
  type D365ConnectionAdapter,
  throwOnPremNotImplemented,
} from "./d365-connection-adapter.js";

export class OnPremADAdapter implements D365ConnectionAdapter {
  constructor(private readonly profile: ResolvedD365Profile) {}

  async connect(): Promise<void> {
    return;
  }

  async testConnection(): Promise<unknown> {
    return buildOnPremNotImplementedDetails(this.profile, "OnPremADAdapter", "testConnection");
  }

  async listEntities(): Promise<unknown[]> {
    return throwOnPremNotImplemented(this.profile, "OnPremADAdapter", "listEntities");
  }

  async getEntityMetadata(): Promise<unknown> {
    return throwOnPremNotImplemented(this.profile, "OnPremADAdapter", "getEntityMetadata");
  }

  async getAttributeMetadata(): Promise<unknown> {
    return throwOnPremNotImplemented(this.profile, "OnPremADAdapter", "getAttributeMetadata");
  }

  async getOptionSet(): Promise<unknown> {
    return throwOnPremNotImplemented(this.profile, "OnPremADAdapter", "getOptionSet");
  }

  async listRelationships(): Promise<unknown[]> {
    return throwOnPremNotImplemented(this.profile, "OnPremADAdapter", "listRelationships");
  }
}
