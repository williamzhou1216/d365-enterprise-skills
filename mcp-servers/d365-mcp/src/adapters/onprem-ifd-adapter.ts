import type { ResolvedD365Profile } from "../profiles/d365-profile.js";
import {
  buildOnPremNotImplementedDetails,
  type D365ConnectionAdapter,
  throwOnPremNotImplemented,
} from "./d365-connection-adapter.js";

export class OnPremIFDAdapter implements D365ConnectionAdapter {
  constructor(private readonly profile: ResolvedD365Profile) {}

  async connect(): Promise<void> {
    return;
  }

  async testConnection(): Promise<unknown> {
    return {
      ...buildOnPremNotImplementedDetails(this.profile, "OnPremIFDAdapter", "testConnection"),
      message:
        "On-Premises IFD is reserved for a later phase. Profile loading works now, but ADFS OAuth and Web API execution still require a dedicated connector implementation.",
    };
  }

  async listEntities(): Promise<unknown[]> {
    return throwOnPremNotImplemented(this.profile, "OnPremIFDAdapter", "listEntities");
  }

  async getEntityMetadata(): Promise<unknown> {
    return throwOnPremNotImplemented(this.profile, "OnPremIFDAdapter", "getEntityMetadata");
  }

  async getAttributeMetadata(): Promise<unknown> {
    return throwOnPremNotImplemented(this.profile, "OnPremIFDAdapter", "getAttributeMetadata");
  }

  async getOptionSet(): Promise<unknown> {
    return throwOnPremNotImplemented(this.profile, "OnPremIFDAdapter", "getOptionSet");
  }

  async listRelationships(): Promise<unknown[]> {
    return throwOnPremNotImplemented(this.profile, "OnPremIFDAdapter", "listRelationships");
  }
}
