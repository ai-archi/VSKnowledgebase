// Mermaid Editor App V2 - 基于 mermaid.js 的新版本
// 阶段1实现：基础渲染、选择、样式编辑

import './styles.css';
import { StateManager } from '../lib/StateManager.js';
import { MermaidRenderer } from '../lib/MermaidRenderer.js';
import { MermaidInteractionLayer } from '../lib/MermaidInteractionLayer.js';
import { MermaidLabelEditor } from '../lib/MermaidLabelEditor.js';
import { MermaidNodeAdder } from '../lib/MermaidNodeAdder.js';
import { MermaidNodeConnector } from '../lib/MermaidNodeConnector.js';
import { MermaidCodeEditor } from '../lib/MermaidCodeEditor.js';
import { MermaidParser } from '../lib/MermaidParser.js';
import { MermaidCodeGenerator } from '../lib/MermaidCodeGenerator.js';
import {
  fetchDiagram,
  saveDiagram,
  isVSCodeWebview,
  vscode,
} from '../lib/vscodeApi.js';

export class MermaidEditorAppV2 {
  constructor() {
    this.stateManager = new StateManager();
    this.renderer = null;
    this.interactionLayer = null;
    this.labelEditor = null;
    this.nodeAdder = null;
    this.nodeConnector = null;
    this.codeEditor = null;
    this.parser = new MermaidParser();
    this.codeGenerator = new MermaidCodeGenerator();
    
    this.saveTimer = null;
    this.lastSubmittedSource = null;
    this.isSaving = false;
    this.selectedNodeId = null;
    this.selectedEdgeIndex = null;
    
    // DOM elements
    this.elements = {
      errorMessage: document.getElementById('error-message'),
      workspace: document.getElementById('workspace'),
      diagramPanel: document.getElementById('diagram-panel'),
      workspaceDivider: document.getElementById('workspace-divider'),
      diagramContainer: document.getElementById('diagram-container'),
      sourcePanel: document.getElementById('source-panel'),
      sourcePath: document.getElementById('source-path'),
      sourceEditor: document.getElementById('source-editor'),
      sourceStatus: document.getElementById('source-status'),
      selectionLabel: document.getElementById('selection-label'),
    };
    
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
    
    // 设置事件监听
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
      window.addEventListener('message', (event) => {
        const data = event.data;
        if (data.type === 'load' || data.type === 'load-response') {
          if (this.isSaving) return;
          if (data.diagram) {
            this.handleDiagramLoad(data.diagram);
          }
        }
      });
      
      if (window.pendingDiagram) {
        this.handleDiagramLoad(window.pendingDiagram);
        window.pendingDiagram = null;
      } else {
        this.loadDiagram();
      }
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
  }
  
  handleKeyDown(event) {
    const key = event.key;
    if (key !== 'Delete' && key !== 'Backspace') {
      return;
    }
    
    // 如果焦点在代码编辑器或输入框中，则不处理
    if (this.codeEditor?.editor && typeof this.codeEditor.editor.hasFocus === 'function' && this.codeEditor.editor.hasFocus()) {
      return;
    }
    const target = event.target;
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
    
    const adjustByStep = (delta) => {
      const workspaceRect = workspace.getBoundingClientRect();
      const dividerWidth = getDividerWidth();
      const currentWidth = diagramPanel.getBoundingClientRect().width;
      let newDiagramWidth = currentWidth + delta;
      const maxDiagramWidth = workspaceRect.width - dividerWidth - minSourceWidth;
      newDiagramWidth = Math.max(minDiagramWidth, Math.min(maxDiagramWidth, newDiagramWidth));
      const newSourceWidth = workspaceRect.width - newDiagramWidth - dividerWidth;
      diagramPanel.style.flex = 'none';
      diagramPanel.style.width = `${newDiagramWidth}px`;
      sourcePanel.style.flex = 'none';
      sourcePanel.style.width = `${newSourceWidth}px`;
    };
    
    divider.addEventListener('mousedown', startDrag);
    divider.addEventListener('dragstart', (event) => event.preventDefault());
    divider.addEventListener('keydown', (event) => {
      const step = event.shiftKey ? 40 : 20;
      if (event.key === 'ArrowLeft') {
        adjustByStep(-step);
        event.preventDefault();
      } else if (event.key === 'ArrowRight') {
        adjustByStep(step);
        event.preventDefault();
      }
    });
  }
  
