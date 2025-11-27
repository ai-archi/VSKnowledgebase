# 项目结构优化方案

## 一、问题分析

### 1.1 当前结构问题

#### Domain 层重复
- ❌ `apps/extension/src/domain/shared/artifact/` - 错误位置
- ❌ `domain/shared/artifact/` - 根目录独立包（应迁移到 modules）
- ❌ `apps/extension/src/domain/shared/artifact/application/` - 应用层不应在 domain 下

#### Infrastructure 层重复
- ❌ `apps/extension/src/infrastructure/storage/` - 错误位置
- ❌ `infrastructure/storage/` - 根目录独立包（应迁移到 modules）
- ✅ `apps/extension/src/infrastructure/di/` - 可保留（extension 特定的 DI 配置）

#### DI 容器重复
- ✅ `apps/extension/src/infrastructure/di/container.ts` - 使用中，正确
- ❌ `infrastructure/di/container.ts` - 未使用，路径错误

## 二、优化方案

### 2.1 目标结构（按模块划分，模块内按 DDD 分层）

```
project/
├── apps/
│   ├── extension/                 # VSCode 插件后端
│   │   ├── src/
│   │   │   ├── core/              # 插件核心能力
│   │   │   │   ├── eventbus/
│   │   │   │   ├── vscode-api/
│   │   │   │   ├── storage/       # 仅 extension 特定的存储适配
│   │   │   │   ├── logger/
│   │   │   │   └── config/
│   │   │   │
│   │   │   ├── infrastructure/    # Extension 特定的基础设施
│   │   │   │   └── di/            # DI 容器配置（extension 特定）
│   │   │   │
│   │   │   └── modules/           # 领域模块（按模块划分，模块内按 DDD 分层）
│   │   │       │
│   │   │       ├── shared/        # 共享资源（不是模块，是共享的领域模型和基础设施）
│   │   │       │   ├── domain/    # 共享领域层
│   │   │       │   │   ├── artifact.ts      # Artifact 实体
│   │   │       │   │   ├── ArtifactMetadata.ts
│   │   │       │   │   ├── ArtifactLink.ts
│   │   │       │   │   ├── ArtifactChange.ts
│   │   │       │   │   ├── vault.ts          # Vault 实体（与 artifact 同级）
│   │   │       │   │   ├── VaultReference.ts
│   │   │       │   │   ├── RemoteEndpoint.ts
│   │   │       │   │   ├── types.ts          # 共享类型
│   │   │       │   │   ├── errors.ts         # 共享错误类型
│   │   │       │   │   └── index.ts
│   │   │       │   ├── application/          # 共享应用层
│   │   │       │   │   ├── ArtifactFileSystemApplicationService.ts
│   │   │       │   │   ├── VaultApplicationService.ts
│   │   │       │   │   └── ...
│   │   │       │   └── infrastructure/       # 共享基础设施层
│   │   │       │       ├── storage/           # 存储适配器
│   │   │       │       │   ├── file/
│   │   │       │       │   ├── yaml/
│   │   │       │       │   └── duckdb/
│   │   │       │       ├── ArtifactRepository.ts
│   │   │       │       ├── MetadataRepository.ts
│   │   │       │       ├── VaultRepository.ts
│   │   │       │       └── ...
│   │   │       │
│   │   │       ├── document/      # 文档模块
│   │   │       │   ├── application/
│   │   │       │   └── interface/
│   │   │       │
│   │   │       ├── viewpoint/    # 视点模块
│   │   │       │   ├── application/
│   │   │       │   └── interface/
│   │   │       │
│   │   │       ├── task/          # 任务模块
│   │   │       │   ├── application/
│   │   │       │   └── interface/
│   │   │       │
│   │   │       ├── template/      # 模板模块
│   │   │       │   ├── application/
│   │   │       │   └── interface/
│   │   │       │
│   │   │       ├── editor/        # 编辑器模块
│   │   │       │   ├── archimate/  # ArchiMate 编辑器（ArchimateEditorProvider）
│   │   │       │   └── mermaid/    # Mermaid 编辑器（MermaidEditorProvider）
│   │   │       │
│   │   │       └── ...            # 其他模块
│   │   │
│   │   ├── dist/                  # 构建产物目录（统一管理，VSCode 打包此目录）
│   │   │   ├── extension/         # Extension 主服务代码（TypeScript 编译输出）
│   │   │   │   ├── main.js
│   │   │   │   ├── main.d.ts
│   │   │   │   └── ...            # 其他编译输出文件
│   │   │   ├── webview/           # Webview 构建产物（从 apps/webview/dist 复制）
│   │   │   ├── archimate-js/      # ArchiMate 编辑器静态资源（从 packages/archimate-js 构建）
│   │   │   └── mermaid-editor/    # Mermaid 编辑器静态资源（从 packages/mermaid-editor 构建）
│   │   ├── package.json           # VSCode 插件清单
│   │   ├── .vscodeignore          # VSCode 打包忽略文件
│   │   └── tsconfig.json          # TypeScript 配置（outDir: dist/extension）
│   │
│   └── webview/                   # 前端源码
│       ├── src/
│       ├── dist/                  # Webview 构建产物（临时目录，最终复制到 apps/extension/dist/webview/）
│       └── vite.config.ts
│
└── packages/                      # 独立可复用包（可选）
    ├── archimate-js/              # ArchiMate 编辑器源码包
    └── mermaid-editor/            # Mermaid 编辑器源码包
```

