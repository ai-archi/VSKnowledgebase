# Architool IntelliJ IDEA Plugin

IntelliJ IDEA 插件实现，复用 Architool 的核心业务逻辑。

## 项目结构

```
architool-intellij/
├── src/
│   └── main/
│       ├── kotlin/
│       │   └── com/
│       │       └── architool/
│       │           ├── ArchitoolPlugin.kt          # 插件入口
│       │           ├── adapter/
│       │           │   └── IntelliJAdapterImpl.kt   # IntelliJ 适配器实现
│       │           ├── editor/
│       │           │   ├── MermaidEditorProvider.kt
│       │           │   └── PlantUMLEditorProvider.kt
│       │           ├── view/
│       │           │   └── DocumentToolWindow.kt
│       │           └── action/
│       │               └── ArchitoolActions.kt
│       └── resources/
│           └── META-INF/
│               └── plugin.xml                       # 插件配置
├── build.gradle.kts                                 # Gradle 构建配置
└── settings.gradle.kts                             # Gradle 设置
```

## 开发说明

### 前置要求

- IntelliJ IDEA 2023.1 或更高版本
- JDK 17 或更高版本
- Gradle 8.0 或更高版本

### 构建

```bash
./gradlew buildPlugin
```

### 运行

1. 在 IntelliJ IDEA 中打开项目
2. 运行 `runIde` Gradle 任务
3. 会启动一个新的 IntelliJ IDEA 实例，插件已安装

### 打包

```bash
./gradlew buildPlugin
```

生成的插件包位于 `build/distributions/` 目录。

## 架构说明

### 适配器模式

插件通过 `IntelliJAdapterImpl` 实现 `IDEAdapter` 接口，将 IntelliJ Platform API 映射到统一的接口。

### 业务逻辑复用

核心业务逻辑位于 `extension/architool/src/modules/` 目录，通过共享模块或消息协议与 IntelliJ 插件通信。

### 通信方式

- **Webview 通信**：使用 JCEF (Java Chromium Embedded Framework) 嵌入 Webview
- **消息协议**：JSON-RPC 2.0，与 VS Code 版本保持一致

## API 映射

| VS Code API | IntelliJ API |
|------------|--------------|
| `vscode.commands.registerCommand` | `AnAction` |
| `vscode.window.createTreeView` | `ToolWindow` + `JTree` |
| `vscode.window.createWebviewPanel` | `JCEF Browser` |
| `vscode.workspace.workspaceFolders` | `Project.getBaseDir()` |
| `vscode.workspace.fs.readFile` | `VirtualFile.contentsToByteArray()` |
| `CustomTextEditorProvider` | `FileEditorProvider` |
| `vscode.window.showInformationMessage` | `NotificationGroup` |

## 待实现功能

- [ ] IntelliJAdapter 完整实现
- [ ] Mermaid 编辑器
- [ ] PlantUML 编辑器
- [ ] 文档树视图
- [ ] 命令系统
- [ ] Webview 通信桥接