  async loadDiagram() {
    try {
      this.stateManager.setState({ loading: true });
      const diagram = await fetchDiagram();
      this.handleDiagramLoad(diagram);
    } catch (error) {
      console.error('Load diagram error:', error);
      this.stateManager.setState({
        loading: false,
        error: error.message || '加载图表失败'
      });
    }
  }
  
  handleDiagramLoad(diagram) {
    const source = diagram.source || '';
    
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
    if (diagram.sourcePath) {
      this.elements.sourcePath.textContent = diagram.sourcePath;
    }
    
    // 渲染图表
    this.renderDiagram(source);
  }
  
  async renderDiagram(source) {
    try {
      await this.renderer.render(source);
      this.interactionLayer.update();
      
      this.stateManager.setState({ error: null });
    } catch (error) {
      console.error('Render error:', error);
      this.stateManager.setState({
        error: `渲染错误: ${error.message}`
      });
    }
  }
  
  handleSourceChange() {
    const source = this.codeEditor ? this.codeEditor.getValue() : this.elements.sourceEditor.value;
    this.stateManager.setState({ sourceDraft: source });
    
    // 防抖重新渲染
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(async () => {
      await this.renderDiagram(source);
    }, 500);
  }
  
  handleNodeSelect(nodeId, nodeInfo) {
    this.selectedNodeId = nodeId;
    this.selectedEdgeIndex = null;
    
    this.stateManager.setState({
      selectedNodeId: nodeId,
      selectedEdgeId: null
    });
    
  }
  
  handleEdgeSelect(edgeIndex, edgeInfo) {
    this.selectedEdgeIndex = edgeIndex;
    this.selectedNodeId = null;
    
    this.stateManager.setState({
      selectedNodeId: null,
      selectedEdgeId: `edge-${edgeIndex}`
    });
    
  }
  
  handleElementDblClick(type, id, element) {
    if (type === 'node') {
      // 双击节点，进入标签编辑模式
      this.startLabelEdit(id, 'node');
    } else if (type === 'edge') {
      // 双击边，进入标签编辑模式
      this.startLabelEdit(id, 'edge');
    }
  }
  
