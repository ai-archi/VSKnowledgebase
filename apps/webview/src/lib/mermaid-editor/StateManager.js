// State Manager - replaces React Hooks

export class StateManager {
  constructor() {
    this.diagram = null;
    this.loading = true;
    this.error = null;
    this.saving = false;
    this.source = "";
    this.sourceDraft = "";
    this.sourceSaving = false;
    this.sourceError = null;
    this.selectedNodeId = null;
    this.selectedEdgeId = null;
    this.imagePaddingValue = "";
    this.dragging = false;
    
    // 监听器
    this.listeners = new Set();
    
    // 保存定时器
    this.saveTimer = null;
    this.lastSubmittedSource = null;
  }
  
  // 订阅状态变化
  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  
  // 通知所有监听器
  notify() {
    this.listeners.forEach(listener => {
      try {
        listener(this.getState());
      } catch (error) {
        console.error('State listener error:', error);
      }
    });
  }
  
  // 获取当前状态快照
  getState() {
    return {
      diagram: this.diagram,
      loading: this.loading,
      error: this.error,
      saving: this.saving,
      source: this.source,
      sourceDraft: this.sourceDraft,
      sourceSaving: this.sourceSaving,
      sourceError: this.sourceError,
      selectedNodeId: this.selectedNodeId,
      selectedEdgeId: this.selectedEdgeId,
      imagePaddingValue: this.imagePaddingValue,
      dragging: this.dragging,
    };
  }
  
  // 设置状态并通知
  setState(updates) {
    let changed = false;
    for (const [key, value] of Object.entries(updates)) {
      if (this[key] !== value) {
        this[key] = value;
        changed = true;
      }
    }
    if (changed) {
      this.notify();
    }
  }
  
  // 获取选中的节点
  getSelectedNode() {
    if (!this.diagram || !this.selectedNodeId) {
      return null;
    }
    return this.diagram.nodes.find(node => node.id === this.selectedNodeId) ?? null;
  }
  
  // 获取选中的边
  getSelectedEdge() {
    if (!this.diagram || !this.selectedEdgeId) {
      return null;
    }
    return this.diagram.edges.find(edge => edge.id === this.selectedEdgeId) ?? null;
  }
  
  // 检查是否有覆盖
  hasOverrides() {
    if (!this.diagram) {
      return false;
    }
    return (
      this.diagram.nodes.some(node => node.overridePosition) ||
      this.diagram.edges.some(edge => edge.overridePoints && edge.overridePoints.length > 0)
    );
  }
  
  // 清除保存定时器
  clearSaveTimer() {
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
  }
  
  // 设置保存定时器
  setSaveTimer(callback, delay) {
    this.clearSaveTimer();
    this.saveTimer = setTimeout(callback, delay);
  }
}

