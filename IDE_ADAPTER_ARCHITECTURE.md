# Architool 多 IDE 支持架构方案

## 一、方案概述

### 1.1 目标
将 Architool 从单一 VS Code 扩展改造为支持多 IDE（VS Code、IntelliJ IDEA）的架构，实现代码复用最大化，维护成本最小化。

### 1.2 设计原则
- **分层抽象**：业务逻辑与 IDE API 完全解耦
- **适配器模式**：通过适配器层屏蔽 IDE 差异
- **向后兼容**：保持现有 VS Code 功能不受影响
- **渐进式改造**：分阶段实施，降低风险

### 1.3 架构概览
```
┌─────────────────────────────────────────────────────────┐
│                    业务逻辑层 (共享)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Domain      │  │ Application │  │ Infrastructure│ │
│  │  (领域模型)  │  │  (应用服务)  │  │  (基础设施)   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                        ↕
┌─────────────────────────────────────────────────────────┐
│                    IDE 适配层 (抽象)                      │
│  ┌──────────────┐  ┌──────────────┐                     │
│  │ IDE Adapter  │  │ Communication│                     │
│  │  (IDE 适配)   │  │  (通信适配)   │                     │
│  └──────────────┘  └──────────────┘                     │
└─────────────────────────────────────────────────────────┘
        ↕                    ↕
┌──────────────┐    ┌──────────────┐
│  VS Code     │    │  IntelliJ    │
│  实现层      │    │  实现层      │
└──────────────┘    └──────────────┘
```

**实施顺序**：
1. **阶段 2-3**：先统一抽象 VS Code 适配（将分散的 `vscode.*` 调用统一到适配器）
2. **阶段 5**：再实现 IntelliJ 适配（实现接口即可）
3. **业务逻辑层**：无需修改，自动支持多 IDE

## 二、后端改造方案 (extension/architool)

### 2.1 架构分层设计

#### 2.1.1 当前架构问题
- **直接依赖**：业务代码直接使用 `vscode.*` API（332 处引用）
- **耦合度高**：IDE 相关代码散布在各层
- **难以扩展**：添加新 IDE 需要大量修改

#### 2.1.2 目标架构
```
extension/architool/
├── src/
│   ├── core/
│   │   ├── ide-api/                    # 新增：IDE API 抽象层
│   │   │   ├── ide-adapter.ts          # IDE 适配器接口
│   │   │   ├── ide-types.ts            # IDE 通用类型定义
│   │   │   ├── vscode-adapter.ts       # VS Code 实现
│   │   │   └── idea-adapter.ts         # IntelliJ 实现
│   │   ├── vscode-api/                 # 保留：VS Code 具体实现（逐步迁移）
│   │   └── ...                         # 其他核心功能
│   ├── modules/                        # 业务逻辑层（无需修改）
│   │   ├── shared/                     # 共享业务逻辑
│   │   ├── document/                   # 文档模块
│   │   └── editor/                     # 编辑器模块
│   ├── infrastructure/
│   │   └── di/
│   │       └── container.ts            # 修改：注入 IDE 适配器
│   └── extension.ts                    # 修改：初始化 IDE 适配器
```

### 2.2 IDE 适配器设计

#### 2.2.1 核心接口定义
**IDEAdapter 接口**（核心抽象）
- 命令系统：`registerCommand()`, `executeCommand()`
- 视图系统：`createTreeView()`, `createWebviewPanel()`
- 工作区：`getWorkspaceRoot()`, `getWorkspaceFolders()`
- 文件系统：`readFile()`, `writeFile()`, `exists()`
- 编辑器：`registerCustomEditor()`, `openTextDocument()`
- 通知：`showInformationMessage()`, `showErrorMessage()`
- 配置：`getConfiguration()`, `updateConfiguration()`

#### 2.2.2 适配器实现策略