  handleCanvasClick() {
    // 如果正在编辑标签，不处理点击
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
  
  handleNodeCtrlClick(nodeId, e) {
    // Ctrl/Cmd + 点击节点：开始连接
    this.nodeConnector.startConnecting(nodeId, e);
  }
  
  handleCanvasDblClick(e) {
    // 如果正在编辑标签，不处理双击
    if (this.labelEditor && this.labelEditor.isEditing()) {
      return;
    }
    
    // 双击空白处，显示添加节点对话框
    const svg = this.renderer.getCurrentSVG();
    if (!svg) return;
    
    const svgPoint = this.nodeAdder.getSVGPoint(svg, e.clientX, e.clientY);
    if (svgPoint) {
      this.nodeAdder.showAddNodeDialog(svgPoint, async (newSource, nodeId) => {
        this.elements.sourceEditor.value = newSource;
        await this.renderDiagram(newSource);
        await this.saveSource(newSource);
        
        // 自动选择新添加的节点
        setTimeout(() => {
          const nodeInfo = this.renderer.getNode(nodeId);
          if (nodeInfo) {
            const nodeElement = svg.querySelector(`[data-node-id="${nodeId}"]`);
            if (nodeElement) {
              this.interactionLayer.selectNode(nodeId, nodeElement);
              this.handleNodeSelect(nodeId, nodeInfo);
            }
          }
        }, 100);
      });
    }
  }
  
  startLabelEdit(id, type) {
    if (type === 'node') {
      this.labelEditor.startNodeLabelEdit(id, async (newSource) => {
        if (this.codeEditor) {
          this.codeEditor.setValue(newSource);
        } else {
          this.elements.sourceEditor.value = newSource;
        }
        await this.renderDiagram(newSource);
        await this.saveSource(newSource);
      });
    } else if (type === 'edge') {
      this.labelEditor.startEdgeLabelEdit(id, async (newSource) => {
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
    const selection = this.interactionLayer.getAllSelected();
    
    // 如果有多个选中项，批量删除
    if (selection.nodes.length > 1 || selection.edges.length > 0) {
      await this.deleteMultiple(selection);
      return;
    }
    
    // 单个删除
    if (this.selectedNodeId) {
      await this.deleteNode(this.selectedNodeId);
    } else if (this.selectedEdgeIndex !== null) {
      await this.deleteEdge(this.selectedEdgeIndex);
    }
  }
  
  async deleteMultiple(selection) {
    const source = this.renderer.getCurrentSource();
    const ast = this.parser.parse(source);
    
    // 删除多个节点
    if (selection.nodes.length > 0) {
      const nodeIdsToDelete = new Set(selection.nodes);
      ast.nodes = ast.nodes.filter(n => !nodeIdsToDelete.has(n.id));
      ast.edges = ast.edges.filter(e => 
        !nodeIdsToDelete.has(e.from) && !nodeIdsToDelete.has(e.to)
      );
      
      // 删除相关样式
      selection.nodes.forEach(nodeId => {
        ast.classDefs = ast.classDefs.filter(cd => cd.name !== `style-${nodeId}`);
        if (ast.classApplications) {
          ast.classApplications = ast.classApplications.filter(ca => !ca.nodes.includes(nodeId));
        }
      });
    }
    
    // 删除多个边（需要重新索引）
    if (selection.edges.length > 0) {
      const edgesToDelete = new Set(selection.edges);
      const newEdges = [];
      const newLinkStyles = [];
      
      ast.edges.forEach((edge, index) => {
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
  
  handleMultiSelect(selection) {
    const count = selection.nodes.length + selection.edges.length;
    if (count > 1 && this.elements.selectionLabel) {
      this.elements.selectionLabel.textContent = `已选择 ${count} 个元素`;
    }
  }
  
  async deleteNode(nodeId) {
    const source = this.renderer.getCurrentSource();
    const ast = this.parser.parse(source);
    
    // 删除节点
    ast.nodes = ast.nodes.filter(n => n.id !== nodeId);
    
    // 删除相关的边
    ast.edges = ast.edges.filter(e => e.from !== nodeId && e.to !== nodeId);
    
    // 删除相关的样式
    ast.classDefs = ast.classDefs.filter(cd => cd.name !== `style-${nodeId}`);
    if (ast.classApplications) {
      ast.classApplications = ast.classApplications.filter(ca => !ca.nodes.includes(nodeId));
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
  
  async deleteEdge(edgeIndex) {
    const source = this.renderer.getCurrentSource();
    const ast = this.parser.parse(source);
    
    // 删除边
    ast.edges.splice(edgeIndex, 1);
    
    // 删除相关的 linkStyle（需要重新索引）
    if (ast.linkStyles) {
      const newLinkStyles = [];
      ast.linkStyles.forEach((linkStyle, index) => {
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
    this.interactionLayer.clearSelection();
    this.stateManager.setState({
      selectedNodeId: null,
      selectedEdgeId: null
    });
  }
  
  async saveSource(source) {
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
  
  onStateChange(state) {
    // 更新错误消息
    if (state.error) {
      this.elements.errorMessage.textContent = state.error;
      this.elements.errorMessage.style.display = 'block';
    } else {
      this.elements.errorMessage.style.display = 'none';
    }
    
    // 更新选择标签
    let selectionLabel = '未选择';
    const selection = this.interactionLayer?.getAllSelected();
    if (selection) {
      const count = selection.nodes.length + selection.edges.length;
      if (count > 1) {
        selectionLabel = `已选择 ${count} 个元素`;
      } else if (state.selectedNodeId) {
        selectionLabel = `节点: ${state.selectedNodeId}`;
      } else if (state.selectedEdgeId) {
        selectionLabel = `边: ${state.selectedEdgeId}`;
      }
    } else if (state.selectedNodeId) {
      selectionLabel = `节点: ${state.selectedNodeId}`;
    } else if (state.selectedEdgeId) {
      selectionLabel = `边: ${state.selectedEdgeId}`;
    }
    if (this.elements.selectionLabel) {
      this.elements.selectionLabel.textContent = selectionLabel;
    }
  }
}

// 导出类供全局使用
if (typeof window !== 'undefined') {
  window.MermaidEditorAppV2 = MermaidEditorAppV2;
}

// 如果直接加载，自动初始化
if (typeof window !== 'undefined' && document.readyState !== 'loading') {
  // 延迟初始化，确保所有脚本已加载
  setTimeout(() => {
    if (!window.app && window.MermaidEditorAppV2) {
      window.app = new MermaidEditorAppV2();
    }
  }, 100);
}

