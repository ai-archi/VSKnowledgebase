// State Manager for PlantUML Editor

export class StateManager {
  constructor() {
    this.source = "";
    this.rendering = false;
    this.renderState = 'idle'; // idle, rendering, error
    this.error = null;
    this.svg = null;
    this.lastRenderedSource = null;
    this.lastSavedSource = null; // 记录最后保存的内容，用于防止重复保存
    
    // 监听器
    this.listeners = new Set();
    
    // 渲染防抖定时器
    this.renderTimer = null;
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
      source: this.source,
      rendering: this.rendering,
      renderState: this.renderState,
      error: this.error,
      svg: this.svg,
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
  
  // 清除渲染定时器
  clearRenderTimer() {
    if (this.renderTimer !== null) {
      clearTimeout(this.renderTimer);
      this.renderTimer = null;
    }
  }
  
  // 设置渲染定时器（防抖）
  setRenderTimer(callback, delay) {
    this.clearRenderTimer();
    this.renderTimer = setTimeout(callback, delay);
  }
}

