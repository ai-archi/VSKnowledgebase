# ArchiTool 新架构实施说明

本文档说明新架构的实施状态和下一步操作。

## 已完成的实施

### 阶段 0.1: 项目结构 ✅
- 创建了单体项目目录结构（apps/, domain/, infrastructure/）
- 配置了 pnpm workspace
- 配置了 TypeScript 项目引用

### 阶段 0.2: 领域核心 ✅
- 创建了 Artifact 领域模型（domain/shared/artifact/）
- 创建了 Vault 领域模型（domain/shared/vault/）
- 实现了错误处理类型和 Result 类型
- 实现了 Artifact 验证器

### 阶段 0.3: 基础设施层 ✅
- 创建了 DuckDB 运行时索引（infrastructure/storage/duckdb/）
- 创建了文件系统适配器（infrastructure/storage/file/）
- 创建了 YAML 存储库（infrastructure/storage/yaml/）
- 实现了向量搜索工具

### 阶段 0.4: Extension 核心模块 ✅
- 创建了日志服务（apps/extension/src/core/logger/）
- 创建了配置管理器（apps/extension/src/core/config/）
- 创建了事件总线（apps/extension/src/core/eventbus/）
- 创建了主入口文件（apps/extension/src/main.ts）

### 阶段 0.5: 应用服务接口 ✅
- 定义了 ArtifactFileSystemApplicationService 接口
- 定义了 VaultApplicationService 接口
- 创建了 DI 容器类型定义

### 阶段 0.6: Webview 前端 ✅
- 创建了 Vue 3 + Vite 项目结构
- 配置了基础前端框架

## 待完成的任务

### 阶段 0.7: 应用服务实现
- [ ] 实现 ArtifactFileSystemApplicationServiceImpl
- [ ] 实现 VaultApplicationServiceImpl
- [ ] 实现存储库（ArtifactRepository, MetadataRepository, VaultRepository）

### 阶段 0.8: DI 容器配置
- [ ] 配置 InversifyJS 容器
- [ ] 绑定所有服务和依赖

### 阶段 0.9: VSCode 命令实现
- [ ] 实现 archi.vault.add 命令
- [ ] 实现 archi.vault.addFromGit 命令
- [ ] 实现 archi.vault.fork 命令
- [ ] 实现 archi.vault.sync 命令
- [ ] 实现 archi.document.create 命令

### 阶段 0.10: MCP Server
- [ ] 实现进程内 MCP Server
- [ ] 实现标准知识库 map API

## 下一步操作

1. **安装依赖**：
   ```bash
   pnpm install
   ```

2. **编译项目**：
   ```bash
   pnpm --filter @architool/extension compile
   ```

3. **运行测试**：
   ```bash
   pnpm test
   ```

## 注意事项

1. **依赖安装**：需要安装以下新依赖：
   - `inversify` - DI 容器
   - `duckdb` - DuckDB 数据库
   - `knex` - SQL 查询构建器
   - `@xenova/transformers` - 向量嵌入模型
   - `vue@3` - Vue 3 框架
   - `vite` - 前端构建工具
   - `pinia` - 状态管理

2. **DuckDB 向量搜索**：DuckDB 的 VSS 扩展可能需要特定版本，需要测试兼容性。

3. **文件系统操作**：所有文件操作都使用原子写入（临时文件 + 重命名）确保数据一致性。

4. **错误处理**：所有操作都使用 Result 类型进行函数式错误处理。

## 参考文档

- `EXPECTED_ARCHITECTURE_DESIGN.md` - 期望架构设计
- `DETAILED_TECHNICAL_DESIGN.md` - 详细技术设计
- `IMPLEMENTATION_PLAN.md` - 实施计划

