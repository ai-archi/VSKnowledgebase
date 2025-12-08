# Vault 目录结构改造方案

## 一、设计问题分析

### 1.0 用户需求分析

**核心需求：**
用户在任意 Git 仓库维护 vault（可能只是文档文件），clone 到本地后能够：
1. **零配置使用**：不需要手动创建 `vault.yaml`、`.metadata` 等配置文件
2. **自动识别**：系统自动识别目录为 vault，无需任何配置文件
3. **可选增强**：用户可以选择性地添加关联信息，这些信息保存在 `.metadata` 目录
4. **Git 友好**：`.metadata` 目录可以被 Git 忽略，用户可以选择是否提交本地添加的关联信息

**当前设计问题：**

1. **Vault 识别依赖配置文件**
   - 当前设计要求检查 `.metadata/vault.yaml` 是否存在
   - 虽然文档说"如果不存在，默认为 document 类型"，但代码逻辑仍然依赖文件检查
   - 用户 clone 一个纯文档仓库时，可能无法被识别为 vault

2. **配置文件必要性不明确**
   - 文档中提到"可以自动生成默认配置"，但没有明确说明何时生成
   - 用户可能根本不想在 Git 仓库中维护 `vault.yaml` 文件

3. **`.metadata` 目录的定位**
   - 当前设计将 `.metadata` 作为必需目录
   - 但实际上，如果用户只是维护文档，可能完全不需要这个目录

**改进方案：**

1. **零配置识别**：任何在 `.architool` 下的目录都可以被识别为 vault，不需要任何配置文件
2. **延迟创建配置**：只有在需要时才创建 `.metadata/vault.yaml`（比如用户添加了关联信息、修改了类型等）
3. **`.metadata` 目录可选**：如果用户没有添加任何关联信息，可以完全不需要 `.metadata` 目录
4. **Git 友好**：`.metadata` 目录应该被 Git 忽略（通过 `.gitignore`），这样用户可以选择是否提交本地添加的关联信息

**`.gitignore` 配置建议：**

在 vault 根目录的 `.gitignore` 文件中添加：

```
# ArchiTool 元数据目录（可选，用户可以选择是否提交）
.metadata/
```

这样：
- 默认情况下，`.metadata` 目录不会被 Git 跟踪
- 如果用户想共享关联信息，可以手动将 `.metadata` 添加到 Git（`git add -f .metadata`）
- 每个团队成员可以有自己的本地关联信息，互不干扰

## 二、现状分析

### 2.1 目录结构对比

#### 当前目录结构（改造前）

当前系统要求每个 vault 必须包含以下固定目录结构：

```
vault-name/
├── artifacts/          # 文档文件（必需）
├── templates/          # 模板文件
│   ├── content/        # 内容模板
│   └── structure/      # 结构模板
├── metadata/           # 元数据文件
├── ai-enhancements/    # AI 增强命令
│   └── commands/       # 命令文件
├── tasks/              # 任务文件
├── viewpoints/         # 视点配置
└── vault.yaml          # Vault 配置文件
```

**特点：**
- 所有 vault 必须遵循相同的目录结构
- `artifacts` 目录是必需的，用于识别 vault
- `vault.yaml` 位于 vault 根目录
- 元数据文件存放在 `metadata/` 目录

#### 期望目录结构（改造后）

改造后的 vault 移除 `artifacts` 层级，文档文件可直接放在 vault 根目录，与 `archi-` 前缀的约定目录平级：

```
vault-name/
├── .metadata/              # 隐藏目录，存放配置和元数据
│   ├── vault.yaml          # Vault 配置文件（必需，但可自动生成）
│   └── *.yaml              # 其他元数据文件
├── *.md                    # 文档文件（可直接放在根目录）
├── *.archimate             # 架构文件
├── docs/                   # 用户自定义文档目录（与 archi- 目录平级）
├── design/                 # 用户自定义设计目录
├── archi-templates/        # 约定目录（如果存在，表示包含模板）
│   ├── content/            # 内容模板
│   └── structure/          # 结构模板
├── archi-tasks/            # 约定目录（如果存在，表示包含任务）
├── archi-ai-enhancements/  # 约定目录（如果存在，表示包含 AI 命令）
│   └── commands/           # AI 命令文件
└── ...                     # 其他任意文件和目录（与 archi- 目录平级）
```

