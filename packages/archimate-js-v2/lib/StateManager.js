// State Manager - 状态管理器

export class StateManager {
  constructor() {
    this.source = "";
    this.error = null;
    this.saving = false;
    
    // 监听器
    this.listeners = new Set();
    
    // 渲染定时器
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
      error: this.error,
      saving: this.saving,
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
  
  // 设置渲染定时器
  setRenderTimer(callback, delay) {
    this.clearRenderTimer();
    this.renderTimer = setTimeout(callback, delay);
  }
}

