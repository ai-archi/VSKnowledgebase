# VSKnowledgebase (ArchiTool)

基于 Dendron 的 VSCode 知识管理插件项目，采用 Monorepo 架构，支持本地优先、基于 Markdown 的笔记管理。

## 📋 目录

- [技术栈](#技术栈)
- [工程结构](#工程结构)
- [模块划分](#模块划分)
- [视图系统](#视图系统)
- [配置文件说明](#配置文件说明)
- [开发指南](#开发指南)
- [架构特点](#架构特点)

## 🛠 技术栈

### 核心语言与框架
- **TypeScript 4.6**：主要开发语言
- **Node.js >= 10.0.0**：运行时环境
- **VSCode Extension API**：插件开发框架

### 构建与工具链
- **Lerna 3.19.0**：Monorepo 管理
- **Yarn Workspaces**：包管理
- **Webpack 5.74.0**：前端打包
- **Babel**：代码转换
- **TypeScript Compiler**：类型检查与编译

### 测试框架
- **Jest 28.1.0**：单元测试
- **Playwright**：E2E 测试（nextjs-template）

### 代码质量工具
- **ESLint**：代码检查（Airbnb 配置）
- **Prettier**：代码格式化
- **Husky**：Git hooks
- **lint-staged**：提交前检查

### 其他技术
- **Prisma**：ORM（engine-server）
- **SQLite**：数据库
- **React/Next.js**：前端模板（nextjs-template）
- **Sentry**：错误追踪

## 📁 工程结构

### Monorepo 架构

采用 **Lerna + Yarn Workspaces** 的 Monorepo 结构：

```
VSKnowledgebase/
├── packages/          # 所有子包（13个）
├── bootstrap/         # 构建脚本
├── hooks/            # Git hooks
├── templates/         # 模板文件
├── .vscode/          # VSCode 配置
└── 根配置文件
```

### 构建顺序

依赖关系决定了严格的构建顺序（`bootstrap:build:fast`）：

1. **common-all** - 基础类型与常量
2. **common-server** - 服务器端通用
3. **common-test-utils** - 测试工具
4. **common-frontend** - 前端通用
5. **unified** - 统一解析器
6. **engine-server** - 引擎服务器
7. **api-server** - API 服务器
8. **pods-core** - 数据导出核心
9. **dendron-viz** - 可视化
10. **dendron-cli** - 命令行工具
11. **engine-test-utils** - 引擎测试工具
12. **plugin-core** - 插件核心

## 🧩 模块划分

### 1. 核心基础层（Common Layer）

#### `common-all`
- **职责**：通用类型、接口、常量、枚举
- **关键内容**：
  - 视图ID定义（`DendronTreeViewKey`, `DendronEditorViewKey`）
  - 配置类型（`DendronConfig`）
  - 数据结构（Note, Schema, Vault等）
- **依赖**：无（最底层）

#### `common-server`
- **职责**：服务器端通用功能
- **关键内容**：
  - 文件系统操作
  - 日志服务
  - Sentry 集成
  - 工具函数
- **依赖**：`common-all`

#### `common-frontend`
- **职责**：前端通用功能
- **关键内容**：
  - React 组件状态管理
  - 前端工具函数
- **依赖**：`common-all`

#### `common-test-utils`
- **职责**：测试工具与辅助函数
- **依赖**：`common-all`, `common-server`

### 2. 引擎层（Engine Layer）

#### `unified`
- **职责**：Markdown 解析器（统一解析）
- **依赖**：`common-all`

#### `engine-server`
- **职责**：知识库引擎核心
- **关键内容**：
  - 笔记索引与查询
  - 链接解析
  - Schema 管理
  - Prisma 数据库操作
- **依赖**：`common-all`, `common-server`, `unified`

#### `engine-test-utils`
- **职责**：引擎测试工具与测试数据
- **依赖**：`common-all`, `common-server`, `engine-server`, `common-frontend`, `pods-core`, `dendron-cli`

### 3. 应用层（Application Layer）

#### `plugin-core` ⭐ VSCode 插件
- **职责**：VSCode 扩展主包
- **关键内容**：
  - 命令注册与处理
  - 视图管理（Tree View, Webview）
  - 工作区激活
  - 编辑器集成
- **依赖**：`common-all`, `common-server`, `engine-server`
- **构建**：TypeScript + Webpack（支持 web 扩展）

#### `dendron-cli`
- **职责**：命令行工具
- **关键内容**：
  - CLI 命令实现
  - 工作区管理
  - 数据导出/导入
- **依赖**：`common-all`, `common-server`, `engine-server`, `pods-core`, `dendron-viz`

#### `api-server`
- **职责**：REST API 服务器
- **依赖**：`common-all`, `common-server`, `engine-server`

### 4. 功能模块层（Feature Layer）

#### `pods-core`
- **职责**：数据导出/导入（Pods）
- **支持**：Notion, Markdown, JSON 等
- **依赖**：`common-all`, `common-server`, `engine-server`

#### `dendron-viz`
- **职责**：知识图谱可视化
- **依赖**：`common-all`, `engine-server`

#### `dendron-plugin-views`
- **职责**：插件前端视图组件（React）
- **依赖**：`common-frontend`

### 5. 模板与资源层

#### `nextjs-template`
- **职责**：Next.js 静态站点模板（发布用）
- **技术**：Next.js, React, TypeScript
- **依赖**：`common-frontend`

#### `common-assets`
- **职责**：静态资源（字体、图标、样式）
- **构建**：Gulp + SCSS

## 🖼️ 视图系统

插件提供了多个视图来帮助用户管理和浏览知识库。所有视图都位于侧边栏的 `architool-view` 容器中。

### 视图列表

#### 1. **Tree View** (笔记树视图)
- **ID**: `architool.treeView`
- **类型**: Native Tree View
- **显示条件**: 插件激活时
- **功能**:
  - 以树形结构展示笔记层次结构
  - 支持展开/折叠节点
  - 点击节点可快速打开笔记
  - 显示笔记的层级关系（基于文件名）
- **用途**: 浏览和管理笔记的层次结构

#### 2. **Backlinks** (反向链接视图)
- **ID**: `architool.backlinks`
- **类型**: Native Tree View
- **显示条件**: 插件激活且支持 shell 执行
- **功能**:
  - 显示当前笔记的所有反向链接（哪些笔记链接到当前笔记）
  - 支持按最后更新时间或路径名称排序
  - 显示链接的具体位置（行级引用）
  - 支持展开查看引用详情
- **用途**: 了解笔记之间的关联关系，发现知识网络

#### 3. **Lookup View** (查找面板视图)
- **ID**: `architool.lookup-view`
- **类型**: Webview
- **显示条件**: 插件激活、查找功能激活且应该显示时
- **功能**:
  - 提供笔记查找和创建界面
  - 支持快速搜索笔记
  - 支持创建新笔记
  - 集成自动补全功能
- **用途**: 快速查找和创建笔记

#### 4. **Calendar View** (日历视图)
- **ID**: `architool.calendar-view`
- **类型**: Webview
- **显示条件**: 插件激活且支持 shell 执行
- **功能**:
  - 以日历形式展示日记笔记
  - 支持创建每日日记
  - 高亮显示有笔记的日期
  - 点击日期可快速打开或创建日记
- **用途**: 管理基于日期的笔记（日记、会议记录等）

#### 5. **Graph Panel** (图谱面板)
- **ID**: `architool.graph-panel`
- **类型**: Webview
- **显示条件**: 插件激活且支持 shell 执行
- **功能**:
  - 可视化展示笔记之间的链接关系
  - 支持调整图谱深度
  - 可切换显示反向链接、正向链接、层级关系
  - 交互式图谱，点击节点可跳转到笔记
- **用途**: 可视化知识图谱，理解笔记间的关联网络

#### 6. **Recent Workspaces** (最近工作区)
- **ID**: `architool.recent-workspaces`
- **类型**: Native Tree View
- **显示条件**: 插件未激活且支持 shell 执行
- **功能**:
  - 显示最近打开的工作区列表
  - 点击可快速打开工作区
  - 记录工作区访问历史
- **用途**: 快速切换和访问最近使用的工作区

#### 7. **Help and Feedback** (帮助和反馈)
- **ID**: `architool.help-and-feedback`
- **类型**: Native Tree View
- **显示条件**: 支持 shell 执行
- **功能**:
  - 提供快速访问帮助文档的链接
  - 包含：入门指南、文档、FAQ、GitHub Issues、社区等
  - 支持报告问题和加入社区
- **用途**: 获取帮助和提供反馈

#### 8. **Tip of the Day** (每日提示) ⚠️ 已隐藏
- **ID**: `architool.tip-of-the-day`
- **类型**: Webview
- **显示条件**: `false`（已禁用）
- **功能**:
  - 显示每日功能提示
  - 每 24 小时自动轮播提示
  - 帮助用户发现新功能
- **状态**: 当前已隐藏，可通过修改 `when` 条件重新启用

#### 9. **Sample View** (示例视图)
- **ID**: `architool.sample`
- **类型**: Webview
- **显示条件**: 开发模式（`dendron:devMode`）
- **功能**:
  - 用于开发和测试的示例视图
  - 仅在开发模式下可见
- **用途**: 开发调试用

### 视图容器

所有视图都位于 **`architool-view`** 容器中，该容器显示在 VSCode 活动栏（Activity Bar）中，图标为 Dendron 标志。

### 视图交互

- **Native Tree View**: 使用 VSCode 原生树形视图，性能好，支持展开/折叠
- **Webview**: 使用自定义 HTML/CSS/JS，功能更灵活，可自定义 UI

## ⚙️ 配置文件说明

### 包管理与构建

#### `package.json`
- **职责**：根包配置
- **关键内容**：
  - Workspaces 定义（13个包）
  - 构建脚本（`bootstrap:build:fast`）
  - 开发依赖
  - Husky Git hooks 配置
  - lint-staged 配置

#### `lerna.json`
- **职责**：Lerna 配置
- **关键内容**：
  - 包路径
  - 版本管理策略（Conventional Commits）
  - NPM 客户端（yarn）

#### `yarn.lock`
- **职责**：锁定依赖版本

### TypeScript 配置

#### `tsconfig.json`
- **职责**：IDE 类型检查配置
- **关键内容**：
  - 路径映射（`@dendronhq/*`）
  - 严格模式
  - 基础编译选项

#### `tsconfig.build.json`
- **职责**：构建时 TypeScript 配置
- **关键内容**：
  - 目标：ES2019
  - 模块：CommonJS
  - 声明文件生成
  - 装饰器支持

### 代码质量

#### `prettier.config.js`
- **职责**：代码格式化规则
- **配置**：2空格缩进，双引号

#### `jest.config.js`
- **职责**：测试配置
- **关键内容**：
  - 测试环境：Node.js
  - 覆盖率阈值：80%
  - 项目分离（plugin-tests vs non-plugin-tests）

### 构建工具

#### `babel.config.js`
- **职责**：Babel 转换配置
- **配置**：TypeScript + ES2019 → CommonJS

#### `Makefile`
- **职责**：常用命令快捷方式
- **命令**：
  - `make install`：安装依赖
  - `make clean`：清理构建产物
  - `make watch`：监听模式
  - `make build-plugin`：构建插件

### 开发环境

#### `.vscode/launch.json`
- **职责**：VSCode 调试配置
- **配置**：
  - Run Extension：运行插件
  - Extension Tests：运行测试
  - Web Extension：运行 Web 扩展

#### `.vscode/tasks.json`
- **职责**：VSCode 任务配置
- **任务**：
  - Build Dependencies：构建依赖
  - compile/watch/build：插件编译任务

#### `.envrc`（direnv）
- **职责**：自动环境配置
- **功能**：
  - Conda 环境激活
  - Node.js 版本切换（nvm）

## 🚀 开发指南

### 初始化项目

```bash
# 安装依赖并构建所有包
yarn setup

# 或分步执行
yarn bootstrap:bootstrap  # 安装依赖
yarn bootstrap:build     # 构建所有包
```

### 快速构建

```bash
# 按依赖顺序快速构建必要包
yarn bootstrap:build:fast
```

### 开发模式

```bash
# 监听模式（自动重新编译）
yarn watch

# 或使用 VSCode 调试配置
# F5 启动 "Run Extension"
```

### 运行测试

```bash
# 运行所有测试
yarn test

# 运行 CLI 测试
yarn test:cli

# 运行插件测试
yarn ci:test:plugin
```

### 代码质量

```bash
# 格式化代码
yarn format

# 代码检查
yarn lint

# 类型检查
yarn lerna:typecheck
```

### 构建插件

```bash
# 构建 VSCode 插件包
make build-plugin
```

## 🏗 架构特点

### 1. 分层架构

```
应用层 (plugin-core, dendron-cli, api-server)
    ↓
引擎层 (engine-server, unified)
    ↓
基础层 (common-all, common-server, common-frontend)
```

### 2. 依赖管理

- **严格依赖顺序**：基础层 → 引擎层 → 应用层
- **避免循环依赖**：通过分层设计
- **路径映射**：使用 TypeScript 路径映射简化导入

### 3. 构建策略

- **增量构建**：`bootstrap:build:fast` 只构建必要包
- **并行构建**：Lerna 支持并行执行
- **监听模式**：支持开发时热重载

### 4. 代码组织

- **DDD 分层结构**：按领域驱动设计原则
- **模块化设计**：每个包职责单一
- **类型安全**：TypeScript 严格模式

## 📝 开发工作流

1. **初始化**：`yarn setup` → 安装依赖 → 构建所有包
2. **开发**：`yarn watch` 或 VSCode 调试配置
3. **构建**：`yarn bootstrap:build:fast`（快速构建）或 `yarn bootstrap:build`（完整构建）
4. **测试**：`yarn test`（单元测试）或 `yarn ci:test:plugin`（插件测试）
5. **发布**：`yarn build:patch:local` 或 `yarn build:patch:remote`

## 🔗 相关链接

- [Dendron 官方文档](https://wiki.dendron.so/)
- [VSCode Extension API](https://code.visualstudio.com/api)
- [Lerna 文档](https://lerna.js.org/)

## 📄 许可证

本项目基于 GNU AFFERO GENERAL PUBLIC LICENSE Version 3 许可证。