**特点：**
- **移除 artifacts 层级**：文档文件可直接放在 vault 根目录或自定义目录
- **约定目录使用 archi- 前缀**：`archi-templates`、`archi-tasks`、`archi-ai-enhancements`
- **自动识别**：如果存在这些 `archi-*` 目录，自动识别 vault 包含相应内容类型
- **灵活组织**：用户创建的文件和目录可以与 `archi-*` 目录平级存放
- `.metadata/` 隐藏目录统一存放所有配置和元数据（可选，延迟创建）
- `vault.yaml` 位于 `.metadata/vault.yaml`（可选，只有在需要时才创建）
- **零配置识别**：如果 `.metadata/vault.yaml` 不存在，系统自动识别为 `document` 类型，使用目录名作为 vault 名称

### 2.2 系统依赖对比

#### 当前系统依赖（改造前）

1. **Vault 识别**：`VaultRepositoryImpl.scanFileSystemVaults()` 通过检查 `artifacts` 目录是否存在来识别 vault
2. **Artifact 路径**：`ArtifactFileSystemAdapter.getArtifactPath()` 硬编码了 `artifacts` 路径
3. **模板加载**：`TemplateApplicationServiceImpl` 从 `templates` 目录加载模板
4. **元数据路径**：`ArtifactFileSystemAdapter.getMetadataPath()` 硬编码了 `metadata` 路径
5. **Vault 创建**：`VaultFileSystemAdapter.createVaultDirectory()` 创建所有固定目录
6. **配置文件位置**：`vault.yaml` 位于 vault 根目录

#### 改造后系统依赖

1. **Vault 注册**：在创建 vault 和 clone vault 时进行信息采集和注册。系统维护 vault 注册表，记录所有已注册的 vault 及其基本信息
2. **文档路径**：直接扫描 vault 根目录（排除 `archi-*` 目录），不再使用 `artifacts` 目录
3. **模板加载**：如果存在 `archi-templates/` 目录，从该目录加载模板
4. **AI 命令加载**：如果存在 `archi-ai-enhancements/` 目录，从该目录加载 AI 命令
5. **任务加载**：如果存在 `archi-tasks/` 目录，从该目录加载任务
6. **元数据路径**：统一使用 `.metadata/` 目录存放所有元数据文件
7. **Vault 创建和注册**：创建 vault 时采集信息并注册到系统。只有在需要时才创建 `.metadata/` 目录和 `vault.yaml`（比如用户添加了关联信息、修改了类型等）。不创建其他固定目录（`archi-*` 目录按需创建）
8. **配置文件位置**：`vault.yaml` 位于 `.metadata/vault.yaml`

### 2.3 问题分析

- **刚性结构**：所有 vault 必须遵循相同的目录结构，不够灵活
- **类型混淆**：不同类型的 vault（document/ai-enhancement/template/task）仍需要创建所有目录
- **路径硬编码**：代码中多处硬编码了目录名称，难以扩展

## 三、改造目标

### 3.1 核心目标

1. **文件系统基础架构**：完全基于文件系统存储，支持用户自行维护 vault 并在本地添加关联信息
2. **移除 artifacts 层级**：文档文件可直接放在 vault 根目录，与 `archi-*` 约定目录平级
3. **约定目录**：使用 `archi-templates`、`archi-tasks`、`archi-ai-enhancements` 作为约定目录
4. **类型区分**：根据 vault 类型，在不同视图展示相应内容
   - **文档类型（document）**：在文档视图展示文档、模板
   - **AI 增强类型（ai-enhancement）**：在助手视图展示 AI 命令
   - **模板类型（template）**：在助手视图展示模板
   - **任务类型（task）**：在任务视图展示任务
5. **Vault 注册机制**：在创建 vault 和 clone vault 时进行信息采集和注册，系统维护 vault 注册表
6. **关联信息管理**：支持在本地添加文档关联、代码路径关联等信息，持久化到 YAML 元数据文件
7. **Git 集成支持**：支持从 Git 仓库 clone vault 到本地，本地添加的关联信息可以 commit 和 push

### 3.2 预期效果

