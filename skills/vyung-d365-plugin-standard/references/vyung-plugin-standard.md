# Vyung D365 Plugin 标准摘要

这份参考资料基于 `vyung/plugin` 目录中的 7 份微扬插件标准化文档整理而成，用于辅助 skill 在需要时按主题读取细节。原始资料主题如下：

- `20-00插件模板安装介绍 - 概述.pdf`
- `20-10插件框架工程介绍 - 概述.pdf`
- `20-20框架配置文件介绍 - 概述.pdf`
- `20-40插件框架单元测试 - 概述.pdf`
- `CRM+Plugin（Entity、IOrganizationService）扩展方法帮助文档 - 概述.pdf`
- `CRM+Plugin（IDbConnection）扩展方法帮助文档 - 概述.pdf`
- `CRM+Plugin（ILogger）扩展方法帮助文档 - 概述.pdf`

## 1. 模板安装与起步
当任务是“新建一个插件”时，默认先走模板与框架，而不是手写一个裸 `IPlugin` 类。

标准动作：
- 先确认是否需要从微扬 Plugin 模板创建工程或插件项。
- 先确认模板安装是否完成，再开始新增插件类。
- 回答中应明确“这是基于模板新增”还是“在现有框架内扩展”。
- 如果用户只给出业务规则，没有给出工程上下文，应提醒先识别模板工程和插件入口位置。

## 2. 框架工程组织
微扬资料显示插件开发不是单文件式写法，而是依赖统一工程结构与模板项。

从工程介绍文档可确认的关键点：
- 存在插件工程介绍章节。
- 存在 `Pluin-Item-(PluginTemplate)` 介绍，表示新增插件应复用模板项。
- 存在 `#region Constructor/Configuration` 相关章节，说明构造与配置读取有固定组织方式。
- 存在 DLL 合并使用介绍，表示发布产物和依赖组织需要遵循框架既有方式。

落地要求：
- 不要任意改变模板类的构造与配置读取结构。
- 新增依赖前要考虑是否影响 DLL 合并与部署。
- 代码建议中应指出类放置位置、依赖注入方式或构造配置来源。

## 3. 配置文件规范
配置文档虽未成功抽取正文，但主题明确指向“框架配置文件介绍”。

落地要求：
- 环境差异、开关、连接信息、超时、外部接口参数等应放入配置文件，不应硬编码到插件业务逻辑。
- 输出方案时要明确：配置项名称、用途、默认值、读取位置、缺省行为。
- 讨论问题排查时，要把“核对配置是否正确”列为标准步骤之一。
- 涉及数据库、集成、日志开关等场景时，应先看配置，再看代码。

## 4. Entity / IOrganizationService 扩展方法
扩展方法文档包含大量面向插件开发的实体与组织服务辅助方法。根据可识别锚点，可归纳为以下几类：

### 4.1 判空与类型转换
可见锚点包括：
- `IsNotNull`
- `ToEntity`
- `ToString`
- `ToObject<T>` / `ToObject`
- `ToInt`
- `ToOpInt`
- `ToDouble`
- `ToDecimal`
- `ToBool`
- `ToDateTime`
- `ToDateString`

落地要求：
- 对实体属性读取优先使用统一转换扩展，而不是在业务代码中散落强制类型转换。
- 判空、默认值和类型转换要保持一致，减少空引用和装箱拆箱错误。

### 4.2 属性复制与构建
可见锚点包括：
- `Copy`
- `AddAttrDate`
- `AddAttr`
- `AddMoney`
- `AddAttrOp`

落地要求：
- 组装更新实体、复制字段、构建新增记录时优先复用标准扩展。
- 需要批量拼装实体属性时，应优先采用统一辅助方法，保持写法一致。

### 4.3 查询与元数据辅助
可见锚点包括：
- `QuickRetrieveMultiple`
- `QuickRetrieve`
- `GetEntityPrimaryKey`
- `GetEntityPrimaryName`
- `RetrieveEntityCode`
- `RetrievePrimaryField`
- `RetrieveUserUILanguageCode`
- `RetrieveOrganizationBaseLanguageCode`
- `GetOptionsSetText`

落地要求：
- 常规实体读取、主键主名称识别、选项集文本解析等优先使用框架能力。
- 涉及多语言、选项集文本或元数据场景时，应先检查是否已有扩展方法可直接使用。

## 5. IDbConnection 扩展方法
数据库访问扩展文档的锚点较完整，可以看出微扬框架对同步、异步、查询、事务和缓冲都有统一封装。

