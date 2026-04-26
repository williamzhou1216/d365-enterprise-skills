# d365-connector-dotnet

This directory is reserved for the future `.NET` execution layer for Dynamics CRM On-Premises connectivity.

Recommended responsibilities:

- `D365Connector.Cli`: local command-line entry point invoked by `d365-mcp`
- `D365Connector.Core`: shared contracts, request/response models, error mapping
- `D365Connector.Online`: optional future .NET implementation for Online parity
- `D365Connector.OnPrem`: Organization Service, AD, ADFS, and IFD connectivity

Recommended execution model:

1. `d365-mcp` resolves the active profile and secrets from `.env.local`.
2. `d365-mcp` invokes a local `.NET CLI` with JSON input.
3. `.NET` performs Organization Service authentication and execution.
4. `.NET` returns JSON for MCP tool output.

Why reserve `.NET` here:

- On-Premises AD / Kerberos / NTLM is better handled by the Windows and .NET stack.
- ADFS Claims and Organization Service integration are more stable through the Microsoft SDK ecosystem.
- The Node.js MCP layer stays focused on protocol, tool routing, solution analysis, and Online metadata queries.
