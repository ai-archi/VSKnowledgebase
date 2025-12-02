// PlantUML Editor App
import './styles.css';
import { StateManager } from '../lib/StateManager.js';
import { postMessage, isVSCodeWebview } from '../lib/vscodeApi.js';
import { debounce } from '../lib/utils.js';

export class PlantUMLEditorApp {
  constructor() {
    this.stateManager = new StateManager();
    this.editor = null;
    this.sourceEditor = null;
    this.errorEl = null;
    this.divider = null;
    this.diagramContainer = null;
    this.currentSVG = null;
    
    // 缩放相关
    this.scale = 1.0;
    this.minScale = 0.1;
    this.maxScale = 5.0;
    this.scaleStep = 0.1;
    
    // 平移相关
    this.translateX = 0;
    this.translateY = 0;
    this.isDragging = false;
    this.isPanning = false; // 是否正在平移（用于区分拖动和点击）
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragStartTranslateX = 0;
    this.dragStartTranslateY = 0;
    this.dragThreshold = 5; // 拖动阈值（像素）
    
    // DOM 元素
    this.elements = {
      errorMessage: null,
      workspace: null,
      diagramPanel: null,
      diagramContainer: null,
      workspaceDivider: null,
      sourcePanel: null,
      sourceEditor: null,
      zoomIn: null,
      zoomOut: null,
      zoomReset: null,
    };
    
    this.init();
  }
  
  init() {
    // 获取 DOM 元素
    this.elements.errorMessage = document.getElementById('error-message');
    this.elements.workspace = document.getElementById('workspace');
    this.elements.diagramPanel = document.getElementById('diagram-panel');
    this.elements.diagramContainer = document.getElementById('diagram-container');
    this.elements.workspaceDivider = document.getElementById('workspace-divider');
    this.elements.sourcePanel = document.getElementById('source-panel');
    this.elements.sourceEditor = document.getElementById('source-editor');
    this.elements.zoomIn = document.getElementById('zoom-in');
    this.elements.zoomOut = document.getElementById('zoom-out');
    this.elements.zoomReset = document.getElementById('zoom-reset');
    
    // 初始化 CodeMirror（如果可用）
    if (window.CodeMirror) {
      this.editor = CodeMirror.fromTextArea(this.elements.sourceEditor, {
        mode: 'text/plain', // PlantUML 没有专门的 CodeMirror 模式，使用纯文本模式
        theme: 'default',
        lineNumbers: true,
        lineWrapping: true,
        indentUnit: 2,
        tabSize: 2,
      });
      
      // 监听编辑器变化
      this.editor.on('change', () => {
        const source = this.editor.getValue();
        this.stateManager.setState({ source });
        this.scheduleRender();
      });
    } else {
      // 回退到 textarea
      this.elements.sourceEditor.addEventListener('input', () => {
        const source = this.elements.sourceEditor.value;
        this.stateManager.setState({ source });
        this.scheduleRender();
      });
    }
    
    // 设置缩放控制
    this.setupZoomControls();
    
    // 设置消息回调
    if (isVSCodeWebview) {
      window.onSourceLoad = (source) => {
        this.loadSource(source);
      };
      
      window.onRenderResult = (svg) => {
        this.handleRenderResult(svg);
      };
      
      window.onRenderError = (error) => {
        this.handleRenderError(error);
      };
      
      window.onSaveSuccess = () => {
        this.handleSaveSuccess();
      };
      
      // 请求加载内容
      postMessage('load-request');
    }
    
    // 订阅状态变化
    this.stateManager.subscribe((state) => {
      this.updateUI(state);
    });
    
    // 初始化分隔条拖拽
    this.setupWorkspaceResizer();
  }
  
  loadSource(source) {
    if (this.editor) {
      this.editor.setValue(source);
    } else {
      this.elements.sourceEditor.value = source;
    }
    this.stateManager.setState({ source });
    this.scheduleRender();
  }
  
  scheduleRender() {
    const source = this.stateManager.source;
    if (!source || source.trim() === '') {
      return;
    }
    
    // 防抖：1秒后自动渲染
    this.stateManager.setRenderTimer(() => {
      this.render();
    }, 1000);
  }
  
  render() {
    const source = this.stateManager.source;
    if (!source || source.trim() === '') {
      this.showError('源代码为空');
      return;
    }
    
    // 如果内容没有变化，跳过渲染
    if (source === this.stateManager.lastRenderedSource) {
      return;
    }
    
    this.stateManager.setState({
      rendering: true,
      renderState: 'rendering',
      error: null
    });
    
    this.hideError();
    
    if (isVSCodeWebview) {
      postMessage('render', { source });
    } else {
      // 非 VSCode 环境，显示提示
      this.showError('请在 VSCode 扩展中使用此编辑器');
    }
  }
  
  handleRenderResult(svg) {
    this.stateManager.setState({
      rendering: false,
      renderState: 'idle',
      error: null,
      svg: svg,
      lastRenderedSource: this.stateManager.source
    });
    
    this.hideError();
    this.displaySVG(svg);
  }
  
