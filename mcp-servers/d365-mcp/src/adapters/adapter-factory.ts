import type { ResolvedD365Profile } from "../profiles/d365-profile.js";
import { throwToolError } from "../errors.js";
import type { D365ConnectionAdapter } from "./d365-connection-adapter.js";
import { OnlineOAuthAdapter } from "./online-oauth-adapter.js";
import { OnPremADAdapter } from "./onprem-ad-adapter.js";
import { OnPremADFSAdapter } from "./onprem-adfs-adapter.js";
import { OnPremIFDAdapter } from "./onprem-ifd-adapter.js";

export function createConnectionAdapter(profile: ResolvedD365Profile): D365ConnectionAdapter {
  if (profile.deploymentType === "online" && profile.authType === "oauth-client-credentials") {
    return new OnlineOAuthAdapter(profile);
  }

  if (profile.deploymentType === "onprem" && profile.authType === "windows-integrated") {
    return new OnPremADAdapter(profile);
  }

  if (profile.deploymentType === "onprem" && profile.authType === "adfs-claims") {
    return new OnPremADFSAdapter(profile);
  }

  if (profile.deploymentType === "onprem-ifd" && profile.authType === "adfs-oauth") {
    return new OnPremIFDAdapter(profile);
  }

  throwToolError(
    "unsupported_auth_type",
    `Unsupported profile combination: deploymentType='${profile.deploymentType}', authType='${profile.authType}', apiType='${profile.apiType}'.`,
    {
      profileName: profile.profileName,
      deploymentType: profile.deploymentType,
      authType: profile.authType,
      apiType: profile.apiType,
    },
  );
}