### 2.2 迁移步骤

#### 步骤 1：迁移 Domain 层到 modules/shared/domain（统一层级）

**关键点**：
- artifact 和 vault 应该在同一层级（都是领域模型文件）
- shared 不是模块，是共享资源

**迁移领域模型**（统一到同一目录，文件级别）：
- `apps/extension/src/domain/shared/artifact/Artifact.ts` → `apps/extension/src/modules/shared/domain/artifact.ts`
- `apps/extension/src/domain/shared/artifact/ArtifactMetadata.ts` → `apps/extension/src/modules/shared/domain/ArtifactMetadata.ts`
- `apps/extension/src/domain/shared/artifact/ArtifactLink.ts` → `apps/extension/src/modules/shared/domain/ArtifactLink.ts`
- `apps/extension/src/domain/shared/artifact/ArtifactChange.ts` → `apps/extension/src/modules/shared/domain/ArtifactChange.ts`
- `apps/extension/src/domain/shared/artifact/types.ts` → `apps/extension/src/modules/shared/domain/types.ts`
- `apps/extension/src/domain/shared/artifact/errors.ts` → `apps/extension/src/modules/shared/domain/errors.ts`
- `apps/extension/src/domain/shared/vault/Vault.ts` → `apps/extension/src/modules/shared/domain/vault.ts`（与 artifact 同级）
- `apps/extension/src/domain/shared/vault/VaultReference.ts` → `apps/extension/src/modules/shared/domain/VaultReference.ts`
- `apps/extension/src/domain/shared/vault/RemoteEndpoint.ts` → `apps/extension/src/modules/shared/domain/RemoteEndpoint.ts`

**处理重复的 Vault 定义**（重要：只保留一个版本）：
- **Vault.ts**：
  - `apps/extension/src/domain/shared/vault/Vault.ts` - `selfContained` 和 `readOnly` 是可选的（`?`）
  - `domain/shared/vault/src/Vault.ts` - `selfContained` 和 `readOnly` 是必需的（更完整）✅ **保留此版本**
  - **删除**：`apps/extension/src/domain/shared/vault/Vault.ts`
- **RemoteEndpoint.ts**：
  - `apps/extension/src/domain/shared/vault/RemoteEndpoint.ts` - 只有 `url` 和可选的 `branch`
  - `domain/shared/vault/src/RemoteEndpoint.ts` - 有 `url`、`branch`（必需）和 `sync` 字段（更完整）✅ **保留此版本**
  - **删除**：`apps/extension/src/domain/shared/vault/RemoteEndpoint.ts`
- **VaultReference.ts**：
  - 两个版本内容相同，保留 `domain/shared/vault/src/VaultReference.ts`
  - **删除**：`apps/extension/src/domain/shared/vault/VaultReference.ts`

**迁移策略**：
- 使用根目录 `domain/shared/vault/src/` 下的版本（更完整）
- 迁移到 `apps/extension/src/modules/shared/domain/` 时，使用根目录的版本
- 删除 `apps/extension/src/domain/shared/vault/` 整个目录（不再需要）

