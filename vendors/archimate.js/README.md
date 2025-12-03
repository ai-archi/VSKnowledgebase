# Archimate.js

基于 bpmn.js (diagram-js) 的 Archimate 3.1 图表编辑器实现，严格遵守 OpenGroup Archimate 3.1 规范。

## 架构说明

### 技术栈

- **diagram-js**: bpmn.io 提供的通用图表编辑引擎
- **moddle**: 用于处理 Archimate 3.1 XML 格式的元模型框架
- **moddle-xml**: XML 序列化/反序列化

### 核心组件

1. **Moddle 元模型** (`lib/moddle/resources/archimate.json`)
   - 完整的 Archimate 3.1 元模型定义
   - 包含所有元素类型、关系类型、视图类型
   - 严格遵守 OpenGroup 规范

2. **BaseViewer** (`lib/BaseViewer.js`)
   - 基于 diagram-js 的查看器基类
   - 支持 XML 导入/导出
   - 支持 SVG 导出
   - 视图管理

3. **BaseModeler** (`lib/BaseModeler.js`)
   - 基于 BaseViewer 的建模器基类
   - ID 管理
   - 模型编辑功能

4. **核心概念** (`lib/core/Concept.js`)
   - Archimate 3.1 常量定义
   - 元素类型枚举
   - 关系类型枚举
   - 工具函数

## 已实现的功能

✅ **完整的 Moddle 元模型定义**
- 所有 58+ 元素类型（Business, Application, Technology, Physical, Motivation, Strategy, Implementation & Migration）
- 所有 11 种关系类型
- 视图和图表结构
- 样式和属性定义

✅ **基础架构**
- BaseViewer 和 BaseModeler
- Moddle 集成
- XML 导入/导出框架

## 待实现的功能

### 1. 渲染器 (Renderer)
- `lib/draw/ArchimateRenderer.js` - 渲染所有元素类型
- 支持所有 Archimate 图形表示
- 样式支持（颜色、字体、线条等）

### 2. 导入器 (Importer)
- `lib/import/Importer.js` - XML 到图形的转换
- `lib/import/ArchimateImporter.js` - Archimate 特定导入逻辑
- 视图渲染

### 3. 建模功能 (Modeling)
- `lib/features/modeling/Modeling.js` - 核心建模功能
- `lib/features/modeling/ArchimateFactory.js` - 元素创建工厂
- 创建、更新、删除元素和关系
- 属性编辑

### 4. 工具面板 (Palette)
- `lib/features/palette/PaletteProvider.js` - 工具面板提供者
- 所有元素类型的工具按钮
- 按层组织

### 5. 上下文菜单 (Context Pad)
- `lib/features/context-pad/ContextPadProvider.js` - 上下文菜单
- 元素操作菜单

### 6. 其他功能
- 标签编辑
- 复制粘贴
- 键盘快捷键
- 自动布局
- 连接点管理
- 对齐和吸附

## 规范支持

本实现严格遵守 OpenGroup Archimate 3.1 规范：

- ✅ 完整的元素类型支持（58+ 类型）
- ✅ 完整的关系类型支持（11 种）
- ✅ 视图和图表结构
- ✅ 属性定义和属性值
- ✅ 组织和元数据
- ✅ 样式系统
- ✅ 多语言支持（LangString）

## 开发指南

### 依赖安装

```bash
pnpm install
```

### 构建

```bash
# 开发模式
pnpm run build:watch

# 生产构建
pnpm run build
```

### 使用示例

```javascript
import Modeler from './lib/Modeler';

const modeler = new Modeler({
  container: '#canvas'
});

// 导入 XML
await modeler.importXML(xmlString);

// 导出 XML
const { xml } = await modeler.saveXML({ format: true });

// 导出 SVG
const { svg } = await modeler.saveSVG();
```

## 文件结构

```
vendors/archimate.js/
├── lib/
│   ├── moddle/
│   │   ├── Moddle.js          # Moddle 包装器
│   │   └── resources/
│   │       └── archimate.json  # 完整的元模型定义
│   ├── core/
│   │   └── Concept.js          # 核心概念和常量
│   ├── BaseViewer.js          # 查看器基类
│   ├── BaseModeler.js         # 建模器基类
│   ├── draw/                   # 渲染器（待实现）
│   ├── import/                 # 导入器（待实现）
│   └── features/               # 功能模块（待实现）
└── README.md
```

## 下一步

1. 实现 ArchimateRenderer - 渲染所有元素类型
2. 实现 Importer - XML 到图形的转换
3. 实现 Modeling - 核心建模功能
4. 实现 Palette - 工具面板
5. 实现其他功能模块

## 参考

- [OpenGroup Archimate 3.1 Specification](https://www.opengroup.org/xsd/archimate/)
- [diagram-js Documentation](https://github.com/bpmn-io/diagram-js)
- [moddle Documentation](https://github.com/bpmn-io/moddle)

