/**
 * Mermaid Editor App V2 - Vue 适配版
 * 适配 Vue 3 组件，接收 DOM 元素引用而非通过 getElementById 获取
 */
import { StateManager } from './StateManager.js';
import { MermaidRenderer } from './MermaidRenderer.js';
import { MermaidInteractionLayer } from './MermaidInteractionLayer.js';
import { MermaidLabelEditor } from './MermaidLabelEditor.js';
import { MermaidNodeAdder } from './MermaidNodeAdder.js';
import { MermaidNodeConnector } from './MermaidNodeConnector.js';
import { MermaidCodeEditor } from './MermaidCodeEditor.js';
import { MermaidParser } from './MermaidParser.js';
import { MermaidCodeGenerator } from './MermaidCodeGenerator.js';
import {
  fetchDiagram,
  saveDiagram,
  isVSCodeWebview,
} from './vscodeApiAdapter';
import { extensionService } from '../../services/ExtensionService';

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
  private interactionLayer: MermaidInteractionLayer | null = null;
  private labelEditor: MermaidLabelEditor | null = null;
  private nodeAdder: MermaidNodeAdder | null = null;
  private nodeConnector: MermaidNodeConnector | null = null;
  private codeEditor: MermaidCodeEditor | null = null;
  private parser: MermaidParser;
  private codeGenerator: MermaidCodeGenerator;
  
  private elements: EditorElements;
  private saveTimer: NodeJS.Timeout | null = null;
  private isSaving = false;
  private selectedNodeId: string | null = null;
  private selectedEdgeIndex: number | null = null;
  private boundHandleKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private messageHandler: ((event: MessageEvent) => void) | null = null;

  constructor(elements: EditorElements) {
    this.elements = elements;
    this.stateManager = new StateManager();
    this.parser = new MermaidParser();
    this.codeGenerator = new MermaidCodeGenerator();
    this.init();
  }

  async init() {
    // 初始化 mermaid 渲染器
    this.renderer = new MermaidRenderer(this.elements.diagramContainer);
    
    // 初始化标签编辑器
    this.labelEditor = new MermaidLabelEditor(
      this.renderer,
      this.parser,
      this.codeGenerator
    );
    
    // 初始化节点添加器
    this.nodeAdder = new MermaidNodeAdder(
      this.renderer,
      this.parser,
      this.codeGenerator
    );
    
    // 初始化节点连接器
    this.nodeConnector = new MermaidNodeConnector(
      this.renderer,
      this.parser,
      this.codeGenerator
    );
    this.nodeConnector.setOnConnectionCreated(async (newSource) => {
      if (this.codeEditor) {
        this.codeEditor.setValue(newSource);
      } else {
        this.elements.sourceEditor.value = newSource;
      }
      await this.renderDiagram(newSource);
      await this.saveSource(newSource);
    });
    
    // 初始化交互层
    this.interactionLayer = new MermaidInteractionLayer(this.renderer, {
      onNodeSelect: (nodeId, nodeInfo, element) => this.handleNodeSelect(nodeId, nodeInfo),
      onEdgeSelect: (edgeIndex, edgeInfo, element) => this.handleEdgeSelect(edgeIndex, edgeInfo),
      onElementDblClick: (type, id, element) => this.handleElementDblClick(type, id, element),
      onCanvasClick: () => this.handleCanvasClick(),
      onCanvasDblClick: (e) => this.handleCanvasDblClick(e),
      onNodeCtrlClick: (nodeId, e) => this.handleNodeCtrlClick(nodeId, e),
      onMultiSelect: (selection) => this.handleMultiSelect(selection),
    });
    
    // 订阅状态变化
    this.stateManager.subscribe((state) => this.onStateChange(state));
    
    // 初始化代码编辑器
    this.codeEditor = new MermaidCodeEditor(this.elements.sourceEditor, {
      onChange: (value) => {
        this.handleSourceChange();
      },
      onError: (error) => {
        this.stateManager.setState({ error: error.message });
      }
    });
    
    this.setupEventListeners();
    this.setupWorkspaceResizer();
    
    // 设置 VSCode 消息监听
    if (isVSCodeWebview) {
      // 监听 ExtensionService 的消息事件
      this.messageHandler = (event: MessageEvent) => {
        const data = event.data;
        // 处理来自后端的 load 消息（通过 ExtensionService 转发）
        if (data.method === 'load' && data.params?.diagram) {
          if (this.isSaving) return;
          this.handleDiagramLoad(data.params.diagram);
        }
      };
      
      window.addEventListener('message', this.messageHandler);
      
      // 监听 ExtensionService 的事件
      extensionService.on('load', (diagram: any) => {
        if (this.isSaving) return;
        if (diagram) {
          this.handleDiagramLoad(diagram);
        }
      });
      
      // 加载初始图表
      this.loadDiagram();
    } else {
      this.loadDiagram();
    }
  }

  setupEventListeners() {
    // 源代码编辑器变化（如果使用原生编辑器）
    if (!this.codeEditor.editor) {
      this.elements.sourceEditor.addEventListener('input', () => {
        this.handleSourceChange();
      });
    }
    
    // 键盘删除快捷键
    if (!this.boundHandleKeyDown) {
      this.boundHandleKeyDown = this.handleKeyDown.bind(this);
      window.addEventListener('keydown', this.boundHandleKeyDown);
    }
    
    // 缩放控制按钮
    if (this.elements.zoomIn) {
      this.elements.zoomIn.addEventListener('click', () => {
        this.renderer?.zoomIn();
        this.updateZoomButtons();
      });
    }
    
    if (this.elements.zoomOut) {
      this.elements.zoomOut.addEventListener('click', () => {
        this.renderer?.zoomOut();
        this.updateZoomButtons();
      });
    }
    
    if (this.elements.zoomReset) {
      this.elements.zoomReset.addEventListener('click', () => {
        this.renderer?.zoomReset();
        this.updateZoomButtons();
      });
    }
  }

  /**
   * 更新缩放按钮状态
   */
  updateZoomButtons() {
    if (!this.renderer) return;
    
    const scale = this.renderer.getZoom();
    const minScale = this.renderer.minScale;
    const maxScale = this.renderer.maxScale;
    
    if (this.elements.zoomIn) {
      (this.elements.zoomIn as HTMLButtonElement).disabled = scale >= maxScale;
    }
    
    if (this.elements.zoomOut) {
      (this.elements.zoomOut as HTMLButtonElement).disabled = scale <= minScale;
    }
  }

  handleKeyDown(event: KeyboardEvent) {
    const key = event.key;
    if (key !== 'Delete' && key !== 'Backspace') {
      return;
    }
    
    // 如果焦点在代码编辑器或输入框中，则不处理
    if (this.codeEditor?.editor && typeof (this.codeEditor.editor as any).hasFocus === 'function' && (this.codeEditor.editor as any).hasFocus()) {
      return;
    }
    const target = event.target as HTMLElement;
    if (target) {
      const tagName = target.tagName?.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || target.isContentEditable || target.closest('.CodeMirror') || target.closest('.mermaid-label-editor')) {
        return;
      }
    }
    
    const selection = this.interactionLayer?.getAllSelected();
    if (!selection) {
      return;
    }
    const hasSelection = selection.nodes.length > 0 || selection.edges.length > 0 || this.selectedNodeId || this.selectedEdgeIndex !== null;
    if (!hasSelection) {
      return;
    }
    
    event.preventDefault();
    this.handleDeleteSelected();
  }

  setupWorkspaceResizer() {
    const workspace = this.elements.workspace;
    const divider = this.elements.divider;
    const diagramPanel = this.elements.diagramPanel;
    const sourcePanel = this.elements.sourceEditor.closest('.source-panel') as HTMLElement;
    
    if (!workspace || !divider || !diagramPanel || !sourcePanel) {
      return;
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
      const diagram = await fetchDiagram();
      this.handleDiagramLoad(diagram);
    } catch (error: any) {
      console.error('Load diagram error:', error);
      this.stateManager.setState({
        loading: false,
        error: error.message || '加载图表失败'
      });
    }
  }

  handleDiagramLoad(diagram: any) {
    // 确保 diagram 有 source 字段，如果没有则从原始文档获取或使用空字符串
    const source = diagram?.source || '';
    
    // 如果内容没有变化，不更新编辑器（避免重置滚动位置）
    const currentSource = this.codeEditor ? this.codeEditor.getValue() : this.elements.sourceEditor.value;
    if (currentSource === source) {
      // 内容相同，只更新状态，不更新编辑器
      this.stateManager.setState({
        diagram: diagram,
        source: source,
        sourceDraft: source,
        loading: false,
        error: null
      });
      return;
    }
    
    this.stateManager.setState({
      diagram: diagram,
      source: source,
      sourceDraft: source,
      loading: false,
      error: null
    });
    
    // 更新代码编辑器
    if (this.codeEditor) {
      this.codeEditor.setValue(source);
    } else {
      this.elements.sourceEditor.value = source;
    }
    
    // 只有当 source 不为空时才渲染图表
    if (source.trim()) {
      this.renderDiagram(source);
    } else {
      // 如果 source 为空，清除渲染错误
      this.stateManager.setState({ error: null });
    }
  }

  async renderDiagram(source: string) {
    try {
      if (!this.renderer) return;
      
      // 如果 source 为空或只包含空白字符，不渲染
      if (!source || !source.trim()) {
        // 清空容器但不显示错误
        if (this.renderer.container) {
          this.renderer.container.innerHTML = '';
        }
        this.stateManager.setState({ error: null });
        return;
      }
      
      await this.renderer.render(source);
      
      // 渲染成功后，再次检查并移除可能的错误信息
      if (this.renderer.container) {
        this.removeErrorElementsFromContainer(this.renderer.container);
      }
      
      // 清理 body 中可能残留的错误 div
      this.cleanupMermaidErrorDivsFromBody();
      
      this.interactionLayer?.update();
      this.updateZoomButtons();
      
      this.stateManager.setState({ error: null });
    } catch (error: any) {
      console.error('Render error:', error);
      
      // 清理 body 中 Mermaid 可能追加的错误 div
      this.cleanupMermaidErrorDivsFromBody();
      
      // 确保容器被清空，移除所有错误信息
      if (this.renderer?.container) {
        this.renderer.container.innerHTML = '';
        this.removeErrorElementsFromContainer(this.renderer.container);
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
    const source = this.codeEditor ? this.codeEditor.getValue() : this.elements.sourceEditor.value;
    this.stateManager.setState({ sourceDraft: source });
    
    // 防抖重新渲染和保存
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    this.saveTimer = setTimeout(async () => {
      await this.renderDiagram(source);
      await this.saveSource(source);
    }, 500);
  }

  handleNodeSelect(nodeId: string, nodeInfo: any) {
    this.selectedNodeId = nodeId;
    this.selectedEdgeIndex = null;
    
    this.stateManager.setState({
      selectedNodeId: nodeId,
      selectedEdgeId: null
    });
  }

  handleEdgeSelect(edgeIndex: number, edgeInfo: any) {
    this.selectedEdgeIndex = edgeIndex;
    this.selectedNodeId = null;
    
    this.stateManager.setState({
      selectedNodeId: null,
      selectedEdgeId: `edge-${edgeIndex}`
    });
  }

  handleElementDblClick(type: string, id: string, element: any) {
    if (type === 'node') {
      this.startLabelEdit(id, 'node');
    } else if (type === 'edge') {
      this.startLabelEdit(id, 'edge');
    }
  }

  handleCanvasClick() {
    if (this.labelEditor && this.labelEditor.isEditing()) {
      return;
    }
    
    this.selectedNodeId = null;
    this.selectedEdgeIndex = null;
    
    this.stateManager.setState({
      selectedNodeId: null,
      selectedEdgeId: null
    });
  }

  handleNodeCtrlClick(nodeId: string, e: MouseEvent) {
    this.nodeConnector?.startConnecting(nodeId, e);
  }

  handleCanvasDblClick(e: MouseEvent) {
    if (this.labelEditor && this.labelEditor.isEditing()) {
      return;
    }
    
    const svg = this.renderer?.getCurrentSVG();
    if (!svg) return;
    
    const svgPoint = this.nodeAdder?.getSVGPoint(svg, e.clientX, e.clientY);
    if (svgPoint && this.nodeAdder) {
      this.nodeAdder.showAddNodeDialog(svgPoint, async (newSource, nodeId) => {
        this.elements.sourceEditor.value = newSource;
        await this.renderDiagram(newSource);
        await this.saveSource(newSource);
        
        setTimeout(() => {
          const nodeInfo = this.renderer?.getNode(nodeId);
          if (nodeInfo) {
            const nodeElement = svg.querySelector(`[data-node-id="${nodeId}"]`);
            if (nodeElement) {
              this.interactionLayer?.selectNode(nodeId, nodeElement);
              this.handleNodeSelect(nodeId, nodeInfo);
            }
          }
        }, 100);
      });
    }
  }

  startLabelEdit(id: string, type: string) {
    if (type === 'node') {
      this.labelEditor?.startNodeLabelEdit(id, async (newSource) => {
        if (this.codeEditor) {
          this.codeEditor.setValue(newSource);
        } else {
          this.elements.sourceEditor.value = newSource;
        }
        await this.renderDiagram(newSource);
        await this.saveSource(newSource);
      });
    } else if (type === 'edge') {
      this.labelEditor?.startEdgeLabelEdit(id, async (newSource) => {
        if (this.codeEditor) {
          this.codeEditor.setValue(newSource);
        } else {
          this.elements.sourceEditor.value = newSource;
        }
        await this.renderDiagram(newSource);
        await this.saveSource(newSource);
      });
    }
  }

  async handleDeleteSelected() {
    const selection = this.interactionLayer?.getAllSelected();
    if (!selection) return;
    
    if (selection.nodes.length > 1 || selection.edges.length > 0) {
      await this.deleteMultiple(selection);
      return;
    }
    
    if (this.selectedNodeId) {
      await this.deleteNode(this.selectedNodeId);
    } else if (this.selectedEdgeIndex !== null) {
      await this.deleteEdge(this.selectedEdgeIndex);
    }
  }

  async deleteMultiple(selection: any) {
    const source = this.renderer?.getCurrentSource();
    if (!source) return;
    
    const ast = this.parser.parse(source);
    
    if (selection.nodes.length > 0) {
      const nodeIdsToDelete = new Set(selection.nodes);
      ast.nodes = ast.nodes.filter((n: any) => !nodeIdsToDelete.has(n.id));
      ast.edges = ast.edges.filter((e: any) => 
        !nodeIdsToDelete.has(e.from) && !nodeIdsToDelete.has(e.to)
      );
      
      selection.nodes.forEach((nodeId: string) => {
        ast.classDefs = ast.classDefs.filter((cd: any) => cd.name !== `style-${nodeId}`);
        if (ast.classApplications) {
          ast.classApplications = ast.classApplications.filter((ca: any) => !ca.nodes.includes(nodeId));
        }
      });
    }
    
    if (selection.edges.length > 0) {
      const edgesToDelete = new Set(selection.edges);
      const newEdges: any[] = [];
      const newLinkStyles: any[] = [];
      
      ast.edges.forEach((edge: any, index: number) => {
        if (!edgesToDelete.has(index)) {
          newEdges.push(edge);
          if (ast.linkStyles && ast.linkStyles[index]) {
            newLinkStyles[newEdges.length - 1] = ast.linkStyles[index];
          }
        }
      });
      
      ast.edges = newEdges;
      ast.linkStyles = newLinkStyles;
    }
    
    const newSource = this.codeGenerator.generate(ast, source);
    if (this.codeEditor) {
      this.codeEditor.setValue(newSource);
    } else {
      this.elements.sourceEditor.value = newSource;
    }
    await this.renderDiagram(newSource);
    await this.saveSource(newSource);
    
    this.clearSelection();
  }

  handleMultiSelect(selection: any) {
    // 多选处理逻辑
  }

  async deleteNode(nodeId: string) {
    const source = this.renderer?.getCurrentSource();
    if (!source) return;
    
    const ast = this.parser.parse(source);
    
    ast.nodes = ast.nodes.filter((n: any) => n.id !== nodeId);
    ast.edges = ast.edges.filter((e: any) => e.from !== nodeId && e.to !== nodeId);
    
    ast.classDefs = ast.classDefs.filter((cd: any) => cd.name !== `style-${nodeId}`);
    if (ast.classApplications) {
      ast.classApplications = ast.classApplications.filter((ca: any) => !ca.nodes.includes(nodeId));
    }
    
    const newSource = this.codeGenerator.generate(ast, source);
    if (this.codeEditor) {
      this.codeEditor.setValue(newSource);
    } else {
      this.elements.sourceEditor.value = newSource;
    }
    await this.renderDiagram(newSource);
    await this.saveSource(newSource);
    
    this.clearSelection();
  }

  async deleteEdge(edgeIndex: number) {
    const source = this.renderer?.getCurrentSource();
    if (!source) return;
    
    const ast = this.parser.parse(source);
    
    ast.edges.splice(edgeIndex, 1);
    
    if (ast.linkStyles) {
      const newLinkStyles: any[] = [];
      ast.linkStyles.forEach((linkStyle: any, index: number) => {
        if (linkStyle && index !== edgeIndex) {
          const newIndex = index > edgeIndex ? index - 1 : index;
          newLinkStyles[newIndex] = linkStyle;
        }
      });
      ast.linkStyles = newLinkStyles;
    }
    
    const newSource = this.codeGenerator.generate(ast, source);
    if (this.codeEditor) {
      this.codeEditor.setValue(newSource);
    } else {
      this.elements.sourceEditor.value = newSource;
    }
    await this.renderDiagram(newSource);
    await this.saveSource(newSource);
    
    this.clearSelection();
  }

  clearSelection() {
    this.selectedNodeId = null;
    this.selectedEdgeIndex = null;
    this.interactionLayer?.clearSelection();
    this.stateManager.setState({
      selectedNodeId: null,
      selectedEdgeId: null
    });
  }

  async saveSource(source: string) {
    this.isSaving = true;
    try {
      const diagram = {
        ...this.stateManager.diagram,
        source: source
      };
      await saveDiagram(diagram);
      this.stateManager.setState({ source: source, sourceDraft: source });
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      this.isSaving = false;
    }
  }

  onStateChange(state: any) {
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
    
    // 移除事件监听器
    if (this.boundHandleKeyDown) {
      window.removeEventListener('keydown', this.boundHandleKeyDown);
      this.boundHandleKeyDown = null;
    }
    
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      extensionService.off('load');
      this.messageHandler = null;
    }
    
    // 清理编辑器
    if (this.codeEditor) {
      this.codeEditor.destroy?.();
      this.codeEditor = null;
    }
    
    // 清理其他组件
    this.renderer = null;
    this.interactionLayer = null;
    this.labelEditor = null;
    this.nodeAdder = null;
    this.nodeConnector = null;
  }

  // 缩放方法
  zoomIn() {
    this.renderer?.zoomIn();
    this.updateZoomButtons();
  }

  zoomOut() {
    this.renderer?.zoomOut();
    this.updateZoomButtons();
  }

  zoomReset() {
    this.renderer?.zoomReset();
    this.updateZoomButtons();
  }

  // 分隔条拖拽
  startResize(e: MouseEvent) {
    // 已在 setupWorkspaceResizer 中处理
  }
}


