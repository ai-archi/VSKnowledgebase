import * as joint from 'jointjs';
import { ViewRenderer, ViewSettings } from '@arktect-co/archimate-diagram-engine';
import { ArchimateXMLParser } from '../parser/ArchimateXMLParser.js';
import { ArchimateXMLSerializer } from '../serializer/ArchimateXMLSerializer.js';
import { ArchimateModel, ArchimateView } from '../utils/ArchimateModel.js';
import { JointJSInteractionManager } from '../interaction/JointJSInteractionManager.js';

/**
 * ArchiMate 编辑器适配器
 * 提供类似 archimate-js/lib/Modeler 的 API
 */
export class ArchimateEditorAdapter {
  constructor(options = {}) {
    this.container = typeof options.container === 'string' 
      ? document.querySelector(options.container) 
      : options.container;
    
    if (!this.container) {
      throw new Error('Container element not found');
    }

    // 初始化 JointJS
    this.graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });
    
    // 为 Graph 添加 hasLabels 方法以兼容 archimate-diagram-engine
    // archimate-diagram-engine 期望 Graph 有 hasLabels 方法
    const graph = this.graph; // 保存引用
    if (typeof graph.hasLabels !== 'function') {
      graph.hasLabels = function() {
        try {
          // 检查是否有元素包含标签
          const elements = graph.getElements();
          return elements.some(element => {
            try {
              const attrs = element.get('attrs');
              return attrs && attrs.label && attrs.label.text;
            } catch (e) {
              return false;
            }
          });
        } catch (e) {
          return false;
        }
      };
    }
    this.paper = new joint.dia.Paper({
      el: this.container,
      model: this.graph,
      width: '100%',
      height: '100%',
      gridSize: 10,
      background: {
        color: '#f5f5f5'
      },
      interactive: {
        linkMove: true,
        elementMove: true
      },
      // 禁用默认的平移，使用自定义实现
      preventDefaultBlankAction: false
    });

    // 初始化解析器和序列化器
    this.parser = new ArchimateXMLParser();
    this.serializer = new ArchimateXMLSerializer();

    // 当前模型和视图
    this.model = null;
    this.currentView = null;

    // 视图设置
    this.viewSettings = new ViewSettings({
      archimateVersion: '<=3.1',
      style: 'hybrid',
      darkColor: '#000000',
      lightColor: '#ffffff',
      textColor: '#000000',
      textSize: 12,
      defaultWidth: 140,
      defaultHeight: 50,
      borderWidth: 0.8,
      edgeWidth: 0.8
    });

    // 初始化交互管理器
    this.interactionManager = new JointJSInteractionManager(this.paper, this.graph, this);

    // 绑定键盘事件
    if (options.keyboard && options.keyboard.bindTo) {
      this.setupKeyboard(options.keyboard.bindTo);
    }
  }

  /**
   * 导入 XML
   */
  async importXML(xml) {
    try {
      const warnings = [];
      
      // 解析 XML
      this.model = this.parser.parse(xml);
      
      // 如果没有视图，创建一个默认视图
      if (this.model.views.length === 0) {
        const defaultView = new ArchimateView({
          name: this.model.name || 'Main View',
          viewNodes: [],
          viewRelationships: []
        });
        this.model.addView(defaultView);
      }

      // 打开第一个视图
      this.currentView = this.model.views[0];
      
      return { warnings };
    } catch (error) {
      throw new Error('Failed to import XML: ' + error.message);
    }
  }

  /**
   * 保存 XML
   */
  async saveXML(options = {}) {
    try {
      // 从当前视图状态更新模型
      this.updateModelFromView();
      
      // 序列化
      const xml = this.serializer.serialize(this.model, options.format || false);
      
      return { xml };
    } catch (error) {
      throw new Error('Failed to save XML: ' + error.message);
    }
  }

  /**
   * 保存 SVG
   */
  async saveSVG() {
    try {
      // 使用 JointJS Paper 的 SVG 导出功能
      const svg = this.paper.toSVG();
      return { svg };
    } catch (error) {
      throw new Error('Failed to save SVG: ' + error.message);
    }
  }

  /**
   * 创建新模型
   */
  async createNewModel() {
    try {
      this.model = new ArchimateModel({
        name: 'New Model',
        documentation: 'A new ArchiMate model'
      });

      // 创建默认视图
      const defaultView = new ArchimateView({
        name: 'Main View',
        viewNodes: [],
        viewRelationships: []
      });
      this.model.addView(defaultView);
      this.currentView = defaultView;

      // 清空画布
      this.graph.clear();

      return Promise.resolve();
    } catch (error) {
      throw new Error('Failed to create new model: ' + error.message);
    }
  }

  /**
   * 打开视图
   */
  async openView(viewId = null) {
    try {
      let view = null;
      
      if (viewId) {
        view = this.model.getView(viewId);
      } else if (this.model.views.length > 0) {
        view = this.model.views[0];
      }

      if (!view) {
        throw new Error('No view to open');
      }

      this.currentView = view;
      this.renderView(view);

      return Promise.resolve();
    } catch (error) {
      throw new Error('Failed to open view: ' + error.message);
    }
  }

  /**
   * 渲染视图
   */
  renderView(view) {
    // 清空现有内容
    this.graph.clear();

    if (!view || !view.viewNodes || view.viewNodes.length === 0) {
      return;
    }

    // 使用 archimate-diagram-engine 渲染
    try {
      // 转换数据格式以匹配 archimate-diagram-engine 的期望
      const viewNodes = view.viewNodes.map(node => ({
        modelNodeId: node.modelNodeId,
        viewNodeId: node.viewNodeId,
        name: node.name,
        type: node.type,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        parent: node.parent
      }));
      
      const viewRelationships = (view.viewRelationships || []).map(rel => ({
        modelRelationshipId: rel.modelRelationshipId,
        sourceId: rel.sourceId,
        targetId: rel.targetId,
        viewRelationshipId: rel.viewRelationshipId,
        type: rel.type,
        bendpoints: rel.bendpoints || []
      }));
      
      console.log('[ArchimateEditor] Rendering view:', {
        nodeCount: viewNodes.length,
        relationshipCount: viewRelationships.length,
        viewNodes: viewNodes.slice(0, 2), // 只打印前两个
        viewRelationships: viewRelationships.slice(0, 2) // 只打印前两个
      });
      
      ViewRenderer.renderToGraph(
        this.graph,
        viewNodes,
        viewRelationships,
        this.viewSettings
      );
    } catch (error) {
      console.error('Failed to render view:', error);
      throw error;
    }
  }

  /**
   * 从当前视图状态更新模型
   */
  updateModelFromView() {
    if (!this.currentView || !this.model) {
      return;
    }

    // 从 JointJS graph 提取当前视图状态
    const elements = this.graph.getElements();
    const links = this.graph.getLinks();

    // 更新视图节点
    this.currentView.viewNodes = elements.map(element => {
      const position = element.get('position') || { x: 0, y: 0 };
      const size = element.get('size') || { width: 140, height: 50 };
      const attrs = element.get('attrs') || {};
      const labelText = attrs.label && attrs.label.text ? attrs.label.text : '';
      
      return {
        modelNodeId: element.get('modelNodeId') || element.id,
        viewNodeId: element.id,
        name: labelText || element.get('name') || '',
        type: element.get('type') || '',
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
        parent: element.get('parent') || null
      };
    });

    // 更新视图关系
    this.currentView.viewRelationships = links.map(link => {
      const source = link.getSourceElement();
      const target = link.getTargetElement();
      const sourceId = source ? source.id : (link.get('source') && link.get('source').id);
      const targetId = target ? target.id : (link.get('target') && link.get('target').id);
      
      return {
        modelRelationshipId: link.get('modelRelationshipId') || link.id,
        sourceId: sourceId,
        targetId: targetId,
        viewRelationshipId: link.id,
        type: link.get('type') || '',
        bendpoints: link.get('vertices') || []
      };
    });
  }

  /**
   * 设置键盘事件
   */
  setupKeyboard(bindTo) {
    bindTo.addEventListener('keydown', (event) => {
      // Undo: Ctrl+Z / Cmd+Z
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        // TODO: 实现撤销
      }
      
      // Redo: Ctrl+Shift+Z / Cmd+Shift+Z
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && event.shiftKey) {
        event.preventDefault();
        // TODO: 实现重做
      }
      
      // Select All: Ctrl+A / Cmd+A
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        event.preventDefault();
        this.selectAll();
      }
      
      // Delete: Delete / Backspace
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (!this.isInputElement(event.target)) {
          event.preventDefault();
          this.deleteSelected();
        }
      }
    });
  }

  /**
   * 选择所有元素
   */
  selectAll() {
    const elements = this.graph.getElements();
    elements.forEach(element => {
      this.paper.findViewByModel(element).highlight();
    });
  }

  /**
   * 删除选中的元素
   */
  deleteSelected() {
    const selected = this.paper.getSelectedViews();
    selected.forEach(view => {
      view.model.remove();
    });
  }

  /**
   * 检查是否是输入元素
   */
  isInputElement(element) {
    return element && (
      element.tagName === 'INPUT' ||
      element.tagName === 'TEXTAREA' ||
      element.isContentEditable
    );
  }
}

