import type { ResolvedD365Profile } from "../profiles/d365-profile.js";
import {
  buildOnPremNotImplementedDetails,
  type D365ConnectionAdapter,
  throwOnPremNotImplemented,
} from "./d365-connection-adapter.js";

export class OnPremADFSAdapter implements D365ConnectionAdapter {
  constructor(private readonly profile: ResolvedD365Profile) {}

  async connect(): Promise<void> {
    return;
  }

  async testConnection(): Promise<unknown> {
    return buildOnPremNotImplementedDetails(this.profile, "OnPremADFSAdapter", "testConnection");
  }

  async listEntities(): Promise<unknown[]> {
    return throwOnPremNotImplemented(this.profile, "OnPremADFSAdapter", "listEntities");
  }

  async getEntityMetadata(): Promise<unknown> {
    return throwOnPremNotImplemented(this.profile, "OnPremADFSAdapter", "getEntityMetadata");
  }

  async getAttributeMetadata(): Promise<unknown> {
    return throwOnPremNotImplemented(this.profile, "OnPremADFSAdapter", "getAttributeMetadata");
  }

  async getOptionSet(): Promise<unknown> {
    return throwOnPremNotImplemented(this.profile, "OnPremADFSAdapter", "getOptionSet");
  }

  async listRelationships(): Promise<unknown[]> {
    return throwOnPremNotImplemented(this.profile, "OnPremADFSAdapter", "listRelationships");
  }
}
