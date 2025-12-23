// State Manager for Mermaid Editor - 参考 PlantUML 实现

export type RenderState = 'idle' | 'rendering' | 'error';

export interface MermaidState {
  source: string;
  sourceDraft: string;
  loading: boolean;
  rendering: boolean;
  renderState: RenderState;
  error: string | null;
  saving: boolean;
  lastSavedSource: string | null;
  lastRenderedSource: string | null;
}

export type StateListener = (state: MermaidState) => void;
export type Unsubscribe = () => void;

export class StateManager {
  private source: string = "";
  private sourceDraft: string = "";
  private loading: boolean = true;
  private rendering: boolean = false;
  private renderState: RenderState = 'idle';
  private error: string | null = null;
  private saving: boolean = false;
  private lastSavedSource: string | null = null;
  private lastRenderedSource: string | null = null;
  
  // 监听器
  private listeners: Set<StateListener> = new Set();
  
  // 渲染防抖定时器
  private renderTimer: ReturnType<typeof setTimeout> | null = null;
  
  // Getter 方法供外部访问
  getSource(): string {
    return this.source;
  }
  
  getSourceDraft(): string {
    return this.sourceDraft;
  }
  
  getLastSavedSource(): string | null {
    return this.lastSavedSource;
  }
  
  getLastRenderedSource(): string | null {
    return this.lastRenderedSource;
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
  getState(): MermaidState {
    return {
      source: this.source,
      sourceDraft: this.sourceDraft,
      loading: this.loading,
      rendering: this.rendering,
      renderState: this.renderState,
      error: this.error,
      saving: this.saving,
      lastSavedSource: this.lastSavedSource,
      lastRenderedSource: this.lastRenderedSource,
    };
  }
  
  // 设置状态并通知
  setState(updates: Partial<MermaidState>): void {
    let changed = false;
    for (const [key, value] of Object.entries(updates)) {
      if (this[key as keyof MermaidState] !== value) {
        (this as any)[key] = value;
        changed = true;
      }
    }
    if (changed) {
      this.notify();
    }
  }
  
  // 清除渲染定时器
  clearRenderTimer(): void {
    if (this.renderTimer !== null) {
      clearTimeout(this.renderTimer);
      this.renderTimer = null;
    }
  }
  
  // 设置渲染定时器（防抖）
  setRenderTimer(callback: () => void, delay: number): void {
    this.clearRenderTimer();
    this.renderTimer = setTimeout(callback, delay);
  }
}

