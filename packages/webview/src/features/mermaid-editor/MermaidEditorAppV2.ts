/**
 * Mermaid Editor App V2 - Vue 适配版
 * 适配 Vue 3 组件，接收 DOM 元素引用而非通过 getElementById 获取
 */
import { StateManager, type MermaidState } from './StateManager';
import { MermaidRenderer } from './MermaidRenderer';
import CodeMirror from 'codemirror';
import {
  saveDiagram,
  loadMermaid,
  renderMermaid,
} from './ideApiAdapter';
import { extensionService } from '@/services/ExtensionService';

interface EditorElements {
  workspace: HTMLElement;
  diagramPanel: HTMLElement | null;
  diagramContainer: HTMLElement;
  sourceEditor: HTMLTextAreaElement;
  divider: HTMLElement | null;
  onError?: (error: string | null) => void;
  zoomIn?: HTMLElement | null;
  zoomOut?: HTMLElement | null;
  zoomReset?: HTMLElement | null;
}

export class MermaidEditorAppV2 {
  private stateManager: StateManager;
  private renderer: MermaidRenderer | null = null;
  private editor: any = null; // CodeMirror 实例
  
  private elements: EditorElements;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private isSaving = false;
  private boundHandleKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private isSettingValue = false; // 标志：是否正在通过 setValue 设置值，防止触发 change 事件
  private isWaitingForInitialLoad = false; // 是否正在等待初始加载
  private renderTimer: ReturnType<typeof setTimeout> | null = null; // 渲染定时器
  
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
  
  // 事件处理器引用（用于清理）
  private wheelHandler: ((e: WheelEvent) => void) | null = null;
  private panMouseDownHandler: ((e: MouseEvent) => void) | null = null;
  private panMouseMoveHandler: ((e: MouseEvent) => void) | null = null;
  private panMouseUpHandler: ((e: MouseEvent) => void) | null = null;

  constructor(elements: EditorElements) {
    this.elements = elements;
    this.stateManager = new StateManager();
    this.init();
  }