**阶段 2：VS Code 适配统一抽象（优先）**
- **VSCodeAdapter**：封装所有 `vscode.*` API 调用
- **目标**：将所有分散的 `vscode.*` 调用统一到适配器
- **方法**：逐步迁移，按模块重构
- **范围**：332 处引用，32 个文件

**阶段 5：IntelliJ 适配实现**
- **IntelliJAdapter**：实现 `IDEAdapter` 接口，封装 IntelliJ Platform API
- **优势**：接口已定义，只需实现即可
- **适配器工厂**：根据运行环境自动选择适配器

### 2.3 依赖注入改造

#### 2.3.1 容器配置
- 在 DI 容器中注册 IDE 适配器
- 业务服务通过接口注入，而非具体实现
- 支持运行时切换适配器（用于测试）

#### 2.3.2 服务重构
- `CommandAdapter` → 使用 `IDEAdapter`
- `TreeViewAdapter` → 使用 `IDEAdapter`
- `WebviewAdapter` → 使用 `IDEAdapter`
- `WorkspaceFileSystemAdapter` → 使用 `IDEAdapter`

### 2.4 入口点改造

#### 2.4.1 VS Code 入口
- `extension.ts` 中检测环境
- 创建 `VSCodeAdapter` 实例
- 传递给业务初始化函数

#### 2.4.2 IntelliJ 入口
- 创建 `plugin.ts` 作为插件入口
- 实现 `Plugin` 接口
- 创建 `IntelliJAdapter` 实例
- 复用相同的业务初始化逻辑

### 2.5 编辑器适配

#### 2.5.1 自定义编辑器
- **MermaidEditorProvider**：抽象为 `CustomEditorProvider` 接口
- **PlantUMLEditorProvider**：抽象为 `CustomEditorProvider` 接口
- 通过 IDE 适配器注册编辑器

#### 2.5.2 编辑器实现差异
- **VS Code**：`CustomTextEditorProvider`
- **IntelliJ**：`FileEditorProvider` + `JComponent`

## 三、前端改造方案 (packages/webview)

### 3.1 通信层抽象

#### 3.1.1 当前问题
- 直接使用 `acquireVsCodeApi()`（467 处引用）
- 硬编码 VS Code 消息协议
- 样式系统依赖 VS Code CSS 变量

#### 3.1.2 目标架构
```
packages/webview/
├── src/
│   ├── services/
│   │   ├── ExtensionService.ts          # 重构：使用 IDE 通信接口
│   │   ├── ide-communication.ts         # 新增：IDE 通信抽象
│   │   ├── vscode-communication.ts      # 新增：VS Code 实现
│   │   └── idea-communication.ts        # 新增：IntelliJ 实现
│   ├── features/
│   │   ├── mermaid-editor/
│   │   │   └── ideApiAdapter.ts         # 重构：统一接口
│   │   └── plantuml-editor/
│   │       └── ideApiAdapter.ts         # 重构：统一接口
│   ├── styles/
│   │   ├── ide-theme.css                # 重构：IDE 无关样式
│   └── types/
│       └── ide-api.d.ts                 # 新增：IDE API 类型
```

### 3.2 IDE 通信抽象

#### 3.2.1 通信接口设计
**IDECommunication 接口**
- `postMessage(message)`: 发送消息到后端
- `onMessage(callback)`: 监听后端消息
- `isAvailable()`: 检测 API 可用性
- `getIDEType()`: 获取 IDE 类型

#### 3.2.2 实现差异处理
- **VS Code**：`acquireVsCodeApi().postMessage()` + `window.addEventListener('message')`
- **IntelliJ**：JCEF `postMessage()` + 事件监听
- **消息协议**：统一 JSON-RPC 格式

### 3.3 ExtensionService 重构

#### 3.3.1 重构策略
- 移除直接 VS Code API 调用
- 使用 `IDECommunication` 接口
- 保持现有 API 不变（向后兼容）
- 自动检测 IDE 类型并选择实现