### 5.1 同步方法
可见锚点包括：
- `Execute`
- `Query`
- `QueryFirst`
- `QueryFirstOrDefault`
- `QuerySingle`
- `QuerySingleOrDefault`
- `QueryMultiple`

### 5.2 异步方法
可见锚点包括：
- `ExecuteAsync`
- `QueryAsync`
- `QueryFirstAsync`
- `QueryFirstOrDefaultAsync`
- `QuerySingleAsync`
- `QuerySingleOrDefaultAsync`
- `QueryMultipleAsync`

### 5.3 事务与缓冲
可见锚点包括：
- `缓冲`
- `事务`

落地要求：
- 访问数据库时优先使用统一扩展方法，不要在插件中自造一套 ADO.NET 封装。
- 需要同步还是异步、是否要事务、是否考虑结果缓冲，都要在方案里显式说明。
- 若数据库访问处于插件同步事务链路中，要特别说明性能与超时风险。

## 6. ILogger 扩展方法
日志扩展文档的正文未抽到，但主题已经明确：微扬框架为 `ILogger` 提供了插件场景下的扩展方法。

落地要求：
- 日志要覆盖：输入上下文、关键判断、外部调用、异常细节、性能关键点。
- 日志内容要能支撑排查，不写只有“执行成功/失败”的空泛文本。
- 回答中若涉及日志设计，要强调统一走 `ILogger` 扩展，不建议每个插件自行定义散乱日志格式。

## 7. 单元测试与覆盖率
单元测试文档可识别的章节包括：
- 单元测试框架工程介绍
- 编辑单元测试方法示例
- 插件测试脚本示例
- 控制台测试脚本示例
- 配置文件使用
- 分析单元测试覆盖率

落地要求：
- 新增插件或改造插件时，默认要补充单元测试。
- 单元测试至少覆盖：主流程、异常路径、配置分支、重复执行/幂等。
- 如果文档要求分析覆盖率，则方案中应包含覆盖率目标或质量闸门建议。
- 测试不仅要测业务逻辑，还要验证关键配置与脚本使用方式。

## 8. 建议的标准输出模板
当 skill 被触发时，推荐输出结构如下：

1. 业务场景与触发方式
2. 对应模板/工程位置
3. 需要新增或调整的配置
4. 插件主实现逻辑
5. 需要复用的扩展方法
6. 日志与异常策略
7. 单元测试与覆盖率建议
8. 风险与待确认项

## 9. 基于实际代码仓库补充的现行规范
以下内容来自对 `E:\VyungDevops\Git\产品部\标准化\standard` 与 `E:\VyungDevops\Git\产品部\审批流\Vyung.BIZ.Flow` 两个仓库的实际代码结构与实现习惯的补充整理，可视为“文档标准 + 真实项目落地方式”的合并摘要。

### 9.1 工程分层
- 标准框架层通常命名为 `Vyung.Xrm.*`，用于承载插件基类、日志、配置、扩展方法、控制台基座等公共能力。
- 业务交付层通常命名为 `Vyung.Crm.*` 或 `Vyung.BIZ.*`，用于承载具体解决方案代码。
- 审批流类项目已形成较明显的分层：`Plugins`、`Sdk`、`UnitTest`、`WebResource`、`Consoles`、`PkgDeploy`。

落地要求：
- 输出方案时要先判断代码放在哪一层，不要默认所有逻辑都进 `Plugins`。
- 插件入口只做上下文组装、参数获取和流程路由；复杂业务应下沉到 `BLL / FlowEngine / Handler`。

### 9.2 插件入口模式
- 微扬现有代码同时存在 `PluginBase` 与 `XrmPluginBase` 两套基类。
- 插件类通常包含固定的 `#region Constructor/Configuration`，接收 `unsecure` 与 `secureConfig`，并在构造函数中 `: base(typeof(CurrentPlugin))`。
- 插件执行入口通常重写 `ExecuteCrmPlugin(...)`，从 `LocalPluginContext / XrmLocalPluginContext` 获取：
  - `OrganizationService`
  - `OrganizationAdminService`
  - `PluginExecutionContext`
  - `TracingService`

落地要求：
- 若是维护现有项目，先遵循项目已采用的基类，不要在同一模块随意混用两套入口模型。
- 若是新模块，建议统一到单一基类风格，并明确迁移边界。