- **灵活性**：不同类型的 vault 可以有不同的目录结构
- **清晰性**：通过配置明确 vault 的用途和内容组织方式
- **可扩展性**：易于添加新的内容类型和视图
- **版本控制友好**：所有数据以文件形式存储，便于 Git 版本控制和团队协作
- **易于维护**：用户可以直接编辑文件，无需额外的数据库或服务

## 四、可行性分析

### 4.1 技术可行性 ✅

**优点：**
- TypeScript 支持动态配置和路径解析
- 文件系统操作可以抽象为配置驱动的服务
- 现有代码结构支持重构

**挑战：**
- 需要修改多个核心组件
- 需要更新所有硬编码路径的地方

### 4.2 实现复杂度

**高复杂度模块：**
- `VaultRepositoryImpl`：vault 识别逻辑
- `ArtifactRepositoryImpl`：artifact 路径解析
- `TemplateApplicationServiceImpl`：模板加载逻辑
- `ArtifactFileSystemAdapter`：文件路径构建
- `VaultFileSystemAdapter`：vault 创建逻辑

**中等复杂度模块：**
- AI 命令加载逻辑
- 元数据管理
- 视图渲染逻辑

### 4.3 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 性能影响 | 中 | 缓存扫描结果 |
| 测试覆盖不足 | 中 | 增加单元测试和集成测试 |

## 五、架构设计

### 5.1 文件系统存储架构

**ArchiTool 项目完全基于文件系统存储，支持用户自行维护 vault 并在本地添加关联信息。**

#### 存储结构

```
.architool/
├── {vault-name-1}/          # Vault 1
│   ├── .metadata/           # 隐藏目录，存放配置和元数据
│   │   ├── vault.yaml        # Vault 配置文件
│   │   └── {metadataId}.metadata.yml  # 元数据文件（包含关联关系）
│   ├── *.md                  # 文档文件（可直接放在根目录）
│   ├── docs/                 # 用户自定义文档目录
│   ├── archi-templates/      # 约定目录（如果存在）
│   ├── archi-tasks/          # 约定目录（如果存在）
│   └── archi-ai-enhancements/ # 约定目录（如果存在）
├── {vault-name-2}/          # Vault 2
│   └── ...
└── cache/                    # 系统缓存目录
```

#### 核心特性

1. **文件系统存储**
   - 所有数据存储在 `.architool/{vault-name}/` 目录下
   - 文档文件可直接放在 vault 根目录或自定义目录
   - 元数据（包括关联关系）以 YAML 格式存储在 `.metadata/{metadataId}.metadata.yml` 文件中
   - 每个 vault 有独立的 `.metadata/vault.yaml` 配置文件

2. **Vault 注册机制**
   - **创建时注册**：在创建新 vault 时，系统采集 vault 信息（名称、类型、描述等）并注册到系统
   - **Clone 时注册**：在从 Git 仓库 clone vault 时，系统自动采集 vault 信息（从 `vault.yaml` 或目录结构推断）并注册
   - **信息采集**：系统会读取 `.metadata/vault.yaml`（如果存在）获取配置，或根据目录结构自动推断类型
   - **注册表维护**：系统维护 vault 注册表，记录所有已注册的 vault 及其基本信息

3. **关联信息管理**
   - 关联关系存储在 `ArtifactMetadata` 的 `relationships` 字段中
   - 提供 `updateRelatedArtifacts`、`updateRelatedCodePaths` 等方法更新关联
   - 所有关联信息持久化到 YAML 文件（`.metadata/{metadataId}.metadata.yml`），便于版本控制
   - 支持文档关联、代码路径关联、组件关联等多种关联类型

4. **Git 集成支持**
   - 支持从 Git 仓库 clone vault 到本地的 `.architool` 目录
   - Clone 时系统自动采集 vault 信息并注册
   - 本地添加的关联信息可以 commit 和 push 回远程仓库
   - 完全基于文件系统，便于备份、迁移和版本管理

### 5.2 典型使用场景

**场景一：用户自行维护的 Vault（零配置）**