#### 3.3.2 消息处理
- 统一消息格式（JSON-RPC）
- 请求/响应机制
- 事件推送机制
- 错误处理

### 3.4 编辑器适配器统一

#### 3.4.1 统一接口
- 将 `vscodeApiAdapter.ts` 重构为 `ideApiAdapter.ts`
- 提供统一的编辑器通信接口
- 隐藏 IDE 差异

#### 3.4.2 适配器方法
- `loadMermaid()` / `loadPlantUML()`
- `renderMermaid()` / `renderPlantUML()`
- `saveDiagram()` / `savePlantUML()`
- 事件监听设置

### 3.5 样式系统简化

#### 3.5.1 方案说明

**采用简化方案：移除 IDE 主题适配**

**设计原则**：
- 使用 Element Plus 内置主题，不进行 IDE 主题适配
- 统一视觉风格，降低维护成本
- 聚焦核心功能，而非视觉细节

**优势**：
- ✅ **简化架构**：无需主题适配层，减少复杂度
- ✅ **降低维护成本**：不需要维护多套主题变量映射
- ✅ **统一视觉风格**：使用 Element Plus 主题，保持一致性
- ✅ **减少代码量**：移除 `vscode-theme.css`（394 行）和相关适配代码
- ✅ **更快开发**：无需处理 IDE 主题差异

#### 3.5.2 实施步骤

1. **移除主题文件**
   - 删除 `vscode-theme.css` 文件
   - 从 `app.ts` 中移除导入语句

2. **使用 Element Plus 深色主题**
   ```typescript
   // app.ts
   import 'element-plus/dist/index.css';
   import 'element-plus/theme-chalk/dark/css-vars.css'; // 深色主题
   ```

3. **清理 CSS 变量引用**
   - 查找所有 `--vscode-*` CSS 变量引用
   - 替换为 Element Plus 变量或固定值
   - 更新 `diagram-editor.css` 中的变量引用

4. **测试验证**
   - 在 VS Code 中测试视觉效果和功能
   - 在 IntelliJ 中测试视觉效果和功能
   - 确保功能正常，视觉效果可接受

### 3.6 组件清理

#### 3.6.1 直接 API 调用清理
- 查找所有 `acquireVsCodeApi()` 调用
- 替换为 `ExtensionService` 调用
- 更新类型定义

#### 3.6.2 类型定义更新
- 移除 `window.acquireVsCodeApi` 类型
- 添加 `window.ideApi` 类型
- 提供 IDE 检测工具函数

## 四、实施计划

### 4.1 阶段划分

#### 阶段 1：架构设计（1 周）
- **目标**：完成架构设计和接口定义
- **交付物**：
  - IDE 适配器接口设计文档
  - 通信协议设计文档
  - 样式简化方案文档
  - 技术选型文档
  - VS Code API 使用情况分析报告

#### 阶段 2：后端 VS Code 适配统一抽象（2-3 周）⭐ 优先
- **目标**：统一抽象后端所有 VS Code API 调用
- **任务**：
  - 创建 IDE 适配器接口（`IDEAdapter`）
  - 实现 `VSCodeAdapter`（封装所有 `vscode.*` API）
  - 重构现有适配器类（`CommandAdapter`, `TreeViewAdapter`, `WebviewAdapter`）
  - 重构业务代码，移除直接 `vscode.*` 调用
  - 更新 DI 容器，注入 `VSCodeAdapter`
  - 重构编辑器提供者（`MermaidEditorProvider`, `PlantUMLEditorProvider`）
  - 重构视图提供者（`DocumentTreeViewProvider`, `ViewpointWebviewViewProvider`）
  - 重构命令类（`VaultCommands`, `DocumentCommands` 等）
  - 全面测试，确保功能正常

**关键原则**：
- 所有 `vscode.*` 调用必须通过 `IDEAdapter` 接口
- 业务代码不直接依赖 VS Code API
- 保持向后兼容，逐步迁移

