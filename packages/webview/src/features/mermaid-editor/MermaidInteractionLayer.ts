// Mermaid 交互层
// 处理节点/边的选择、点击等交互事件

import type { MermaidRenderer, NodeInfo, EdgeInfo } from './MermaidRenderer';

export interface InteractionCallbacks {
  onNodeSelect?: (nodeId: string, nodeInfo: NodeInfo | undefined, element: Element) => void;
  onEdgeSelect?: (edgeIndex: number, edgeInfo: EdgeInfo | undefined, element: Element) => void;
  onElementClick?: (type: string, id: string | number, element: Element) => void;
  onElementDblClick?: (type: 'node' | 'edge', id: string | number, element: Element) => void;
  onCanvasClick?: () => void;
  onCanvasDblClick?: (e: MouseEvent) => void;
  onNodeCtrlClick?: (nodeId: string, e: MouseEvent) => void;
  onMultiSelect?: (selection: { nodes: string[]; edges: number[] }) => void;
}

export class MermaidInteractionLayer {
  private renderer: MermaidRenderer;
  private callbacks: Required<InteractionCallbacks>;
  private selectedNodeId: string | null = null;
  private selectedEdgeIndex: number | null = null;
  private selectedNodeIds: Set<string> = new Set(); // 多选节点集合
  private selectedEdgeIndices: Set<number> = new Set(); // 多选边集合
  
  constructor(renderer: MermaidRenderer, callbacks: InteractionCallbacks = {}) {
    this.renderer = renderer;
    this.callbacks = {
      onNodeSelect: callbacks.onNodeSelect || (() => {}),
      onEdgeSelect: callbacks.onEdgeSelect || (() => {}),
      onElementClick: callbacks.onElementClick || (() => {}),
      onElementDblClick: callbacks.onElementDblClick || (() => {}),
      onCanvasClick: callbacks.onCanvasClick || (() => {}),
      onCanvasDblClick: callbacks.onCanvasDblClick || (() => {}),
      onNodeCtrlClick: callbacks.onNodeCtrlClick || (() => {}),
      onMultiSelect: callbacks.onMultiSelect || (() => {})
    };
    this.setup();
  }
  
  private setup(): void {
    const svg = this.renderer.getCurrentSVG();
    if (!svg) return;
    
    // 绑定点击事件
    svg.addEventListener('click', (e) => this.handleClick(e));
    svg.addEventListener('dblclick', (e) => this.handleDblClick(e));
    
    // 绑定画布双击事件
    svg.addEventListener('dblclick', (e) => {
      if (e.target === svg || (e.target as Element).tagName === 'svg') {
        this.callbacks.onCanvasDblClick(e);
      }
    });
  }
  
  /**
   * 处理点击事件
   */
  private handleClick(e: MouseEvent): void {
    const target = e.target as Element;
    
    // 检查是否点击了节点
    const nodeElement = target.closest('.node[data-mermaid-type="node"]');
    if (nodeElement) {
      const nodeId = nodeElement.getAttribute('data-node-id');
      if (!nodeId) return;
      
      // Ctrl/Cmd + 点击：多选或开始连接
      if (e.ctrlKey || e.metaKey) {
        // 如果按住 Shift，则多选
        if (e.shiftKey) {
          this.toggleNodeSelection(nodeId, nodeElement);
        } else {
          // Ctrl/Cmd 单独：开始连接
          this.callbacks.onNodeCtrlClick(nodeId, e);
        }
        e.stopPropagation();
        return;
      }
      
      // Shift + 点击：多选
      if (e.shiftKey) {
        this.toggleNodeSelection(nodeId, nodeElement);
        e.stopPropagation();
        return;
      }
      
      // 普通点击：单选
      this.selectNode(nodeId, nodeElement);
      e.stopPropagation();
      return;
    }
    
    // 检查是否点击了边
    const edgeElement = target.closest('.edgePath[data-mermaid-type="edge"]');
    if (edgeElement) {
      const edgeIndexAttr = edgeElement.getAttribute('data-edge-index');
      if (!edgeIndexAttr) return;
      const edgeIndex = parseInt(edgeIndexAttr);
      
      // Ctrl/Cmd 或 Shift + 点击：多选
      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        this.toggleEdgeSelection(edgeIndex, edgeElement);
      } else {
        // 普通点击：单选
        this.selectEdge(edgeIndex, edgeElement);
      }
      e.stopPropagation();
      return;
    }
    
