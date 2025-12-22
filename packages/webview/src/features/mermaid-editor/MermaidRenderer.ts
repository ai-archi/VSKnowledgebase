// Mermaid.js 渲染器和增强层
// 负责使用 mermaid.js 渲染图表，并添加交互功能

import mermaid from 'mermaid';
import zenuml from '@mermaid-js/mermaid-zenuml';

export interface NodeInfo {
  id: string;
  element: SVGGElement;
  bbox: DOMRect;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EdgeInfo {
  index: number;
  element: SVGElement;
  path: SVGPathElement;
  pathData: string | null;
  label: string;
}

export interface ExtendedSVGElement extends SVGSVGElement {
  _selectionBox?: SVGRectElement;
}

export class MermaidRenderer {
  public container: HTMLElement; // 改为 public，供外部访问
  private currentSVG: ExtendedSVGElement | null = null;
  private currentSource: string = '';
  private nodeMap: Map<string, NodeInfo> = new Map();
  private edgeMap: Map<number, EdgeInfo> = new Map();
  
  // 缩放相关
  private scale: number = 1.0;
  public minScale: number = 0.1; // 改为 public，供外部访问
  public maxScale: number = 5.0; // 改为 public，供外部访问
  private scaleStep: number = 0.1;
  
  // 平移相关
  private translateX: number = 0;
  private translateY: number = 0;
  private isDragging: boolean = false;
  private isPanning: boolean = false; // 是否正在平移（用于区分拖动和点击）
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private dragStartTranslateX: number = 0;
  private dragStartTranslateY: number = 0;
  private dragThreshold: number = 5; // 拖动阈值（像素）
  
  // 事件处理器引用（用于清理）
  private wheelHandler: ((e: WheelEvent) => void) | null = null;
  private panMouseDownHandler: ((e: MouseEvent) => void) | null = null;
  private panMouseMoveHandler: ((e: MouseEvent) => void) | null = null;
  private panMouseUpHandler: ((e: MouseEvent) => void) | null = null;
  
  constructor(container: HTMLElement) {
    this.container = container;
    this.init();
  }
  
  /**
   * 检测当前 VSCode 主题（dark 或 light）
   * 通过检查背景色的亮度来判断
   */
  private detectVSCodeTheme(): 'dark' | 'light' {
    if (typeof document === 'undefined') {
      return 'dark'; // 默认返回 dark
    }
    
    // 获取 VSCode 背景色
    const root = document.documentElement;
    const bgColor = getComputedStyle(root).getPropertyValue('--vscode-editor-background').trim();
    
    // 如果没有设置，使用默认值
    if (!bgColor || bgColor === '') {
      return 'dark'; // 默认 dark 主题
    }
    
    // 解析颜色值（支持 hex、rgb、rgba）
    let r: number, g: number, b: number;
    
    if (bgColor.startsWith('#')) {
      // Hex 格式：#1e1e1e 或 #fff
      const hex = bgColor.slice(1);
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else {
        r = parseInt(hex.slice(0, 2), 16);
        g = parseInt(hex.slice(2, 4), 16);
        b = parseInt(hex.slice(4, 6), 16);
      }
    } else if (bgColor.startsWith('rgb')) {
      // RGB 或 RGBA 格式：rgb(30, 30, 30) 或 rgba(30, 30, 30, 1)
      const match = bgColor.match(/\d+/g);
      if (match && match.length >= 3) {
        r = parseInt(match[0], 10);
        g = parseInt(match[1], 10);
        b = parseInt(match[2], 10);
      } else {
        return 'dark'; // 解析失败，默认 dark
      }
    } else {
      return 'dark'; // 未知格式，默认 dark
    }
    
    // 计算亮度（使用相对亮度公式）
    // L = 0.2126 * R + 0.7152 * G + 0.0722 * B
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    
    // 如果亮度小于 0.5，认为是 dark 主题；否则是 light 主题
    return luminance < 0.5 ? 'dark' : 'light';
  }
  