**迁移应用层**：
- `apps/extension/src/domain/shared/artifact/application/ArtifactTreeApplicationService*`
  → `apps/extension/src/modules/shared/application/ArtifactTreeApplicationService*`

**删除旧目录**：
- `apps/extension/src/domain/shared/vault/`（整个目录，使用根目录的完整版本）
- `apps/extension/src/domain/shared/artifact/`（整个目录，如果根目录版本更完整）
- `apps/extension/src/domain/`（整个目录，迁移完成后）
- `domain/`（根目录，迁移完成后删除，因为已迁移到 modules/shared/domain）

**更新导入**：
- 所有 `from '../../../domain/shared/artifact/Artifact'` 
  → `from '../../shared/domain/artifact'`（在 modules 内部）
  → `from '../../../modules/shared/domain/artifact'`（在 modules 外部）
- 所有 `from '../../../domain/shared/vault/Vault'`
  → `from '../../shared/domain/vault'`（在 modules 内部）
  → `from '../../../modules/shared/domain/vault'`（在 modules 外部）

#### 步骤 2：迁移 Infrastructure 层到 modules/shared/infrastructure

**迁移存储适配器**：
- `apps/extension/src/infrastructure/storage/file/` → `apps/extension/src/modules/shared/infrastructure/storage/file/`
- `apps/extension/src/infrastructure/storage/yaml/` → `apps/extension/src/modules/shared/infrastructure/storage/yaml/`
- `apps/extension/src/infrastructure/storage/sqlite/` → `apps/extension/src/modules/shared/infrastructure/storage/sqlite/` 或删除（如果使用 DuckDB）
- `apps/extension/src/modules/vault/infrastructure/GitVaultAdapter.ts` → `apps/extension/src/modules/shared/infrastructure/storage/git/GitVaultAdapter.ts`（统一到 shared）
- `infrastructure/storage/file/` → `apps/extension/src/modules/shared/infrastructure/storage/file/`（如果根目录存在）
- `infrastructure/storage/yaml/` → `apps/extension/src/modules/shared/infrastructure/storage/yaml/`（如果根目录存在）
- `infrastructure/storage/duckdb/` → `apps/extension/src/modules/shared/infrastructure/storage/duckdb/`（如果根目录存在）

**删除 vault 模块**（GitVaultAdapter 已迁移）：
- `apps/extension/src/modules/vault/`（整个目录，GitVaultAdapter 已迁移到 shared/infrastructure/storage/git/）

**保留**：
- `apps/extension/src/infrastructure/di/`（extension 特定的 DI 配置）

**删除旧目录**：
- `apps/extension/src/infrastructure/storage/`（整个目录）
- `infrastructure/`（根目录，如果存在）

**更新导入**：
- 所有 `from '../../../infrastructure/storage/...'`
  → `from '../../shared/infrastructure/storage/...'`（在 modules 内部）
  → `from '../../../modules/shared/infrastructure/storage/...'`（在 modules 外部）

#### 步骤 3：清理未使用的 DI 容器

**删除**：
- `infrastructure/di/container.ts`（路径错误，未使用）

**保留**：
- `apps/extension/src/infrastructure/di/container.ts`（使用中）

#### 步骤 4：更新导入路径

**Domain 模型导入**：
```typescript
// 旧：from '../../../domain/shared/artifact/Artifact'
// 新：from '../../shared/domain/artifact/Artifact'（在 modules 内部）
// 新：from '../../../modules/shared/domain/artifact/Artifact'（在 modules 外部）
```

**Infrastructure 适配器导入**：
```typescript
// 旧：from '../../../infrastructure/storage/file/ArtifactFileSystemAdapter'
// 新：from '../../shared/infrastructure/storage/file/ArtifactFileSystemAdapter'（在 modules 内部）
// 新：from '../../../modules/shared/infrastructure/storage/file/ArtifactFileSystemAdapter'（在 modules 外部）

// GitVaultAdapter 迁移：
// 旧：from '../../vault/infrastructure/GitVaultAdapter'
// 新：from '../../shared/infrastructure/storage/git/GitVaultAdapter'（在 modules 内部）
// 新：from '../../../modules/shared/infrastructure/storage/git/GitVaultAdapter'（在 modules 外部）
```

### 2.3 目录职责说明

