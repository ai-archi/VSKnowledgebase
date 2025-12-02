# PlantUML Jar 文件

## 文件位置

- **文件名**: `plantuml-1.2025.10.jar`
- **完整路径**: `packages/plantuml-js/vendor/plantuml-1.2025.10.jar`
- **构建输出**: `apps/extension/dist/plantuml-js/vendor/plantuml-1.2025.10.jar`（保留 vendor 目录结构）

## 文件准备

此文件需要提前准备好并放置在本目录。文件应该已经提交到 Git 仓库。

如果文件缺失，需要：
1. 从 PlantUML 官方下载: https://plantuml.com/download
2. 将下载的 jar 文件放置到本目录 (`packages/plantuml-js/vendor/`)
3. 更新 `webpack.config.js` 中的文件名（如果需要）
4. 提交到 Git 仓库

## 版本要求

- 当前版本: 1.2025.10
- 建议使用最新稳定版本
- 最低版本要求: 1.2023.0+

## 持久化

此文件已提交到 Git 仓库，确保所有开发者都能直接使用。

## 构建流程

构建时，webpack 会自动将此文件从 `vendor/` 目录复制到 `apps/extension/dist/plantuml-js/vendor/plantuml-1.2025.10.jar`，保留 vendor 目录结构。