1. 用户在 Git 仓库中维护自己的 vault（**只需要文档文件，不需要任何配置文件**）
2. 用户将 vault clone 到本地的 `.architool` 目录
3. **系统在 clone 时自动采集 vault 信息并注册**
4. 用户通过扩展的 UI 或 API 添加文档关联、代码路径关联等信息
5. **系统自动创建 `.metadata` 目录**，关联信息保存到对应的 `.metadata/{metadataId}.metadata.yml` 文件中
6. **`.metadata` 目录被 Git 忽略**（通过 `.gitignore`），用户可以选择是否提交本地添加的关联信息
7. 如果用户想提交关联信息，可以手动添加到 Git 并推送

**场景二：本地创建和编辑**

1. 用户通过 UI 或命令在本地创建新的 vault
2. **系统在创建时采集 vault 信息（名称、类型、描述等）并注册**
3. 用户添加文档文件到 vault 根目录或自定义目录
4. 用户通过 UI 创建文档关联、添加代码路径等
5. **只有在用户添加关联信息或修改类型时，系统才自动创建 `.metadata` 目录和 `vault.yaml`**
6. 所有修改都保存在文件系统中，可以随时通过 Git 进行版本控制

**场景三：团队协作（Git 友好）**

1. 团队在 Git 仓库中共享 vault（**只需要文档文件，不需要配置文件**）
2. 每个成员通过 UI 或命令 clone vault 到本地
3. **系统在 clone 时自动采集 vault 信息并注册**
4. 成员在本地添加关联信息、更新文档等
5. **`.metadata` 目录被 Git 忽略**，每个成员可以有自己的本地关联信息
6. 如果团队想共享关联信息，可以手动将 `.metadata` 添加到 Git 并提交
7. 通过 Git 提交、推送、拉取实现协作
8. 所有变更都以文件形式存在，便于代码审查和合并

## 六、改造方案

### 6.1 vault.yaml 简化设计（可选配置）

**注意：** `vault.yaml` 文件位置为 `.metadata/vault.yaml`，但**不是必需的**

**设计原则：**
- **零配置识别**：任何在 `.architool` 下的目录都可以被识别为 vault，不需要 `vault.yaml`
- **延迟创建**：只有在需要时才创建 `.metadata/vault.yaml`（比如用户添加了关联信息、修改了类型等）
- **可选配置**：如果用户只是维护文档，可以完全不需要 `vault.yaml` 文件
- **Git 友好**：`.metadata` 目录应该被 Git 忽略（通过 `.gitignore`），这样用户可以选择是否提交本地添加的关联信息

```yaml
name: Demo Vault - Document
type: document
description: |
  文档类型的演示 Vault，用于存储和管理各种架构文档、设计文档和项目文档。

# 可选：Git 集成
remote:
  url: https://github.com/user/my-vault.git
  branch: main

createdAt: 2025-11-22T00:00:00.000Z
updatedAt: 2025-11-22T00:00:00.000Z
```

**字段说明：**
- **name**：Vault 名称（必需），通常与目录名相同
- **type**：Vault 类型（必需），`document` | `ai-enhancement` | `template` | `task`
- **description**：Vault 描述（可选）
- **remote**：Git 远程仓库配置（可选），如果存在则表示 vault 来自 Git 仓库
- **createdAt/updatedAt**：时间戳（可选）

**移除的字段：**
- **id**：不需要，系统使用目录名作为 id
- **selfContained**：不需要，可以通过 `remote` 字段判断（有 remote 则不是自包含）
- **readOnly**：不需要，所有 vault 在本地都是可写的，Git vault 的同步由用户通过 Git 命令控制

**内容识别规则（基于目录存在性）：**
- **文档类型（document）**：
  - 扫描 vault 根目录下的所有文件（排除 `.metadata/`、`.git/`、`archi-*` 等目录）
  - 支持的文件格式：`.md`、`.archimate`、`.puml`、`.mmd` 等
  - 文档文件可以直接放在根目录，也可以放在自定义目录中
  - 如果存在 `archi-templates/` 目录，自动识别为包含模板
  - 在**文档视图**展示

- **AI 增强类型（ai-enhancement）**：
  - 如果存在 `archi-ai-enhancements/` 目录，扫描其中的 `.yml`、`.yaml` 文件
  - 在**助手视图**展示

