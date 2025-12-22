// State Manager - replaces React Hooks

import type { State, StateListener, Unsubscribe, Diagram, Node, Edge } from './types';

export class StateManager {
  private diagram: Diagram | null = null;
  private loading: boolean = true;
  private error: string | null = null;
  private saving: boolean = false;
  private source: string = "";
  private sourceDraft: string = "";
  private lastSavedSource: string | null = null; // 参考 PlantUML，跟踪已保存的内容
  private sourceSaving: boolean = false;
  private sourceError: string | null = null;
  private selectedNodeId: string | null = null;
  private selectedEdgeId: string | null = null;
  private imagePaddingValue: string = "";
  private dragging: boolean = false;
  
  // 监听器
  private listeners: Set<StateListener> = new Set();
  
  // 保存定时器
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  
  // 公共访问器方法
  getSource(): string {
    return this.source;
  }
  
  getSourceDraft(): string {
    return this.sourceDraft;
  }
  
  getLastSavedSource(): string | null {
    return this.lastSavedSource;
  }
  
  getDiagram(): Diagram | null {
    return this.diagram;
  }
  
  // 订阅状态变化
  subscribe(listener: StateListener): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  
  // 通知所有监听器
  notify(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getState());
      } catch (error) {
        console.error('State listener error:', error);
      }
    });
  }
  
  // 获取当前状态快照
  getState(): State {
    return {
      diagram: this.diagram,
      loading: this.loading,
      error: this.error,
      saving: this.saving,
      source: this.source,
      sourceDraft: this.sourceDraft,
      lastSavedSource: this.lastSavedSource,
      sourceSaving: this.sourceSaving,
      sourceError: this.sourceError,
      selectedNodeId: this.selectedNodeId,
      selectedEdgeId: this.selectedEdgeId,
      imagePaddingValue: this.imagePaddingValue,
      dragging: this.dragging,
    };
  }
  
  // 设置状态并通知
  setState(updates: Partial<State>): void {
    let changed = false;
    for (const [key, value] of Object.entries(updates)) {
      if (this[key as keyof State] !== value) {
        (this as any)[key] = value;
        changed = true;
      }
    }
    if (changed) {
      this.notify();
    }
  }
  
  // 获取选中的节点
  getSelectedNode(): Node | null {
    if (!this.diagram || !this.selectedNodeId) {
      return null;
    }
    return this.diagram.nodes.find(node => node.id === this.selectedNodeId) ?? null;
  }
  
  // 获取选中的边
  getSelectedEdge(): Edge | null {
    if (!this.diagram || !this.selectedEdgeId) {
      return null;
    }
    return this.diagram.edges.find(edge => edge.id === this.selectedEdgeId) ?? null;
  }
  
  // 检查是否有覆盖
  hasOverrides(): boolean {
    if (!this.diagram) {
      return false;
    }
    return (
      this.diagram.nodes.some(node => node.overridePosition) ||
      this.diagram.edges.some(edge => edge.overridePoints && edge.overridePoints.length > 0)
    );
  }
  
  // 清除保存定时器
  clearSaveTimer(): void {
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
  }
  
  // 设置保存定时器
  setSaveTimer(callback: () => void, delay: number): void {
    this.clearSaveTimer();
    this.saveTimer = setTimeout(callback, delay);
  }
}