    // 点击空白处，取消选择
    const svg = this.renderer.getCurrentSVG();
    if (target === svg || target.tagName === 'svg') {
      this.clearSelection();
      this.callbacks.onCanvasClick();
    }
  }
  
  /**
   * 处理双击事件
   */
  private handleDblClick(e: MouseEvent): void {
    const target = e.target as Element;
    
    const nodeElement = target.closest('.node[data-mermaid-type="node"]');
    if (nodeElement) {
      const nodeId = nodeElement.getAttribute('data-node-id');
      if (nodeId) {
        this.callbacks.onElementDblClick('node', nodeId, nodeElement);
        e.stopPropagation();
        return;
      }
    }
    
    const edgeElement = target.closest('.edgePath[data-mermaid-type="edge"]');
    if (edgeElement) {
      const edgeIndexAttr = edgeElement.getAttribute('data-edge-index');
      if (edgeIndexAttr) {
        const edgeIndex = parseInt(edgeIndexAttr);
        this.callbacks.onElementDblClick('edge', edgeIndex, edgeElement);
        e.stopPropagation();
        return;
      }
    }
  }
  
  /**
   * 选择节点（单选）
   */
  public selectNode(nodeId: string, element: Element): void {
    this.clearSelection();
    
    this.selectedNodeId = nodeId;
    this.selectedNodeIds.clear();
    this.selectedNodeIds.add(nodeId);
    this.renderer.highlightElement(element, 'node');
    this.renderer.showSelectionBox(element as SVGGElement);
    
    const nodeInfo = this.renderer.getNode(nodeId);
    this.callbacks.onNodeSelect(nodeId, nodeInfo, element);
  }
  
  /**
   * 切换节点选择（多选）
   */
  private toggleNodeSelection(nodeId: string, element: Element): void {
    if (this.selectedNodeIds.has(nodeId)) {
      // 取消选择
      this.selectedNodeIds.delete(nodeId);
      element.classList.remove('mermaid-selected-node');
      
      // 如果这是当前单选节点，清除单选状态
      if (this.selectedNodeId === nodeId) {
        this.selectedNodeId = null;
        this.renderer.hideSelectionBox();
      }
    } else {
      // 添加选择
      this.selectedNodeIds.add(nodeId);
      this.renderer.highlightElement(element, 'node');
      
      // 如果当前没有单选，设置这个为单选
      if (!this.selectedNodeId) {
        this.selectedNodeId = nodeId;
        this.renderer.showSelectionBox(element as SVGGElement);
      }
    }
    
    // 更新多选回调
    this.callbacks.onMultiSelect({
      nodes: Array.from(this.selectedNodeIds),
      edges: Array.from(this.selectedEdgeIndices)
    });
  }
  
  /**
   * 选择边（单选）
   */
  private selectEdge(edgeIndex: number, element: Element): void {
    this.clearSelection();
    
    this.selectedEdgeIndex = edgeIndex;
    this.selectedEdgeIndices.clear();
    this.selectedEdgeIndices.add(edgeIndex);
    this.renderer.highlightElement(element, 'edge');
    
    const edgeInfo = this.renderer.getEdge(edgeIndex);
    this.callbacks.onEdgeSelect(edgeIndex, edgeInfo, element);
  }
  
  /**
   * 切换边选择（多选）
   */
  private toggleEdgeSelection(edgeIndex: number, element: Element): void {
    if (this.selectedEdgeIndices.has(edgeIndex)) {
      // 取消选择
      this.selectedEdgeIndices.delete(edgeIndex);
      element.classList.remove('mermaid-selected-edge');
      
      // 如果这是当前单选边，清除单选状态
      if (this.selectedEdgeIndex === edgeIndex) {
        this.selectedEdgeIndex = null;
      }
    } else {
      // 添加选择
      this.selectedEdgeIndices.add(edgeIndex);
      this.renderer.highlightElement(element, 'edge');
      
      // 如果当前没有单选，设置这个为单选
      if (this.selectedEdgeIndex === null) {
        this.selectedEdgeIndex = edgeIndex;
      }
    }
    
    // 更新多选回调
    this.callbacks.onMultiSelect({
      nodes: Array.from(this.selectedNodeIds),
      edges: Array.from(this.selectedEdgeIndices)
    });
  }
  
  /**
   * 清除选择
   */
  clearSelection(): void {
    this.selectedNodeId = null;
    this.selectedEdgeIndex = null;
    this.selectedNodeIds.clear();
    this.selectedEdgeIndices.clear();
    this.renderer.clearHighlight();
    this.renderer.hideSelectionBox();
  }
  
  /**
   * 获取多选节点 ID 列表
   */
  getSelectedNodeIds(): string[] {
    return Array.from(this.selectedNodeIds);
  }
  
  /**
   * 获取多选边索引列表
   */
  getSelectedEdgeIndices(): number[] {
    return Array.from(this.selectedEdgeIndices);
  }
  
  /**
   * 获取所有选中的元素
   */
  getAllSelected(): { nodes: string[]; edges: number[] } {
    return {
      nodes: this.getSelectedNodeIds(),
      edges: this.getSelectedEdgeIndices()
    };
  }
  
  /**
   * 获取当前选中的节点 ID
   */
  getSelectedNodeId(): string | null {
    return this.selectedNodeId;
  }
  
  /**
   * 获取当前选中的边索引
   */
  getSelectedEdgeIndex(): number | null {
    return this.selectedEdgeIndex;
  }
  
  /**
   * 更新（当 SVG 重新渲染后调用）
   */
  update(): void {
    this.setup();
    
    // 恢复选择状态
    const svg = this.renderer.getCurrentSVG();
    if (!svg) return;
    
    // 恢复多选节点
    if (this.selectedNodeIds && this.selectedNodeIds.size > 0) {
      this.selectedNodeIds.forEach(nodeId => {
        const nodeElement = svg.querySelector(`[data-node-id="${nodeId}"]`);
        if (nodeElement) {
          this.renderer.highlightElement(nodeElement, 'node');
        }
      });
    }
    
    // 恢复单选节点
    if (this.selectedNodeId) {
      const nodeElement = svg.querySelector(`[data-node-id="${this.selectedNodeId}"]`);
      if (nodeElement) {
        this.renderer.highlightElement(nodeElement, 'node');
        this.renderer.showSelectionBox(nodeElement as SVGGElement);
      }
    }
    
    // 恢复多选边
    if (this.selectedEdgeIndices && this.selectedEdgeIndices.size > 0) {
      this.selectedEdgeIndices.forEach(edgeIndex => {
        const edgeElement = svg.querySelector(`[data-edge-index="${edgeIndex}"]`);
        if (edgeElement) {
          this.renderer.highlightElement(edgeElement, 'edge');
        }
      });
    }
    
    // 恢复单选边
    if (this.selectedEdgeIndex !== null) {
      const edgeElement = svg.querySelector(`[data-edge-index="${this.selectedEdgeIndex}"]`);
      if (edgeElement) {
        this.renderer.highlightElement(edgeElement, 'edge');
      }
    }
  }
}

