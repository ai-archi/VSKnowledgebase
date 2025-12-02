// Mermaid.js 渲染器和增强层
// 负责使用 mermaid.js 渲染图表，并添加交互功能

import mermaid from 'mermaid';

export class MermaidRenderer {
  constructor(container) {
    this.container = container;
    this.currentSVG = null;
    this.currentSource = '';
    this.nodeMap = new Map();
    this.edgeMap = new Map();
    
    // 缩放相关
    this.scale = 1.0;
    this.minScale = 0.1;
    this.maxScale = 5.0;
    this.scaleStep = 0.1;
    
    this.init();
  }
  
  async init() {
    // 初始化 mermaid
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose', // 允许交互
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis'
      }
    });
  }
  
  /**
   * 渲染 mermaid 图表
   */
  async render(source) {
    try {
      this.currentSource = source;
      
      // 清空容器
      this.container.innerHTML = '';
      
      // 使用 mermaid 渲染
      const id = `mermaid-${Date.now()}`;
      const { svg } = await mermaid.render(id, source);
      
      // 注入 SVG
      this.container.innerHTML = svg;
      this.currentSVG = this.container.querySelector('svg');
      
      if (!this.currentSVG) {
        throw new Error('Failed to render mermaid diagram');
      }
      
      // 后处理增强
      this.enhanceSVG(this.currentSVG);
      
      // 应用当前缩放
      this.applyZoom();
      
      // 设置鼠标滚轮缩放
      this.setupWheelZoom();
      
      return this.currentSVG;
    } catch (error) {
      console.error('Mermaid render error:', error);
      throw error;
    }
  }
  
  /**
   * 增强 SVG，添加交互功能
   */
  enhanceSVG(svg) {
    // 1. 添加数据属性
    this.addDataAttributes(svg);
    
    // 2. 添加交互层
    this.addInteractionLayer(svg);
    
    // 3. 添加选择框
    this.addSelectionBox(svg);
    
    // 4. 提取节点和边映射
    this.extractNodeEdgeMap(svg);
  }
  
  /**
   * 添加数据属性，便于识别元素
   */
  addDataAttributes(svg) {
    // 为节点添加 data-node-id
    svg.querySelectorAll('.node').forEach((nodeGroup, index) => {
      const nodeId = this.extractNodeId(nodeGroup, index);
      nodeGroup.setAttribute('data-node-id', nodeId);
      nodeGroup.setAttribute('data-mermaid-type', 'node');
    });
    
    // 为边添加 data-edge-index
    svg.querySelectorAll('.edgePath').forEach((path, index) => {
      path.setAttribute('data-edge-index', index);
      path.setAttribute('data-mermaid-type', 'edge');
    });
    
    // 为子图添加标识
    svg.querySelectorAll('.cluster').forEach((cluster, index) => {
      cluster.setAttribute('data-subgraph-index', index);
      cluster.setAttribute('data-mermaid-type', 'subgraph');
    });
  }
  
  /**
   * 提取节点 ID
   */
  extractNodeId(nodeGroup, fallbackIndex) {
    // 方法1: 从文本内容推断（如果文本就是 ID）
    const textEl = nodeGroup.querySelector('text');
    if (textEl) {
      const text = textEl.textContent.trim();
      // 如果文本看起来像 ID（短且无空格），使用它
      if (text.length < 20 && !text.includes(' ')) {
        return text;
      }
    }
    
    // 方法2: 从 class 名称提取
    const classes = Array.from(nodeGroup.classList);
    const idClass = classes.find(c => c.startsWith('node-') || c.match(/^[A-Z]\d+$/));
    if (idClass) {
      return idClass.replace('node-', '');
    }
    
    // 方法3: 使用索引生成
    return `node-${fallbackIndex}`;
  }
  
  /**
   * 添加交互层
   */
  addInteractionLayer(svg) {
    // 为节点添加交互样式
    svg.querySelectorAll('.node').forEach(node => {
      node.style.cursor = 'pointer';
      node.setAttribute('data-interactive', 'true');
    });
    
    // 为边添加交互样式
    svg.querySelectorAll('.edgePath').forEach(edge => {
      edge.style.cursor = 'pointer';
      edge.setAttribute('data-interactive', 'true');
      
      // 增加边的点击区域（通过 stroke-width）
      const path = edge.querySelector('path');
      if (path) {
        const currentWidth = path.getAttribute('stroke-width') || '2';
        path.setAttribute('stroke-width', Math.max(parseFloat(currentWidth), 4));
        path.setAttribute('data-original-stroke-width', currentWidth);
      }
    });
    
    // 为子图添加交互样式
    svg.querySelectorAll('.cluster').forEach(cluster => {
      cluster.style.cursor = 'pointer';
      cluster.setAttribute('data-interactive', 'true');
    });
  }
  
  /**
   * 添加选择框元素
   */
  addSelectionBox(svg) {
    // 创建选择框
    const selectionBox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    selectionBox.setAttribute('class', 'mermaid-selection-box');
    selectionBox.setAttribute('fill', 'none');
    selectionBox.setAttribute('stroke', '#007bff');
    selectionBox.setAttribute('stroke-width', '2');
    selectionBox.setAttribute('stroke-dasharray', '5,5');
    selectionBox.style.display = 'none';
    selectionBox.style.pointerEvents = 'none';
    
    svg.appendChild(selectionBox);
    svg._selectionBox = selectionBox;
  }
  
  /**
   * 提取节点和边的映射关系
   */
  extractNodeEdgeMap(svg) {
    this.nodeMap.clear();
    this.edgeMap.clear();
    
    // 提取节点映射
    svg.querySelectorAll('.node').forEach(nodeGroup => {
      const nodeId = nodeGroup.getAttribute('data-node-id');
      if (nodeId) {
        const bbox = nodeGroup.getBBox();
        const textEl = nodeGroup.querySelector('text');
        
        this.nodeMap.set(nodeId, {
          id: nodeId,
          element: nodeGroup,
          bbox: bbox,
          label: textEl ? textEl.textContent.trim() : '',
          x: bbox.x + bbox.width / 2,
          y: bbox.y + bbox.height / 2,
          width: bbox.width,
          height: bbox.height
        });
      }
    });
    
    // 提取边映射
    svg.querySelectorAll('.edgePath').forEach((edgePath, index) => {
      const path = edgePath.querySelector('path');
      if (path) {
        const pathData = path.getAttribute('d');
        const labelEl = edgePath.parentElement?.querySelector('.edgeLabel');
        
        this.edgeMap.set(index, {
          index: index,
          element: edgePath,
          path: path,
          pathData: pathData,
          label: labelEl ? labelEl.textContent.trim() : ''
        });
      }
    });
  }
  
  /**
   * 获取节点信息
   */
  getNode(nodeId) {
    return this.nodeMap.get(nodeId);
  }
  
  /**
   * 获取所有节点
   */
  getAllNodes() {
    return Array.from(this.nodeMap.values());
  }
  
  /**
   * 获取边信息
   */
  getEdge(index) {
    return this.edgeMap.get(index);
  }
  
  /**
   * 获取所有边
   */
  getAllEdges() {
    return Array.from(this.edgeMap.values());
  }
  
  /**
   * 高亮元素
   */
  highlightElement(element, type) {
    this.clearHighlight();
    
    if (type === 'node') {
      element.classList.add('mermaid-selected-node');
    } else if (type === 'edge') {
      element.classList.add('mermaid-selected-edge');
    }
  }
  
  /**
   * 清除高亮
   */
  clearHighlight() {
    if (this.currentSVG) {
      this.currentSVG.querySelectorAll('.mermaid-selected-node, .mermaid-selected-edge').forEach(el => {
        el.classList.remove('mermaid-selected-node', 'mermaid-selected-edge');
      });
    }
  }
  
  /**
   * 显示选择框
   */
  showSelectionBox(element) {
    if (!this.currentSVG || !this.currentSVG._selectionBox) return;
    
    const bbox = element.getBBox();
    const selectionBox = this.currentSVG._selectionBox;
    
    selectionBox.setAttribute('x', bbox.x - 4);
    selectionBox.setAttribute('y', bbox.y - 4);
    selectionBox.setAttribute('width', bbox.width + 8);
    selectionBox.setAttribute('height', bbox.height + 8);
    selectionBox.style.display = 'block';
  }
  
  /**
   * 隐藏选择框
   */
  hideSelectionBox() {
    if (this.currentSVG && this.currentSVG._selectionBox) {
      this.currentSVG._selectionBox.style.display = 'none';
    }
  }
  
  /**
   * 获取当前源代码
   */
  getCurrentSource() {
    return this.currentSource;
  }
  
  /**
   * 获取当前 SVG
   */
  getCurrentSVG() {
    return this.currentSVG;
  }
  
  /**
   * 设置鼠标滚轮缩放
   */
  setupWheelZoom() {
    if (!this.container) return;
    
    // 移除旧的监听器（如果存在）
    if (this.wheelHandler) {
      this.container.removeEventListener('wheel', this.wheelHandler);
    }
    
    // 添加新的滚轮监听器
    this.wheelHandler = (e) => {
      // 如果按住 Ctrl 或 Cmd 键，进行缩放
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -this.scaleStep : this.scaleStep;
        this.setZoom(this.scale + delta);
      }
    };
    
    this.container.addEventListener('wheel', this.wheelHandler, { passive: false });
  }
  
  /**
   * 应用缩放
   */
  applyZoom() {
    if (!this.currentSVG) return;
    
    // 获取原始尺寸
    const originalWidth = this.currentSVG.getAttribute('width') || this.currentSVG.viewBox?.baseVal?.width || this.currentSVG.clientWidth;
    const originalHeight = this.currentSVG.getAttribute('height') || this.currentSVG.viewBox?.baseVal?.height || this.currentSVG.clientHeight;
    
    // 应用缩放变换
    this.currentSVG.style.transform = `scale(${this.scale})`;
    
    // 更新 SVG 尺寸以触发正确的滚动
    if (originalWidth && originalHeight) {
      this.currentSVG.style.width = `${originalWidth * this.scale}px`;
      this.currentSVG.style.height = `${originalHeight * this.scale}px`;
    }
  }
  
  /**
   * 设置缩放级别
   */
  setZoom(newScale) {
    this.scale = Math.max(this.minScale, Math.min(this.maxScale, newScale));
    this.applyZoom();
    return this.scale;
  }
  
  /**
   * 放大
   */
  zoomIn() {
    return this.setZoom(this.scale + this.scaleStep);
  }
  
  /**
   * 缩小
   */
  zoomOut() {
    return this.setZoom(this.scale - this.scaleStep);
  }
  
  /**
   * 重置缩放
   */
  zoomReset() {
    return this.setZoom(1.0);
  }
  
  /**
   * 获取当前缩放级别
   */
  getZoom() {
    return this.scale;
  }
}

