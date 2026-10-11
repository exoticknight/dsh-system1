# 发布流程

[简体中文](releasing.md) | [English](releasing.en.md)

推送 `v*` tag 会触发 Release workflow。工作流检查 tag 是否与 `package.json.version` 一致，复用 CI 矩阵，发布到 npm，然后创建包含自动生成发布说明的 GitHub Release。GitHub 会为每个 tag 自动提供源码压缩包。带预发布后缀的版本会标记为预发布，并以 npm `next` dist-tag 发布；正式版使用 `latest`。

## npm 发布身份

在 npm 包设置中添加 GitHub Actions Trusted Publisher：账号 `exoticknight`、仓库 `dsh-system1`、工作流文件 `release.yml`，允许 `npm publish`，环境名留空。工作流通过 OIDC 发布，不使用 npm token。新建信任关系后两天内须成功发布一次来完成验证，建议临近下一个版本发布时配置。详见 [npm Trusted Publisher 文档](https://docs.npmjs.com/trusted-publishers/)。

首次创建 npm 包前无法配置 Trusted Publisher。`v0.2.0` 由维护者从对应的干净提交交互式执行 `npm publish --access public --tag latest` 并完成 2FA；该 tag 沿用旧工作流创建 GitHub Release。后续 tag 使用本页所述的 OIDC 工作流。

## 准备发布

1. 确认默认分支 CI 通过，公开接口和文档已更新。
2. 修改 `package.json.version`，然后运行 `pnpm install --lockfile-only` 和 `pnpm verify`。
3. 提交版本变更并推送到 `main`。
4. 创建与版本匹配的 tag 并推送。例如版本为 `0.1.0`：

```sh
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0
```

## 安装发行版本

直接从 GitHub 安装指定 tag：

```sh
dsh plugin --profile headless add github:exoticknight/dsh-system1#vX.Y.Z
```

GitHub Release 包含发布说明和 GitHub 自动生成的源码压缩包。安装插件时可以使用上面的 GitHub tag 引用；npm 发布后也可以运行 `pnpm add dsh-system1`。

## 工作流行为

- Windows/Linux × Node 22.19/24 矩阵中的所有检查通过后才会发布。
- 发布作业重新安装依赖并构建，检查 `lib/` 与 tag 中提交的内容一致，再通过 npm CLI 发布包。npm 发布成功后才创建 GitHub Release。
- npm 发布使用 Trusted Publisher 和作业的 `id-token: write` 权限。GitHub Release 使用仓库的 `GITHUB_TOKEN` 和 `contents: write` 权限。
- 同一个 tag 的任务会串行执行。已有 Release 不会被覆盖。npm 版本不可重复发布；如果 npm 发布成功但创建 GitHub Release 失败，请检查两处状态，再手动补建 GitHub Release。
