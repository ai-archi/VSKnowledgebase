# Archimate Diagram Engine 改造方案

## 一、可行性分析

### 1.1 项目对比

| 特性 | archimate-js (当前) | archimate-diagram-engine (目标) |
|------|-------------------|--------------------------------|
| **定位** | 完整的编辑器 | 渲染引擎 |
| **底层技术** | 未知（可能是自定义） | JointJS |
| **核心功能** | 编辑 + 渲染 + XML 处理 | 仅渲染 |
| **API 类型** | Modeler 类（高级封装） | ViewRenderer（渲染函数） |
| **编辑能力** | ✅ 内置完整编辑功能 | ❌ 无（需自行实现） |
| **XML 处理** | ✅ 内置 importXML/saveXML | ❌ 无（需自行实现） |
| **交互功能** | ✅ 内置拖拽、连接、快捷键 | ❌ 无（需基于 JointJS 实现） |
| **依赖** | archimate-js | @arktect-co/archimate-diagram-engine + jointjs |

### 1.2 关键发现

**archimate-diagram-engine 的特点：**
- ✅ 基于 JointJS，渲染性能好
- ✅ 支持服务端和客户端渲染
- ✅ 提供灵活的样式配置（ViewSettings）
- ✅ TypeScript 编写，类型安全
- ❌ **仅提供渲染功能，不提供编辑能力**
- ❌ **不提供 XML 解析/生成功能**
- ❌ **不提供交互功能（拖拽、连接等）**

**当前 archimate-js 的特点：**
- ✅ 完整的编辑器功能（开箱即用）
- ✅ 内置 XML 导入/导出
- ✅ 内置 SVG 导出
- ✅ 完整的交互功能
- ❓ 底层实现未知，可能难以扩展

### 1.3 可行性结论

**可行性：中等**

**优势：**
1. JointJS 是成熟的图表库，有丰富的交互能力
2. 可以完全控制编辑体验
3. 可以自定义功能扩展

**挑战：**
1. **需要大量开发工作**：需要自己实现编辑、XML 处理、交互功能
2. **开发周期长**：预计需要 4-8 周
3. **维护成本高**：需要维护更多代码

## 二、架构设计

### 2.1 新架构概览

```
┌─────────────────────────────────────────────────────────┐
│                    Archimate Editor                     │
│  (packages/archimate-js/app/app.js)                     │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              ArchimateEditorAdapter                     │
│  (封装编辑功能，提供类似 archimate-js 的 API)          │
└─────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ XML Parser  │    │ JointJS      │    │ XML          │
│ & Generator │    │ Graph        │    │ Serializer   │
└──────────────┘    └──────────────┘    └──────────────┘
         │                    │                    │
         └────────────────────┴────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│        archimate-diagram-engine (ViewRenderer)          │
│  (仅用于渲染，不参与编辑逻辑)                            │
└─────────────────────────────────────────────────────────┘
```

### 2.2 核心组件设计

#### 2.2.1 ArchimateEditorAdapter

**职责：**
- 提供类似 `archimate-js/lib/Modeler` 的 API
- 管理 JointJS Graph 和 Paper
- 协调 XML 解析、渲染、序列化

**API 设计：**
```typescript
class ArchimateEditorAdapter {
  constructor(options: {
    container: string | HTMLElement;
    keyboard?: { bindTo: Window };
  });
  
  // 兼容 archimate-js API
  importXML(xml: string): Promise<{warnings: string[]}>;
  saveXML(options?: {format?: boolean}): Promise<{xml: string}>;
  saveSVG(): Promise<{svg: string}>;
  createNewModel(): Promise<void>;
  openView(): Promise<void>;
}
```

#### 2.2.2 ArchimateXMLParser

**职责：**
- 解析 ArchiMate XML 格式
- 提取 elements、relationships、views
- 转换为内部数据模型

**数据结构：**
```typescript
interface ArchimateModel {
  elements: ArchimateElement[];
  relationships: ArchimateRelationship[];
  views: ArchimateView[];
}

interface ArchimateElement {
  id: string;
  name: string;
  type: string;
  // ... 其他属性
}

interface ArchimateView {
  id: string;
  name: string;
  viewNodes: ViewNode[];
  viewRelationships: ViewRelationship[];
}
```

