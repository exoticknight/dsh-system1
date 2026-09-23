# 发布流程

[English](../en/releasing.md) | [简体中文](releasing.md)

推送 `v*` tag 会触发 Release workflow。工作流检查 tag 是否与 `package.json.version` 一致，复用 CI 矩阵，并创建包含自动生成发布说明的 GitHub Release。GitHub 会为每个 tag 自动提供源码压缩包。带预发布后缀的版本会标记为预发布。

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

GitHub Release 包含发布说明和 GitHub 自动生成的源码压缩包。安装插件时请使用上面的 GitHub tag 引用。

## 工作流行为

- Windows/Linux × Node 22.19/24 矩阵中的所有检查通过后才会发布。
- 发布作业通过 GitHub CLI 创建 Release 并生成发布说明，不构建或上传包文件。
- 发布作业使用仓库提供的 `GITHUB_TOKEN`，仅授予 `contents: write`；不需要 TypeSafe 或 npm 凭据。
- 工作流发布到 GitHub Releases。发布到 npm registry 需另行配置。
- 同一个 tag 的任务会串行执行。已有 Release 不会被覆盖。任务失败后，先检查 tag 和 Release 状态，再决定重跑或发布修复版本。
