# {{projectName}} 架构概览

**创建日期**: {{date}}  
**架构师**: {{architect}}  
**架构类型**: {{architectureType}}

## 架构目标

{{architectureGoal}}

## 架构原则

1. **原则1**: 说明
2. **原则2**: 说明
3. **原则3**: 说明

## 架构视图

### 逻辑视图

{{logicalViewDescription}}

**逻辑架构图**（Mermaid 流程图）：
```mermaid
graph LR
    A[表示层] --> B[业务层]
    B --> C[数据层]
    B --> D[集成层]
```

**逻辑架构图**（Archimate）：
参考 [[架构图.逻辑视图.archimate]]

### 物理视图

{{physicalViewDescription}}

**物理部署图**（Mermaid 流程图）：
```mermaid
graph TB
    subgraph "生产环境"
        A[Web服务器] --> B[应用服务器]
        B --> C[(数据库)]
    end
    subgraph "测试环境"
        D[Web服务器] --> E[应用服务器]
        E --> F[(数据库)]
    end
```

**物理架构图**（Archimate）：
参考 [[架构图.物理视图.archimate]]

### 部署视图

{{deploymentViewDescription}}

**部署架构图**（Mermaid 架构图）：
```mermaid
C4Deployment
    title 系统部署视图
    
    Deployment_Node(docker, "Docker容器", "运行应用服务") {
        Container(web, "Web服务", "Node.js", "处理HTTP请求")
        Container(app, "应用服务", "Java", "业务逻辑处理")
    }
    
    Deployment_Node(db, "数据库服务器", "PostgreSQL") {
        ContainerDb(database, "主数据库", "PostgreSQL", "数据存储")
    }
    
    Rel(web, app, "调用")
    Rel(app, database, "读写")
```

## 技术栈

### 前端技术

- 技术1
- 技术2

### 后端技术

- 技术1
- 技术2

### 基础设施

- 技术1
- 技术2

## 架构决策

详见 [[架构决策记录]]

## 相关文档

- [[需求文档]]
- [[设计文档]]

## 变更记录

| 日期 | 版本 | 变更内容 | 变更人 |
|------|------|----------|--------|
| {{date}} | 1.0 | 初始版本 | {{architect}} |