- **模板类型（template）**：
  - 如果存在 `archi-templates/` 目录，扫描其中的模板文件
  - 支持 `archi-templates/content/` 和 `archi-templates/structure/` 目录结构
  - 在**助手视图**展示

- **任务类型（task）**：
  - 如果存在 `archi-tasks/` 目录，扫描其中的任务文件
  - 在**任务视图**展示

**关键设计：**
- 使用 `archi-` 前缀避免与用户内容冲突
- 文档文件与 `archi-*` 目录平级，组织更灵活
- 通过目录存在性自动识别内容类型，无需复杂配置

### 6.2 AI 增强类型 vault 示例

```yaml
name: Demo Vault - AI Enhancement
type: ai-enhancement
description: |
  AI 增强类型的演示 Vault，专注于 AI 增强命令

createdAt: 2025-11-22T00:00:00.000Z
updatedAt: 2025-11-22T00:00:00.000Z
```

**自动识别：**
- 如果存在 `archi-ai-enhancements/` 目录，扫描其中的 `.yml`、`.yaml` 文件作为 AI 命令
- 在**助手视图**展示

### 6.3 模板类型 vault 示例

```yaml
name: Demo Vault - Template
type: template
description: |
  模板类型的演示 Vault，专注于模板管理

createdAt: 2025-11-22T00:00:00.000Z
updatedAt: 2025-11-22T00:00:00.000Z
```

**自动识别：**
- 如果存在 `archi-templates/` 目录，扫描其中的模板文件
- 支持 `archi-templates/content/` 和 `archi-templates/structure/` 目录结构
- 在**助手视图**展示

### 6.4 任务类型 vault 示例

```yaml
name: Demo Vault - Task
type: task
description: |
  任务类型的演示 Vault，专注于任务管理

createdAt: 2025-11-22T00:00:00.000Z
updatedAt: 2025-11-22T00:00:00.000Z
```

**自动识别：**
- 如果存在 `archi-tasks/` 目录，扫描其中的任务文件
- 在**任务视图**展示

### 6.5 扁平化目录结构示例

**文档类型 vault 示例：**
```
demo-vault-document/
├── .metadata/
│   └── vault.yaml
├── design/                    # 用户自定义目录，与 archi- 目录平级
│   ├── demo.archimate
│   └── example-archimate.archimate
├── docs/                      # 用户自定义目录
│   ├── architecture.md
│   └── requirements.md
├── welcome.md                 # 文档文件可直接放在根目录
├── archi-templates/          # 约定目录（如果存在，表示包含模板）
│   ├── content/
│   │   ├── archimate/
│   │   └── markdown/
│   └── structure/
│       └── project-template.yml
└── my-custom-folder/         # 用户自定义目录，与 archi- 目录平级
    └── custom-doc.md
```

**AI 增强类型 vault 示例：**
```
demo-vault-ai-enhancement/
├── .metadata/
│   └── vault.yaml
└── archi-ai-enhancements/    # 约定目录（如果存在，表示包含 AI 命令）
    └── commands/
        ├── analyze.yml
        ├── optimize.yml
        └── refactor.yml
```

**模板类型 vault 示例：**
```
demo-vault-template/
├── .metadata/
│   └── vault.yaml
└── archi-templates/          # 约定目录（如果存在，表示包含模板）
    ├── content/
    │   ├── archimate/
    │   └── markdown/
    └── structure/
        └── project-template.yml
```

**任务类型 vault 示例：**
```
demo-vault-task/
├── .metadata/
│   └── vault.yaml
└── archi-tasks/              # 约定目录（如果存在，表示包含任务）
    └── task-list.md
```

**混合类型 vault 示例（包含多种内容）：**
```
demo-vault-mixed/
├── .metadata/
│   └── vault.yaml
├── docs/                      # 文档文件
│   └── architecture.md
├── archi-templates/          # 包含模板
│   └── content/
├── archi-tasks/              # 包含任务
│   └── tasks.md
└── archi-ai-enhancements/    # 包含 AI 命令
    └── commands/
```

## 七、元数据与关联信息管理

### 7.1 元数据存储结构

元数据文件存储在 `.metadata/{metadataId}.metadata.yml`，包含以下内容：