  async init(): Promise<void> {
    // 注册 ZenUML 外部图表类型
    try {
      await mermaid.registerExternalDiagrams([zenuml]);
    } catch (error) {
      console.warn('Failed to register ZenUML diagram type:', error);
    }
    
    // 检测 VSCode 主题
    const vsTheme = this.detectVSCodeTheme();
    
    // 根据 VSCode 主题设置 Mermaid 主题
    // dark 主题使用 'dark'，light 主题使用 'base'
    const mermaidTheme = vsTheme === 'dark' ? 'dark' : 'base';
    
    // 初始化 mermaid
    mermaid.initialize({
      startOnLoad: false,
      theme: mermaidTheme,
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
  async render(source: string): Promise<ExtendedSVGElement> {
    try {
      this.currentSource = source;
      
      // 渲染前清理 body 中可能存在的错误 div
      this.cleanupMermaidErrorDivs();
      
      // 使用 mermaid 渲染（在清空容器之前先渲染，减少空白期）
      const id = `mermaid-${Date.now()}`;
      const { svg } = await mermaid.render(id, source);
      
      // 渲染后立即清理 body 中可能被追加的错误 div（Mermaid 可能在渲染过程中追加）
      this.cleanupMermaidErrorDivs();
      
      // 检查 SVG 是否包含错误信息
      if (this.isErrorSVG(svg)) {
        // 如果是错误 SVG，淡出旧内容后清空容器并抛出错误
        const oldSVG = this.container.querySelector('svg');
        if (oldSVG) {
          oldSVG.style.transition = 'opacity 0.1s ease-out';
          oldSVG.style.opacity = '0';
          setTimeout(() => {
            this.container.innerHTML = '';
          }, 100);
        } else {
          this.container.innerHTML = '';
        }
        // 再次清理，确保 body 中没有残留的错误 div
        this.cleanupMermaidErrorDivs();
        throw new Error('Mermaid syntax error detected');
      }
      
      // 解析 SVG（Mermaid 11.x 可能会返回包含 div 包装器的 HTML）
      let svgElement: SVGSVGElement | null = null;
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = svg;
      
      // 移除容器内 Mermaid 自动添加的 div 包装器（id="dmermaid-xxxx"）
      const dmermaidDiv = tempDiv.querySelector('div[id^="dmermaid-"]');
      if (dmermaidDiv) {
        // 提取内部的 SVG 元素
        svgElement = dmermaidDiv.querySelector('svg');
      } else {
        // 如果没有包装器，直接获取 SVG
        svgElement = tempDiv.querySelector('svg');
      }
      
      if (!svgElement) {
        throw new Error('Failed to extract SVG from mermaid render result');
      }
      
      // 使用 requestAnimationFrame 确保平滑过渡，避免闪烁
      await new Promise(resolve => requestAnimationFrame(resolve));
      
      // 获取旧 SVG（如果存在）
      const oldSVG = this.container.querySelector('svg');
      
      // 先添加新 SVG（设置为透明），避免容器空白导致的闪烁
      svgElement.style.opacity = '0';
      svgElement.style.transition = 'opacity 0.15s ease-in';
      this.container.appendChild(svgElement);
      
      // 再次清理 body（防止异步追加）
      this.cleanupMermaidErrorDivs();
      
      this.currentSVG = svgElement as ExtendedSVGElement;
      
      // 后处理增强
      this.enhanceSVG(this.currentSVG);
      
      // 应用当前缩放和平移（在增强之后）
      this.applyZoom();
      
      // 使用 requestAnimationFrame 确保新 SVG 已添加到 DOM
      await new Promise(resolve => requestAnimationFrame(resolve));
      
      // 淡出旧 SVG（如果存在）
      if (oldSVG && oldSVG !== svgElement) {
        oldSVG.style.transition = 'opacity 0.1s ease-out';
        oldSVG.style.opacity = '0';
        // 等待淡出完成后再移除，避免闪烁
        setTimeout(() => {
          if (oldSVG.parentNode && oldSVG !== this.currentSVG) {
            oldSVG.parentNode.removeChild(oldSVG);
          }
        }, 100);
      }
      
      // 淡入新 SVG
      await new Promise(resolve => requestAnimationFrame(resolve));
      this.currentSVG.style.opacity = '1';
      
      // 淡入完成后移除 transition，避免影响后续操作
      setTimeout(() => {
        if (this.currentSVG) {
          this.currentSVG.style.transition = '';
        }
      }, 150);
      
      // 设置事件监听器（方法内部会处理重复调用的情况）
      this.setupWheelZoom();
      this.setupPan();
      
      return this.currentSVG;
    } catch (error) {
      console.error('Mermaid render error:', error);
      // 错误时清理 body 中的错误 div
      this.cleanupMermaidErrorDivs();
      // 淡出旧内容后清空容器
      const oldSVG = this.container.querySelector('svg');
      if (oldSVG) {
        oldSVG.style.transition = 'opacity 0.1s ease-out';
        oldSVG.style.opacity = '0';
        setTimeout(() => {
          this.container.innerHTML = '';
        }, 100);
      } else {
        this.container.innerHTML = '';
      }
      throw error;
    }
  }
  
  /**
   * 清理 body 中 Mermaid 自动添加的错误 div
   * Mermaid 在渲染错误时会在 body 下追加 div#dmermaid-xxxx
   * 这是 Mermaid 的默认错误处理行为，我们需要主动清理
   */
  private cleanupMermaidErrorDivs(): void {
    if (typeof document === 'undefined' || !document.body) {
      return;
    }
    
    // 查找所有 id 以 "dmermaid-" 开头的 div
    const errorDivs = document.body.querySelectorAll('div[id^="dmermaid-"]');
    errorDivs.forEach(div => {
      // 检查是否是错误 div（包含错误 SVG 或错误文本）
      const hasErrorSVG = div.querySelector('svg[aria-roledescription="error"]');
      const hasErrorIcon = div.querySelector('.error-icon');
      const hasErrorText = div.querySelector('.error-text');
      const textContent = div.textContent || '';
      const isErrorDiv = hasErrorSVG || hasErrorIcon || hasErrorText || 
                         textContent.includes('Syntax error') || 
                         textContent.includes('mermaid version');
      
      if (isErrorDiv) {
        div.remove();
      }
    });
  }
  
  /**
   * 检查 SVG 是否包含错误信息
   */
  private isErrorSVG(svgString: string): boolean {
    if (!svgString || typeof svgString !== 'string') {
      return false;
    }
    
    // 检查是否包含错误相关的标识
    const errorIndicators = [
      'aria-roledescription="error"',
      'class="error-icon"',
      'class="error-text"',
      'Syntax error in text',
      'mermaid version'
    ];
    
    // 如果包含任何错误标识，认为是错误 SVG
    return errorIndicators.some(indicator => svgString.includes(indicator));
  }

  /**
   * 增强 SVG，添加交互功能
   */
  private enhanceSVG(svg: ExtendedSVGElement): void {
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
  private addDataAttributes(svg: ExtendedSVGElement): void {
    // 为节点添加 data-node-id
    svg.querySelectorAll('.node').forEach((nodeGroup, index) => {
      const nodeId = this.extractNodeId(nodeGroup as SVGGElement, index);
      nodeGroup.setAttribute('data-node-id', nodeId);
      nodeGroup.setAttribute('data-mermaid-type', 'node');
    });
    
    // 为边添加 data-edge-index
    svg.querySelectorAll('.edgePath').forEach((path, index) => {
      path.setAttribute('data-edge-index', index.toString());
      path.setAttribute('data-mermaid-type', 'edge');
    });
    
    // 为子图添加标识
    svg.querySelectorAll('.cluster').forEach((cluster, index) => {
      cluster.setAttribute('data-subgraph-index', index.toString());
      cluster.setAttribute('data-mermaid-type', 'subgraph');
    });
  }
  
  /**
   * 提取节点 ID
   */
  private extractNodeId(nodeGroup: SVGGElement, fallbackIndex: number): string {
    // 方法1: 从文本内容推断（如果文本就是 ID）
    const textEl = nodeGroup.querySelector('text');
    if (textEl) {
      const text = textEl.textContent?.trim() || '';
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
  private addInteractionLayer(svg: ExtendedSVGElement): void {
    // 为节点添加交互样式
    svg.querySelectorAll('.node').forEach(node => {
      (node as HTMLElement).style.cursor = 'pointer';
      node.setAttribute('data-interactive', 'true');
    });
    
    // 为边添加交互样式
    svg.querySelectorAll('.edgePath').forEach(edge => {
      (edge as HTMLElement).style.cursor = 'pointer';
      edge.setAttribute('data-interactive', 'true');
      
      // 增加边的点击区域（通过 stroke-width）
      const path = edge.querySelector('path');
      if (path) {
        const currentWidth = path.getAttribute('stroke-width') || '2';
        path.setAttribute('stroke-width', Math.max(parseFloat(currentWidth), 4).toString());
        path.setAttribute('data-original-stroke-width', currentWidth);
      }
    });
    
    // 为子图添加交互样式
    svg.querySelectorAll('.cluster').forEach(cluster => {
      (cluster as HTMLElement).style.cursor = 'pointer';
      cluster.setAttribute('data-interactive', 'true');
    });
  }
  
  /**
   * 添加选择框元素
   */
  private addSelectionBox(svg: ExtendedSVGElement): void {
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
  private extractNodeEdgeMap(svg: ExtendedSVGElement): void {
    this.nodeMap.clear();
    this.edgeMap.clear();
    
    // 提取节点映射
    svg.querySelectorAll('.node').forEach(nodeGroup => {
      const nodeId = nodeGroup.getAttribute('data-node-id');
      if (nodeId) {
        const bbox = (nodeGroup as SVGGElement).getBBox();
        const textEl = nodeGroup.querySelector('text');
        
        this.nodeMap.set(nodeId, {
          id: nodeId,
          element: nodeGroup as SVGGElement,
          bbox: bbox,
          label: textEl ? (textEl.textContent?.trim() || '') : '',
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
          element: edgePath as SVGElement,
          path: path,
          pathData: pathData,
          label: labelEl ? (labelEl.textContent?.trim() || '') : ''
        });
      }
    });
  }
  
  /**
   * 获取节点信息
   */
  getNode(nodeId: string): NodeInfo | undefined {
    return this.nodeMap.get(nodeId);
  }
  
  /**
   * 获取所有节点
   */
  getAllNodes(): NodeInfo[] {
    return Array.from(this.nodeMap.values());
  }
  
  /**
   * 获取边信息
   */
  getEdge(index: number): EdgeInfo | undefined {
    return this.edgeMap.get(index);
  }
  
  /**
   * 获取所有边
   */
  getAllEdges(): EdgeInfo[] {
    return Array.from(this.edgeMap.values());
  }
  
  /**
   * 高亮元素
   */
  highlightElement(element: Element, type: 'node' | 'edge'): void {
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
  clearHighlight(): void {
    if (this.currentSVG) {
      this.currentSVG.querySelectorAll('.mermaid-selected-node, .mermaid-selected-edge').forEach(el => {
        el.classList.remove('mermaid-selected-node', 'mermaid-selected-edge');
      });
    }
  }
  
  /**
   * 显示选择框
   */
  showSelectionBox(element: SVGGElement): void {
    if (!this.currentSVG || !this.currentSVG._selectionBox) return;
    
    const bbox = element.getBBox();
    const selectionBox = this.currentSVG._selectionBox;
    
    selectionBox.setAttribute('x', (bbox.x - 4).toString());
    selectionBox.setAttribute('y', (bbox.y - 4).toString());
    selectionBox.setAttribute('width', (bbox.width + 8).toString());
    selectionBox.setAttribute('height', (bbox.height + 8).toString());
    selectionBox.style.display = 'block';
  }
  
  /**
   * 隐藏选择框
   */
  hideSelectionBox(): void {
    if (this.currentSVG && this.currentSVG._selectionBox) {
      this.currentSVG._selectionBox.style.display = 'none';
    }
  }
  
  /**
   * 获取当前源代码
   */
  getCurrentSource(): string {
    return this.currentSource;
  }
  
  /**
   * 获取当前 SVG
   */
  getCurrentSVG(): ExtendedSVGElement | null {
    return this.currentSVG;
  }
  
  /**
   * 设置鼠标滚轮缩放
   */
  setupWheelZoom(): void {
    if (!this.container) return;
    
    // 移除旧的监听器（如果存在）
    if (this.wheelHandler) {
      this.container.removeEventListener('wheel', this.wheelHandler);
    }
    
    // 添加新的滚轮监听器
    this.wheelHandler = (e: WheelEvent) => {
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
   * 应用缩放和平移
   */
  applyZoom(): void {
    if (!this.currentSVG) return;
    
    // 获取原始尺寸
    const originalWidth = this.currentSVG.getAttribute('width') || 
                         (this.currentSVG.viewBox?.baseVal?.width || this.currentSVG.clientWidth);
    const originalHeight = this.currentSVG.getAttribute('height') || 
                          (this.currentSVG.viewBox?.baseVal?.height || this.currentSVG.clientHeight);
    
    // 应用缩放和平移变换
    this.currentSVG.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
    
    // 更新 SVG 尺寸以触发正确的滚动
    if (originalWidth && originalHeight) {
      this.currentSVG.style.width = `${Number(originalWidth) * this.scale}px`;
      this.currentSVG.style.height = `${Number(originalHeight) * this.scale}px`;
    }
  }
  
  /**
   * 设置缩放级别
   */
  setZoom(newScale: number): number {
    this.scale = Math.max(this.minScale, Math.min(this.maxScale, newScale));
    this.applyZoom();
    return this.scale;
  }
  
  /**
   * 放大
   */
  zoomIn(): number {
    return this.setZoom(this.scale + this.scaleStep);
  }
  
  /**
   * 缩小
   */
  zoomOut(): number {
    return this.setZoom(this.scale - this.scaleStep);
  }
  
  /**
   * 重置缩放
   */
  zoomReset(): number {
    return this.setZoom(1.0);
  }
  
  /**
   * 获取当前缩放级别
   */
  getZoom(): number {
    return this.scale;
  }
  
  /**
   * 设置画布拖动功能
   */
  setupPan(): void {
    if (!this.container) return;
    
    // 移除旧的监听器（如果存在）
    if (this.panMouseDownHandler) {
      this.container.removeEventListener('mousedown', this.panMouseDownHandler);
    }
    if (this.panMouseMoveHandler) {
      document.removeEventListener('mousemove', this.panMouseMoveHandler);
    }
    if (this.panMouseUpHandler) {
      document.removeEventListener('mouseup', this.panMouseUpHandler);
    }
    
    // 鼠标按下事件
    this.panMouseDownHandler = (e: MouseEvent) => {
      // 如果点击的是交互元素（节点、边等），不处理拖动
      const target = e.target as Element;
      if (target.closest('.node[data-mermaid-type="node"]') ||
          target.closest('.edgePath[data-mermaid-type="edge"]') ||
          target.closest('.cluster[data-mermaid-type="subgraph"]') ||
          target.closest('.mermaid-selection-box') ||
          target.closest('.mermaid-label-editor')) {
        return;
      }
      
      // 如果点击的是 SVG 背景或容器，开始拖动
      if (target === this.currentSVG || 
          target === this.container || 
          target.tagName === 'svg' ||
          (target.tagName === 'g' && !target.closest('.node, .edgePath, .cluster'))) {
        // 检查是否按下了鼠标左键
        if (e.button === 0) {
          this.isDragging = true;
          this.dragStartX = e.clientX;
          this.dragStartY = e.clientY;
          this.dragStartTranslateX = this.translateX;
          this.dragStartTranslateY = this.translateY;
          
          // 添加拖动样式
          this.container.style.cursor = 'grabbing';
          if (this.currentSVG) {
            this.currentSVG.style.cursor = 'grabbing';
          }
          
          e.preventDefault();
        }
      }
    };
    
    // 鼠标移动事件
    this.panMouseMoveHandler = (e: MouseEvent) => {
      if (!this.isDragging) return;
      
      const deltaX = e.clientX - this.dragStartX;
      const deltaY = e.clientY - this.dragStartY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      // 如果移动距离超过阈值，认为是拖动
      if (distance > this.dragThreshold) {
        this.isPanning = true;
      }
      
      if (this.isPanning) {
        this.translateX = this.dragStartTranslateX + deltaX;
        this.translateY = this.dragStartTranslateY + deltaY;
        
        this.applyZoom();
        
        e.preventDefault();
      }
    };
    
    // 鼠标释放事件
    this.panMouseUpHandler = (e: MouseEvent) => {
      if (this.isDragging) {
        const wasPanning = this.isPanning;
        this.isDragging = false;
        this.isPanning = false;
        
        // 恢复光标样式
        this.container.style.cursor = 'grab';
        if (this.currentSVG) {
          this.currentSVG.style.cursor = 'default';
        }
        
        // 如果进行了拖动，阻止后续的点击事件
        if (wasPanning) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    
    // 绑定事件监听器
    this.container.addEventListener('mousedown', this.panMouseDownHandler);
    document.addEventListener('mousemove', this.panMouseMoveHandler);
    document.addEventListener('mouseup', this.panMouseUpHandler);
  }
  
  /**
   * 重置平移
   */
  resetPan(): void {
    this.translateX = 0;
    this.translateY = 0;
    this.applyZoom();
  }
}

