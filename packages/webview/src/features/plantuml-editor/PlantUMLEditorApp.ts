/**
 * PlantUML Editor App - Vue 适配版
 * 适配 Vue 3 组件，接收 DOM 元素引用而非通过 getElementById 获取
 */
import { StateManager } from './StateManager.js';
import { postMessage, setupMessageHandlers, isVSCodeWebview } from './vscodeApiAdapter';
import CodeMirror from 'codemirror';

interface EditorElements {
  workspace: HTMLElement;
  diagramPanel: HTMLElement | null;
  diagramContainer: HTMLElement;
  sourceEditor: HTMLTextAreaElement;
  divider: HTMLElement | null;
  errorMessage: HTMLElement | null;
}

export class PlantUMLEditorApp {
  private stateManager: StateManager;
  private editor: any = null; // CodeMirror 实例
  private elements: EditorElements;
  private currentSVG: SVGElement | null = null;
  
  // 缩放相关
  private scale = 1.0;
  private minScale = 0.1;
  private maxScale = 5.0;
  private scaleStep = 0.1;
  
  // 平移相关
  private translateX = 0;
  private translateY = 0;
  private isDragging = false;
  private isPanning = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragStartTranslateX = 0;
  private dragStartTranslateY = 0;
  private dragThreshold = 5;
  
  // 回调函数
  public onError: ((error: string | null) => void) | null = null;
  public onZoomChange: ((canZoomIn: boolean, canZoomOut: boolean) => void) | null = null;
  
  // 事件处理器引用（用于清理）
  private wheelHandler: ((e: WheelEvent) => void) | null = null;
  private panMouseDownHandler: ((e: MouseEvent) => void) | null = null;
  private panMouseMoveHandler: ((e: MouseEvent) => void) | null = null;
  private panMouseUpHandler: ((e: MouseEvent) => void) | null = null;
  
  // 保存定时器（防抖）
  private saveTimer: NodeJS.Timeout | null = null;
  // 防止循环加载的标志
  private isSaving = false;
  // 是否已初始化完成
  private isInitialized = false;
  // 是否正在等待初始加载
  private isWaitingForInitialLoad = false;

  constructor(elements: EditorElements) {
    this.elements = elements;
    this.stateManager = new StateManager();
    this.init();
  }

