# ArchiTool 新架构快速开始指南

## 📦 安装依赖

```bash
# 安装所有依赖
pnpm install
```

## 🔨 编译项目

```bash
# 编译 Extension
pnpm --filter @architool/extension compile

# 编译所有模块
pnpm -r compile
```

## 🚀 运行和测试

### 在 VSCode 中运行

1. 打开项目根目录
2. 按 `F5` 启动调试
3. 在新窗口中测试命令：
   - `archi.vault.add` - 创建 Vault
   - `archi.vault.list` - 列出 Vault
   - `archi.document.create` - 创建文档

### 测试命令

在 VSCode 命令面板（`Cmd+Shift+P` 或 `Ctrl+Shift+P`）中运行：
- `ArchiTool: Add Vault`
- `ArchiTool: List Vaults`
- `ArchiTool: Create Document`

## 📁 项目结构

```
project/
├── apps/
│   ├── extension/          # VSCode 插件后端
│   └── webview/            # Webview 前端（Vue 3）
├── domain/                 # 领域核心
│   └── shared/
│       ├── artifact/       # Artifact 领域模型
│       └── vault/          # Vault 领域模型
├── infrastructure/         # 基础设施层
│   ├── di/                 # DI 容器配置
│   └── storage/
│       ├── duckdb/         # DuckDB 存储
│       ├── file/           # 文件系统存储
│       └── yaml/           # YAML 存储
└── pnpm-workspace.yaml     # pnpm workspace 配置
```

## 🎯 核心功能

### 已实现

✅ **Vault 管理**
- 创建本地 Vault
- 列出所有 Vault
- Vault 配置管理

✅ **Artifact 管理**
- 创建 Artifact
- 更新 Artifact
- 删除 Artifact
- 查询 Artifact

✅ **存储系统**
- DuckDB 运行时索引
- YAML 元数据存储
- 文件系统适配器

✅ **DI 容器**
- InversifyJS 配置
- 服务依赖注入

### 进行中

⏳ **MCP Server**
- 框架已创建
- 需要完善实现

⏳ **Git Vault**
- 接口已定义
- 需要实现 Git 操作

## 🔧 配置

### .architool 目录结构

所有数据存储在 `.architool/` 目录下：

```
.architool/
├── architool.yml           # 全局配置
├── cache/
│   └── runtime.duckdb      # DuckDB 运行时数据库
└── {vault-name}/           # Vault 目录
    ├── architool.yml       # Vault 配置
    ├── artifacts/          # Artifact 文件
    ├── metadata/           # 元数据文件
    ├── links/              # 链接文件
    ├── templates/          # 模板文件
    ├── tasks/              # 任务文件
    ├── viewpoints/         # 视点配置
    └── changes/            # 变更记录
```

## 📝 开发指南

### 添加新命令

1. 在 `apps/extension/src/main.ts` 中注册命令：
```typescript
vscode.commands.registerCommand('archi.your.command', async () => {
  // 实现逻辑
});
```

2. 在 `package.json` 中声明命令（如果需要）：
```json
{
  "contributes": {
    "commands": [{
      "command": "archi.your.command",
      "title": "Your Command"
    }]
  }
}
```

### 添加新应用服务

1. 定义接口（在 `application/` 目录）
2. 实现服务（在 `application/` 目录）
3. 在 DI 容器中注册（`infrastructure/di/container.ts`）

### 添加新存储库

1. 定义接口（在 `infrastructure/` 目录）
2. 实现存储库（在 `infrastructure/` 目录）
3. 在 DI 容器中注册

## 🐛 常见问题

### 依赖安装失败

确保使用 pnpm：
```bash
npm install -g pnpm
pnpm install
```

### TypeScript 编译错误

检查路径别名配置：
- `tsconfig.json` 中的 `paths` 配置
- `package.json` 中的 workspace 依赖

### DuckDB 初始化失败

DuckDB 初始化失败不会阻止插件运行，但会影响搜索功能。检查：
- DuckDB 文件路径是否正确
- 文件系统权限

## 📚 参考文档

- `EXPECTED_ARCHITECTURE_DESIGN.md` - 架构设计
- `DETAILED_TECHNICAL_DESIGN.md` - 技术设计
- `IMPLEMENTATION_PLAN.md` - 实施计划
- `IMPLEMENTATION_PROGRESS.md` - 实施进度

## 🎉 下一步

1. **完善 MCP Server** - 实现完整的 AI 工具集成
2. **实现 Git Vault** - 支持从 Git 仓库拉取 Vault
3. **完善命令** - 实现所有 Vault 和 Artifact 管理命令
4. **添加测试** - 编写单元测试和集成测试
5. **性能优化** - 优化 DuckDB 查询和索引性能

