import * as joint from 'jointjs';

/**
 * JointJS 交互管理器
 * 处理拖拽、连接、选择等交互功能
 */
export class JointJSInteractionManager {
  constructor(paper, graph, adapter) {
    this.paper = paper;
    this.graph = graph;
    this.adapter = adapter;
    
    this.setupInteractions();
  }

  /**
   * 设置交互功能
   */
  setupInteractions() {
    // 设置连接工具
    this.setupLinkTools();
    
    // 设置元素工具
    this.setupElementTools();
    
    // 设置拖拽
    this.setupDragDrop();
    
    // 设置选择
    this.setupSelection();
  }

  /**
   * 设置连接工具
   */
  setupLinkTools() {
    const linkToolsView = new joint.dia.ToolsView({
      tools: [
        new joint.linkTools.Vertices(),
        new joint.linkTools.Segments(),
        new joint.linkTools.Remove({
          distance: 20
        })
      ]
    });

    // 点击连接时显示工具
    this.paper.on('link:pointerclick', (linkView) => {
      // 移除其他连接的工具
      this.graph.getLinks().forEach(link => {
        const view = this.paper.findViewByModel(link);
        if (view && view !== linkView) {
          view.removeTools();
        }
      });
      
      linkView.addTools(linkToolsView);
    });

    // 点击空白处移除工具
    this.paper.on('blank:pointerclick', () => {
      this.graph.getLinks().forEach(link => {
        const view = this.paper.findViewByModel(link);
        if (view) {
          view.removeTools();
        }
      });
    });
  }

  /**
   * 设置元素工具
   */
  setupElementTools() {
    // 双击编辑标签
    this.paper.on('element:pointerdblclick', (elementView) => {
      const element = elementView.model;
      const attrs = element.get('attrs');
      const currentText = attrs?.label?.text || '';
      
      const newText = prompt('Enter new label:', currentText);
      if (newText !== null && newText !== currentText) {
        element.attr('label/text', newText);
        element.set('name', newText);
      }
    });
  }

  /**
   * 设置拖拽功能
   */
  setupDragDrop() {
    // JointJS 默认支持元素拖拽，这里可以添加自定义逻辑
    this.paper.on('element:pointermove', (elementView, evt, x, y) => {
      // 可以在这里添加拖拽时的自定义逻辑
    });
    
    // 设置画布平移（手型工具）
    this.setupPanning();
  }

  /**
   * 设置画布平移功能
   * 支持：
   * - 鼠标左键拖拽空白区域：平移画布
   * - 鼠标中键拖拽：平移画布
   * - 鼠标右键拖拽：平移画布
   * - 鼠标滚轮：缩放画布（Ctrl/Cmd + 滚轮）
   */
  setupPanning() {
    let isPanning = false;
    let panStartPoint = null;
    let panStartTranslate = null;
    let hasMoved = false; // 标记是否真正移动了

    // 鼠标左键/中键/右键拖拽空白区域平移画布
    this.paper.on('blank:pointerdown', (evt, x, y) => {
      const button = evt.originalEvent.button;
      // 左键 (0)、中键 (1)、右键 (2) 都可以平移
      if (button === 0 || button === 1 || button === 2) {
        isPanning = true;
        hasMoved = false;
        
        // 获取鼠标在画布中的位置（相对于画布左上角，不是画布坐标系统）
        const clientRect = this.paper.el.getBoundingClientRect();
        panStartPoint = {
          x: evt.originalEvent.clientX - clientRect.left,
          y: evt.originalEvent.clientY - clientRect.top
        };
        
        // 保存当前的平移量
        const translate = this.paper.translate();
        panStartTranslate = {
          tx: translate.tx || 0,
          ty: translate.ty || 0
        };
        
        if (this.paper.el) {
          this.paper.el.style.cursor = 'grabbing';
        }
        evt.preventDefault();
        evt.stopPropagation();
      }
    });

    // 拖拽过程中（只在真正移动时才平移）
    // 使用全局 mousemove 事件，避免 JointJS 事件和全局事件冲突
    const handlePointerMove = (evt) => {
      if (!isPanning || !panStartPoint || !panStartTranslate) {
        return;
      }

      // 获取鼠标在画布中的位置（相对于画布左上角）
      const clientRect = this.paper.el.getBoundingClientRect();
      const currentX = evt.clientX - clientRect.left;
      const currentY = evt.clientY - clientRect.top;
      
      const dx = currentX - panStartPoint.x;
      const dy = currentY - panStartPoint.y;
      
      // 只有移动距离超过阈值（例如 2px）才认为是真正的拖拽
      const threshold = 2;
      if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
        hasMoved = true;
        
        // 计算新的平移量
        const newTx = panStartTranslate.tx + dx;
        const newTy = panStartTranslate.ty + dy;
        
        // 应用平移
        this.paper.translate(newTx, newTy);
        
        evt.preventDefault();
        evt.stopPropagation();
      }
    };