  handleRenderError(error) {
    this.stateManager.setState({
      rendering: false,
      renderState: 'error',
      error: error
    });
    
    this.showError(error || '渲染失败，请检查源代码');
    this.clearPreview();
  }
  
  displaySVG(svg) {
    if (!this.elements.diagramContainer) {
      return;
    }
    
    // 设置 SVG 内容
    this.elements.diagramContainer.innerHTML = svg;
    
    // 获取 SVG 元素
    this.currentSVG = this.elements.diagramContainer.querySelector('svg');
    
    if (this.currentSVG) {
      // 应用当前缩放和平移
      this.applyZoom();
      
      // 设置鼠标滚轮缩放
      this.setupWheelZoom();
      
      // 设置画布拖动
      this.setupPan();
    }
  }
  
  clearPreview() {
    if (this.elements.diagramContainer) {
      this.elements.diagramContainer.innerHTML = '';
    }
    this.currentSVG = null;
  }
  
  save() {
    const source = this.stateManager.source;
    
    if (isVSCodeWebview) {
      postMessage('save', { source });
    } else {
      this.showError('请在 VSCode 扩展中使用此编辑器');
    }
  }
  
  handleSaveSuccess() {
    // 可以显示一个短暂的提示
    setTimeout(() => {
      // 提示已保存
    }, 2000);
  }
  
  showError(message) {
    if (this.elements.errorMessage) {
      this.elements.errorMessage.textContent = message;
      this.elements.errorMessage.style.display = 'block';
    }
  }
  
  hideError() {
    if (this.elements.errorMessage) {
      this.elements.errorMessage.textContent = '';
      this.elements.errorMessage.style.display = 'none';
    }
  }
  
  updateUI(state) {
    // 更新缩放按钮状态
    this.updateZoomButtons();
  }
  
  // 缩放功能
  setupZoomControls() {
    if (this.elements.zoomIn) {
      this.elements.zoomIn.addEventListener('click', () => {
        this.zoomIn();
        this.updateZoomButtons();
      });
    }
    
    if (this.elements.zoomOut) {
      this.elements.zoomOut.addEventListener('click', () => {
        this.zoomOut();
        this.updateZoomButtons();
      });
    }
    
    if (this.elements.zoomReset) {
      this.elements.zoomReset.addEventListener('click', () => {
        this.zoomReset();
        this.updateZoomButtons();
      });
    }
  }
  
  zoomIn() {
    return this.setZoom(this.scale + this.scaleStep);
  }
  
  zoomOut() {
    return this.setZoom(this.scale - this.scaleStep);
  }
  
  zoomReset() {
    return this.setZoom(1.0);
  }
  
  getZoom() {
    return this.scale;
  }
  
  setZoom(newScale) {
    this.scale = Math.max(this.minScale, Math.min(this.maxScale, newScale));
    this.applyZoom();
    return this.scale;
  }
  
  applyZoom() {
    if (!this.currentSVG) return;
    
    // 应用缩放和平移变换
    this.currentSVG.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
    
    // 更新 SVG 尺寸以触发正确的滚动
    const bbox = this.currentSVG.getBBox();
    if (bbox.width && bbox.height) {
      this.currentSVG.style.width = `${bbox.width * this.scale}px`;
      this.currentSVG.style.height = `${bbox.height * this.scale}px`;
    }
  }
  
  setupWheelZoom() {
    if (!this.elements.diagramContainer) return;
    
    // 移除旧的监听器（如果存在）
    if (this.wheelHandler) {
      this.elements.diagramContainer.removeEventListener('wheel', this.wheelHandler);
    }
    
    // 添加新的滚轮监听器
    this.wheelHandler = (e) => {
      // 如果按住 Ctrl 或 Cmd 键，进行缩放
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -this.scaleStep : this.scaleStep;
        this.setZoom(this.scale + delta);
        this.updateZoomButtons();
      }
    };
    