  async init() {
    // 初始化 mermaid 渲染器
    this.renderer = new MermaidRenderer(this.elements.diagramContainer);
    
    // 初始化 CodeMirror（如果可用）
    try {
      if (!this.elements.sourceEditor) {
        throw new Error('Source editor element not found');
      }

      this.editor = CodeMirror.fromTextArea(this.elements.sourceEditor, {
        mode: 'text/plain', // Mermaid 使用纯文本模式（与 PlantUML 保持一致）
        theme: 'default',
        lineNumbers: true,
        lineWrapping: true,
        indentUnit: 2,
        tabSize: 2,
        gutters: ['CodeMirror-linenumbers'],
        extraKeys: {
          // Cmd+S / Ctrl+S: 立即保存
          'Cmd-S': () => {
            this.saveImmediately();
          },
          'Ctrl-S': () => {
            this.saveImmediately();
          },
        },
      });
      
      // 样式由 CSS 文件统一管理，这里只刷新编辑器以确保样式正确应用

      this.editor.on('change', () => {
        // 如果正在通过 setValue 设置值，不触发渲染和保存（避免循环和重复渲染）
        if (this.isSettingValue) {
          return;
        }
        const source = this.editor.getValue();
        this.stateManager.setState({ source });
        this.scheduleRender();
        this.scheduleSave(source);
      });

      // 确保行号正确渲染
      setTimeout(() => {
        if (this.editor) {
          this.editor.refresh();
          console.log('[MermaidEditorAppV2] CodeMirror initialized');
        }
      }, 0);
    } catch (error) {
      // CodeMirror 不可用，回退到原生 textarea
      console.error('[MermaidEditorAppV2] CodeMirror initialization failed, falling back to native textarea:', error);
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
    
    // 订阅状态变化
    this.stateManager.subscribe((state) => this.onStateChange(state));
    
    this.setupEventListeners();
    this.setupWorkspaceResizer();
    
    // 设置 IDE 消息监听（通过 ExtensionService）
    // ExtensionService 已经监听了 window.addEventListener('message')
    // 监听源码加载事件
    extensionService.on('load', (data: { source?: string; diagram?: any }) => {
      if (this.isSaving) return;
      // 兼容新旧格式：新格式是 { source: string }，旧格式是 { diagram: { source: string } }
      if (data?.source !== undefined) {
        this.handleSourceLoad(data.source);
      } else if (data?.diagram) {
        // 兼容旧格式
        const source = data.diagram?.source || '';
        this.handleSourceLoad(source);
      }
    });
    
    // 监听渲染结果事件（前端渲染，这里只用于确认）
    extensionService.on('render-result', (_data: any) => {
      console.log('[MermaidEditorAppV2] Received render-result confirmation');
    });
    
    // 监听保存成功事件（与 PlantUML 保持一致）
    extensionService.on('save-success', () => {
      this.handleSaveSuccess();
    });
    
    // 加载初始图表
    this.loadDiagram();
  }

  setupEventListeners() {
    // 键盘快捷键
    if (!this.boundHandleKeyDown) {
      this.boundHandleKeyDown = this.handleKeyDown.bind(this);
      window.addEventListener('keydown', this.boundHandleKeyDown);
    }
    
    // 缩放控制按钮
    if (this.elements.zoomIn) {
      this.elements.zoomIn.addEventListener('click', () => {
        this.zoomIn();
      });
    }
    
    if (this.elements.zoomOut) {
      this.elements.zoomOut.addEventListener('click', () => {
        this.zoomOut();
      });
    }
    
    if (this.elements.zoomReset) {
      this.elements.zoomReset.addEventListener('click', () => {
        this.zoomReset();
      });
    }
  }

  /**
   * 更新缩放按钮状态
   */
  updateZoomButtons() {
    const canZoomIn = this.scale < this.maxScale;
    const canZoomOut = this.scale > this.minScale;
    
    if (this.elements.zoomIn) {
      (this.elements.zoomIn as HTMLButtonElement).disabled = !canZoomIn;
    }
    
    if (this.elements.zoomOut) {
      (this.elements.zoomOut as HTMLButtonElement).disabled = !canZoomOut;
    }
  }

  handleKeyDown(event: KeyboardEvent) {
    // 处理 Cmd+S / Ctrl+S 保存快捷键
    if ((event.metaKey || event.ctrlKey) && event.key === 's') {
      event.preventDefault();
      // 清除保存定时器（与 PlantUML 的 saveImmediately 保持一致）
      if (this.saveTimer) {
        clearTimeout(this.saveTimer);
        this.saveTimer = null;
      }
      
      // 获取最新的源码（优先从编辑器获取，确保获取最新内容）
      const source = this.editor ? this.editor.getValue() : this.elements.sourceEditor.value;
      
      // 如果内容为空，不保存
      if (!source || source.trim() === '') {
        console.log('[MermaidEditorAppV2] handleKeyDown: source is empty, skipping save');
        return;
      }
      
      // 更新状态（确保状态与编辑器内容一致）
      // 注意：只更新 source，不更新 sourceDraft，让 handleSaveSuccess 中的渲染能正确触发
      // 因为 renderDiagram 会检查 sourceDraft 来判断是否需要渲染
      if (source !== this.stateManager.getSource()) {
        this.stateManager.setState({ source });
      }
      
      console.log('[MermaidEditorAppV2] handleKeyDown: cmd+s pressed, calling saveSource', {
        sourceLength: source.length,
        lastSavedSourceLength: this.stateManager.getLastSavedSource()?.length || 0
      });
      
      // 立即保存（不使用防抖，与 PlantUML 的 saveImmediately 保持一致）
      this.saveSource(source);
    }
  }

  setupWorkspaceResizer() {
    const workspace = this.elements.workspace;
    const divider = this.elements.divider;
    const diagramPanel = this.elements.diagramPanel;
    const sourcePanel = this.elements.sourceEditor.closest('.source-panel') as HTMLElement;
    
    if (!workspace || !divider || !diagramPanel || !sourcePanel) {
      console.warn('[MermaidEditorAppV2] setupWorkspaceResizer: Missing elements', {
        workspace: !!workspace,
        divider: !!divider,
        diagramPanel: !!diagramPanel,
        sourcePanel: !!sourcePanel
      });
      return;
    }
    
    // 源码面板样式由 CSS 文件统一管理，这里只做验证
    if (sourcePanel) {
      console.log('[MermaidEditorAppV2] Source panel found:', {
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
      sourcePanel.style.cssText = `flex: none !important; width: ${Math.max(minSourceWidth, newSourceWidth)}px !important; min-width: ${minSourceWidth}px !important; display: flex !important; visibility: visible !important;`;
      
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
          this.editor?.refresh();
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
    divider.addEventListener('dragstart', (event) => event.preventDefault());
  }

  async loadDiagram() {
    try {
      this.stateManager.setState({ loading: true });
      // 请求加载源码（参考 PlantUML 的方式）
      await loadMermaid();
      // 源码会通过 'load' 事件推送，不需要在这里处理
    } catch (error: any) {
      console.error('Load diagram error:', error);
      this.stateManager.setState({
        loading: false,
        error: error.message || '加载图表失败'
      });
      this.isWaitingForInitialLoad = false;
    }
  }
  
  handleSourceLoad(source: string) {
    // 参考 PlantUML 的 loadSource 逻辑，保持一致
    const wasWaitingForInitialLoad = this.isWaitingForInitialLoad;
    if (this.isWaitingForInitialLoad) {
      this.isWaitingForInitialLoad = false;
      console.log('[MermaidEditorAppV2] Initial content loaded, source length:', source.length);
    }
    
    // 获取当前编辑器内容（参考 PlantUML 的方式）
    const currentSource = this.editor ? this.editor.getValue() : 
                        (this.elements.sourceEditor ? this.elements.sourceEditor.value : '');
    
    // 判断是否是首次加载（参考 PlantUML，使用 lastSavedSource 判断）
    const isInitialLoad = this.stateManager.getLastSavedSource() === null;
    
    // 如果内容没有变化，不更新编辑器（避免触发 change 事件和循环加载）
    // 参考 PlantUML 的方式
    if (currentSource === source) {
      // 内容相同，只更新状态，不更新编辑器
      this.stateManager.setState({ source, loading: false, error: null });
      // 如果是首次加载，设置 sourceDraft 和 lastSavedSource
      if (isInitialLoad) {
        this.stateManager.setState({ sourceDraft: source, lastSavedSource: source });
      }
      // 如果是首次加载且内容不为空，立即触发渲染（不使用防抖）
      if (wasWaitingForInitialLoad && source && source.trim() !== '' && 
          this.stateManager.getSourceDraft() === '') {
        console.log('[MermaidEditorAppV2] Triggering initial render for loaded content (same source)');
        this.renderDiagram(source);
      }
      return;
    }
    
    // 内容不同，更新编辑器（参考 PlantUML 的方式）
    this.isSettingValue = true; // 设置标志，防止触发 change 事件
    try {
      if (this.editor) {
        this.editor.setValue(source);
      } else if (this.elements.sourceEditor) {
        this.elements.sourceEditor.value = source;
      }
      this.stateManager.setState({ source, loading: false, error: null });
      // 如果是首次加载，设置 sourceDraft 和 lastSavedSource
      if (isInitialLoad) {
        this.stateManager.setState({ sourceDraft: source, lastSavedSource: source });
      }
    } finally {
      // 使用 setTimeout 确保 change 事件已经处理完毕
      setTimeout(() => {
        this.isSettingValue = false;
      }, 0);
    }
    
    // 如果是首次加载且内容不为空，立即触发渲染（不使用防抖）
    if (wasWaitingForInitialLoad && source && source.trim() !== '') {
      console.log('[MermaidEditorAppV2] Triggering initial render immediately (different source)');
      this.renderDiagram(source);
    } else {
      // 其他情况使用防抖
      this.scheduleRender(source);
    }
  }
  
  scheduleRender(source?: string) {
    // 参考 PlantUML 的方式：如果没有提供 source，从状态管理器获取
    const renderSource = source || this.stateManager.getSource();
    if (!renderSource || renderSource.trim() === '') {
      return;
    }
    
    // 清除之前的渲染定时器
    if (this.renderTimer) {
      clearTimeout(this.renderTimer);
    }
    
    // 设置新的渲染定时器（防抖：500ms后自动渲染）
    // Mermaid 是前端渲染，比 PlantUML 的后端渲染快，所以可以使用更短的延迟
    this.renderTimer = setTimeout(() => {
      // 从状态管理器获取最新的 source，确保使用最新值
      const latestSource = this.stateManager.getSource();
      if (latestSource && latestSource.trim() !== '') {
        this.renderDiagram(latestSource);
      }
      this.renderTimer = null;
    }, 500);
  }

  scheduleSave(source: string) {
    // 参考 PlantUML 的 scheduleSave 方式
    if (!source || source.trim() === '') {
      return;
    }
    
    // 清除之前的保存定时器
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    
    // 设置新的保存定时器（防抖：1秒后自动保存，参考 PlantUML）
    this.saveTimer = setTimeout(async () => {
      await this.saveSource(source);
      this.saveTimer = null;
      // 注意：不在这里触发渲染，因为 scheduleRender 已经在编辑时触发了
      // 渲染和保存是独立的，避免重复渲染
    }, 1000);
  }


  async renderDiagram(source: string) {
    // 保存渲染前的 sourceDraft，以便渲染失败时还原
    const previousSourceDraft = this.stateManager.getSourceDraft();
    
    console.log('[MermaidEditorAppV2] renderDiagram: START', {
      sourceLength: source?.length || 0,
      sourcePreview: source?.substring(0, 50) || '',
      previousSourceDraftLength: previousSourceDraft?.length || 0,
      previousSourceDraftPreview: previousSourceDraft?.substring(0, 50) || '',
      timestamp: new Date().toISOString()
    });
    
    try {
      if (!this.renderer) {
        console.log('[MermaidEditorAppV2] renderDiagram: renderer not available, returning');
        return;
      }
      
      // 检查是否与当前渲染的内容相同，避免重复渲染
      // 注意：使用 sourceDraft 来跟踪已渲染的内容
      const currentRenderedSource = this.stateManager.getSourceDraft();
      if (source === currentRenderedSource && this.renderer?.getCurrentSVG()) {
        console.log('[MermaidEditorAppV2] renderDiagram: Source unchanged, skipping render');
        return;
      }
      
      // 在渲染前，先更新 sourceDraft 为即将渲染的内容
      // 这样可以避免在渲染过程中，如果用户继续编辑，导致重复渲染检查失败
      // 同时也能确保后续的检查使用最新的 sourceDraft
      console.log('[MermaidEditorAppV2] renderDiagram: updating sourceDraft before render');
      this.stateManager.setState({ sourceDraft: source });
      
      // 如果 source 为空或只包含空白字符，不渲染
      if (!source || !source.trim()) {
        // 淡出旧内容后清空容器，避免闪烁
        if (this.renderer) {
          this.renderer.fadeOutAndClear();
        }
        this.stateManager.setState({ error: null });
        return;
      }
      
      console.log('[MermaidEditorAppV2] renderDiagram: calling renderer.render');
      const svg = await this.renderer.render(source);
      console.log('[MermaidEditorAppV2] renderDiagram: renderer.render success');
      
      // 应用缩放/平移
      if (svg) {
        this.applyZoom();
        this.setupWheelZoom();
        this.setupPan();
      }
      
      // 渲染成功后，验证编辑器内容是否仍然正确
      // 如果编辑器内容被清空，恢复它（参考 PlantUML 的逻辑，渲染后不应该影响编辑器内容）
      // 但只在渲染过程中（isSettingValue 为 true）才恢复，避免覆盖用户的编辑
      const actualSource = this.editor ? this.editor.getValue() : this.elements.sourceEditor.value;
      if (actualSource !== source && source.trim() !== '' && this.isSettingValue) {
        console.warn('[MermaidEditorAppV2] Editor content lost after render, restoring...', {
          expectedLength: source.length,
          actualLength: actualSource.length
        });
        // 恢复编辑器内容，使用 isSettingValue 标志防止触发 change 事件
        // 注意：此时 isSettingValue 应该还是 true（从 handleSourceLoad 设置的）
        if (this.editor) {
          this.editor.setValue(source);
        } else {
          this.elements.sourceEditor.value = source;
        }
      }
      
      // sourceDraft 已经在渲染前更新了，这里不需要再次更新
      // 但为了确保一致性，再次验证（防止渲染过程中 sourceDraft 被其他地方修改）
      if (this.stateManager.getSourceDraft() !== source) {
        this.stateManager.setState({ sourceDraft: source });
      }
      
      // 通知后端渲染完成（用于确认，参考 PlantUML 的方式）
      renderMermaid(source).catch(err => {
        console.warn('[MermaidEditorAppV2] Failed to notify render completion:', err);
      });
      
      // 渲染成功后，再次检查并移除可能的错误信息
      if (this.elements.diagramContainer) {
        this.removeErrorElementsFromContainer(this.elements.diagramContainer);
      }
      
      // 清理 body 中可能残留的错误 div
      this.cleanupMermaidErrorDivsFromBody();
      
      this.updateZoomButtons();
      
      // 更新 lastRenderedSource
      this.stateManager.setState({ lastRenderedSource: source });
      
      this.stateManager.setState({ error: null });
      console.log('[MermaidEditorAppV2] renderDiagram: SUCCESS');
    } catch (error: any) {
      console.error('[MermaidEditorAppV2] renderDiagram: ERROR', {
        error: error.message || error,
        errorStack: error.stack,
        sourceLength: source?.length || 0,
        previousSourceDraftLength: previousSourceDraft?.length || 0,
        timestamp: new Date().toISOString()
      });
      
      // 渲染失败时，还原 sourceDraft 到之前的值
      // 这样可以确保状态一致：如果渲染失败，sourceDraft 不应该被更新
      // 否则会导致 handleSourceChange 中的检查逻辑出现问题
      console.log('[MermaidEditorAppV2] renderDiagram: restoring sourceDraft to previous value');
      this.stateManager.setState({ sourceDraft: previousSourceDraft });
      
      // 清理 body 中 Mermaid 可能追加的错误 div
      this.cleanupMermaidErrorDivsFromBody();
      
      // 淡出旧内容后清空容器，移除所有错误信息，避免闪烁
      if (this.renderer) {
        this.renderer.fadeOutAndClear(() => {
          if (this.elements.diagramContainer) {
            this.removeErrorElementsFromContainer(this.elements.diagramContainer);
          }
        });
      }
      
      // 显示错误消息（包括 UnknownDiagramError 和 No diagram type detected）
      let errorMessage = error.message || '未知错误';
      
      // 处理 UnknownDiagramError 和 No diagram type detected 错误
      if (errorMessage.includes('UnknownDiagramError') || errorMessage.includes('No diagram type detected')) {
        // 提取错误类型和主要信息
        if (errorMessage.includes('UnknownDiagramError')) {
          // 格式：UnknownDiagramError: No diagram type detected matching given configuration for text: radar
          const match = errorMessage.match(/UnknownDiagramError:\s*(.+)/);
          if (match && match[1]) {
            errorMessage = match[1].trim();
          } else {
            // 如果没有匹配到，使用原始消息但去掉 "UnknownDiagramError: " 前缀
            errorMessage = errorMessage.replace(/UnknownDiagramError:\s*/i, '').trim();
          }
        }
        
        // 如果错误消息太长，提取关键部分
        if (errorMessage.length > 200) {
          const lines = errorMessage.split('\n');
          errorMessage = lines[0] || errorMessage;
        }
      } else if (errorMessage.includes('Parsing failed')) {
        // 如果是解析错误，保留完整信息但格式化
        const lines = errorMessage.split('\n');
        const mainError = lines[0] || errorMessage;
        errorMessage = mainError;
      }
      
      // 显示错误消息
      this.stateManager.setState({
        error: errorMessage
      });
    }
  }
  
  /**
   * 清理 body 中 Mermaid 自动添加的错误 div
   * Mermaid 在渲染错误时会在 body 下追加 div#dmermaid-xxxx
   */
  private cleanupMermaidErrorDivsFromBody() {
    if (typeof document === 'undefined' || !document.body) {
      return;
    }
    
    // 查找所有 id 以 "dmermaid-" 开头的 div
    const errorDivs = document.body.querySelectorAll('div[id^="dmermaid-"]');
    errorDivs.forEach(div => {
      // 检查是否是错误 div（包含错误 SVG 或错误文本）
      const hasErrorSVG = div.querySelector('svg[aria-roledescription="error"]');
      const hasErrorIcon = div.querySelector('.error-icon');
      const hasErrorText = div.querySelector('.error-text');
      const textContent = div.textContent || '';
      const isErrorDiv = hasErrorSVG || hasErrorIcon || hasErrorText || 
                         textContent.includes('Syntax error') || 
                         textContent.includes('mermaid version');
      
      if (isErrorDiv) {
        div.remove();
      }
    });
  }
  
  /**
   * 从容器中移除所有错误元素
   */
  private removeErrorElementsFromContainer(container: HTMLElement) {
    // 移除所有非 SVG 元素
    const children = Array.from(container.children);
    children.forEach((child) => {
      if (child.tagName !== 'SVG' && child.tagName !== 'svg') {
        child.remove();
      }
    });
    
    // 检查并移除包含错误文本的节点
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent || '';
            if (text.includes('Syntax error') || text.includes('mermaid version')) {
              return NodeFilter.FILTER_ACCEPT;
            }
          }
          return NodeFilter.FILTER_SKIP;
        }
      }
    );
    
    const nodesToRemove: Node[] = [];
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement && node.parentElement !== container) {
        nodesToRemove.push(node.parentElement);
      }
    }
    
    nodesToRemove.forEach((node) => {
      if (node.parentElement) {
        node.parentElement.removeChild(node);
      }
    });
  }

  handleSourceChange() {
    // 参考 PlantUML 的 onChange 逻辑，保持一致
    // 如果正在通过 setValue 设置值，不触发渲染和保存（避免循环和重复渲染）
    if (this.isSettingValue) {
      return;
    }
    
    const source = this.editor ? this.editor.getValue() : this.elements.sourceEditor.value;
    
    // 更新状态（参考 PlantUML 的方式：直接更新状态）
    this.stateManager.setState({ source, sourceDraft: source });
    
    // 调度渲染和保存（参考 PlantUML 的方式）
    // 注意：Mermaid 需要先保存再渲染，所以 scheduleSave 内部会在保存成功后触发渲染
    this.scheduleRender(source);
    this.scheduleSave(source);
  }


  async saveSource(source: string): Promise<boolean> {
    // 保存时，从编辑器获取最新的内容，而不是使用传入的参数
    // 这样可以确保保存的是用户当前编辑的内容
    const currentEditorSource = this.editor ? this.editor.getValue() : this.elements.sourceEditor.value;
    const sourceToSave = currentEditorSource || source;
    const lastSavedSource = this.stateManager.getLastSavedSource();
    
    console.log('[MermaidEditorAppV2] saveSource: START', {
      paramSourceLength: source?.length || 0,
      paramSourcePreview: source?.substring(0, 50) || '',
      editorSourceLength: currentEditorSource?.length || 0,
      sourceToSaveLength: sourceToSave?.length || 0,
      lastSavedSourceLength: lastSavedSource?.length || 0,
      isSame: sourceToSave === lastSavedSource
    });
    
    // 如果内容没有变化（与已保存的内容相同），不保存（避免触发重新加载）
    // 使用 lastSavedSource 而不是 currentStateSource，与 PlantUML 保持一致
    if (sourceToSave === lastSavedSource) {
      console.log('[MermaidEditorAppV2] saveSource: content unchanged (same as last saved), skipping save');
      return true; // 返回 true 表示"保存成功"（因为内容没有变化）
    }
    
    this.isSaving = true;
    console.log('[MermaidEditorAppV2] saveSource: starting save, isSaving=true');
    try {
      const diagram = {
        source: sourceToSave
      };
      await saveDiagram(diagram);
      // 注意：状态更新应该在 handleSaveSuccess 中完成，这里只等待保存完成
      // 这样可以确保与 PlantUML 的逻辑保持一致
      console.log('[MermaidEditorAppV2] saveSource: save request sent, waiting for save-success event');
      
      // 设置超时，防止保存失败时标志未重置（5秒超时，与 PlantUML 保持一致）
      setTimeout(() => {
        if (this.isSaving) {
          console.warn('[MermaidEditorAppV2] Save timeout, resetting isSaving flag');
          this.isSaving = false;
        }
      }, 5000);
      
      return true;
    } catch (error) {
      console.error('[MermaidEditorAppV2] saveSource: save failed:', error);
      this.isSaving = false; // 保存失败时立即清除标志
      return false;
    }
    // 注意：isSaving 标志的清除应该在 handleSaveSuccess 中完成
    // 这样可以确保只有在后端确认保存成功后才清除标志
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
      source = this.stateManager.getSource();
    }
    
    // 如果内容没有变化，不保存（避免触发重新加载）
    if (source === this.stateManager.getLastSavedSource()) {
      return;
    }
    
    // 更新状态
    if (source !== this.stateManager.getSource()) {
      this.stateManager.setState({ source });
    }
    
    // 立即保存
    this.saveSource(source);
  }

  handleSaveSuccess() {
    // 保存成功，更新状态并重置标志（与 PlantUML 保持一致）
    const currentSource = this.stateManager.getSource();
    
    // 更新 lastSavedSource 为当前已保存的内容
    this.stateManager.setState({ 
      source: currentSource,
      lastSavedSource: currentSource
    });
    this.isSaving = false;
    console.log('[MermaidEditorAppV2] handleSaveSuccess: state updated, lastSavedSource updated, isSaving=false');
    
    // 注意：不在这里触发渲染，因为编辑时已经通过 scheduleRender 触发了渲染
    // 如果 sourceDraft 与 source 相同，说明已经渲染过了，不需要重复渲染
    // 这样可以避免保存成功后的重复渲染导致的闪烁
  }

  onStateChange(state: MermaidState) {
    // 使用回调函数通知错误
    if (this.elements.onError) {
      this.elements.onError(state.error || null);
    }
  }

  /**
   * 清理资源
   */
  destroy() {
    // 清理定时器
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    
    if (this.renderTimer) {
      clearTimeout(this.renderTimer);
      this.renderTimer = null;
    }
    
    // 移除事件监听器
    if (this.boundHandleKeyDown) {
      window.removeEventListener('keydown', this.boundHandleKeyDown);
      this.boundHandleKeyDown = null;
    }
    
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
    
    // 移除 ExtensionService 的事件监听
    extensionService.off('load');
    
    // 清理 CodeMirror
    if (this.editor) {
      this.editor.toTextArea();
      this.editor = null;
    }
    
    // 清理其他组件
    if (this.renderer) {
      this.renderer.clear();
    }
    this.renderer = null;
  }

  // 缩放方法
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
    const currentSVG = this.renderer?.getCurrentSVG();
    if (!currentSVG) return;
    
    // 使用 transform 进行缩放和平移，保持居中
    currentSVG.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
    currentSVG.style.transformOrigin = 'center center';
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
      const currentSVG = this.renderer?.getCurrentSVG();
      const isSVGElement = target instanceof SVGElement;
      const closestSvg = target.closest('svg');
      // 使用类型断言来比较元素，因为 TypeScript 无法正确推断 HTMLElement & SVGElement 和 SVGSVGElement 的关系
      const isCurrentSVG = currentSVG && (target === (currentSVG as any) || target.isSameNode(currentSVG));
      const isInCurrentSVG = currentSVG && closestSvg && (closestSvg === (currentSVG as any) || closestSvg.isSameNode(currentSVG));
      const canDrag = target === this.elements.diagramContainer ||
                      (isSVGElement && isCurrentSVG) ||
                      target.tagName === 'svg' ||
                      (isSVGElement && isInCurrentSVG && 
                       (target.tagName === 'g' || target.tagName === 'rect' || isCurrentSVG));
      
      if (canDrag) {
        this.isDragging = true;
        this.isPanning = false; // 重置平移状态
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.dragStartTranslateX = this.translateX;
        this.dragStartTranslateY = this.translateY;
        
        // 更新光标样式
        this.elements.diagramContainer.style.cursor = 'grabbing';
        if (currentSVG) {
          currentSVG.style.cursor = 'grabbing';
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
        const currentSVG = this.renderer?.getCurrentSVG();
        this.elements.diagramContainer.style.cursor = 'grab';
        if (currentSVG) {
          currentSVG.style.cursor = 'grab';
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

  // 分隔条拖拽
  startResize(_e: MouseEvent) {
    // 已在 setupWorkspaceResizer 中处理
  }
}