#### 2.2.3 JointJSInteractionManager

**职责：**
- 实现拖拽功能
- 实现连接功能
- 实现键盘快捷键
- 实现选择、删除等操作

**功能：**
- 元素拖拽
- 连接创建（通过拖拽）
- 元素选择（单选/多选）
- 元素删除
- 元素编辑（双击编辑标签）
- 撤销/重做（基于 JointJS 的 CommandManager）

#### 2.2.4 ArchimateXMLSerializer

**职责：**
- 将 JointJS Graph 状态序列化为 ArchiMate XML
- 保持 XML 格式兼容性

## 三、实施计划

### 阶段 1：基础架构搭建（1-2 周）

#### 任务 1.1：安装依赖
```bash
cd packages/archimate-js
npm install @arktect-co/archimate-diagram-engine jointjs
npm install --save-dev @types/jointjs
```

#### 任务 1.2：创建项目结构
```
packages/archimate-js/
├── app/
│   ├── app.js (主入口，修改为使用新适配器)
│   └── index.html
├── src/
│   ├── adapter/
│   │   └── ArchimateEditorAdapter.js
│   ├── parser/
│   │   └── ArchimateXMLParser.js
│   ├── serializer/
│   │   └── ArchimateXMLSerializer.js
│   ├── interaction/
│   │   ├── JointJSInteractionManager.js
│   │   ├── DragDropHandler.js
│   │   ├── ConnectionHandler.js
│   │   └── KeyboardHandler.js
│   └── utils/
│       ├── ArchimateModel.js (数据模型)
│       └── ViewSettingsBuilder.js
└── package.json
```

#### 任务 1.3：创建基础适配器框架
- 创建 `ArchimateEditorAdapter` 类
- 初始化 JointJS Graph 和 Paper
- 实现基本的容器绑定

### 阶段 2：XML 处理实现（1-2 周）

#### 任务 2.1：实现 XML 解析器
- 解析 ArchiMate 3.x XML 格式
- 提取 elements、relationships、views
- 处理命名空间和 schema

**参考标准：**
- ArchiMate 3.1 XML Schema
- OpenGroup 官方规范

#### 任务 2.2：实现 XML 序列化器
- 将内部模型转换为 XML
- 保持格式兼容性
- 处理视图数据（viewNodes、viewRelationships）

#### 任务 2.3：集成渲染引擎
- 使用 `archimate-diagram-engine` 的 `ViewRenderer`
- 配置 `ViewSettings`
- 实现渲染到 JointJS Graph

### 阶段 3：交互功能实现（2-3 周）

#### 任务 3.1：基础交互
- 元素选择（点击、框选）
- 元素移动（拖拽）
- 元素删除（Delete 键）

#### 任务 3.2：连接功能
- 创建连接（拖拽连接点）
- 编辑连接（移动、删除）
- 连接样式（根据关系类型）

#### 任务 3.3：编辑功能
- 元素标签编辑（双击）
- 属性编辑（右键菜单或侧边栏）
- 元素创建（工具栏或快捷键）

#### 任务 3.4：键盘快捷键
- Undo/Redo (Ctrl+Z, Ctrl+Shift+Z)
- Select All (Ctrl+A)
- Delete (Delete/Backspace)
- 工具切换（H=Hand, L=Lasso, S=Space, E=Edit）

### 阶段 4：高级功能（1-2 周）

#### 任务 4.1：撤销/重做
- 基于 JointJS CommandManager
- 记录所有操作历史

#### 任务 4.2：SVG 导出
- 使用 JointJS Paper 的 SVG 导出功能
- 处理样式和资源

#### 任务 4.3：视图管理
- 多视图支持
- 视图切换
- 视图创建/删除

#### 任务 4.4：性能优化
- 大型模型渲染优化
- 延迟加载
- 虚拟滚动（如需要）

### 阶段 5：测试与优化（1 周）

#### 任务 5.1：功能测试
- XML 导入/导出测试
- 交互功能测试
- 兼容性测试（与现有 .archimate 文件）

#### 任务 5.2：VSCode 集成测试
- Webview 环境测试
- 资源路径修复
- 消息通信测试

#### 任务 5.3：文档更新
- API 文档
- 使用说明
- 迁移指南