```yaml
id: {metadataId}
artifactId: {artifactId}
vaultId: {vaultId}
vaultName: {vaultName}

# 关联关系
relationships:
  - type: relates-to
    targetId: {targetArtifactId}
    description: "关联描述"
  - type: implements
    targetId: {targetArtifactId}
    description: "实现关系"

# 关联的 Artifact ID 列表
relatedArtifacts:
  - {artifact-id-1}
  - {artifact-id-2}

# 关联的代码路径
relatedCodePaths:
  - "src/modules/user/service.ts"
  - "src/modules/order/controller.ts"

# 关联的架构组件
relatedComponents:
  - {component-id-1}
  - {component-id-2}

# 其他元数据
tags:
  - architecture
  - design
author: "John Doe"
createdAt: 2025-11-22T00:00:00.000Z
updatedAt: 2025-11-22T00:00:00.000Z
```

### 7.2 关联信息更新机制

**设计要点：**

1. **关联信息更新 API**
   - 提供 `updateRelatedArtifacts` 方法更新关联的 Artifacts
   - 提供 `updateRelatedCodePaths` 方法更新关联的代码路径
   - 提供 `updateRelationships` 方法更新关联关系

2. **工作流程：**

1. 用户通过 UI 或 API 添加关联信息
2. 系统更新内存中的 `ArtifactMetadata` 对象
3. 将更新后的元数据序列化为 YAML 格式
4. 写入到 `.metadata/{metadataId}.metadata.yml` 文件
5. 文件变更可以通过 Git 进行版本控制

### 7.3 Git 集成工作流

**设计要点：**

1. **Clone Vault 流程**
   - 用户通过 UI 或命令输入 Git 仓库 URL
   - 系统将 vault clone 到 `.architool/{vault-name}/` 目录
   - 系统自动采集 vault 信息并注册

2. **工作流程：**
   - 用户通过 UI 或命令输入 Git 仓库 URL
   - 系统将 vault clone 到 `.architool/{vault-name}/` 目录
   - 系统自动采集 vault 信息（从 `vault.yaml` 读取或根据目录结构推断）并注册
   - 加载 vault 中的所有文档和元数据
   - 用户在本地添加关联信息
   - 用户通过 Git 提交和推送变更

## 八、实现步骤

### 8.1 阶段一：扩展 Vault 实体和配置

**任务清单：**
1. 扩展 `Vault` 接口（移除 `contentMapping` 和 `views` 字段）
2. 更新 `VaultRepositoryImpl` 解析 `vault.yaml` 中的基本字段
3. 实现配置验证逻辑

**设计要点：**

1. **Vault 实体定义**
   - 定义 `VaultType` 类型：`'document' | 'ai-enhancement' | 'template' | 'task'`
   - 定义 `Vault` 接口，包含：id、name、type、description、remote、createdAt、updatedAt
   - id 从目录名自动生成，不需要在 vault.yaml 中配置

2. **配置解析**
   - 更新 `VaultRepositoryImpl` 解析 `.metadata/vault.yaml` 中的基本字段
   - 实现配置验证逻辑，确保类型字段有效

**设计原则：**
- 移除了 `contentMapping` 和 `views` 配置
- 内容识别和视图展示完全基于 `type` 字段自动判断
- 保持配置简洁，只保留必要的元数据

**说明：** vault.yaml 字段说明详见第6.1节

### 8.2 阶段二：实现基于类型的自动识别逻辑

**任务清单：**
1. 创建 `VaultContentScanner` 服务，根据 vault 类型自动扫描内容
2. 实现基于类型的文件识别规则（基于 `archi-*` 目录存在性）
3. 添加扫描结果缓存机制

**设计要点：**

1. **内容扫描服务**
   - 创建 `VaultContentScanner` 服务，根据 vault 类型自动扫描内容
   - 支持基于 `archi-*` 目录存在性的自动识别

2. **扫描规则**
   - **文档类型**：扫描根目录（排除 `archi-*` 目录），如果存在 `archi-templates/` 也扫描
   - **AI 增强类型**：扫描 `archi-ai-enhancements/` 目录
   - **模板类型**：扫描 `archi-templates/` 目录
   - **任务类型**：扫描 `archi-tasks/` 目录

3. **缓存机制**
   - 添加扫描结果缓存，避免重复扫描
   - 支持缓存失效和刷新机制

