# 发布流程

[English](../en/releasing.md) | [简体中文](releasing.md)

推送 `v*` tag 会触发 Release workflow。工作流检查 tag 是否与 `package.json.version` 一致，复用 CI 矩阵，构建安装包，并在 GitHub Release 中发布 `.tgz` 和 `SHA256SUMS`。带预发布后缀的版本会标记为预发布。

## 准备发布

1. 确认默认分支 CI 通过，公开接口和文档已更新。
2. 修改 `package.json.version`，然后运行 `pnpm install --lockfile-only` 和 `pnpm verify`。
3. 提交版本变更并推送到 `main`。
4. 创建与版本匹配的 tag 并推送。例如版本为 `0.1.0`：

```sh
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0
```

## 安装 Release 压缩包

默认安装方式是直接使用 GitHub 仓库。若要改用 `.tgz`，从 [GitHub Releases](https://github.com/exoticknight/dsh-system1/releases) 下载文件，进入下载目录后传入解析出的实际路径。

PowerShell：

```powershell
$package = (Get-ChildItem .\dsh-system1-*.tgz | Select-Object -First 1).FullName
dsh plugin --profile headless add $package
```

macOS 或 Linux：

```sh
dsh plugin --profile headless add "$(realpath dsh-system1-*.tgz)"
```

## 工作流行为

- Windows/Linux × Node 22.19/24 矩阵中的所有检查通过后才会发布。
- 发布作业使用 Node 24 构建压缩包、计算 SHA-256、通过 GitHub CLI 生成 Release notes 并上传文件。
- 发布作业使用仓库提供的 `GITHUB_TOKEN`，仅授予 `contents: write`；不需要 TypeSafe 或 npm 凭据。
- 工作流发布到 GitHub Releases。发布到 npm registry 需另行配置。
- 同一个 tag 的任务会串行执行。已有 Release 不会被覆盖。任务失败后，先检查 tag 和 Release 状态，再决定重跑或发布修复版本。

下载附件后，使用 `sha256sum -c SHA256SUMS` 校验。在 Windows 上可通过 `Get-FileHash -Algorithm SHA256 <文件>` 比对。