  async init() {
    // 初始化 CodeMirror（如果可用）
    try {
      if (!this.elements.sourceEditor) {
        throw new Error('Source editor element not found');
      }

      this.editor = CodeMirror.fromTextArea(this.elements.sourceEditor, {
        mode: 'text/plain', // PlantUML 使用纯文本模式
        theme: 'default',
        lineNumbers: true,
        lineWrapping: true,
        indentUnit: 2,
        tabSize: 2,
        gutters: ['CodeMirror-linenumbers'],
        extraKeys: {
          // Cmd+S / Ctrl+S: 立即保存
          'Cmd-S': () => this.saveImmediately(),
          'Ctrl-S': () => this.saveImmediately(),
        },
      });
      
      // 样式由 CSS 文件统一管理，这里只刷新编辑器以确保样式正确应用

      this.editor.on('change', () => {
        const source = this.editor.getValue();
        this.stateManager.setState({ source });
        this.scheduleRender();
        this.scheduleSave(source);
      });

      // 确保行号正确渲染
      setTimeout(() => {
        if (this.editor) {
          this.editor.refresh();
          console.log('[PlantUMLEditorApp] CodeMirror initialized with forced styles');
        }
      }, 0);
    } catch (error) {
      // CodeMirror 不可用，回退到原生 textarea
      console.error('[PlantUMLEditorApp] CodeMirror initialization failed, falling back to native textarea:', error);
      if (this.elements.sourceEditor) {
        this.elements.sourceEditor.addEventListener('input', () => {
          const source = this.elements.sourceEditor.value;
          this.stateManager.setState({ source });
          this.scheduleRender();
          this.scheduleSave(source);
        });
        
        // 添加键盘快捷键监听（Cmd+S / Ctrl+S）
        this.elements.sourceEditor.addEventListener('keydown', (e: KeyboardEvent) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 's') {
            e.preventDefault();
            this.saveImmediately();
          }
        });
      }
    }
    
    // 设置消息回调
    if (isVSCodeWebview) {
      setupMessageHandlers({
        onSourceLoad: (source) => {
          // 如果正在保存，忽略加载请求（防止循环）
          if (this.isSaving) return;
          this.loadSource(source);
        },
        onRenderResult: (svg) => this.handleRenderResult(svg),
        onRenderError: (error) => this.handleRenderError(error),
        onSaveSuccess: () => this.handleSaveSuccess(),
      });
      
      // 延迟请求加载内容，确保 Vue 应用完全初始化
      // 使用 requestAnimationFrame 和 setTimeout 确保 DOM 完全准备好
      requestAnimationFrame(() => {
        setTimeout(() => {
          this.isInitialized = true;
          this.isWaitingForInitialLoad = true;
          console.log('[PlantUMLEditorApp] Requesting initial content...');
          postMessage('load-request');
          
          // 设置超时，如果 5 秒内没有收到响应，显示警告
          setTimeout(() => {
            if (this.isWaitingForInitialLoad) {
              console.warn('[PlantUMLEditorApp] Initial load timeout, content may not be loaded');
              this.isWaitingForInitialLoad = false;
            }
          }, 5000);
        }, 100);
      });
    }
    
    // 订阅状态变化
    this.stateManager.subscribe((state) => {
      this.updateUI(state);
    });
    
    // 初始化分隔条拖拽
    this.setupWorkspaceResizer();
  }

  destroy() {
    // 清理事件监听器
    if (this.wheelHandler && this.elements.diagramContainer) {
      this.elements.diagramContainer.removeEventListener('wheel', this.wheelHandler);
    }
    
    if (this.panMouseDownHandler && this.elements.diagramContainer) {
      this.elements.diagramContainer.removeEventListener('mousedown', this.panMouseDownHandler);
    }
    
    if (this.panMouseMoveHandler) {
      document.removeEventListener('mousemove', this.panMouseMoveHandler);
    }
    
    if (this.panMouseUpHandler) {
      document.removeEventListener('mouseup', this.panMouseUpHandler);
    }
    
    // 清理保存定时器
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    
    // 清理 CodeMirror
    if (this.editor) {
      this.editor.toTextArea();
      this.editor = null;
    }
    
    // 清理状态管理器
    this.stateManager.clearRenderTimer();
  }

  loadSource(source: string) {
    // 标记已收到初始加载响应
    const wasWaitingForInitialLoad = this.isWaitingForInitialLoad;
    if (this.isWaitingForInitialLoad) {
      this.isWaitingForInitialLoad = false;
      console.log('[PlantUMLEditorApp] Initial content loaded, source length:', source.length);
    }
    
    // 获取当前编辑器内容
    const currentSource = this.editor ? this.editor.getValue() : 
                        (this.elements.sourceEditor ? this.elements.sourceEditor.value : '');
    
    // 判断是否是首次加载
    const isInitialLoad = this.stateManager.lastSavedSource === null;
    
    // 如果内容没有变化，不更新编辑器（避免触发 change 事件和循环加载）
    if (currentSource === source) {
      // 内容相同，只更新状态，不更新编辑器
      this.stateManager.setState({ source });
      // 如果是首次加载，设置 lastSavedSource
      if (isInitialLoad) {
        this.stateManager.lastSavedSource = source;
      }
      // 如果是首次加载且内容不为空，立即触发渲染（不使用防抖）
      if (wasWaitingForInitialLoad && source && source.trim() !== '' && 
          this.stateManager.lastRenderedSource === null) {
        console.log('[PlantUMLEditorApp] Triggering initial render for loaded content (same source)');
        this.render();
      }
      return;
    }
    
    // 内容不同，更新编辑器
    if (this.editor) {
      this.editor.setValue(source);
    } else if (this.elements.sourceEditor) {
      this.elements.sourceEditor.value = source;
    }
    this.stateManager.setState({ source });
    // 如果是首次加载，设置 lastSavedSource
    if (isInitialLoad) {
      this.stateManager.lastSavedSource = source;
    }
    
    // 如果是首次加载且内容不为空，立即触发渲染（不使用防抖）
    if (wasWaitingForInitialLoad && source && source.trim() !== '') {
      console.log('[PlantUMLEditorApp] Triggering initial render immediately (different source)');
      this.render();
    } else {
      // 其他情况使用防抖
      this.scheduleRender();
    }
  }

  scheduleRender() {
    const source = this.stateManager.source;
    if (!source || source.trim() === '') {
      return;
    }
    
    // 增加防抖延迟到 1.5 秒，减少不必要的渲染请求
    this.stateManager.setRenderTimer(() => {
      this.render();
    }, 1500);
  }

  scheduleSave(source: string) {
    if (!source || source.trim() === '') {
      return;
    }
    
    // 清除之前的保存定时器
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    
    // 设置新的保存定时器（防抖：1秒后自动保存）
    this.saveTimer = setTimeout(() => {
      this.save();
      this.saveTimer = null;
    }, 1000);
  }

  render() {
    const source = this.stateManager.source;
    console.log('[PlantUMLEditorApp] render() called, source length:', source?.length || 0);
    
    if (!source || source.trim() === '') {
      console.warn('[PlantUMLEditorApp] Source is empty, showing error');
      this.showError('源代码为空');
      return;
    }
    
    if (source === this.stateManager.lastRenderedSource) {
      console.log('[PlantUMLEditorApp] Source unchanged, skipping render');
      return;
    }
    
    console.log('[PlantUMLEditorApp] Starting render, source:', source.substring(0, 100) + '...');
    
    this.stateManager.setState({
      rendering: true,
      renderState: 'rendering',
      error: null
    });
    
    this.hideError();
    
    if (isVSCodeWebview) {
      console.log('[PlantUMLEditorApp] Sending render request to backend');
      postMessage('render', { source }).catch((error) => {
        console.error('[PlantUMLEditorApp] Error sending render request:', error);
        this.showError(`发送渲染请求失败: ${error.message}`);
      });
    } else {
      this.showError('请在 VSCode 扩展中使用此编辑器');
    }
  }

  handleRenderResult(svg: string) {
    console.log('[PlantUMLEditorApp] handleRenderResult called, SVG length:', svg?.length || 0);
    
    if (!svg || svg.trim() === '') {
      console.error('[PlantUMLEditorApp] Received empty SVG');
      this.handleRenderError('收到空的 SVG 结果');
      return;
    }
    
    this.stateManager.setState({
      rendering: false,
      renderState: 'idle',
      error: null,
      svg: svg,
      lastRenderedSource: this.stateManager.source
    });
    
    this.hideError();
    console.log('[PlantUMLEditorApp] Displaying SVG');
    this.displaySVG(svg);
  }

  handleRenderError(error: string) {
    console.error('[PlantUMLEditorApp] handleRenderError called:', error);
    
    this.stateManager.setState({
      rendering: false,
      renderState: 'error',
      error: error
    });
    
    this.showError(error || '渲染失败，请检查源代码');
    this.clearPreview();
  }

  displaySVG(svg: string) {
    console.log('[PlantUMLEditorApp] displaySVG called');
    
    if (!this.elements.diagramContainer) {
      console.error('[PlantUMLEditorApp] diagramContainer is null');
      return;
    }
    
    console.log('[PlantUMLEditorApp] Clearing diagram container');
    // 清空容器
    this.elements.diagramContainer.innerHTML = '';
    
    // 解析并注入 SVG（直接添加到容器，不使用包装器，因为 CSS 会隐藏非 SVG 元素）
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = svg;
    const svgElement = tempDiv.querySelector('svg');
    
    if (svgElement) {
      console.log('[PlantUMLEditorApp] SVG element found, appending to container');
      console.log('[PlantUMLEditorApp] SVG element dimensions:', {
        width: svgElement.getAttribute('width'),
        height: svgElement.getAttribute('height'),
        viewBox: svgElement.getAttribute('viewBox')
      });
      
      // 设置 SVG 样式以确保正确显示
      // CSS 已经设置了 .diagram-container svg 的样式，这里只需要确保 SVG 可见
      svgElement.style.display = 'block';
      svgElement.style.maxWidth = '100%';
      svgElement.style.maxHeight = '100%';
      svgElement.style.width = 'auto';
      svgElement.style.height = 'auto';
      svgElement.style.margin = 'auto';
      svgElement.style.cursor = 'grab';
      svgElement.style.visibility = 'visible';
      svgElement.style.opacity = '1';
      
      // 直接添加到容器（不使用包装器，因为 CSS 会隐藏非 SVG 元素）
      this.elements.diagramContainer.appendChild(svgElement);
      
      this.currentSVG = svgElement;
      
      // 重置缩放和平移，使图表居中显示
      this.scale = 1.0;
      this.translateX = 0;
      this.translateY = 0;
      
      this.applyZoom();
      this.setupWheelZoom();
      this.setupPan();
      
      // 验证 SVG 是否真的被添加到 DOM
      const addedSvg = this.elements.diagramContainer.querySelector('svg');
      if (addedSvg) {
        console.log('[PlantUMLEditorApp] SVG successfully added to DOM');
        console.log('[PlantUMLEditorApp] Container dimensions:', {
          width: this.elements.diagramContainer.offsetWidth,
          height: this.elements.diagramContainer.offsetHeight,
          clientWidth: this.elements.diagramContainer.clientWidth,
          clientHeight: this.elements.diagramContainer.clientHeight
        });
        console.log('[PlantUMLEditorApp] SVG dimensions:', {
          offsetWidth: addedSvg.offsetWidth,
          offsetHeight: addedSvg.offsetHeight,
          clientWidth: addedSvg.clientWidth,
          clientHeight: addedSvg.clientHeight
        });
      } else {
        console.error('[PlantUMLEditorApp] SVG was not added to DOM!');
      }
    } else {
      console.error('[PlantUMLEditorApp] No SVG element found in response:', svg.substring(0, 200));
      this.showError('SVG 解析失败：未找到 SVG 元素');
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
    
    // 如果内容没有变化，不保存（避免触发重新加载）
    if (source === this.stateManager.lastSavedSource) {
      return;
    }
    
    this.isSaving = true;
    if (isVSCodeWebview) {
      postMessage('save', { source });
      // 设置超时，防止保存失败时标志未重置（5秒超时）
      setTimeout(() => {
        if (this.isSaving) {
          console.warn('[PlantUMLEditorApp] Save timeout, resetting isSaving flag');
          this.isSaving = false;
        }
      }, 5000);
    } else {
      this.showError('请在 VSCode 扩展中使用此编辑器');
      this.isSaving = false;
    }
  }

  /**
   * 立即保存（用于快捷键触发）
   * 清除防抖定时器并立即保存
   */
  saveImmediately() {
    // 清除保存定时器
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    
    // 获取最新的源码（从编辑器或状态管理器）
    let source: string;
    if (this.editor) {
      source = this.editor.getValue();
    } else if (this.elements.sourceEditor) {
      source = this.elements.sourceEditor.value;
    } else {
      source = this.stateManager.source;
    }
    
    // 如果内容没有变化，不保存（避免触发重新加载）
    if (source === this.stateManager.lastSavedSource) {
      return;
    }
    
    // 更新状态
    if (source !== this.stateManager.source) {
      this.stateManager.setState({ source });
    }
    
    // 立即保存
    this.isSaving = true;
    if (isVSCodeWebview) {
      postMessage('save', { source });
      // 设置超时，防止保存失败时标志未重置（5秒超时）
      setTimeout(() => {
        if (this.isSaving) {
          console.warn('[PlantUMLEditorApp] Save timeout, resetting isSaving flag');
          this.isSaving = false;
        }
      }, 5000);
    } else {
      this.showError('请在 VSCode 扩展中使用此编辑器');
      this.isSaving = false;
    }
  }

  handleSaveSuccess() {
    // 保存成功，记录已保存的内容并重置标志
    this.stateManager.lastSavedSource = this.stateManager.source;
    this.isSaving = false;
  }

  showError(message: string) {
    if (this.onError) {
      this.onError(message);
    }
  }

  hideError() {
    if (this.onError) {
      this.onError(null);
    }
  }

  updateUI(state: any) {
    this.updateZoomButtons();
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

  setZoom(newScale: number) {
    this.scale = Math.max(this.minScale, Math.min(this.maxScale, newScale));
    this.applyZoom();
    this.updateZoomButtons();
    return this.scale;
  }

  applyZoom() {
    if (!this.currentSVG) return;
    
    // 使用 transform 进行缩放和平移，保持居中
    this.currentSVG.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
    this.currentSVG.style.transformOrigin = 'center center';
    
    // 不修改 SVG 的 width 和 height，让 CSS 的 max-width/max-height 控制大小
    // 这样可以保持 SVG 的原始比例和居中显示
  }

  setupWheelZoom() {
    if (!this.elements.diagramContainer) return;
    
    if (this.wheelHandler) {
      this.elements.diagramContainer.removeEventListener('wheel', this.wheelHandler);
    }
    
    this.wheelHandler = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -this.scaleStep : this.scaleStep;
        this.setZoom(this.scale + delta);
      }
    };
    
    this.elements.diagramContainer.addEventListener('wheel', this.wheelHandler, { passive: false });
  }

  updateZoomButtons() {
    const canZoomIn = this.scale < this.maxScale;
    const canZoomOut = this.scale > this.minScale;
    
    if (this.onZoomChange) {
      this.onZoomChange(canZoomIn, canZoomOut);
    }
  }

  setupWorkspaceResizer() {
    const workspace = this.elements.workspace;
    const divider = this.elements.divider;
    const diagramPanel = this.elements.diagramPanel;
    const sourcePanel = this.elements.sourceEditor.closest('.source-panel') as HTMLElement || this.elements.sourceEditor.parentElement as HTMLElement;
    
    if (!workspace || !divider || !diagramPanel || !sourcePanel) {
      console.warn('[PlantUMLEditorApp] setupWorkspaceResizer: Missing elements', {
        workspace: !!workspace,
        divider: !!divider,
        diagramPanel: !!diagramPanel,
        sourcePanel: !!sourcePanel
      });
      return;
    }
    
    // 源码面板样式由 CSS 文件统一管理，这里只做验证
    if (sourcePanel) {
      console.log('[PlantUMLEditorApp] Source panel found:', {
        width: sourcePanel.style.width || 'from CSS',
        display: sourcePanel.style.display || 'from CSS',
        visibility: sourcePanel.style.visibility || 'from CSS'
      });
    }
    
    const minDiagramWidth = 320;
    const minSourceWidth = 240;
    const getDividerWidth = () => divider.getBoundingClientRect().width || 6;
    let isDragging = false;
    let startX = 0;
    let startDiagramWidth = 0;
    
    const onDrag = (event: MouseEvent) => {
      if (!isDragging) return;
      const workspaceRect = workspace.getBoundingClientRect();
      const delta = event.clientX - startX;
      const dividerWidth = getDividerWidth();
      const maxDiagramWidth = workspaceRect.width - dividerWidth - minSourceWidth;
      let newDiagramWidth = startDiagramWidth + delta;
      newDiagramWidth = Math.max(minDiagramWidth, Math.min(maxDiagramWidth, newDiagramWidth));
      const newSourceWidth = workspaceRect.width - newDiagramWidth - dividerWidth;
      
      // 使用内联样式覆盖 CSS，确保拖拽时宽度可以改变
      diagramPanel.style.cssText = `flex: none !important; width: ${newDiagramWidth}px !important;`;
      (sourcePanel as HTMLElement).style.cssText = `flex: none !important; width: ${Math.max(minSourceWidth, newSourceWidth)}px !important; min-width: ${minSourceWidth}px !important; display: flex !important; visibility: visible !important;`;
      
      // 刷新 CodeMirror 编辑器以更新布局
      if (this.editor && typeof this.editor.refresh === 'function') {
        this.editor.refresh();
      }
    };
    
    const stopDrag = () => {
      if (!isDragging) return;
      isDragging = false;
      workspace.classList.remove('resizing');
      document.removeEventListener('mousemove', onDrag);
      document.removeEventListener('mouseup', stopDrag);
      
      // 拖拽结束后刷新 CodeMirror 编辑器以确保布局正确
      if (this.editor && typeof this.editor.refresh === 'function') {
        // 使用 requestAnimationFrame 确保 DOM 更新完成后再刷新
        requestAnimationFrame(() => {
          this.editor.refresh();
        });
      }
    };
    
    const startDrag = (event: MouseEvent) => {
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
    
    // 支持键盘调整
    divider.addEventListener('keydown', (event: KeyboardEvent) => {
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
        
        // 使用内联样式覆盖 CSS，确保键盘调整时宽度可以改变
        diagramPanel.style.cssText = `flex: none !important; width: ${newDiagramWidth}px !important;`;
        (sourcePanel as HTMLElement).style.cssText = `flex: none !important; width: ${Math.max(minSourceWidth, newSourceWidth)}px !important; min-width: ${minSourceWidth}px !important; display: flex !important; visibility: visible !important;`;
        
        // 键盘调整后刷新 CodeMirror 编辑器
        if (this.editor && typeof this.editor.refresh === 'function') {
          requestAnimationFrame(() => {
            this.editor.refresh();
          });
        }
      }
    });
  }

  startResize(e: MouseEvent) {
    // 这个方法由 Vue 组件调用，实际逻辑在 setupWorkspaceResizer 中
  }

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
    this.panMouseDownHandler = (e: MouseEvent) => {
      // 只处理鼠标左键
      if (e.button !== 0) return;
      
      // 如果按住了修饰键（Ctrl/Cmd/Shift），不处理拖拽（可能用于其他操作）
      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        return;
      }
      
      const target = e.target as HTMLElement;
      
      // 检查是否点击了可交互的元素（如文本、链接等），如果是则不拖拽
      // 但允许在 SVG 背景、容器或空白区域拖拽
      const isInteractiveElement = target.closest('a, button, input, textarea, select') ||
                                   target.isContentEditable ||
                                   target.tagName === 'text' ||
                                   target.tagName === 'tspan';
      
      if (isInteractiveElement) {
        return;
      }
      
      // 允许在以下位置开始拖拽：
      // 1. 容器本身
      // 2. SVG 元素
      // 3. SVG 内的空白区域（g 元素、背景等）
      const canDrag = target === this.elements.diagramContainer ||
                      target === this.currentSVG ||
                      target.tagName === 'svg' ||
                      (target.closest('svg') === this.currentSVG && 
                       (target.tagName === 'g' || target.tagName === 'rect' || target === this.currentSVG));
      
      if (canDrag) {
        this.isDragging = true;
        this.isPanning = false; // 重置平移状态
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.dragStartTranslateX = this.translateX;
        this.dragStartTranslateY = this.translateY;
        
        // 更新光标样式
        this.elements.diagramContainer.style.cursor = 'grabbing';
        if (this.currentSVG) {
          this.currentSVG.style.cursor = 'grabbing';
        }
        
        // 阻止默认行为，防止文本选择
        e.preventDefault();
        e.stopPropagation();
      }
    };
    
    // 鼠标移动事件
    this.panMouseMoveHandler = (e: MouseEvent) => {
      if (!this.isDragging) return;
      
      const deltaX = e.clientX - this.dragStartX;
      const deltaY = e.clientY - this.dragStartY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      // 如果移动距离超过阈值，开始平移
      if (distance > this.dragThreshold) {
        this.isPanning = true;
      }
      
      // 一旦开始平移，就持续更新位置
      if (this.isPanning) {
        this.translateX = this.dragStartTranslateX + deltaX;
        this.translateY = this.dragStartTranslateY + deltaY;
        
        this.applyZoom();
        
        // 阻止默认行为，防止文本选择或页面滚动
        e.preventDefault();
        e.stopPropagation();
      }
    };
    
    // 鼠标释放事件
    this.panMouseUpHandler = (e: MouseEvent) => {
      if (this.isDragging) {
        const wasPanning = this.isPanning;
        this.isDragging = false;
        this.isPanning = false;
        
        // 恢复光标样式
        this.elements.diagramContainer.style.cursor = 'grab';
        if (this.currentSVG) {
          this.currentSVG.style.cursor = 'grab';
        }
        
        // 如果进行了平移，阻止后续的点击事件
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

  resetPan() {
    this.translateX = 0;
    this.translateY = 0;
    this.applyZoom();
  }
}

