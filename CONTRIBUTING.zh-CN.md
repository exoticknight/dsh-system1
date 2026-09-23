# 贡献指南

[English](CONTRIBUTING.md) | [简体中文](CONTRIBUTING.zh-CN.md)

## 准备项目环境

使用 Node.js 22.19+（22.x）或 Node.js 24，安装 `package.json` 中指定版本的 pnpm，然后执行：

```sh
pnpm install --frozen-lockfile
pnpm hooks:install
pnpm verify
```

沿用本机现有工具链和默认缓存位置。依赖发生变化时，同时提交 `package.json` 和 `pnpm-lock.yaml`。

## 项目结构

| 路径                      | 职责                                               |
| ------------------------- | -------------------------------------------------- |
| `src/index.ts`            | Cordis 服务、配置和 Context 声明                   |
| `src/contracts/`          | 消费者与 provider 共用的公开类型                   |
| `src/core/`               | 请求校验、分发、结果校验、超时和 provider 生命周期 |
| `src/providers/typesafe/` | TypeSafe 插件配置、后端调用和协议映射              |
| `examples/`               | 消费者与第三方 provider 示例                       |
| `tests/`                  | 公共契约、HTTP fixture 和生命周期检查              |
| `scripts/`                | 安装包检查以及显式运行的后端/宿主探针              |
| `docs/en/`、`docs/zh-CN/` | 英文和简体中文 API、发布指南                       |

生成的 `lib/` JavaScript、类型声明和 source map 会提交到仓库，供 dsh 直接从 GitHub 安装。提交前钩子会运行 `pnpm build` 并暂存更新后的 `lib/`。提交前请先暂存构建输入；如果发现 source 有未暂存或未跟踪的改动，钩子会停止提交，避免生成物与提交中的源文件不一致。

钩子通过仅用于开发的 `simple-git-hooks` 管理。仓库在 `pnpm-workspace.yaml` 中明确允许它的安装脚本，以便 `pnpm install` 注册维护者钩子。该包不属于 dsh 的运行时依赖。修改钩子配置后，可运行 `pnpm hooks:install` 更新本地钩子。

## 实现约定

- 保持改动小而完整。新增行为先确定属于基础服务、provider 还是消费插件。
- 通用能力优先复用成熟依赖。若编写自有基础设施，应说明现有库无法满足的具体契约或生命周期保证。
- 使用 strict TypeScript、ESM 和 `.js` 相对导入后缀。示例通过公开包导出入口导入。
- provider 将请求视为只读，遵守 `AbortSignal`，归一化结果并保留实际模型及可用用量。
- 针对可观察行为和关键回归进行检查；公共契约变更时同步示例与 API 文档。
- 错误信息应适合展示。凭据、原始服务端响应正文和用户输入不得写入日志或测试快照。

## 提交前检查

```sh
pnpm format
pnpm verify
```

`verify` 会执行类型检查、格式检查、Node 测试、构建，以及独立目录中的 tarball 安装和消费者编译。测试使用本地响应，不需要后端凭据。CI 在 Windows/Linux 和 Node 22.19/24 上执行同一命令。

修改宿主接入时，可使用已安装的 dsh `0.1.5-rc.2` 执行 Loader 探针：

```sh
pnpm build
pnpm probe:host <path-to-node_modules/@deepseek-ai/dsh/package.json>
```

修改 TypeSafe 协议时，在 `.env.local` 中配置凭据后显式运行 `pnpm probe:live`。缺少凭据时退出码为 2，题目失败时退出码为 1。单次响应仅作为接口样本；延迟和判断质量需要在实际场景中评估。

提交 PR 时说明问题、行为变化和验证结果。除 GitHub 安装所需的 `lib/` 外，生成物、凭据和本地调研记录由 Git 忽略。发布流程见[发布指南](docs/zh-CN/releasing.md)。
