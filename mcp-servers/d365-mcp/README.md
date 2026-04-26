# d365-mcp

`d365-mcp` is an OpenCode MCP server for Dynamics 365 / Dataverse delivery work. It is designed for consulting and implementation teams that need a maintainable bridge between OpenCode and customer CRM environments without hardcoding secrets into source control or `opencode.jsonc`.

The current implementation uses a TypeScript Node.js MCP server as the control plane:

- MCP protocol handling
- profile loading and secret indirection
- Online Dataverse OAuth support
- metadata and solution-analysis tools
- On-Premises profile support with clear `.NET Connector` extension points

## 1. What d365-mcp is

`d365-mcp` provides a delivery-oriented MCP layer for:

- environment profile switching
- connection testing
- Dataverse metadata lookup
- field dictionary generation support
- unpacked solution analysis
- release-note drafting
- plugin delivery validation workflows
- future On-Premises Organization Service integration

The architecture is intentionally split:

- Node.js MCP server: protocol, profile management, tool exposure
- future `.NET Connector`: On-Premises AD / ADFS / Organization Service connectivity

## 2. Supported connection types

Current support level:

- Online OAuth: prioritized and implemented in this phase
- OnPrem AD: profile supported, execution reserved, recommended through .NET Connector
- OnPrem ADFS: profile supported, execution reserved, recommended through .NET Connector
- OnPrem IFD: profile model reserved for later enhancement

Supported profile types:

- Dynamics 365 Online / Dataverse Online
- Dynamics CRM On-Premises internal AD
- Dynamics CRM On-Premises ADFS / Claims
- Dynamics CRM On-Premises IFD

## 3. Online configuration

Use OAuth client credentials with Entra ID App Registration and Dataverse Application User.

Steps:

1. Create an App Registration in Entra ID.
2. Create a client secret or certificate.
3. Add an Application User in the Dataverse environment.
4. Assign the required security role.
5. Put the real values in `.env.local`.
6. Map the environment variable names in `config/d365-connections.json`.

Recommended API type:

- `deploymentType=online`
- `authType=oauth-client-credentials`
- `apiType=webapi`

## 4. On-Premises AD configuration

Use this profile for internal CRM deployments that rely on Windows Integrated Authentication, NTLM, or Kerberos.

Recommended configuration:

- `deploymentType=onprem`
- `authType=windows-integrated`
- `apiType=organization-service`

Important notes:

- On-Premises AD does not always work well through Web API.
- Organization Service is usually the more stable integration path.
- The first version of `d365-mcp` reserves this profile and recommends a `.NET Connector` execution layer.

## 5. On-Premises ADFS configuration

Use this profile when the customer has already enabled Claims-Based Authentication.

Recommended configuration:

- `deploymentType=onprem`
- `authType=adfs-claims`
- `apiType=organization-service`

Requirements:

- customer ADFS endpoint is reachable
- Claims-Based Authentication is already enabled in CRM
- Organization Service URL is confirmed

The current Node.js layer keeps the profile contract and tool routing ready, while the actual connector execution is reserved for `.NET`.

## 6. On-Premises IFD configuration

Use this profile for external-facing On-Premises environments that rely on ADFS + IFD.

Recommended configuration:

- `deploymentType=onprem-ifd`
- `authType=adfs-oauth`
- `apiType=webapi`

Important notes:

- IFD requires DNS, certificates, ADFS, relying party trust, and CRM IFD URLs to be correctly configured.
- This phase provides the profile structure and extension interface.
- Full ADFS OAuth / Web API support is reserved for a later phase.

## 7. Enable MCP in OpenCode

Copy the example OpenCode config:

```bash
cp .opencode/opencode.example.jsonc .opencode/opencode.jsonc
```

