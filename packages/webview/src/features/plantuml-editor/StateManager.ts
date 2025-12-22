// State Manager for PlantUML Editor

export type RenderState = 'idle' | 'rendering' | 'error';

export interface PlantUMLState {
  source: string;
  rendering: boolean;
  renderState: RenderState;
  error: string | null;
  svg: string | null;
  lastRenderedSource: string | null;
  lastSavedSource: string | null;
}

export type StateListener = (state: PlantUMLState) => void;
export type Unsubscribe = () => void;

export class StateManager {
  private source: string = "";
  private rendering: boolean = false;
  private renderState: RenderState = 'idle';
  private error: string | null = null;
  private svg: string | null = null;
  private lastRenderedSource: string | null = null;
  private lastSavedSource: string | null = null;
  
  // 监听器
  private listeners: Set<StateListener> = new Set();
  
  // 渲染防抖定时器
  private renderTimer: ReturnType<typeof setTimeout> | null = null;
  
  // Getter 方法供外部访问
  getSource(): string {
    return this.source;
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
  getState(): PlantUMLState {
    return {
      source: this.source,
      rendering: this.rendering,
      renderState: this.renderState,
      error: this.error,
      svg: this.svg,
      lastRenderedSource: this.lastRenderedSource,
      lastSavedSource: this.lastSavedSource,
    };
  }
  
  // 设置状态并通知
  setState(updates: Partial<PlantUMLState>): void {
    let changed = false;
    for (const [key, value] of Object.entries(updates)) {
      if (this[key as keyof PlantUMLState] !== value) {
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