#### 模块结构（按模块划分，模块内按 DDD 分层）

**shared**（`modules/shared/`）- **不是模块，是共享资源**：
- **domain/** - 共享领域层
  - `artifact.ts` - Artifact 实体（与 vault 同级）
  - `ArtifactMetadata.ts` - 元数据值对象
  - `ArtifactLink.ts` - 链接实体
  - `ArtifactChange.ts` - 变更实体
  - `vault.ts` - Vault 实体（与 artifact 同级，不是子目录）
  - `VaultReference.ts` - Vault 引用值对象
  - `RemoteEndpoint.ts` - 远程端点值对象
  - `types.ts` - 共享类型定义
  - `errors.ts` - 共享错误类型
  - `index.ts` - 统一导出
- **application/** - 共享应用层
  - `ArtifactFileSystemApplicationService.ts` - Artifact 应用服务
  - `VaultApplicationService.ts` - Vault 应用服务
  - `ArtifactTreeApplicationService.ts` - Artifact 树应用服务
- **infrastructure/** - 共享基础设施层
  - `storage/` - 存储适配器
    - `file/` - 文件系统适配器
    - `yaml/` - YAML 存储适配器
    - `duckdb/` - DuckDB 运行时索引
    - `git/` - Git 存储适配器（GitVaultAdapter）
  - `ArtifactRepository.ts` - Artifact 存储库
  - `MetadataRepository.ts` - 元数据存储库
  - `VaultRepository.ts` - Vault 存储库
  - `ChangeDetector.ts` - 变更检测器
  - `ArtifactLinkRepository.ts` - 链接存储库

**业务模块**（document、viewpoint、task、template、editor 等）：
- **application/** - 应用层（可选）
  - 模块特定的应用服务
- **interface/** - 接口层（可选）
  - TreeViewProvider、Commands 等
- **infrastructure/** - 基础设施层（可选）
  - 模块特定的基础设施（不包含存储适配器，存储适配器统一在 shared/infrastructure/storage/）

**editor 模块**（`modules/editor/`）：
- **archimate/** - ArchiMate 编辑器
  - `ArchimateEditorProvider.ts` - ArchiMate 编辑器提供者
- **mermaid/** - Mermaid 编辑器
  - `MermaidEditorProvider.ts` - Mermaid 编辑器提供者
  - `mermaidConverter.ts` - Mermaid 转换器

**构建产物目录**（`apps/extension/dist/`）：
- `extension/` - Extension 主服务代码（TypeScript 编译输出，main.js、*.d.ts 等）
- `webview/` - Webview 构建产物（从 `apps/webview/dist/` 复制）
- `archimate-js/` - ArchiMate 编辑器静态资源（从 `packages/archimate-js/` 构建）
- `mermaid-editor/` - Mermaid 编辑器静态资源（从 `packages/mermaid-editor/` 构建）

**VSCode 插件打包结构**：
- **插件根目录**：`apps/extension/`
- **打包内容**：
  - `package.json` - 插件清单（main 指向 `./dist/extension/main.js`）
  - `dist/` - 构建产物（直接在此目录，无需复制）
  - 其他配置文件（`README.md`、`language-configuration.json` 等）
- **排除内容**（`.vscodeignore`）：
  - `src/` - 源码目录
  - `tsconfig.json` - TypeScript 配置文件
  - `*.ts` - TypeScript 源文件
  - `node_modules/` - 依赖包
  - `.vscode/` - 开发配置

**构建产物管理原则**：
1. **统一目录**：所有构建产物集中在 `apps/extension/dist/` 下（VSCode 打包目录）
2. **源码分离**：源码在 `apps/extension/src/`，构建产物在 `apps/extension/dist/`，清晰分离
3. **便于打包**：`.vscodeignore` 排除 `src/`，只打包 `dist/` 和配置文件
4. **便于调试**：开发环境可以使用源码和构建产物，生产环境只使用构建产物
5. **简化流程**：构建产物直接输出到打包目录，无需复制步骤，减少维护成本

**关键设计原则**：
1. **shared 不是模块**：shared 是共享资源，包含被多个模块使用的领域模型和基础设施
2. **artifact 和 vault 同级**：它们都是领域模型，在同一层级（`domain/` 目录下），不是嵌套关系
3. **文件级别组织**：领域模型按文件组织，不是按目录（除非文件太多）

#### Extension 基础设施（`apps/extension/src/infrastructure/`）
- **职责**：Extension 特定的基础设施配置
- **位置**：extension 内部
- **内容**：
  - `di/` - DI 容器配置（extension 特定）

#### 核心能力（`apps/extension/src/core/`）
- **职责**：插件核心能力
- **内容**：
  - `eventbus/` - 事件总线
  - `vscode-api/` - VSCode API 适配器
  - `storage/` - Extension 特定的存储适配
  - `logger/` - 日志
  - `config/` - 配置管理

## 三、VSCode 插件打包结构

### 3.1 构建产物目录结构

**`apps/extension/dist/`**（统一管理所有构建产物，VSCode 打包目录）：
```
apps/extension/dist/
├── extension/              # Extension 主服务代码（TypeScript 编译输出）
│   ├── main.js
│   ├── main.d.ts
│   └── ...                 # 其他编译输出文件
├── webview/                # Webview 构建产物（从 apps/webview/dist 复制）
│   ├── index.html
│   ├── assets/
│   └── ...
├── archimate-js/           # ArchiMate 编辑器静态资源（从 packages/archimate-js 构建）
│   ├── index.html
│   ├── *.js
│   └── ...
└── mermaid-editor/         # Mermaid 编辑器静态资源（从 packages/mermaid-editor 构建）
    ├── index-v2.html
    ├── *.js
    └── ...
```

### 3.2 VSCode 插件打包结构

**重要说明**：
- **VSCode 打包机制**：`vsce package` 命令只打包插件根目录（`apps/extension/`）下的内容，**不会包含父目录的文件**
- **构建产物位置**：所有构建产物直接输出到 `apps/extension/dist/`，无需复制步骤
- **简化流程**：构建产物统一在 `apps/extension/dist/`，减少维护成本，打包时直接使用此目录

**插件根目录**：`apps/extension/`（VSCode 打包此目录）

**打包后的插件结构**：
```
apps/extension/             # VSCode 插件根目录（打包此目录）
├── dist/                   # 构建产物（直接在此目录，无需复制）
│   ├── extension/          # Extension 主服务代码
│   │   ├── main.js
│   │   └── ...
│   ├── webview/            # Webview 构建产物
│   ├── archimate-js/       # ArchiMate 编辑器静态资源
│   └── mermaid-editor/     # Mermaid 编辑器静态资源
├── package.json            # 插件清单（main: "./dist/extension/main.js"）
├── README.md               # 插件说明
├── .vscodeignore           # 打包排除文件
└── language-configuration.json  # 语言配置（如果有）
```

**`.vscodeignore` 配置**（排除不需要打包的文件）：
```
# 排除源码
src/

# 排除开发文件
tsconfig.json
*.ts
!dist/extension/**/*.d.ts

