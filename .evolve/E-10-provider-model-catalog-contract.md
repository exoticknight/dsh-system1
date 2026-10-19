+++
id = "E-10"
state = "evolve"
status = "accepted"
title = "Provider 自有模型目录与别名解析"
created = "2026-10-19"
document_paths = ["docs/api.md", "docs/api.en.md", "CONTRIBUTING.md", "CONTRIBUTING.zh-CN.md"]
verified = true
+++

# E-10: Provider 自有模型目录与别名解析

## Change

- 每个内置 provider 在自己的 `models.ts` 定义并导出模型数组；设置页和 adapter 复用对应 provider 的数据，不再依赖跨 provider 的集中目录。
- `ProviderModel` 只描述规范 `id` 和可选 `aliases`。能力限制由 provider adapter 维护，设置页本地化显示文案由 client locale 维护。
- `SystemOneHttpProviderOptions.resolveModel` 将用户输入解析为模型定义；共享 System One transport 在能力查询、上游请求与响应归一化前使用规范 ID。Cloudflare adapter 对短 ID 与 `@cf/cloudflare/...` 别名执行同样归一化。
- `findProviderModel` 通过 `dsh-system1/providers` 导出，供第三方 provider 按相同数据格式实现别名匹配；示例展示了定义目录和解析模型的用法。
- 新增的公共模型数据导出为 `TYPESAFE_MODELS`、`LAYA_MODELS` 与 `CLOUDFLARE_MODELS`，分别从 provider 子路径提供。
- 扩展既有包检查，以安装后的 tarball 验证模型数组、别名解析器和 `dsh-system1/client` 类型入口。
- `tsconfig.json` 将通用 provider 包路径映射到源码，确保 `typecheck` 在 build 前验证源码 API。
- 为共享 transport 的 alias canonicalization 与未知模型优先级新增定向覆盖，放入 `tests/shared/` 并由 `pnpm test shared` 运行；模型数组的包检查改为成员断言，不依赖展示顺序。
- 提交前构建输入追踪包含 `tsconfig.client.json`，因为它决定 client declaration 的输出结构。
- npm 文件清单排除 client 编译过程中产生、但公开 client 声明未引用的重复 `contracts` 和 `providers` 类型树；`.gitignore` 将这些重复生成目录作为本地产物忽略。

## Rationale

模型名称与别名由拥有其路由语义的 provider 定义，设置 UI 只消费这些定义。此边界避免总目录承担不同 provider 的能力或显示语义，同时让客户端选项和 adapter 的运行时接受范围来自相同的数据。共享解析函数使第三方 provider 可复用相同别名规则。

## Acceptance

- 三个内置 provider 子路径导出各自模型数组，设置页选项和 adapter 校验使用各自数组。
- aliases 在输入边界解析到规范 ID，能力查询与上游请求收到规范 ID；当前没有定义 alias 的模型保持原行为。
- provider 能力元数据与本地化显示文案继续由其模块维护。
- `dsh-system1/providers` 导出 `findProviderModel`；第三方示例用 `ProviderModel` 和该解析器完成 alias 查找。
- API 文档描述新增的类型、数组和解析器导出，并说明规范 ID 与别名关系。
- 安装后的 package check 能解析 `dsh-system1/client` 类型入口，并验证 provider 子路径模型数组和 alias helper。
- `pnpm typecheck` 在 build 前解析 `dsh-system1/providers` 到源码。
- 共享 transport 测试覆盖 alias 被规范化后进入能力查询、序列化、请求 model 和响应归一化；未知模型与缺少凭据同时发生时优先返回 `unsupported`。
- `pnpm test shared` 选择共享 transport 测试，不将 `systemone` 注册成 provider 测试目标。
- 提交前构建钩子将 `tsconfig.client.json` 视为构建输入，并在其有未暂存改动时阻止提交。
- npm tarball 不包含 `lib/types/contracts/**` 或 `lib/types/providers/**`，也不依赖模型数组顺序。

## Verification

- `pnpm verify` 通过：typecheck 在 build 前完成；测试 51/51；build 与 isolated package check 均通过。
- `pnpm test shared` 通过，定向运行共享 transport 用例 2/2。
- 定向测试验证 shared transport 将别名规范化后传入能力查询、序列化、请求 model 和响应归一化；未知模型与缺少凭据同时发生时返回 `unsupported`，且不读取凭据或发起请求。
- `check:package` 验证安装包中的 client 类型入口、provider 模型导出和别名解析；tarball 不含 `lib/types/contracts/**` 与 `lib/types/providers/**`。
- 提交前构建输入清单包含 `tsconfig.client.json`，匹配会影响 client 声明输出的配置变更。
- `red check --json` 返回 `ok: true`；`git diff --check` 通过。
- 本机 `red promote` 因 CLI 比较 TOML null-prototype 对象与普通对象而拒绝写入；在用户明确接受后，按同一 CLI 生成的 `status = "accepted"`、`verified = true` 和 `document_paths` 字段手动记录，随后通过 `red check`。
- RED 研究文件的结构错误已通过补 frontmatter 和使用匹配 ID 的文件名修复。

## Document synchronization

已在 `docs/api.md` 和 `docs/api.en.md` 同步公开入口、`ProviderModel` 格式、provider-owned 模型数组、别名规范化、能力与本地化文案的归属，以及内置 provider 对未知模型的错误优先级。

## Open questions

- 暂无。