## 四、技术细节

### 4.1 XML 解析实现

**使用 DOMParser：**
```javascript
class ArchimateXMLParser {
  parse(xmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'text/xml');
    
    // 解析 elements
    const elements = this.parseElements(doc);
    
    // 解析 relationships
    const relationships = this.parseRelationships(doc);
    
    // 解析 views
    const views = this.parseViews(doc);
    
    return { elements, relationships, views };
  }
  
  parseElements(doc) {
    // 实现元素解析逻辑
  }
  
  parseRelationships(doc) {
    // 实现关系解析逻辑
  }
  
  parseViews(doc) {
    // 实现视图解析逻辑
  }
}
```

### 4.2 JointJS 集成

**初始化：**
```javascript
import joint from 'jointjs';
import { ViewRenderer, ViewSettings } from '@arktect-co/archimate-diagram-engine';

class ArchimateEditorAdapter {
  constructor(options) {
    this.graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });
    this.paper = new joint.dia.Paper({
      el: document.querySelector(options.container),
      model: this.graph,
      width: '100%',
      height: '100%',
      gridSize: 10,
      // ... 其他配置
    });
    
    // 配置 archimate-diagram-engine
    this.viewSettings = new ViewSettings({
      archimateVersion: '<=3.1',
      style: 'hybrid',
      // ... 其他配置
    });
  }
  
  renderView(viewNodes, viewRelationships) {
    // 清空现有内容
    this.graph.clearCells();
    
    // 使用 archimate-diagram-engine 渲染
    ViewRenderer.renderToGraph(
      this.graph,
      viewNodes,
      viewRelationships,
      this.viewSettings
    );
  }
}
```

### 4.3 交互功能实现

**拖拽连接：**
```javascript
class ConnectionHandler {
  constructor(paper, graph) {
    this.paper = paper;
    this.graph = graph;
    this.setupConnectionTools();
  }
  
  setupConnectionTools() {
    // 使用 JointJS 的 linkTools
    const linkToolsView = new joint.dia.ToolsView({
      tools: [
        new joint.linkTools.Vertices(),
        new joint.linkTools.Segments(),
        new joint.linkTools.Remove()
      ]
    });
    
    // 为连接添加工具
    this.paper.on('link:pointerclick', (linkView) => {
      linkView.addTools(linkToolsView);
    });
  }
}
```

**元素创建：**
```javascript
class ElementCreator {
  createElement(type, position) {
    // 创建新的 ArchiMate 元素
    const element = new joint.shapes.standard.Rectangle({
      position: position,
      size: { width: 140, height: 50 },
      attrs: {
        body: {
          // 使用 archimate-diagram-engine 的样式
        },
        label: {
          text: 'New Element'
        }
      }
    });
    
    this.graph.addCell(element);
    return element;
  }
}
```

### 4.4 XML 序列化实现

**序列化流程：**
```javascript
class ArchimateXMLSerializer {
  serialize(model, graph) {
    // 1. 从 graph 提取当前视图状态
    const viewNodes = this.extractViewNodes(graph);
    const viewRelationships = this.extractViewRelationships(graph);
    
    // 2. 构建 XML 结构
    const xmlDoc = this.buildXMLDocument(model, viewNodes, viewRelationships);
    
    // 3. 序列化为字符串
    return new XMLSerializer().serializeToString(xmlDoc);
  }
  
  extractViewNodes(graph) {
    // 从 JointJS graph 提取节点信息
    return graph.getElements().map(element => ({
      modelNodeId: element.get('modelNodeId'),
      viewNodeId: element.id,
      name: element.get('name'),
      type: element.get('type'),
      x: element.get('position').x,
      y: element.get('position').y,
      width: element.get('size').width,
      height: element.get('size').height,
      parent: element.get('parent')
    }));
  }
  
  extractViewRelationships(graph) {
    // 从 JointJS graph 提取连接信息
    return graph.getLinks().map(link => ({
      modelRelationshipId: link.get('modelRelationshipId'),
      sourceId: link.get('source').id,
      targetId: link.get('target').id,
      viewRelationshipId: link.id,
      type: link.get('type'),
      bendpoints: link.get('vertices') || []
    }));
  }
}
```