# 排除构建工具
node_modules/
.vscode/

# 只包含构建产物和配置文件
dist/
package.json
README.md
language-configuration.json
```

### 3.3 构建和打包流程

1. **开发构建**（根目录执行）：
   ```bash
   # 构建 Extension 主服务（输出到 apps/extension/dist/extension/）
   npm run build:extension
   
   # 构建 Webview（输出到 apps/webview/dist/，然后复制到 apps/extension/dist/webview/）
   npm run build:webview
   
   # 构建 ArchiMate 编辑器（直接输出到 apps/extension/dist/archimate-js/）
   npm run build:archimate-js
   
   # 构建 Mermaid 编辑器（直接输出到 apps/extension/dist/mermaid-editor/）
   npm run build:mermaid-editor
   ```

2. **完整构建**（一键构建所有）：
   ```bash
   npm run build
   ```

3. **VSCode 插件打包**：
   ```bash
   # 进入插件目录
   cd apps/extension
   
   # 打包插件（vsce 只打包当前目录下的内容）
   vsce package
   ```
   - **说明**：`vsce package` 只打包 `apps/extension/` 目录下的内容
   - 构建产物已在 `apps/extension/dist/`，无需复制步骤
   - `.vscodeignore` 自动排除源码，只打包 `dist/` 和配置文件
   - 打包后的 `.vsix` 文件只包含必要的运行时文件

### 3.4 路径引用说明

**代码中的路径引用**（使用 `context.extensionPath`）：
```typescript
// Webview 路径
const webviewPath = path.join(context.extensionPath, 'dist', 'webview');