    // 只使用全局 mousemove 事件，避免事件冲突
    document.addEventListener('mousemove', handlePointerMove, { passive: false });
    
    // 保存清理函数
    this._panningMoveCleanup = () => {
      document.removeEventListener('mousemove', handlePointerMove);
    };

    // 释放鼠标
    this.paper.on('blank:pointerup', (evt) => {
      if (isPanning) {
        // 如果没有真正移动，可能是点击而不是拖拽
        if (!hasMoved) {
          // 可以在这里处理点击事件（如果需要）
        }
        isPanning = false;
        hasMoved = false;
        panStartPoint = null;
        panStartTranslate = null;
        if (this.paper.el) {
          this.paper.el.style.cursor = 'default';
        }
        evt.preventDefault();
        evt.stopPropagation();
      }
    });

    // 监听全局鼠标事件（处理鼠标移出画布时的情况）
    const handleGlobalMouseUp = () => {
      if (isPanning) {
        isPanning = false;
        hasMoved = false;
        panStartPoint = null;
        panStartTranslate = null;
        if (this.paper.el) {
          this.paper.el.style.cursor = 'default';
        }
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('mouseleave', handleGlobalMouseUp);

    // 设置鼠标滚轮缩放
    this.setupMouseWheelZoom();

    // 保存全局事件清理函数
    this._panningGlobalCleanup = () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('mouseleave', handleGlobalMouseUp);
      if (this._panningMoveCleanup) {
        this._panningMoveCleanup();
      }
    };
  }

  /**
   * 设置鼠标滚轮缩放功能
   * 支持直接滚轮缩放（不需要按 Ctrl/Cmd）
   */
  setupMouseWheelZoom() {
    const handleWheel = (evt) => {
      // 允许直接滚轮缩放，或者 Ctrl/Cmd + 滚轮
      // 如果按下了 Ctrl/Cmd，则缩放；否则也可以缩放（可选）
      evt.preventDefault();
      evt.stopPropagation();

      const delta = evt.deltaY;
      const scale = this.paper.scale();
      const currentScale = scale.sx || 1;
      const newScale = delta > 0 
        ? Math.max(0.1, currentScale * 0.9)  // 缩小
        : Math.min(4, currentScale * 1.1);   // 放大

      // 获取鼠标在画布中的位置
      const clientRect = this.paper.el.getBoundingClientRect();
      const pointerX = evt.clientX - clientRect.left;
      const pointerY = evt.clientY - clientRect.top;

      // 获取当前的平移量
      const translate = this.paper.translate();
      const tx = translate.tx || 0;
      const ty = translate.ty || 0;

      // 计算缩放比例
      const scaleRatio = newScale / currentScale;

      // 计算新的平移量，使鼠标位置保持不变
      const newTx = pointerX - (pointerX - tx) * scaleRatio;
      const newTy = pointerY - (pointerY - ty) * scaleRatio;

      // 应用缩放和平移
      this.paper.scale(newScale, newScale);
      this.paper.translate(newTx, newTy);
    };

    // 使用 capture 阶段确保事件被捕获
    this.paper.el.addEventListener('wheel', handleWheel, { 
      passive: false,
      capture: true 
    });

    // 保存清理函数
    this._wheelZoomCleanup = () => {
      this.paper.el.removeEventListener('wheel', handleWheel, { capture: true });
    };
  }

  /**
   * 设置选择功能
   */
  setupSelection() {
    // 点击选择
    this.paper.on('element:pointerclick', (elementView) => {
      // 可以添加选择逻辑
    });

    // 框选（需要额外的插件支持）
    // 这里可以集成 jointjs-selection 插件
  }

  /**
   * 创建连接
   */
  createLink(sourceElement, targetElement, type = 'association') {
    const link = new joint.shapes.standard.Link({
      source: { id: sourceElement.id },
      target: { id: targetElement.id },
      attrs: {
        line: {
          stroke: '#000000',
          strokeWidth: 1,
          targetMarker: {
            type: 'path',
            d: 'M 10 0 L 0 5 L 10 10 z'
          }
        }
      },
      type: type
    });

    this.graph.addCell(link);
    return link;
  }

  /**
   * 删除元素
   */
  removeElement(element) {
    // 删除相关的连接
    const links = this.graph.getLinks().filter(link => {
      const source = link.getSourceElement();
      const target = link.getTargetElement();
      return source === element || target === element;
    });
    
    links.forEach(link => link.remove());
    element.remove();
  }
}

