// Mermaid 节点连接器
// 实现拖拽方式连接节点

import type { MermaidRenderer, ExtendedSVGElement } from './MermaidRenderer';
import type { MermaidParser, ParsedEdge } from './MermaidParser';
import type { MermaidCodeGenerator } from './MermaidCodeGenerator';

export interface SVGPoint {
  x: number;
  y: number;
}

export class MermaidNodeConnector {
  private renderer: MermaidRenderer;
  private parser: MermaidParser;
  private codeGenerator: MermaidCodeGenerator;
  private connecting: boolean = false;
  private sourceNodeId: string | null = null;
  private connectionLine: SVGLineElement | null = null;
  public onConnectionCreated?: (newSource: string) => void;
  
  constructor(renderer: MermaidRenderer, parser: MermaidParser, codeGenerator: MermaidCodeGenerator) {
    this.renderer = renderer;
    this.parser = parser;
    this.codeGenerator = codeGenerator;
  }
  
  /**
   * 开始连接（从源节点开始）
   */
  startConnecting(sourceNodeId: string, e: MouseEvent): void {
    if (this.connecting) return;
    
    this.connecting = true;
    this.sourceNodeId = sourceNodeId;
    
    const svg = this.renderer.getCurrentSVG();
    if (!svg) return;
    
    const sourceNode = this.renderer.getNode(sourceNodeId);
    if (!sourceNode) return;
    
    // 创建连接线
    this.connectionLine = this.createConnectionLine(
      svg,
      sourceNode.x,
      sourceNode.y,
      e
    );
    
    // 绑定鼠标移动和释放事件
    const onMouseMove = (e: MouseEvent) => {
      this.updateConnectionLine(e);
    };
    
    const onMouseUp = (e: MouseEvent) => {
      this.completeConnection(e, onMouseMove, onMouseUp);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    
    // 阻止默认行为
    e.preventDefault();
    e.stopPropagation();
  }
  
  /**
   * 创建连接线
   */
  private createConnectionLine(svg: ExtendedSVGElement, startX: number, startY: number, e: MouseEvent): SVGLineElement {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('class', 'mermaid-connection-line');
    line.setAttribute('x1', startX.toString());
    line.setAttribute('y1', startY.toString());
    
    const svgPoint = this.getSVGPoint(svg, e.clientX, e.clientY);
    line.setAttribute('x2', svgPoint ? svgPoint.x.toString() : startX.toString());
    line.setAttribute('y2', svgPoint ? svgPoint.y.toString() : startY.toString());
    
    line.setAttribute('stroke', '#007bff');
    line.setAttribute('stroke-width', '3');
    line.setAttribute('stroke-dasharray', '8,4');
    line.setAttribute('marker-end', 'url(#arrow-end)');
    line.style.pointerEvents = 'none';
    line.style.opacity = '0.7';
    
    // 确保箭头标记存在
    this.ensureArrowMarker(svg);
    
    svg.appendChild(line);
    return line;
  }
  
  /**
   * 更新连接线
   */
  private updateConnectionLine(e: MouseEvent): void {
    if (!this.connectionLine) return;
    
    const svg = this.renderer.getCurrentSVG();
    if (!svg) return;
    
    const svgPoint = this.getSVGPoint(svg, e.clientX, e.clientY);
    if (svgPoint) {
      this.connectionLine.setAttribute('x2', svgPoint.x.toString());
      this.connectionLine.setAttribute('y2', svgPoint.y.toString());
    }
    
    // 高亮悬停的节点
    this.highlightHoverNode(e);
  }
  
  /**
   * 完成连接
   */
  private completeConnection(
    e: MouseEvent, 
    onMouseMove: (e: MouseEvent) => void, 
    onMouseUp: (e: MouseEvent) => void
  ): void {
    // 移除事件监听
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    
    // 移除连接线
    if (this.connectionLine) {
      const svg = this.renderer.getCurrentSVG();
      if (svg && svg.contains(this.connectionLine)) {
        svg.removeChild(this.connectionLine);
      }
      this.connectionLine = null;
    }
    
    // 清除高亮
    this.clearHoverHighlight();
    
    // 检查是否连接到目标节点
    const targetNodeId = this.getHoverNodeId(e);
    if (targetNodeId && targetNodeId !== this.sourceNodeId) {
      // 创建连接
      this.createConnection(this.sourceNodeId!, targetNodeId);
    }
    
    // 重置状态
    this.connecting = false;
    this.sourceNodeId = null;
  }
  
  /**
   * 创建连接（添加边）
   */
  private createConnection(fromNodeId: string, toNodeId: string): void {
    const source = this.renderer.getCurrentSource();
    const ast = this.parser.parse(source);
    
    // 检查边是否已存在
    const existingEdge = ast.edges.find(e => 
      e.from === fromNodeId && e.to === toNodeId
    );
    
    if (existingEdge) {
      // 边已存在，不重复添加
      return;
    }
    
    // 添加新边
    const newEdge: Omit<ParsedEdge, 'index' | 'lineNumber'> = {
      from: fromNodeId,
      to: toNodeId,
      label: '',
      type: 'arrow'
    };
    
    ast.edges.push({
      ...newEdge,
      index: ast.edges.length,
      lineNumber: -1
    });
    
    // 生成新代码
    const newSource = this.codeGenerator.generate(ast, source);
    
    // 触发回调
    if (this.onConnectionCreated) {
      this.onConnectionCreated(newSource);
    }
  }
  
  /**
   * 高亮悬停的节点
   */
  private highlightHoverNode(e: MouseEvent): void {
    const targetNodeId = this.getHoverNodeId(e);
    const svg = this.renderer.getCurrentSVG();
    if (!svg) return;
    
    // 清除之前的高亮
    this.clearHoverHighlight();
    
    if (targetNodeId && targetNodeId !== this.sourceNodeId) {
      const nodeElement = svg.querySelector(`[data-node-id="${targetNodeId}"]`);
      if (nodeElement) {
        nodeElement.classList.add('mermaid-hover-target');
      }
    }
  }
  
  /**
   * 清除悬停高亮
   */
  private clearHoverHighlight(): void {
    const svg = this.renderer.getCurrentSVG();
    if (!svg) return;
    
    svg.querySelectorAll('.mermaid-hover-target').forEach(el => {
      el.classList.remove('mermaid-hover-target');
    });
  }
  
  /**
   * 获取悬停的节点 ID
   */
  private getHoverNodeId(e: MouseEvent): string | null {
    const svg = this.renderer.getCurrentSVG();
    if (!svg) return null;
    
    const svgPoint = this.getSVGPoint(svg, e.clientX, e.clientY);
    if (!svgPoint) return null;
    
    // 检查所有节点
    const nodes = this.renderer.getAllNodes();
    for (const node of nodes) {
      const dx = svgPoint.x - node.x;
      const dy = svgPoint.y - node.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // 如果鼠标在节点范围内
      if (distance < Math.max(node.width, node.height) / 2 + 10) {
        return node.id;
      }
    }
    
    return null;
  }
  
  /**
   * 将屏幕坐标转换为 SVG 坐标
   */
  private getSVGPoint(svg: ExtendedSVGElement, clientX: number, clientY: number): SVGPoint | null {
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    return point.matrixTransform(ctm.inverse());
  }
  
  /**
   * 确保箭头标记存在
   */
  private ensureArrowMarker(svg: ExtendedSVGElement): void {
    let defs = svg.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      svg.insertBefore(defs, svg.firstChild);
    }
    
    // 检查箭头标记是否存在
    let arrowEnd = defs.querySelector('#arrow-end');
    if (!arrowEnd) {
      arrowEnd = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      arrowEnd.setAttribute('id', 'arrow-end');
      arrowEnd.setAttribute('markerWidth', '12');
      arrowEnd.setAttribute('markerHeight', '12');
      arrowEnd.setAttribute('refX', '10');
      arrowEnd.setAttribute('refY', '6');
      arrowEnd.setAttribute('orient', 'auto');
      arrowEnd.setAttribute('markerUnits', 'strokeWidth');
      
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M2,2 L10,6 L2,10 z');
      path.setAttribute('fill', '#007bff');
      arrowEnd.appendChild(path);
      
      defs.appendChild(arrowEnd);
    }
  }
  
  /**
   * 设置连接创建回调
   */
  setOnConnectionCreated(callback: (newSource: string) => void): void {
    this.onConnectionCreated = callback;
  }
}