#### 阶段 3：前端 VS Code 适配统一抽象（1.5-2 周）⭐ 优先
- **目标**：统一抽象前端所有 VS Code API 调用
- **任务**：
  - 创建 IDE 通信接口（`IDECommunication`）
  - 实现 `VSCodeCommunication`（封装 `acquireVsCodeApi` 和 `postMessage`）
  - 重构 `ExtensionService`，使用 `IDECommunication` 接口
  - 重构编辑器适配器（`vscodeApiAdapter.ts` → `ideApiAdapter.ts`）
  - 清理组件中的直接 `acquireVsCodeApi` 调用
  - 更新类型定义
  - 全面测试，确保通信正常

**关键原则**：
- 所有 `acquireVsCodeApi` 调用必须通过 `IDECommunication` 接口
- 前端代码不直接依赖 VS Code Webview API
- 保持消息协议兼容

#### 阶段 4：样式清理（0.5 周）
- **目标**：移除 IDE 主题适配，使用 Element Plus 深色主题
- **任务**：
  - 移除 `vscode-theme.css` 文件
  - 引入 Element Plus 深色主题
  - 清理所有 `--vscode-*` CSS 变量引用
  - 更新 `diagram-editor.css` 中的变量
  - 测试视觉效果和功能

#### 阶段 5：IntelliJ 插件开发（3-4 周）
- **目标**：开发 IntelliJ IDEA 插件
- **任务**：
  - 创建插件项目结构
  - 实现 `IntelliJAdapter`（实现 `IDEAdapter` 接口）
  - 实现 `IntelliJCommunication`（实现 `IDECommunication` 接口）
  - 实现自定义编辑器（`FileEditorProvider`）
  - 实现视图和命令（`ToolWindow`, `AnAction`）
  - 集成测试

#### 阶段 6：集成测试与优化（2 周）
- **目标**：完整功能测试和性能优化
- **任务**：
  - VS Code 端到端测试
  - IntelliJ 端到端测试
  - 性能测试
  - 兼容性测试
  - 文档完善

### 4.2 里程碑

| 里程碑 | 时间 | 交付物 |
|--------|------|--------|
| M1: 架构设计完成 | 第 1 周 | 设计文档、接口定义、API 使用分析 |
| M2: 后端 VS Code 适配统一完成 | 第 4 周 | IDE 适配器接口、VSCodeAdapter、重构完成 |
| M3: 前端 VS Code 适配统一完成 | 第 6 周 | IDE 通信接口、VSCodeCommunication、重构完成 |
| M4: 样式清理完成 | 第 6.5 周 | 移除主题适配、使用 Element Plus 主题 |
| M5: IntelliJ 插件 Alpha | 第 10.5 周 | 基础功能可用 |
| M6: 完整功能发布 | 第 12.5 周 | 双 IDE 支持完整版 |

### 4.3 实施策略说明

#### 4.3.1 为什么优先统一抽象？

**问题现状**：
- 后端有 332 处 `vscode.*` 直接调用，分散在 32 个文件中
- 前端有 467 处 VS Code API 引用，分散在 25 个文件中
- 代码耦合度高，难以维护和扩展
- 直接调用散布在各处：命令类、视图提供者、编辑器提供者、工具类等

**统一抽象的优势**：
1. **降低风险**：先统一抽象，再支持多 IDE，降低改造风险
2. **逐步迁移**：可以按模块逐步迁移，不影响现有功能
3. **便于测试**：统一接口便于 Mock 和测试
4. **代码质量**：提高代码可维护性和可扩展性
5. **为多 IDE 铺路**：抽象完成后，添加 IntelliJ 支持只需实现接口
6. **代码审查**：统一抽象后，更容易发现和修复问题

#### 4.3.2 统一抽象的实施原则