### 9.3 组织服务使用边界
- 现有项目大量区分 `OrganizationService` 与 `OrganizationAdminService`。
- 常规用户上下文逻辑使用 `OrganizationService`。
- 元数据、系统配置、跨权限读取等更偏平台管理的操作常使用 `OrganizationAdminService`。

落地要求：
- 方案中必须说明“当前调用为何用用户服务或管理员服务”。
- 涉及权限差异、语言、多实体元数据、部署操作时，要特别审查是否误用了用户服务。

### 9.4 审批流解决方案模式
- 审批流中，旧模式常见于 `Action` 入口类根据 `actionCode` 分发，再调用 `BLL`。
- 新模式正在向 `Sdk Request + Handler + FlowClient` 演进，使业务能力可脱离插件入口复用。
- `BaseFlowBLL` 一类基类负责聚合上下文、语言、目标单据、审批实例等通用初始化逻辑。

落地要求：
- 对审批流或复杂插件，优先把业务能力设计成可复用的处理器或 BLL，而不是继续放大入口类中的分支逻辑。
- 新增动作应优先补 `Request/Response/Handler` 或明确职责的 BLL，再由入口层暴露给插件或 Action。

### 9.5 WebResource 与多语言
- 现有审批流前端资源采用 `vy_/...` 命名空间组织。
- 多语言资源放在 `vy_/locale/*.json`，按 LCID 区分。
- `spkl.json` 中显式登记大量 HTML / JS / locale 资源。
- 前端全局命名空间常见为 `Vyung`、`FlowUtil`。

落地要求：
- 新增前端功能时，要同步考虑 WebResource 文件、`spkl.json`、多语言 JSON、按钮和窗体脚本。
- 新增按钮、规则、对话页或移动端页面时，要检查桌面端与移动端资源是否同时覆盖。

### 9.6 测试风格
- 现有测试大量使用 `ServiceProviderBase` + `Rhino.Mocks` 模拟 `IServiceProvider`、`IPluginExecutionContext`、`ITracingService`。
- 同时，测试也常连接真实 CRM 环境并读取真实记录，这更接近“集成辅助测试”或“场景测试”，不是纯离线单元测试。

落地要求：
- 输出测试方案时必须区分：纯单元测试、集成辅助测试、场景测试。
- 依赖真实环境的测试要明确环境、账号、前置数据、可重复执行性和失败恢复方式。

### 9.7 打包与交付
- 插件项目通常启用强签名。
- 项目使用 ILMerge 合并依赖，并通过 `ILMergeConfig.json` 显式控制。
- WebResource 部署使用 `spkl`。
- 解决方案导入/部署还可能涉及 `PkgDeploy`。

落地要求：
- 任何新增依赖都要检查是否影响强签名、ILMerge、spkl 或部署包。
- 交付清单中不能只写代码文件，还要写清楚部署与打包工件。

## 10. 建议补强点
结合现有实际代码，建议在后续项目中逐步补强以下做法：

### 10.1 统一基类与框架版本
- 减少 `PluginBase` 与 `XrmPluginBase` 混用。
- 减少包版本漂移，建立明确的推荐版本基线。

### 10.2 消除配置硬编码
- 不建议在插件中直接硬编码 `C:\CRMConfig\Vyung.Xrm.config`。
- 建议增加统一配置解析入口，或在宿主层注入配置路径与关键参数。

### 10.3 强化“薄入口，厚业务”
- 不建议继续扩大超长 `actionCode if/else` 或大型插件入口类。
- 建议优先抽成可测试的 `Handler / Service / BLL`，入口类只做协议适配。

### 10.4 区分测试类型
- 现有“单元测试”中有相当一部分依赖真实环境，后续应显式区分并命名。
- 建议核心业务逻辑逐步补齐真正可离线运行的单元测试。

### 10.5 前端现代化
- 现有前端仍可见 `Xrm.Page`、同步 Ajax 等旧模式。
- 新增代码应优先使用 `formContext`、异步调用、可维护的模块边界，并保持与既有全局命名空间兼容。

## 11. 已知局限
当前摘要基于本地 PDF 文件、标准仓库代码与审批流源码的静态阅读整理而成，因此：
- 可以安全用于生成 skill、流程、检查清单、评审规则和实现框架。
- 对“团队实际口头约定但未落到代码/文档”的规范仍可能覆盖不全。
- 若后续拿到更多内部 wiki、代码评审清单或发布流程文档，可继续把本文件补全为更细的规范手册。
