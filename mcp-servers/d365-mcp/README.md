# d365-mcp

`d365-mcp` is a delivery-oriented OpenCode MCP server for Dynamics 365 / Dataverse / Dynamics CRM Customer Engagement projects. It is designed for real implementation teams that need profile-based environment access, metadata inspection, solution analysis, plugin and Web Resource review, Power Automate helper tooling, and delivery document generation.

The current implementation uses a TypeScript Node.js MCP server as the control plane.

- Node.js MCP layer: protocol handling, profile loading, tool routing, local analysis
- Online OAuth adapter: Dataverse Web API metadata access
- On-Premises AD / ADFS / IFD: profile-ready, connector-reserved
- Future .NET connector: Organization Service execution for On-Premises projects

## 1. What d365-mcp is

`d365-mcp` supports Dynamics CRM delivery work such as:

- environment connection checks
- entity and field metadata analysis
- field dictionary generation
- customization dry-run payload generation for selected write scenarios
- solution folder comparison and release note generation
- plugin and Web Resource code review
- OData Filter Rows validation and generation
- UAT and delivery-document scaffolding

It follows a three-layer configuration model:

1. OpenCode config only starts the MCP server
2. `config/d365-connections.json` only maps profile fields to environment variable names
3. `.env.local` stores actual secrets and must not be committed

## 2. Supported connection types

Current support level:

- Online OAuth: prioritized and usable now
- OnPrem AD: profile supported, execution reserved for .NET connector
- OnPrem ADFS: profile supported, execution reserved for .NET connector
- OnPrem IFD: profile structure reserved for later enhancement

Supported profile combinations:

- `online + oauth-client-credentials + webapi`
- `onprem + windows-integrated + organization-service`
- `onprem + adfs-claims + organization-service`
- `onprem-ifd + adfs-oauth + webapi`

## 3. Installation

PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\install-d365-mcp.ps1
```

Linux / macOS:

```bash
chmod +x ./install-d365-mcp.sh
./install-d365-mcp.sh
```

Manual install:

```bash
cd mcp-servers/d365-mcp
npm install
npm run build
```

## 4. Build And Run

From `mcp-servers/d365-mcp`:

```bash
npm run build
npm run start
```

Useful scripts:

```bash
npm run dev
npm run profile
npm run test:connection
```

## 5. Configuration

Copy the examples if they do not already exist:

```bash
cp .env.example .env.local
cp config/d365-connections.example.json config/d365-connections.json
cp .opencode/opencode.example.jsonc .opencode/opencode.jsonc
```

Example environment variables:

```dotenv
D365_PROFILE=customerA-online-dev
D365_CONNECTIONS_FILE=./config/d365-connections.json
```

## 6. OpenCode MCP Configuration

Example `.opencode/opencode.example.jsonc`:

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

Enable it with:

```bash
cp .opencode/opencode.example.jsonc .opencode/opencode.jsonc
```

## 7. Profile Switching

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

## 8. Test Connection

```bash
cd mcp-servers/d365-mcp
npm run profile
npm run test:connection
```

Expected behavior:

- Online OAuth: real token acquisition and Dataverse connection test
- On-Prem AD / ADFS: structured `not_implemented`
- On-Prem IFD: structured `not_implemented`

## 9. Security Recommendations

- Do not commit `.env.local`
- Do not put Client Secret in `.opencode/opencode.jsonc`
- Keep PROD profiles `readonly=true`
- Customer production environments should usually be metadata-only and read-only from MCP
- Do not use MCP as a direct write channel to PROD
- All write-class tools must be blocked when the active profile is `readonly=true`
- Store On-Premises usernames and passwords in controlled secret storage
- Manage each customer and environment as a separate profile
- Do not expose Token, RefreshToken, ClientSecret, or Password in tool outputs

## 10. On-Premises Guidance

Important delivery guidance:

- On-Premises AD is usually better served through Organization Service than Web API
- ADFS / Claims requires the customer environment to already be configured correctly
- IFD requires DNS, certificates, relying party trust, and external CRM URL setup to be correct
- The current Node.js MCP server is the orchestration layer
- A future `.NET` CLI should be used as the execution layer for Organization Service scenarios

## 11. Write Tool Execution Policy

Write-class tools follow these rules:

- `dryRun=true`: generate payloads, XML, and execution plans only
- `dryRun=false`: currently supported only for `online + oauth-client-credentials + webapi + readonly=false`
- `readonly=true`: all write tools must fail with `readonly_violation`
- Before real execution, supported tools perform pre-validation such as existence checks for entities, attributes, and views
- On-Premises write execution is not implemented yet and should later be routed through the `.NET` connector

## MCP Tools Reference

| Tool | Category | Status | Description |
|---|---|---|---|
| d365_get_current_profile | Auth/Profile | Implemented | Get current D365 connection profile |
| d365_list_profiles | Auth/Profile | Implemented | List configured D365 profiles |
| d365_test_connection | Auth/Profile | Partial | Test current profile connection |
| d365_list_entities | Metadata | Partial | List Dataverse / CRM entities |
| d365_get_entity_metadata | Metadata | Partial | Read entity metadata with attributes and relationships |
| d365_get_attribute_metadata | Metadata | Partial | Read attribute metadata |
| d365_get_option_set | Metadata | Partial | Read option set / choice values |
| d365_list_relationships | Metadata | Partial | List entity relationships |
| d365_generate_field_dictionary | Metadata | Partial | Generate delivery-ready field dictionary |
| d365_create_entity | Customization/Write | Partial | Generate dry-run entity creation plan |
| d365_create_attribute | Customization/Write | Partial | Generate dry-run attribute creation payload |
| d365_create_form | Customization/Write | Partial | Generate dry-run form creation plan |
| d365_update_form | Customization/Write | Partial | Generate dry-run form update plan |
| d365_create_view | Customization/Write | Partial | Generate dry-run view creation payload |
| d365_update_view | Customization/Write | Partial | Generate dry-run view update payload |
| d365_list_forms | Forms/Views | Planned | List entity forms |
| d365_get_form_configuration | Forms/Views | Planned | Read form tabs, sections, controls, handlers |
| d365_list_views | Forms/Views | Planned | List entity views |
| d365_analyze_view_fetchxml | Forms/Views | Planned | Analyze FetchXML in views |
| d365_analyze_solution_folder | Solution | Implemented | Analyze unpacked solution folder |
| d365_compare_solution_folders | Solution | Implemented | Compare unpacked solution folders |
| d365_generate_release_note | Solution | Implemented | Generate release note draft |
| d365_generate_deployment_checklist | Solution | Implemented | Generate deployment and rollback checklist |
| d365_list_plugin_steps | Plugin | Planned | List plugin steps from CRM |
| d365_analyze_plugin_code | Plugin | Implemented | Analyze local C# plugin code |
| d365_generate_plugin_template | Plugin | Implemented | Generate plugin C# template |
| d365_generate_plugin_registration_note | Plugin | Implemented | Generate plugin registration note |
| d365_list_webresources | WebResource/PCF | Planned | List CRM Web Resources |
| d365_analyze_webresource_js | WebResource/PCF | Implemented | Analyze local JS for UCI readiness |
| d365_generate_xrm_typings | WebResource/PCF | Implemented | Generate TypeScript typings from metadata |
| d365_generate_webresource_template | WebResource/PCF | Implemented | Generate standard UCI JS template |
| d365_validate_odata_filter | Power Automate/OData | Implemented | Validate OData Filter Rows expression |
| d365_generate_odata_filter | Power Automate/OData | Implemented | Generate OData Filter Rows expression |
| d365_analyze_power_automate_flow | Power Automate/OData | Implemented | Analyze exported Power Automate flow JSON |
| d365_generate_uat_test_cases | Testing | Implemented | Generate UAT test cases |
| d365_generate_fit_gap_analysis | Testing | Planned | Generate fit-gap analysis from requirements source |
| d365_generate_solution_design_doc | Delivery Docs | Implemented | Generate solution design document skeleton |
| d365_generate_security_matrix | Delivery Docs | Implemented | Generate security role matrix |
| d365_generate_cutover_plan | Delivery Docs | Implemented | Generate cutover and rollback plan |

## OpenCode Prompt Examples

1. 环境确认

“调用 d365_get_current_profile，告诉我当前连接的 Dynamics CRM 环境类型、认证方式、API 类型和只读状态。”

2. 元数据分析

“调用 d365_get_entity_metadata 分析 incident 实体，生成字段字典、关系说明和插件开发注意事项。”

3. Solution 发布说明

“调用 d365_analyze_solution_folder 分析 ./solutions/unpacked/CustomerService，然后调用 d365_generate_release_note 生成客户可读的发布说明。”

4. 插件检查

“调用 d365_analyze_plugin_code 检查 ./src/Plugins/IncidentPreUpdate.cs，验证字段名是否存在，检查 Depth、Image、Tracing 和异常处理。”

5. Power Automate Filter Rows

“调用 d365_generate_odata_filter，为 contact 表生成 telephone1 等于用户输入电话，且 statecode 等于 0 的 Filter Rows 表达式。”

6. UAT 测试用例

“调用 d365_generate_uat_test_cases，为 Customer Service 的 Case 创建、分派、队列处理生成 UAT 测试用例。”

7. 写入类 dry-run

“调用 d365_create_attribute，为 incident 生成一个新字段的 dry-run 创建计划，并输出 Online Web API metadata payload。”

8. 视图 dry-run

“调用 d365_create_view，为 account 生成一个新系统视图的 dry-run 输出，包括 FetchXML 和 LayoutXML。”

## Tool Details

### Auth/Profile

#### d365_get_current_profile
- Purpose: return the current profile summary without secrets
- Input: `{}` or `{ "profileName": "customerA-online-dev" }`
- Output example:

```json
{
  "profileName": "customerA-online-dev",
  "displayName": "Customer A Online DEV",
  "deploymentType": "online",
  "authType": "oauth-client-credentials",
  "apiType": "webapi",
  "readonly": false,
  "connectionFile": "./config/d365-connections.json"
}
```

- OpenCode prompt: “读取当前 Dynamics CRM 连接 Profile，告诉我当前连接的是 Online 还是 On-Premises，是否只读。”

#### d365_list_profiles
- Purpose: list all configured profiles
- Input: `{}`
- Output example:

```json
{
  "defaultProfile": "customerA-online-dev",
  "profiles": [
    {
      "profileName": "customerA-online-dev",
      "displayName": "Customer A Online DEV",
      "deploymentType": "online",
      "authType": "oauth-client-credentials",
      "apiType": "webapi",
      "readonly": false
    }
  ]
}
```

- OpenCode prompt: “列出当前项目配置的所有 Dynamics CRM 环境 Profile。”

#### d365_test_connection
- Purpose: test whether the current profile can connect
- Input: `{ "profileName": "customerA-online-dev" }`
- Output example:

```json
{
  "success": true,
  "profileName": "customerA-online-dev",
  "organizationName": "org-dev",
  "version": "9.2.x",
  "user": "application-user",
  "deploymentType": "online",
  "apiType": "webapi"
}
```

- OpenCode prompt: “测试当前 Dynamics CRM 环境连接是否正常。”

### Metadata

#### d365_list_entities
- Purpose: list entities and filter by system/custom/name
- Input: `{ "includeSystemEntities": false, "includeCustomEntitiesOnly": false, "nameFilter": "account" }`
- Output example:

```json
{
  "entities": [
    {
      "logicalName": "account",
      "displayName": "Account",
      "schemaName": "Account",
      "entitySetName": "accounts",
      "primaryIdAttribute": "accountid",
      "primaryNameAttribute": "name",
      "isCustomEntity": false,
      "ownershipType": "UserOwned"
    }
  ]
}
```

- OpenCode prompt: “列出当前 CRM 环境中的自定义实体，并说明每个实体的主键字段和主名称字段。”

#### d365_get_entity_metadata
- Purpose: read entity metadata, attributes, and relationships
- Input: `{ "entityLogicalName": "account", "includeAttributes": true, "includeRelationships": true, "includePrivileges": false }`
- Output example:

```json
{
  "logicalName": "account",
  "displayName": "Account",
  "schemaName": "Account",
  "entitySetName": "accounts",
  "primaryIdAttribute": "accountid",
  "primaryNameAttribute": "name",
  "ownershipType": "UserOwned",
  "attributes": [],
  "relationships": []
}
```

- OpenCode prompt: “读取 account 实体的元数据，生成字段字典和开发注意事项。”

#### d365_get_attribute_metadata
- Purpose: read a single attribute definition
- Input: `{ "entityLogicalName": "account", "attributeLogicalName": "telephone1" }`
- Output example:

```json
{
  "entityLogicalName": "account",
  "attributeLogicalName": "telephone1",
  "displayName": "Main Phone",
  "schemaName": "Telephone1",
  "attributeType": "String",
  "maxLength": 50,
  "requiredLevel": "None",
  "isValidForCreate": true,
  "isValidForUpdate": true,
  "isValidForRead": true
}
```

- OpenCode prompt: “检查 account.telephone1 字段是否存在，它的类型、长度、是否必填分别是什么。”

#### d365_get_option_set
- Purpose: read option set values for a choice field
- Input: `{ "entityLogicalName": "incident", "attributeLogicalName": "statuscode", "languageCode": 1033 }`
- Output example:

```json
{
  "entityLogicalName": "incident",
  "attributeLogicalName": "statuscode",
  "options": [
    {
      "value": 1,
      "label": "In Progress",
      "languageCode": 1033
    }
  ]
}
```

- OpenCode prompt: “查询 incident.statuscode 的所有选项值，并生成状态流转说明。”

#### d365_list_relationships
- Purpose: list one-to-many, many-to-one, or many-to-many relationships
- Input: `{ "entityLogicalName": "account", "relationshipType": "all" }`
- Output example:

```json
{
  "entityLogicalName": "account",
  "relationships": [
    {
      "relationshipType": "oneToMany",
      "schemaName": "account_primary_contact",
      "referencedEntity": "account",
      "referencingEntity": "contact",
      "referencingAttribute": "parentcustomerid"
    }
  ]
}
```

- OpenCode prompt: “分析 account 和 contact 的关系，生成数据模型说明。”

#### d365_generate_field_dictionary
- Purpose: generate a delivery-ready field dictionary in JSON, Markdown, or CSV
- Input: `{ "entities": ["account", "contact", "incident"], "languageCode": 1033, "includeSystemFields": false, "includeOptionSetValues": true, "outputFormat": "json" }`
- Output example:

```json
{
  "generatedAt": "2026-04-26T00:00:00Z",
  "entities": [
    {
      "entityLogicalName": "account",
      "displayName": "Account",
      "fields": []
    }
  ]
}
```

- OpenCode prompt: “基于 account/contact/incident 生成一份字段字典，适合放到客户交付文档中。”

### Customization / Write

#### d365_create_entity
- Purpose: generate a dry-run entity creation plan and execute the Online `CreateEntity` action when `dryRun=false`
- Input: `{ "entityLogicalName": "new_project", "schemaName": "new_Project", "displayName": "Project", "pluralDisplayName": "Projects", "primaryNameAttribute": { "logicalName": "new_name", "schemaName": "new_Name", "displayName": "Project Name" }, "dryRun": true }`
- Output example:

```json
{
  "success": true,
  "toolName": "d365_create_entity",
  "executionMode": "dry_run",
  "request": {
    "method": "POST",
    "path": "/EntityDefinitions",
    "body": {}
  }
}
```

- Execution note: when `dryRun=false`, this tool attempts `POST /CreateEntity` and checks that the target entity does not already exist.
- OpenCode prompt: “为项目管理方案生成一个新自定义实体的 dry-run 创建计划和 Online Web API payload。”

#### d365_create_attribute
- Purpose: generate a dry-run attribute creation plan and execute Online attribute creation when `dryRun=false`
- Input: `{ "entityLogicalName": "incident", "attributeLogicalName": "new_customerpriority", "schemaName": "new_CustomerPriority", "displayName": "Customer Priority", "attributeType": "choice", "options": [{ "label": "High" }, { "label": "Medium" }, { "label": "Low" }], "dryRun": true }`
- Output example:

```json
{
  "success": true,
  "toolName": "d365_create_attribute",
  "executionMode": "dry_run",
  "request": {
    "method": "POST",
    "path": "/EntityDefinitions(LogicalName='incident')/Attributes",
    "body": {}
  }
}
```

- Execution note: when `dryRun=false`, this tool attempts `POST /EntityDefinitions(LogicalName='entity')/Attributes` and checks both entity existence and attribute non-existence.
- OpenCode prompt: “为 incident 生成一个新字段的 dry-run 创建计划，并输出 Online Web API metadata payload。”

#### d365_create_form
- Purpose: generate a dry-run form creation plan and draft FormXml, including tabs, sections, and controls
- Input: `{ "entityLogicalName": "incident", "formName": "Case Triage Form", "formType": "main", "tabs": [], "dryRun": true }`
- Output example:

```json
{
  "success": true,
  "toolName": "d365_create_form",
  "executionMode": "dry_run",
  "formXml": "<?xml version=... ?>",
  "plannedStructure": {
    "tabCount": 0,
    "tabs": []
  }
}
```

- OpenCode prompt: “为 incident 设计一个新主窗体，先给我 dry-run 的结构计划和实施说明。”

#### d365_update_form
- Purpose: generate a dry-run form update plan and FormXml patch draft for libraries, handlers, and controls
- Input: `{ "entityLogicalName": "incident", "formId": "xxxx", "addLibraries": ["new_/js/case_form.js"], "addEventHandlers": [{ "event": "onload", "libraryName": "new_/js/case_form.js", "functionName": "CaseForm.onLoad" }], "dryRun": true }`
- Output example:

```json
{
  "success": true,
  "toolName": "d365_update_form",
  "executionMode": "dry_run",
  "formXmlPatch": "<?xml version=... ?>",
  "updatePlan": {
    "addLibraries": ["new_/js/case_form.js"],
    "addEventHandlers": []
  }
}
```

- OpenCode prompt: “为 incident 现有主窗体生成一次更新的 dry-run 计划，包括新增 JS 库和事件处理器。”

#### d365_create_view
- Purpose: generate FetchXML, LayoutXML, and execute Online savedquery creation when `dryRun=false`
- Input: `{ "entityLogicalName": "account", "viewName": "Active Accounts By City", "columns": [{ "logicalName": "name", "width": 200 }, { "logicalName": "address1_city", "width": 120 }], "conditions": [{ "attribute": "statecode", "operator": "eq", "value": 0 }], "orders": [{ "attribute": "name", "descending": false }], "dryRun": true }`
- Output example:

```json
{
  "success": true,
  "toolName": "d365_create_view",
  "executionMode": "dry_run",
  "fetchXml": "<fetch>...</fetch>",
  "layoutXml": "<grid>...</grid>"
}
```

- Execution note: when `dryRun=false`, this tool attempts `POST /savedqueries`, checks that the entity exists, validates referenced columns, and checks that the view name does not already exist.
- OpenCode prompt: “为 account 生成一个新系统视图的 dry-run 输出，包括 FetchXML 和 LayoutXML。”

#### d365_update_view
- Purpose: generate FetchXML, LayoutXML, and execute Online savedquery update when `dryRun=false`
- Input: `{ "viewId": "xxxx", "entityLogicalName": "account", "viewName": "Active Accounts By City", "columns": [{ "logicalName": "name", "width": 200 }], "dryRun": true }`
- Output example:

```json
{
  "success": true,
  "toolName": "d365_update_view",
  "executionMode": "dry_run",
  "request": {
    "entityName": "savedquery",
    "id": "xxxx",
    "body": {}
  }
}
```

- Execution note: when `dryRun=false`, this tool attempts `PATCH /savedqueries(<viewId>)`, validates the target view ID, and validates referenced columns before update.
- OpenCode prompt: “更新 account 现有系统视图，先输出 dry-run 的 FetchXML 和 LayoutXML 更新计划。”

### Forms/Views

#### d365_list_forms
- Purpose: planned form discovery tool
- Input: `{ "entityLogicalName": "incident", "formType": "main" }`
- Output example:

```json
{
  "success": false,
  "errorCode": "not_implemented",
  "message": "Form metadata querying is planned for a later phase.",
  "plannedAdapter": "OnlineOAuthAdapter"
}
```

- OpenCode prompt: “列出 incident 实体的主窗体，并分析哪些窗体需要检查脚本事件。”

#### d365_get_form_configuration
- Purpose: planned form tabs/sections/control analysis
- Input: `{ "entityLogicalName": "incident", "formId": "xxxx", "includeEventHandlers": true }`
- Output example:

```json
{
  "success": false,
  "errorCode": "not_implemented",
  "message": "Form XML parsing through the CRM metadata layer is planned for a later phase.",
  "plannedAdapter": "OnlineOAuthAdapter"
}
```

- OpenCode prompt: “分析 incident 主窗体上的字段、控件和 JS 事件绑定，指出潜在风险。”

#### d365_list_views
- Purpose: planned view discovery tool
- Input: `{ "entityLogicalName": "account", "viewType": "system" }`
- Output example:

```json
{
  "success": false,
  "errorCode": "not_implemented",
  "message": "Saved query discovery is planned for a later phase.",
  "plannedAdapter": "OnlineOAuthAdapter"
}
```

- OpenCode prompt: “列出 account 的系统视图，并分析 Active Accounts 的过滤条件和展示列。”

#### d365_analyze_view_fetchxml
- Purpose: planned FetchXML analysis tool
- Input: `{ "entityLogicalName": "account", "viewId": "xxxx" }`
- Output example:

```json
{
  "success": false,
  "errorCode": "not_implemented",
  "message": "FetchXML view analysis is planned for a later phase.",
  "plannedAdapter": "OnlineOAuthAdapter"
}
```

- OpenCode prompt: “分析这个视图 FetchXML 是否存在性能风险。”

### Solution

#### d365_analyze_solution_folder
- Purpose: analyze unpacked solution artifacts and delivery risks
- Input: `{ "solutionFolder": "./solutions/unpacked/CustomerService", "includeXmlSummary": true, "includeRiskAnalysis": true }`
- Output example:

```json
{
  "solutionFolder": "./solutions/unpacked/CustomerService",
  "entities": [],
  "attributes": [],
  "forms": [],
  "views": [],
  "webResources": [],
  "pluginAssemblies": [],
  "workflows": [],
  "environmentVariables": [],
  "connectionReferences": [],
  "risks": []
}
```

- OpenCode prompt: “分析本地 unpacked solution，生成组件清单、发布风险和上线检查项。”

#### d365_compare_solution_folders
- Purpose: compare two unpacked solution folders
- Input: `{ "baseSolutionFolder": "./solutions/unpacked/v1", "targetSolutionFolder": "./solutions/unpacked/v2" }`
- Output example:

```json
{
  "added": [],
  "modified": [],
  "removed": [],
  "riskSummary": []
}
```

- OpenCode prompt: “对比 v1 和 v2 的 Solution 文件夹，告诉我这次发布改了哪些组件。”

#### d365_generate_release_note
- Purpose: generate customer-readable release notes from the solution folder
- Input: `{ "solutionFolder": "./solutions/unpacked/CustomerService", "releaseVersion": "1.2.0", "outputFormat": "markdown", "includeRollbackPlan": true }`
- Output example:

```json
{
  "releaseVersion": "1.2.0",
  "markdown": "## Release Note 1.2.0"
}
```

- OpenCode prompt: “基于当前 Solution 生成一份客户可读的发布说明，包括发布范围、影响模块、风险和回滚建议。”

#### d365_generate_deployment_checklist
- Purpose: generate pre-deployment, deployment, post-deployment, and rollback checklists
- Input: `{ "solutionFolder": "./solutions/unpacked/CustomerService", "environmentType": "uat", "includePostDeploymentValidation": true }`
- Output example:

```json
{
  "preDeployment": [],
  "deployment": [],
  "postDeployment": [],
  "rollback": []
}
```

- OpenCode prompt: “帮我为这个 Solution 生成 UAT 上线检查清单和上线后验证清单。”

### Plugin

#### d365_list_plugin_steps
- Purpose: planned CRM plugin step discovery tool
- Input: `{ "entityLogicalName": "incident", "messageName": "Update" }`
- Output example:

```json
{
  "success": false,
  "errorCode": "not_implemented",
  "message": "Plugin step discovery is planned for the .NET Organization Service connector.",
  "plannedAdapter": "OnPremADAdapter"
}
```

- OpenCode prompt: “查询 incident Update 上注册了哪些插件步骤，并分析递归触发风险。”

#### d365_analyze_plugin_code
- Purpose: inspect local plugin code for Depth, tracing, exception, image, and field risks
- Input: `{ "codePath": "./src/Plugins/IncidentPreUpdate.cs", "entityLogicalName": "incident", "messageName": "Update" }`
- Output example:

```json
{
  "codePath": "./src/Plugins/IncidentPreUpdate.cs",
  "detectedEntities": [],
  "detectedAttributes": [],
  "risks": [],
  "recommendations": []
}
```

- OpenCode prompt: “检查这个插件代码是否符合 Dynamics CRM 插件开发规范，并根据当前 CRM 元数据验证字段名是否正确。”

#### d365_generate_plugin_template
- Purpose: generate a standard C# plugin template
- Input: `{ "entityLogicalName": "incident", "messageName": "Update", "stage": "PreOperation", "mode": "Synchronous", "filteringAttributes": ["statuscode"], "preImageAttributes": ["statuscode"], "namespace": "Company.Crm.Plugins", "className": "IncidentPreUpdatePlugin" }`
- Output example:

```json
{
  "fileName": "IncidentPreUpdatePlugin.cs",
  "code": "using Microsoft.Xrm.Sdk; ..."
}
```

- OpenCode prompt: “基于 incident Update PreOperation 生成一个标准插件模板，包括 Depth 检查、Target 校验、PreImage 读取和 Tracing 日志。”

#### d365_generate_plugin_registration_note
- Purpose: generate plugin registration instructions
- Input: `{ "entityLogicalName": "incident", "messageName": "Update", "stage": "PreOperation", "mode": "Synchronous", "filteringAttributes": ["statuscode"], "preImageAttributes": ["statuscode"], "assemblyName": "Company.Crm.Plugins", "pluginTypeName": "Company.Crm.Plugins.IncidentPreUpdatePlugin" }`
- Output example:

```json
{
  "markdown": "## Plugin Registration"
}
```

- OpenCode prompt: “为这个插件生成 Plugin Registration Tool 注册说明。”

### Web Resource / PCF

#### d365_list_webresources
- Purpose: planned CRM Web Resource discovery tool
- Input: `{ "nameFilter": "case", "type": "javascript" }`
- Output example:

```json
{
  "success": false,
  "errorCode": "not_implemented",
  "message": "Web Resource discovery from CRM metadata is planned for a later phase.",
  "plannedAdapter": "OnlineOAuthAdapter"
}
```

- OpenCode prompt: “列出包含 case 的 JavaScript Web Resource，并检查是否被窗体引用。”

#### d365_analyze_webresource_js
- Purpose: analyze local JavaScript for UCI, formContext, and Xrm.Page risks
- Input: `{ "filePath": "./webresources/js/case_form.js", "entityLogicalName": "incident" }`
- Output example:

```json
{
  "filePath": "./webresources/js/case_form.js",
  "detectedXrmApis": [],
  "detectedAttributes": [],
  "risks": []
}
```

- OpenCode prompt: “检查这个 Web Resource JS 是否符合 UCI 规范，是否还在使用 Xrm.Page。”

#### d365_generate_xrm_typings
- Purpose: generate TypeScript typings from entity metadata
- Input: `{ "entityLogicalName": "incident", "outputPath": "./types/incident.d.ts", "includeOptionSets": true }`
- Output example:

```json
{
  "outputPath": "./types/incident.d.ts",
  "content": "export interface IncidentAttributes { ... }"
}
```

- OpenCode prompt: “根据 incident 元数据生成 TypeScript 类型定义，方便 Web Resource 开发。”

#### d365_generate_webresource_template
- Purpose: generate a UCI-friendly JavaScript form library template
- Input: `{ "entityLogicalName": "incident", "namespace": "Company.Crm.IncidentForm", "events": ["onLoad", "onSave", "onChange_statuscode"] }`
- Output example:

```json
{
  "fileName": "incident_form.js",
  "code": "var Company = Company || {}; ..."
}
```

- OpenCode prompt: “生成一个 incident 主窗体使用的 JavaScript Web Resource 模板，包含 onLoad、onSave 和字段 onChange。”

### Power Automate / OData

#### d365_validate_odata_filter
- Purpose: validate Filter Rows syntax and highlight risks
- Input: `{ "entityLogicalName": "contact", "filter": "telephone1 eq '08012345678' and statecode eq 0" }`
- Output example:

```json
{
  "isValid": true,
  "detectedFields": ["telephone1", "statecode"],
  "risks": [],
  "normalizedFilter": "telephone1 eq '08012345678' and statecode eq 0"
}
```

- OpenCode prompt: “帮我检查这个 Power Automate Dataverse Filter Rows 是否写法正确。”

#### d365_generate_odata_filter
- Purpose: generate a safe Filter Rows expression from structured conditions
- Input: `{ "entityLogicalName": "contact", "conditions": [{ "field": "telephone1", "operator": "eq", "value": "08012345678", "type": "string" }, { "field": "statecode", "operator": "eq", "value": 0, "type": "number" }] }`
- Output example:

```json
{
  "filter": "telephone1 eq '08012345678' and statecode eq 0",
  "notes": []
}
```

- OpenCode prompt: “根据电话号码生成 Power Automate Dataverse List rows 的 Filter Rows 条件。”

#### d365_analyze_power_automate_flow
- Purpose: analyze exported flow JSON for Dataverse delivery risks
- Input: `{ "flowJsonPath": "./flows/CreateTeamsChannel.json" }`
- Output example:

```json
{
  "flowName": "Create Teams Channel",
  "triggers": [],
  "actions": [],
  "connectionReferences": [],
  "environmentVariables": [],
  "risks": []
}
```

- OpenCode prompt: “分析这个 Power Automate Flow 的 Dataverse 操作和连接引用，生成部署风险说明。”

### Testing

#### d365_generate_uat_test_cases
- Purpose: generate UAT test cases for module, entities, and scenario
- Input: `{ "module": "Customer Service", "entities": ["incident", "account", "contact"], "scenario": "Case creation and assignment", "outputFormat": "markdown" }`
- Output example:

```json
{
  "testCases": [
    {
      "testCaseId": "UAT-CS-001",
      "title": "Create a new case",
      "preconditions": [],
      "steps": [],
      "expectedResult": "",
      "priority": "High"
    }
  ],
  "markdown": "## UAT Test Cases"
}
```

- OpenCode prompt: “基于 incident/account/contact 生成客户服务模块 UAT 测试用例。”

#### d365_generate_fit_gap_analysis
- Purpose: planned fit-gap generation from requirements source
- Input: `{ "requirementsPath": "./docs/requirements/issues.xlsx", "targetProducts": ["Dynamics 365 Customer Service", "Power Platform"], "outputFormat": "markdown" }`
- Output example:

```json
{
  "success": false,
  "errorCode": "not_implemented",
  "message": "Fit-gap generation from spreadsheet sources is planned for a later phase.",
  "plannedAdapter": "OnlineOAuthAdapter"
}
```

- OpenCode prompt: “读取需求清单，基于 Dynamics 365 Customer Service 和 Power Platform 生成 Fit-Gap 分析。”

### Delivery Docs

#### d365_generate_solution_design_doc
- Purpose: generate solution design document skeleton
- Input: `{ "projectName": "Customer Service Implementation", "modules": ["Customer Service", "Omnichannel", "Power Automate"], "entities": ["incident", "account", "contact"], "includeIntegration": true, "includeSecurity": true, "outputFormat": "markdown" }`
- Output example:

```json
{
  "markdown": "## Solution Design Document"
}
```

- OpenCode prompt: “基于当前 CRM 元数据和项目模块生成一份 Dynamics 365 Customer Service 技术方案文档。”

#### d365_generate_security_matrix
- Purpose: generate security role matrix
- Input: `{ "roles": ["System Administrator", "Supervisor", "Agent"], "entities": ["incident", "account", "contact", "queueitem"], "outputFormat": "markdown" }`
- Output example:

```json
{
  "matrix": [],
  "markdown": "## Security Role Matrix"
}
```

- OpenCode prompt: “为客服系统管理员、座席主管、座席生成 Dynamics CRM 权限矩阵。”

#### d365_generate_cutover_plan
- Purpose: generate cutover, validation, and rollback plan
- Input: `{ "projectName": "Customer Service Rollout", "environmentFrom": "UAT", "environmentTo": "PROD", "solutionFolder": "./solutions/unpacked/CustomerService", "includeRollback": true }`
- Output example:

```json
{
  "cutoverTasks": [],
  "rollbackTasks": [],
  "validationTasks": [],
  "markdown": "## Cutover Plan"
}
```

- OpenCode prompt: “基于当前 Solution 生成正式环境上线切换计划，包括回滚步骤和上线后验证。”

## Error Model

The MCP server returns structured JSON errors. Common error codes include:

- `profile_not_found`
- `missing_env_var`
- `unsupported_auth_type`
- `connection_failed`
- `not_implemented`
- `readonly_violation`

Example:

```json
{
  "success": false,
  "errorCode": "not_implemented",
  "message": "This tool is planned but not implemented yet.",
  "plannedAdapter": "OnlineOAuthAdapter"
}
```

## Repository Files

Key files in this solution:

- `mcp-servers/d365-mcp/src/index.ts`
- `mcp-servers/d365-mcp/src/tools/index.ts`
- `mcp-servers/d365-mcp/src/tools/*.ts`
- `mcp-servers/d365-mcp/src/adapters/*.ts`
- `config/d365-connections.example.json`
- `config/d365-connections.schema.json`
- `.env.example`
- `.opencode/opencode.example.jsonc`
- `install-d365-mcp.sh`
- `install-d365-mcp.ps1`
- `connectors/d365-connector-dotnet/README.md`