1. **接口先行**：先定义接口，再实现
2. **逐步迁移**：按模块逐步迁移，不一次性改动
3. **向后兼容**：保持现有功能不变
4. **充分测试**：每个模块迁移后立即测试
5. **文档同步**：及时更新文档和注释

#### 4.3.3 后端统一抽象的具体步骤

**步骤 1：创建接口和基础实现（1 周）**
- 定义 `IDEAdapter` 接口
- 实现 `VSCodeAdapter`（封装所有 `vscode.*` API）
- 在 DI 容器中注册适配器

**步骤 2：重构适配器类（0.5 周）**
- `CommandAdapter` → 使用 `IDEAdapter`
- `TreeViewAdapter` → 使用 `IDEAdapter`
- `WebviewAdapter` → 使用 `IDEAdapter`

**步骤 3：重构编辑器提供者（0.5 周）**
- `MermaidEditorProvider` → 使用 `IDEAdapter`
- `PlantUMLEditorProvider` → 使用 `IDEAdapter`

**步骤 4：重构视图提供者（0.5 周）**
- `DocumentTreeViewProvider` → 使用 `IDEAdapter`
- `ViewpointWebviewViewProvider` → 使用 `IDEAdapter`

**步骤 5：重构命令类（0.5 周）**
- `VaultCommands` → 使用 `IDEAdapter`
- `DocumentCommands` → 使用 `IDEAdapter`
- `ViewpointCommands` → 使用 `IDEAdapter`
- 其他命令类

**步骤 6：清理工具类（0.5 周）**
- 查找所有直接 `vscode.*` 调用
- 替换为 `IDEAdapter` 调用
- 更新类型定义

#### 4.3.4 前端统一抽象的具体步骤

**步骤 1：创建接口和基础实现（0.5 周）**
- 定义 `IDECommunication` 接口
- 实现 `VSCodeCommunication`
- 更新 `ExtensionService` 使用接口

**步骤 2：重构编辑器适配器（0.5 周）**
- `mermaid-editor/vscodeApiAdapter.ts` → `ideApiAdapter.ts`
- `plantuml-editor/vscodeApiAdapter.ts` → `ideApiAdapter.ts`

**步骤 3：清理组件调用（0.5 周）**
- 查找所有 `acquireVsCodeApi()` 调用
- 替换为 `ExtensionService` 调用
- 更新类型定义

**步骤 4：测试验证（0.5 周）**
- 测试所有 Webview 通信
- 测试编辑器功能
- 测试组件交互

## 五、技术选型

### 5.1 后端技术

#### 5.1.1 IDE 适配层
- **接口定义**：TypeScript Interface
- **实现语言**：TypeScript
- **依赖注入**：Inversify（现有）

#### 5.1.2 IntelliJ 插件
- **开发语言**：Kotlin（推荐）或 Java
- **构建工具**：Gradle
- **插件 SDK**：IntelliJ Platform SDK
- **通信方式**：JCEF（Java Chromium Embedded Framework）

### 5.2 前端技术

#### 5.2.1 通信层
- **接口定义**：TypeScript Interface
- **实现方式**：适配器模式
- **消息协议**：JSON-RPC 2.0

#### 5.2.2 主题系统
- **CSS 变量**：动态设置
- **主题检测**：运行时检测
- **降级方案**：默认主题

### 5.3 构建与部署

#### 5.3.1 构建系统
- **VS Code 扩展**：webpack（现有）
- **IntelliJ 插件**：Gradle
- **Webview**：Vite（现有）

#### 5.3.2 发布策略
- **VS Code**：VSIX 包（现有流程）
- **IntelliJ**：JAR 包或 ZIP 包
- **共享资源**：npm 包或 Git 子模块

## 六、风险评估与应对

### 6.1 技术风险

#### 6.1.1 IDE API 差异
- **风险**：VS Code 和 IntelliJ API 差异较大
- **影响**：适配器实现复杂度高
- **应对**：
  - 充分调研两个 IDE 的 API
  - 设计合理的抽象层
  - 提供降级方案