// ArchiMate 编辑器路径
const archimatePath = path.join(context.extensionPath, 'dist', 'archimate-js');

// Mermaid 编辑器路径
const mermaidPath = path.join(context.extensionPath, 'dist', 'mermaid-editor');
```

**package.json 配置**：
```json
{
  "main": "./dist/extension/main.js",
  "activationEvents": [...],
  "contributes": {
    "webviews": {
      "webviewId": {
        "path": "./dist/webview"
      }
    }
  }
}
```

## 四、实施计划

### 阶段 1：准备（1-2 天）
1. 创建备份
2. 更新 package.json 中的包名和导入路径
3. 更新 tsconfig.json 路径映射

### 阶段 2：迁移 Domain 层（1 天）
1. 迁移 `ArtifactTreeApplicationService` 到 `modules/shared/application/`
2. 删除 `apps/extension/src/domain/`
3. 更新所有导入路径

### 阶段 3：迁移 Infrastructure 层（1-2 天）
1. 确认 `infrastructure/storage/` 下的包已正确配置
2. 删除 `apps/extension/src/infrastructure/storage/`
3. 更新所有导入路径
4. 删除未使用的 `infrastructure/di/container.ts`

### 阶段 4：验证（1 天）
1. 运行类型检查
2. 运行测试
3. 验证构建成功
4. 检查导入路径是否正确

## 五、注意事项

1. **模块化组织**：所有代码按模块划分，模块内按 DDD 分层（domain、application、infrastructure、interface）
2. **路径映射**：在 `tsconfig.json` 中配置路径别名，便于导入（可选）
3. **依赖关系**：确保依赖关系正确
   - domain 层不依赖 infrastructure 层
   - application 层可以依赖 domain 和 infrastructure
   - interface 层可以依赖 application
4. **相对路径**：优先使用相对路径导入，保持模块内聚
5. **测试**：迁移后运行所有测试，确保功能正常

## 六、预期收益

1. **结构清晰**：按模块划分，模块内按 DDD 分层，职责明确
2. **减少重复**：消除重复的目录定义，统一在 modules 下
3. **易于维护**：模块内聚，相对路径导入，便于重构
4. **符合要求**：按模块划分目录，模块内按 DDD 分层

## 七、关键迁移清单

### 需要迁移的目录/文件

1. **Domain 层**（统一层级，文件级别，使用根目录的完整版本）：
   - **Artifact 相关**（使用根目录版本）：
     - `domain/shared/artifact/src/Artifact.ts` → `apps/extension/src/modules/shared/domain/artifact.ts`
     - `domain/shared/artifact/src/ArtifactMetadata.ts` → `apps/extension/src/modules/shared/domain/ArtifactMetadata.ts`
     - `domain/shared/artifact/src/ArtifactLink.ts` → `apps/extension/src/modules/shared/domain/ArtifactLink.ts`
     - `domain/shared/artifact/src/ArtifactChange.ts` → `apps/extension/src/modules/shared/domain/ArtifactChange.ts`
     - `domain/shared/artifact/src/types.ts` → `apps/extension/src/modules/shared/domain/types.ts`
     - `domain/shared/artifact/src/errors.ts` → `apps/extension/src/modules/shared/domain/errors.ts`
   - **Vault 相关**（使用根目录的完整版本，删除 extension 下的不完整版本）：
     - `domain/shared/vault/src/Vault.ts` → `apps/extension/src/modules/shared/domain/vault.ts` ✅ **保留此版本**（`selfContained` 和 `readOnly` 是必需的）
     - `domain/shared/vault/src/VaultReference.ts` → `apps/extension/src/modules/shared/domain/VaultReference.ts`
     - `domain/shared/vault/src/RemoteEndpoint.ts` → `apps/extension/src/modules/shared/domain/RemoteEndpoint.ts` ✅ **保留此版本**（包含 `sync` 字段）
   - **删除**：`apps/extension/src/domain/shared/vault/` 整个目录（不完整版本）
   - **删除**：`apps/extension/src/domain/shared/artifact/` 整个目录（如果根目录版本更完整）

3. **应用层**：
   - `apps/extension/src/domain/shared/artifact/application/ArtifactTreeApplicationService*` → `apps/extension/src/modules/shared/application/ArtifactTreeApplicationService*`

4. **Infrastructure 层**：
   - `apps/extension/src/infrastructure/storage/file/` → `apps/extension/src/modules/shared/infrastructure/storage/file/`
   - `apps/extension/src/infrastructure/storage/yaml/` → `apps/extension/src/modules/shared/infrastructure/storage/yaml/`
   - `apps/extension/src/infrastructure/storage/sqlite/` → `apps/extension/src/modules/shared/infrastructure/storage/sqlite/` 或删除
   - `apps/extension/src/modules/vault/infrastructure/GitVaultAdapter.ts` → `apps/extension/src/modules/shared/infrastructure/storage/git/GitVaultAdapter.ts`（统一到 shared）
   - `infrastructure/storage/*/` → `apps/extension/src/modules/shared/infrastructure/storage/*/`（如果根目录存在）

5. **删除 vault 模块**（如果只有 infrastructure）：
   - `apps/extension/src/modules/vault/`（整个目录，GitVaultAdapter 已迁移到 shared/infrastructure/storage/git/）

#### 步骤 5：重构构建产物目录（统一到 apps/extension/dist/，明确 VSCode 插件打包结构）

**目标**：将所有构建产物统一到 `apps/extension/dist/`，源码和构建产物完全分离，明确 VSCode 插件打包结构，减少维护成本

**当前问题**：
- 构建产物分散在多个目录：`apps/extension/out/`、`apps/extension/webview/`、`apps/extension/archimate-js/`、`apps/extension/mermaid-editor/`
- 源码和构建产物混在一起，不利于打包和调试
- VSCode 插件打包结构不明确

**目标结构**：
```
project/
├── apps/
│   └── extension/                 # VSCode 插件根目录
│       ├── src/                   # 源码目录（不打包）
│       ├── dist/                  # 构建产物（统一管理，VSCode 打包此目录）
│       │   ├── extension/         # Extension 主服务代码（TypeScript 编译输出）
│       │   │   ├── main.js
│       │   │   ├── main.d.ts
│       │   │   └── ...
│       │   ├── webview/           # Webview 构建产物（从 apps/webview/dist 复制）
│       │   ├── archimate-js/      # ArchiMate 编辑器静态资源（从 packages/archimate-js 构建）
│       │   └── mermaid-editor/   # Mermaid 编辑器静态资源（从 packages/mermaid-editor 构建）
│       ├── package.json           # 插件清单（main: "./dist/extension/main.js"）
│       ├── .vscodeignore          # 打包排除文件
│       └── tsconfig.json          # TypeScript 配置（outDir: dist/extension）
```

**VSCode 插件打包结构说明**：
- **插件根目录**：`apps/extension/`（VSCode 打包此目录）
- **打包内容**：
  - `package.json` - 插件清单
  - `dist/` - 构建产物（直接在此目录，无需复制）
  - 其他配置文件（`README.md`、`language-configuration.json` 等）
- **排除内容**（`.vscodeignore`）：
  - `src/` - 源码目录
  - `tsconfig.json` - TypeScript 配置文件
  - `*.ts` - TypeScript 源文件
  - `node_modules/` - 依赖包
  - `.vscode/` - 开发配置

**迁移步骤**：

1. **更新 TypeScript 配置**：
   - `apps/extension/tsconfig.json`：`"outDir": "dist/extension"`（从 `"out"` 改为 `"dist/extension"`）

2. **更新 package.json**：
   - `apps/extension/package.json`：`"main": "./dist/extension/main.js"`（从 `"./out/main.js"` 改为 `"./dist/extension/main.js"`）

3. **更新构建脚本**（根目录 `package.json`）：
   ```json
   {
     "scripts": {
       "build:extension": "cd apps/extension && tsc",
       "build:archimate-js": "mkdir -p apps/extension/dist/archimate-js && rm -rf apps/extension/dist/archimate-js/* && cd packages/archimate-js && OUTPUT_PATH=../../apps/extension/dist/archimate-js npm run build",
       "build:mermaid-editor": "mkdir -p apps/extension/dist/mermaid-editor && rm -rf apps/extension/dist/mermaid-editor/* && cd packages/mermaid-editor && OUTPUT_PATH=../../apps/extension/dist/mermaid-editor pnpm run build:v2",
       "build:webview": "cd apps/webview && npm run build && mkdir -p ../extension/dist/webview && rm -rf ../extension/dist/webview/* && cp -r dist/* ../extension/dist/webview/",
       "build": "npm run build:extension && npm run build:webview && npm run build:archimate-js && npm run build:mermaid-editor",
       "cleanup": "rm -rf apps/extension/dist apps/*/out"
     }
   }
   ```

4. **创建 .vscodeignore**（`apps/extension/.vscodeignore`）：
   ```
   # 排除源码
   src/
   
   # 排除开发文件
   tsconfig.json
   *.ts
   !dist/extension/**/*.d.ts
   
   # 排除构建工具
   node_modules/
   .vscode/
   
   # 只包含构建产物和配置文件
   dist/
   package.json
   README.md
   language-configuration.json
   ```

5. **更新代码中的路径引用**：
   - 所有 `context.extensionPath + '/webview'` → `context.extensionPath + '/dist/webview'`
   - 所有 `context.extensionPath + '/archimate-js'` → `context.extensionPath + '/dist/archimate-js'`
   - 所有 `context.extensionPath + '/mermaid-editor'` → `context.extensionPath + '/dist/mermaid-editor'`

6. **更新 .gitignore**：
   ```
   # 构建产物
   apps/extension/dist/
   apps/webview/dist/
   ```

**优势**：
- ✅ **清晰的目录结构**：源码和构建产物完全分离，构建产物统一在 `apps/extension/dist/`
- ✅ **便于打包**：`.vscodeignore` 自动排除源码，只打包必要文件，构建产物已在打包目录
- ✅ **便于调试**：开发环境可以使用源码和构建产物，生产环境使用打包后的构建产物
- ✅ **统一管理**：所有构建产物在 `apps/extension/dist/` 下，便于清理和维护
- ✅ **简化流程**：构建产物直接输出到打包目录，无需复制步骤，减少维护成本
- ✅ **明确的打包结构**：VSCode 插件打包时，只需打包 `apps/extension/` 目录，构建产物已在目录中

### 需要删除的目录/文件

1. `apps/extension/src/domain/shared/vault/`（整个目录，使用根目录的完整版本）
2. `apps/extension/src/domain/shared/artifact/`（整个目录，如果根目录版本更完整）
3. `apps/extension/src/domain/`（整个目录，迁移完成后）
4. `apps/extension/src/infrastructure/storage/`（整个目录）
5. `apps/extension/src/modules/vault/`（整个目录，GitVaultAdapter 已迁移到 shared/infrastructure/storage/git/）
6. `apps/extension/out/`（迁移到 `apps/extension/dist/extension/` 后删除）
7. `apps/extension/webview/`（迁移到 `apps/extension/dist/webview/` 后删除）
8. `apps/extension/archimate-js/`（迁移到 `apps/extension/dist/archimate-js/` 后删除）
9. `apps/extension/mermaid-editor/`（迁移到 `apps/extension/dist/mermaid-editor/` 后删除）
10. `domain/`（根目录，迁移完成后删除，因为已迁移到 modules/shared/domain）
11. `infrastructure/`（根目录，如果存在）
12. `infrastructure/di/container.ts`（未使用）

**注意**：`apps/extension/dist/` 目录用于 VSCode 插件打包，构建产物直接输出到此目录，应在 `.gitignore` 中忽略

### 需要更新导入的文件（部分列表）

1. 所有使用 `from.*domain/shared/artifact` 的文件（约 69 个）
2. 所有使用 `from.*infrastructure/storage/` 的文件（约 55 个）
3. 所有使用 `from.*vault/infrastructure/GitVaultAdapter` 的文件（需要更新为 `from.*shared/infrastructure/storage/git/GitVaultAdapter`）
4. `apps/extension/src/infrastructure/di/container.ts`
5. `apps/extension/src/modules/shared/application/VaultApplicationServiceImpl.ts`
6. `apps/extension/src/main.ts`
7. `apps/extension/src/modules/template/application/TemplateApplicationServiceImpl.ts`
8. `apps/extension/src/modules/template/interface/TemplateTreeDataProvider.ts`