## 五、风险评估与缓解

### 5.1 技术风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| XML 解析不完整 | 高 | 中 | 使用标准 XML 解析库，充分测试 |
| JointJS 性能问题 | 中 | 低 | 大型模型使用虚拟化，延迟渲染 |
| 样式不一致 | 中 | 中 | 参考 archimate-js 样式，使用 archimate-diagram-engine 的 ViewSettings |
| 兼容性问题 | 高 | 中 | 充分测试现有 .archimate 文件 |

### 5.2 开发风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| 开发周期超期 | 中 | 中 | 分阶段实施，优先核心功能 |
| 功能缺失 | 高 | 低 | 详细功能对比清单 |
| 维护成本高 | 中 | 高 | 良好的代码结构和文档 |

## 六、迁移策略

### 6.1 渐进式迁移

**阶段 A：并行运行**
- 保留现有 `archimate-js` 实现
- 新实现作为 `archimate-js-v3` 或 `archimate-js-jointjs`
- 通过配置切换

**阶段 B：功能对等**
- 确保新实现功能对等
- 充分测试兼容性

**阶段 C：完全切换**
- 移除旧实现
- 更新文档和示例

### 6.2 兼容性保证

1. **XML 格式兼容**：确保生成的 XML 与 archimate-js 兼容
2. **API 兼容**：保持 `Modeler` 类 API 不变
3. **功能对等**：确保所有现有功能都可用

## 七、成功标准

### 7.1 功能完整性
- ✅ XML 导入/导出功能正常
- ✅ SVG 导出功能正常
- ✅ 所有交互功能正常（拖拽、连接、编辑）
- ✅ 键盘快捷键正常
- ✅ 撤销/重做功能正常

### 7.2 性能标准
- ✅ 加载 100 个元素的模型 < 2 秒
- ✅ 渲染大型模型（500+ 元素）流畅
- ✅ 交互响应时间 < 100ms

### 7.3 兼容性标准
- ✅ 能打开现有 .archimate 文件
- ✅ 生成的 XML 能被其他工具识别
- ✅ VSCode webview 环境正常工作

## 八、时间估算

| 阶段 | 任务 | 时间估算 |
|------|------|---------|
| 阶段 1 | 基础架构搭建 | 1-2 周 |
| 阶段 2 | XML 处理实现 | 1-2 周 |
| 阶段 3 | 交互功能实现 | 2-3 周 |
| 阶段 4 | 高级功能 | 1-2 周 |
| 阶段 5 | 测试与优化 | 1 周 |
| **总计** | | **6-10 周** |

## 九、建议

### 9.1 是否进行改造？

**建议：谨慎考虑**

**支持改造的理由：**
1. JointJS 是成熟库，长期维护有保障
2. 可以完全控制编辑体验
3. 可以自定义功能扩展

**不支持改造的理由：**
1. **开发成本高**：需要 6-10 周开发时间
2. **维护成本高**：需要维护更多代码
3. **风险较高**：可能遇到未知问题
4. **当前方案可用**：archimate-js 已经满足需求

### 9.2 替代方案

**方案 A：保持现状**
- 继续使用 archimate-js
- 如果遇到问题，再考虑改造

**方案 B：混合方案**
- 使用 archimate-diagram-engine 仅用于渲染
- 保留 archimate-js 的编辑功能
- 逐步迁移编辑功能到 JointJS

**方案 C：完全改造**
- 按照本方案完全改造
- 获得完全控制权
- 承担开发和维护成本

### 9.3 最终建议

**如果满足以下条件，建议进行改造：**
1. 当前 archimate-js 无法满足需求
2. 有足够的开发资源（6-10 周）
3. 需要长期维护和扩展
4. 团队熟悉 JointJS

**否则，建议保持现状或采用混合方案。**

## 十、参考资料

- [archimate-diagram-engine GitHub](https://github.com/Arktect-Co/archimate-diagram-engine)
- [JointJS 官方文档](https://resources.jointjs.com/docs/jointjs)
- [ArchiMate 3.1 规范](https://pubs.opengroup.org/architecture/archimate3-doc/)
- [ArchiMate XML Schema](http://www.opengroup.org/xsd/archimate/3.1/archimate3_Diagram.xsd)