#### 6.1.2 性能影响
- **风险**：适配层可能带来性能开销
- **影响**：启动速度、响应速度
- **应对**：
  - 适配层保持轻量
  - 避免不必要的抽象
  - 性能测试和优化

#### 6.1.3 兼容性问题
- **风险**：现有功能在改造后可能失效
- **影响**：用户体验下降
- **应对**：
  - 充分的回归测试
  - 渐进式改造
  - 保持向后兼容

#### 6.1.4 视觉体验
- **风险**：移除主题适配后视觉效果可能不如完美适配
- **影响**：用户体验轻微下降（可接受）
- **应对**：
  - 使用 Element Plus 深色主题，基本满足深色环境需求
  - 提供用户反馈渠道
  - 如后续有强烈需求，可考虑添加主题适配

### 6.2 项目风险

#### 6.2.1 开发周期
- **风险**：改造工作量可能超出预期
- **影响**：项目延期
- **应对**：
  - 分阶段实施
  - 优先核心功能
  - 预留缓冲时间

#### 6.2.2 维护成本
- **风险**：双 IDE 支持增加维护成本
- **影响**：长期维护负担
- **应对**：
  - 代码复用最大化
  - 自动化测试
  - 清晰的文档

### 6.3 业务风险

#### 6.3.1 用户接受度
- **风险**：IntelliJ 用户可能不熟悉功能
- **影响**：用户流失
- **应对**：
  - 提供迁移指南
  - 保持功能一致性
  - 收集用户反馈

## 七、成功标准

### 7.1 功能标准
- ✅ VS Code 功能完全保留
- ✅ IntelliJ 核心功能可用
- ✅ 双 IDE 功能一致性 > 90%
- ✅ 性能影响 < 5%

### 7.2 质量标准
- ✅ 代码覆盖率 > 80%
- ✅ 无严重 Bug
- ✅ 文档完整性 > 90%
- ✅ 用户满意度 > 4.0/5.0

### 7.3 技术标准
- ✅ 代码复用率 > 85%
- ✅ 适配层代码 < 总代码 15%
- ✅ 构建时间增加 < 20%
- ✅ 包体积增加 < 30%

### 7.4 视觉标准
- ✅ Element Plus 深色主题正常显示
- ✅ 基本视觉协调性
- ✅ 功能可用性不受影响
- ✅ 统一的视觉风格（所有 IDE 一致）

## 八、后续扩展

### 8.1 其他 IDE 支持
- **Eclipse**：基于 Eclipse Theia
- **Sublime Text**：基于插件 API
- **Vim/Neovim**：基于 LSP 或自定义协议

### 8.2 功能增强
- **云端同步**：跨 IDE 配置同步
- **协作功能**：多用户协作编辑
- **AI 增强**：集成更多 AI 能力

### 8.3 性能优化
- **懒加载**：按需加载功能模块
- **缓存优化**：智能缓存策略
- **资源优化**：减少资源占用

## 九、总结

### 9.1 方案优势
1. **架构清晰**：分层明确，职责单一
2. **扩展性强**：易于添加新 IDE 支持
3. **维护成本低**：代码复用率高，移除主题适配进一步降低维护成本
4. **风险可控**：渐进式改造，向后兼容
5. **简化优先**：移除主题适配，聚焦核心功能开发
6. **开发高效**：减少 1-2 周开发时间，加快交付速度

### 9.2 关键成功因素
1. **接口设计**：合理的抽象层设计
2. **测试覆盖**：充分的测试保障
3. **文档完善**：清晰的开发文档
4. **团队协作**：前后端协调配合

### 9.3 预期收益
1. **用户覆盖**：支持更多 IDE 用户
2. **市场扩展**：扩大产品市场
3. **技术积累**：多 IDE 适配经验
4. **代码质量**：更好的架构设计