    this.elements.diagramContainer.addEventListener('wheel', this.wheelHandler, { passive: false });
  }
  
  updateZoomButtons() {
    const minScale = this.minScale;
    const maxScale = this.maxScale;
    const scale = this.scale;
    
    if (this.elements.zoomIn) {
      this.elements.zoomIn.disabled = scale >= maxScale;
    }
    
    if (this.elements.zoomOut) {
      this.elements.zoomOut.disabled = scale <= minScale;
    }
  }
  
  // 工作区调整大小
  setupWorkspaceResizer() {
    const workspace = this.elements.workspace;
    const divider = this.elements.workspaceDivider;
    const diagramPanel = this.elements.diagramPanel;
    const sourcePanel = this.elements.sourcePanel;
    
    if (!workspace || !divider || !diagramPanel || !sourcePanel) {
      return;
    }
    
    const minDiagramWidth = 320;
    const minSourceWidth = 240;
    const getDividerWidth = () => divider.getBoundingClientRect().width || 6;
    let isDragging = false;
    let startX = 0;
    let startDiagramWidth = 0;
    
    const onDrag = (event) => {
      if (!isDragging) return;
      const workspaceRect = workspace.getBoundingClientRect();
      const delta = event.clientX - startX;
      const dividerWidth = getDividerWidth();
      const maxDiagramWidth = workspaceRect.width - dividerWidth - minSourceWidth;
      let newDiagramWidth = startDiagramWidth + delta;
      newDiagramWidth = Math.max(minDiagramWidth, Math.min(maxDiagramWidth, newDiagramWidth));
      const newSourceWidth = workspaceRect.width - newDiagramWidth - dividerWidth;
      
      diagramPanel.style.flex = 'none';
      diagramPanel.style.width = `${newDiagramWidth}px`;
      sourcePanel.style.flex = 'none';
      sourcePanel.style.width = `${newSourceWidth}px`;
    };
    
    const stopDrag = () => {
      if (!isDragging) return;
      isDragging = false;
      workspace.classList.remove('resizing');
      document.removeEventListener('mousemove', onDrag);
      document.removeEventListener('mouseup', stopDrag);
    };
    
    const startDrag = (event) => {
      if (event.button !== 0) return;
      isDragging = true;
      startX = event.clientX;
      startDiagramWidth = diagramPanel.getBoundingClientRect().width;
      workspace.classList.add('resizing');
      document.addEventListener('mousemove', onDrag);
      document.addEventListener('mouseup', stopDrag);
      event.preventDefault();
    };
    
    divider.addEventListener('mousedown', startDrag);
    
    // 支持键盘调整（可选）
    divider.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const workspaceRect = workspace.getBoundingClientRect();
        const dividerWidth = getDividerWidth();
        const currentDiagramWidth = diagramPanel.getBoundingClientRect().width;
        const step = 20;
        const delta = event.key === 'ArrowLeft' ? -step : step;
        const newDiagramWidth = Math.max(
          minDiagramWidth,
          Math.min(
            workspaceRect.width - dividerWidth - minSourceWidth,
            currentDiagramWidth + delta
          )
        );
        const newSourceWidth = workspaceRect.width - newDiagramWidth - dividerWidth;
        
        diagramPanel.style.flex = 'none';
        diagramPanel.style.width = `${newDiagramWidth}px`;
        sourcePanel.style.flex = 'none';
        sourcePanel.style.width = `${newSourceWidth}px`;
      }
    });
  }
  
  /**
   * 设置画布拖动功能
   */
  setupPan() {
    if (!this.elements.diagramContainer) return;
    
    // 移除旧的监听器（如果存在）
    if (this.panMouseDownHandler) {
      this.elements.diagramContainer.removeEventListener('mousedown', this.panMouseDownHandler);
    }
    if (this.panMouseMoveHandler) {
      document.removeEventListener('mousemove', this.panMouseMoveHandler);
    }
    if (this.panMouseUpHandler) {
      document.removeEventListener('mouseup', this.panMouseUpHandler);
    }
    
    // 鼠标按下事件
    this.panMouseDownHandler = (e) => {
      // 如果点击的是 SVG 内的元素（不是背景），不处理拖动
      const target = e.target;
      if (target !== this.currentSVG && target.tagName !== 'svg' && target.parentElement !== this.currentSVG) {
        // 检查是否点击了 SVG 内的实际元素
        if (target.closest('svg') === this.currentSVG && target !== this.elements.diagramContainer) {
          return;
        }
      }
      
      // 如果点击的是 SVG 背景或容器，开始拖动
      if (target === this.currentSVG || 
          target === this.elements.diagramContainer || 
          target.tagName === 'svg') {
        // 检查是否按下了鼠标左键
        if (e.button === 0) {
          this.isDragging = true;
          this.dragStartX = e.clientX;
          this.dragStartY = e.clientY;
          this.dragStartTranslateX = this.translateX;
          this.dragStartTranslateY = this.translateY;
          
          // 添加拖动样式
          this.elements.diagramContainer.style.cursor = 'grabbing';
          if (this.currentSVG) {
            this.currentSVG.style.cursor = 'grabbing';
          }
          
          e.preventDefault();
        }
      }
    };
    
    // 鼠标移动事件
    this.panMouseMoveHandler = (e) => {
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
    this.panMouseUpHandler = (e) => {
      if (this.isDragging) {
        const wasPanning = this.isPanning;
        this.isDragging = false;
        this.isPanning = false;
        
        // 恢复光标样式
        this.elements.diagramContainer.style.cursor = 'grab';
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
    this.elements.diagramContainer.addEventListener('mousedown', this.panMouseDownHandler);
    document.addEventListener('mousemove', this.panMouseMoveHandler);
    document.addEventListener('mouseup', this.panMouseUpHandler);
  }
  
  /**
   * 重置平移
   */
  resetPan() {
    this.translateX = 0;
    this.translateY = 0;
    this.applyZoom();
  }
}

// 导出到全局
if (typeof window !== 'undefined') {
  window.PlantUMLEditorApp = PlantUMLEditorApp;
}