Example MCP configuration:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "d365": {
      "type": "local",
      "command": "node",
      "args": [
        "./mcp-servers/d365-mcp/dist/index.js"
      ],
      "enabled": true,
      "env": {
        "D365_PROFILE": "{env:D365_PROFILE}",
        "D365_CONNECTIONS_FILE": "{env:D365_CONNECTIONS_FILE}"
      }
    }
  }
}
```

## 8. Switch environment profiles

PowerShell:

```powershell
$env:D365_PROFILE="customerA-online-dev"
opencode
```

Switch to On-Prem AD:

```powershell
$env:D365_PROFILE="customerA-op-internal-ad"
opencode
```

Linux / macOS:

```bash
export D365_PROFILE=customerA-online-dev
opencode
```

The MCP server resolves the active profile in this order:

1. explicit tool argument `profileName`
2. environment variable `D365_PROFILE`
3. `defaultProfile` from `config/d365-connections.json`

## 9. Test connection

Build the MCP server first:

```bash
cd mcp-servers/d365-mcp
npm install
npm run build
```

Then test the current profile:

```bash
npm run test:connection
```

Show the current profile summary:

```bash
npm run profile
```

Expected behavior:

- Online OAuth profile: real token acquisition and `WhoAmI` request
- OnPrem AD / ADFS: returns `not_implemented` with connector guidance
- OnPrem IFD: returns `not_implemented` and reserved-phase guidance

## 10. MCP tools

Phase 1 tools:

- `d365_get_current_profile`
- `d365_list_profiles`
- `d365_test_connection`

Phase 2 tools:

- `d365_list_entities`
- `d365_get_entity_metadata`
- `d365_get_attribute_metadata`
- `d365_get_option_set`
- `d365_list_relationships`

Phase 3 tools:

- `d365_analyze_solution_folder`
- `d365_compare_solution_folders`
- `d365_generate_release_note`

Current tool behavior:

- Online metadata tools call Dataverse Web API.
- On-Premises metadata calls return explicit `not_implemented` guidance.
- Solution tools work locally against unpacked solution folders and do not require CRM connectivity.

Example OpenCode prompts:

1. Read the current `D365_PROFILE` environment and show the connection type plus readonly state.
2. Query `account`, `contact`, and `incident` metadata and generate a field dictionary.
3. Analyze a local unpacked solution and produce a component inventory, release note, dependency risks, and rollback suggestions.
4. Check whether plugin field names in code exist in CRM metadata.
5. Generate UAT test cases from the current CRM metadata.

## 11. Security recommendations

- Do not commit `.env.local`.
- Do not write Client Secret into `.opencode/opencode.jsonc`.
- Keep production profiles `readonly=true` by default.
- Customer production environments should usually be metadata-only and read-only from MCP.
- Do not use MCP as a direct production write channel.
- Store On-Premises usernames and passwords in controlled secret storage.
- Manage each customer and each environment as a separate profile.
- Review Application User permissions and keep them minimal.

## 12. FAQ

### Why are On-Premises AD / ADFS connections not fully implemented in Node.js?

Dynamics CRM On-Premises often requires Organization Service behaviors that are better handled through the Microsoft .NET SDK, Windows authentication stacks, or ADFS-specific libraries. The Node.js layer remains the orchestration and MCP interface.

### Why not put secrets directly in OpenCode config?

Because `opencode.jsonc` is a tool-launch config, not a secret store. The recommended model is:

- OpenCode config: start command only
- `d365-connections.json`: profile-to-env-var mapping only
- `.env.local`: actual secrets only

### Can I use this against PROD?

Yes, but only with strict readonly profiles and only for metadata or analysis scenarios. Direct write operations are intentionally discouraged.

### How should the future .NET connector work?

Recommended direction:

1. Node.js loads the resolved profile.
2. Node.js invokes a local `.NET CLI` with a sanitized command contract.
3. `.NET` handles Organization Service authentication and execution.
4. `.NET` returns JSON to the MCP layer.

## Repository files

Important files added for this solution:

- `mcp-servers/d365-mcp/src/*`
- `config/d365-connections.example.json`
- `config/d365-connections.schema.json`
- `.env.example`
- `.opencode/opencode.example.jsonc`
- `install-d365-mcp.sh`
- `install-d365-mcp.ps1`
- `connectors/d365-connector-dotnet/README.md`