### 8.3 阶段三：重构核心组件

**任务清单：**
1. 重构 `ArtifactFileSystemAdapter` 使用 `VaultPathResolver`
2. 重构 `ArtifactRepositoryImpl` 使用配置驱动的路径
3. 重构 `TemplateApplicationServiceImpl` 使用配置驱动的模板路径
4. 重构 `VaultRepositoryImpl` 的 vault 识别逻辑（不再要求 artifacts 目录）

**关键设计点：**

1. **路径解析重构**
   - 文档路径：直接扫描 vault 根目录（排除 `archi-*` 目录）
   - 模板路径：如果存在 `archi-templates/` 目录，从该目录加载
   - 元数据路径：统一使用 `.metadata/` 目录

2. **Vault 注册机制**（详见第5.1节）
   - 在创建 vault 时：系统采集用户提供的信息（名称、类型、描述等）并注册
   - 在 clone vault 时：系统自动采集信息（从 `vault.yaml` 读取或根据目录结构推断）并注册
   - 系统维护 vault 注册表，记录所有已注册的 vault

### 8.4 阶段四：更新视图逻辑

**任务清单：**
1. 修改视图组件，根据 vault 类型和配置显示相应内容
   - **文档视图**：显示 `document` 类型的 vault
   - **助手视图**：显示 `ai-enhancement` 和 `template` 类型的 vault
   - **任务视图**：显示 `task` 类型的 vault
2. 实现视图过滤逻辑（只显示启用的内容类型）
3. 更新 UI 组件，支持不同类型的 vault
4. 实现助手视图的内容区分：
   - `ai-enhancement` 类型：显示 AI 命令列表
   - `template` 类型：显示模板列表

## 九、测试策略

### 9.1 单元测试

- 不同类型 vault 的创建和使用
- 视图正确显示相应内容
- 文件操作（创建、读取、更新、删除）

## 十、实施时间表

| 阶段 | 任务 | 预计时间 | 优先级 |
|------|------|----------|--------|
| 阶段一 | 扩展 Vault 实体（简化，移除 contentMapping 和 views） | 1-2 天 | 高 |
| 阶段二 | 创建内容扫描服务（基于类型和 archi-* 目录自动识别） | 3-4 天 | 高 |
| 阶段三 | 重构核心组件 | 4-5 天 | 高 |
| 阶段四 | 更新视图逻辑（基于类型自动展示） | 2-3 天 | 中 |
| 测试 | 单元测试和集成测试 | 3-4 天 | 高 |

**总计：13-18 个工作日**

**说明：** 
- 由于移除了 `contentMapping` 和 `views` 配置，实现复杂度降低
- 由于是新项目，不需要向后兼容和迁移逻辑，进一步简化实现

## 十一、风险评估与缓解

### 11.1 主要风险

1. **性能影响**：文件扫描可能增加开销
   - **缓解**：实现扫描结果缓存，延迟加载

2. **目录识别错误**：`archi-*` 目录识别可能出错
   - **缓解**：清晰的命名约定，充分的测试覆盖

3. **文件组织混乱**：用户可能不清楚如何组织文件
   - **缓解**：提供清晰的文档和示例，默认创建必要的 `archi-*` 目录

## 十二、总结

### 12.1 优势

- ✅ **灵活性**：文档文件可直接放在根目录，组织更自由
- ✅ **清晰性**：通过 `archi-*` 约定目录明确内容类型
- ✅ **简洁性**：移除复杂的配置，基于目录存在性自动识别
- ✅ **类型区分**：不同类型 vault 有不同结构
- ✅ **实现简单**：不需要向后兼容逻辑，代码更简洁

### 12.2 挑战

- ⚠️ **实现复杂度**：需要修改多个核心组件
- ⚠️ **测试工作量**：需要充分测试各种场景
- ⚠️ **用户教育**：需要用户了解 `archi-*` 约定目录的用途

### 12.3 建议

1. **分阶段实施**：按照上述阶段逐步推进
2. **充分测试**：每个阶段都要有充分的测试
3. **文档更新**：及时更新用户文档，说明 `archi-*` 目录的用途
4. **用户反馈**：收集用户反馈，持续优化

