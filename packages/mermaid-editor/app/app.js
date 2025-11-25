// Main application entry point

import './styles.css';
import { StateManager } from '../lib/StateManager.js';
import { DiagramCanvas } from '../lib/DiagramCanvas.js';
import {
  fetchDiagram,
  saveDiagram,
  isVSCodeWebview,
  vscode,
} from '../lib/vscodeApi.js';
import {
  formatPaddingValue,
  normalizePadding,
  resolveColor,
  normalizeColorInput,
  formatByteSize,
  ensureImageWithinLimit,
} from '../lib/utils.js';
import {
  DEFAULT_NODE_COLORS,
  DEFAULT_EDGE_COLOR,
  DEFAULT_NODE_TEXT,
  MAX_IMAGE_FILE_BYTES,
  LINE_STYLE_OPTIONS,
  ARROW_DIRECTION_OPTIONS,
} from '../lib/types.js';

// Application class
class MermaidEditorApp {
  constructor() {
    this.stateManager = new StateManager();
    this.diagramCanvas = null;
    this.saveTimer = null;
    this.lastSubmittedSource = null;
    
    // DOM elements
    this.elements = {
      statusMessage: document.getElementById('status-message'),
      errorMessage: document.getElementById('error-message'),
      resetOverridesBtn: document.getElementById('reset-overrides-btn'),
      deleteSelectedBtn: document.getElementById('delete-selected-btn'),
      stylePanel: document.getElementById('style-panel'),
      panelCaption: document.getElementById('panel-caption'),
      stylePanelBody: document.getElementById('style-panel-body'),
      diagramContainer: document.getElementById('diagram-container'),
      sourcePanel: document.getElementById('source-panel'),
      sourcePath: document.getElementById('source-path'),
      sourceEditor: document.getElementById('source-editor'),
      sourceStatus: document.getElementById('source-status'),
      selectionLabel: document.getElementById('selection-label'),
    };
    
    this.init();
  }
  
  init() {
    // Initialize diagram canvas
    this.diagramCanvas = new DiagramCanvas(this.elements.diagramContainer, {
      onNodeMove: (id, position) => this.handleNodeMove(id, position),
      onEdgeMove: (id, points) => this.handleEdgeMove(id, points),
      onLayoutUpdate: (update) => this.handleLayoutUpdate(update),
      onSelectNode: (id) => this.handleSelectNode(id),
      onSelectEdge: (id) => this.handleSelectEdge(id),
      onDragStateChange: (dragging) => this.handleDragStateChange(dragging),
      onDeleteNode: (id) => this.handleDeleteNode(id),
      onDeleteEdge: (id) => this.handleDeleteEdge(id),
    });
    
    // Subscribe to state changes
    this.stateManager.subscribe((state) => this.onStateChange(state));
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Setup VSCode message listener (before loading diagram)
    if (isVSCodeWebview) {
      window.addEventListener('message', (event) => {
        const data = event.data;
        if (data.type === 'load' || data.type === 'load-response') {
          if (data.diagram) {
            this.handleDiagramLoad(data.diagram);
          }
        }
      });
      
      // Check for pending diagram data (stored by inline script)
      if (window.pendingDiagram) {
        console.log('[MermaidEditor] Found pending diagram data, loading it');
        this.handleDiagramLoad(window.pendingDiagram);
        window.pendingDiagram = null; // Clear after use
      } else {
        // Load initial diagram if no pending data
        this.loadDiagram();
      }
    } else {
      // Not in VSCode, load diagram normally
      this.loadDiagram();
    }
  }
  
  setupEventListeners() {
    // Reset overrides button
    this.elements.resetOverridesBtn.addEventListener('click', () => {
      this.handleResetOverrides();
    });
    
    // Delete selected button
    this.elements.deleteSelectedBtn.addEventListener('click', () => {
      this.handleDeleteSelection();
    });
    
    // Source editor
    this.elements.sourceEditor.addEventListener('input', (e) => {
      this.handleSourceChange(e.target.value);
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.saveSource();
      }
    });
  }
  
  handleDiagramLoad(diagram) {
    // Unified method to handle diagram loading from any source
    this.stateManager.setState({
      diagram,
      loading: false,
      error: null,
      source: diagram.source || '',
      sourceDraft: diagram.source || '',
    });
    this.diagramCanvas.setDiagram(diagram);
    if (diagram.source) {
      this.elements.sourceEditor.value = diagram.source;
    }
    if (diagram.sourcePath) {
      this.elements.sourcePath.textContent = diagram.sourcePath;
    }
  }
  
  async loadDiagram() {
    try {
      this.stateManager.setState({ loading: true, error: null });
      const diagram = await fetchDiagram();
      this.handleDiagramLoad(diagram);
    } catch (error) {
      this.stateManager.setState({
        loading: false,
        error: error.message,
        diagram: null,
      });
    }
  }
  
  async saveDiagram() {
    const diagram = this.stateManager.diagram;
    if (!diagram) {
      return;
    }
    
    try {
      this.stateManager.setState({ saving: true, error: null });
      await saveDiagram(diagram);
      this.stateManager.setState({ saving: false });
    } catch (error) {
      this.stateManager.setState({ 
        saving: false,
        error: error.message 
      });
    }
  }
  
  async handleNodeMove(id, position) {
    const diagram = this.stateManager.diagram;
    if (!diagram) return;
    
    // 更新 diagram 状态
    const node = diagram.nodes.find(n => n.id === id);
    if (node) {
      if (position) {
        node.overridePosition = position;
        node.renderedPosition = position;
      } else {
        node.overridePosition = undefined;
        node.renderedPosition = node.autoPosition;
      }
      await this.saveDiagram();
    }
  }
  
  async handleEdgeMove(id, points) {
    const diagram = this.stateManager.diagram;
    if (!diagram) return;
    
    // 更新 diagram 状态
    const edge = diagram.edges.find(e => e.id === id);
    if (edge) {
      if (points && points.length > 0) {
        edge.overridePoints = points;
        edge.renderedPoints = points;
      } else {
        edge.overridePoints = undefined;
        edge.renderedPoints = edge.autoPoints;
      }
      await this.saveDiagram();
    }
  }
  
  async handleLayoutUpdate(update) {
    const diagram = this.stateManager.diagram;
    if (!diagram) return;
    
    // 更新 nodes
    if (update.nodes) {
      for (const [nodeId, position] of Object.entries(update.nodes)) {
        const node = diagram.nodes.find(n => n.id === nodeId);
        if (node) {
          if (position) {
            node.overridePosition = position;
            node.renderedPosition = position;
          } else {
            node.overridePosition = undefined;
            node.renderedPosition = node.autoPosition;
          }
        }
      }
    }
    
    // 更新 edges
    if (update.edges) {
      for (const [edgeId, edgeUpdate] of Object.entries(update.edges)) {
        const edge = diagram.edges.find(e => e.id === edgeId);
        if (edge && edgeUpdate) {
          if (edgeUpdate.points) {
            edge.overridePoints = edgeUpdate.points;
            edge.renderedPoints = edgeUpdate.points;
          } else if (edgeUpdate.points === null) {
            edge.overridePoints = undefined;
            edge.renderedPoints = edge.autoPoints;
          }
        }
      }
    }
    
    await this.saveDiagram();
  }
  
  async handleDeleteNode(id) {
    const diagram = this.stateManager.diagram;
    if (!diagram) return;
    
    // 删除节点和相关边
    diagram.nodes = diagram.nodes.filter(n => n.id !== id);
    diagram.edges = diagram.edges.filter(e => e.from !== id && e.to !== id);
    
    if (this.stateManager.selectedNodeId === id) {
      this.stateManager.setState({ selectedNodeId: null });
    }
    
    await this.saveDiagram();
    this.diagramCanvas.setDiagram(diagram);
  }
  
  async handleDeleteEdge(id) {
    const diagram = this.stateManager.diagram;
    if (!diagram) return;
    
    // 删除边
    diagram.edges = diagram.edges.filter(e => e.id !== id);
    
    if (this.stateManager.selectedEdgeId === id) {
      this.stateManager.setState({ selectedEdgeId: null });
    }
    
    await this.saveDiagram();
    this.diagramCanvas.setDiagram(diagram);
  }
  
  handleSelectNode(id) {
    this.stateManager.setState({ selectedNodeId: id });
    if (id) {
      this.stateManager.setState({ selectedEdgeId: null });
    }
    this.updateStylePanel();
  }
  
  handleSelectEdge(id) {
    this.stateManager.setState({ selectedEdgeId: id });
    if (id) {
      this.stateManager.setState({ selectedNodeId: null });
    }
    this.updateStylePanel();
  }
  
  handleDragStateChange(dragging) {
    this.stateManager.setState({ dragging });
  }
  
  handleDeleteSelection() {
    if (this.stateManager.selectedNodeId) {
      this.handleDeleteNode(this.stateManager.selectedNodeId);
    } else if (this.stateManager.selectedEdgeId) {
      this.handleDeleteEdge(this.stateManager.selectedEdgeId);
    }
  }
  
  async handleResetOverrides() {
    const diagram = this.stateManager.diagram;
    if (!diagram) {
      return;
    }
    
    const nodesUpdate = {};
    const edgesUpdate = {};
    
    for (const node of diagram.nodes) {
      if (node.overridePosition) {
        nodesUpdate[node.id] = null;
      }
    }
    
    for (const edge of diagram.edges) {
      if (edge.overridePoints && edge.overridePoints.length > 0) {
        edgesUpdate[edge.id] = { points: null };
      }
    }
    
    if (Object.keys(nodesUpdate).length === 0 && Object.keys(edgesUpdate).length === 0) {
      return;
    }
    
    await this.handleLayoutUpdate({ nodes: nodesUpdate, edges: edgesUpdate });
  }
  
  async handleAddEdgeJoint() {
    const selectedEdge = this.stateManager.getSelectedEdge();
    if (!selectedEdge) {
      return;
    }
    
    const diagram = this.stateManager.diagram;
    if (!diagram) {
      return;
    }
    
    const edge = diagram.edges.find(e => e.id === selectedEdge.id);
    if (!edge) {
      return;
    }
    
    const route = edge.renderedPoints;
    if (route.length < 2) {
      return;
    }
    
    // 找到最长的线段
    let bestSegment = 0;
    let bestLength = -Infinity;
    for (let index = 0; index < route.length - 1; index++) {
      const start = route[index];
      const end = route[index + 1];
      const length = Math.hypot(end.x - start.x, end.y - start.y);
      if (length > bestLength) {
        bestLength = length;
        bestSegment = index;
      }
    }
    
    const start = route[bestSegment];
    const end = route[bestSegment + 1];
    const newPoint = {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2,
    };
    
    const currentOverrides = edge.overridePoints
      ? edge.overridePoints.map(point => ({ ...point }))
      : [];
    
    // 检查是否已经存在
    const alreadyPresent = currentOverrides.some(point => {
      const dx = point.x - newPoint.x;
      const dy = point.y - newPoint.y;
      return Math.hypot(dx, dy) < 0.25;
    });
    if (alreadyPresent) {
      return;
    }
    
    const insertIndex = Math.min(bestSegment, currentOverrides.length);
    currentOverrides.splice(insertIndex, 0, newPoint);
    
    edge.overridePoints = currentOverrides;
    edge.renderedPoints = currentOverrides;
    
    await this.saveDiagram();
    this.diagramCanvas.setDiagram(diagram);
  }
  
  handleSourceChange(value) {
    this.stateManager.setState({
      sourceDraft: value,
      sourceError: null,
    });
    this.lastSubmittedSource = null;
    
    // Auto-save with debounce
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    
    this.saveTimer = setTimeout(() => {
      this.saveSource();
    }, 700);
  }
  
  async saveSource() {
    const sourceDraft = this.stateManager.sourceDraft;
    const source = this.stateManager.source;
    
    if (sourceDraft === source) {
      this.stateManager.setState({ sourceSaving: false, sourceError: null });
      this.lastSubmittedSource = sourceDraft;
      return;
    }
    
    if (this.lastSubmittedSource === sourceDraft) {
      return;
    }
    
    try {
      this.stateManager.setState({ sourceSaving: true });
      
      // 更新 diagram 的 source
      const diagram = this.stateManager.diagram;
      if (diagram) {
        diagram.source = sourceDraft;
        await this.saveDiagram();
      }
      
      this.stateManager.setState({
        source: sourceDraft,
        sourceSaving: false,
        sourceError: null,
      });
      this.lastSubmittedSource = sourceDraft;
    } catch (error) {
      this.stateManager.setState({
        sourceSaving: false,
        sourceError: error.message,
        error: error.message,
      });
    }
  }
  
  updateStylePanel() {
    const state = this.stateManager.getState();
    const selectedNode = state.selectedNodeId ? this.stateManager.getSelectedNode() : null;
    const selectedEdge = state.selectedEdgeId ? this.stateManager.getSelectedEdge() : null;
    
    // Update caption
    if (selectedNode) {
      this.elements.panelCaption.textContent = `Node: ${selectedNode.label || selectedNode.id}`;
    } else if (selectedEdge) {
      this.elements.panelCaption.textContent = `Edge: ${selectedEdge.label || `${selectedEdge.from}→${selectedEdge.to}`}`;
    } else {
      this.elements.panelCaption.textContent = 'Select an element';
      this.elements.panelCaption.className = 'panel-caption muted';
    }
    
    // Clear existing controls
    this.elements.stylePanelBody.innerHTML = '';
    
    if (selectedNode) {
      this.renderNodeStyleControls(selectedNode, state);
    } else if (selectedEdge) {
      this.renderEdgeStyleControls(selectedEdge, state);
    }
  }
  
  renderNodeStyleControls(node, state) {
    const section = document.createElement('section');
    section.className = 'style-section';
    
    const header = document.createElement('header');
    header.className = 'section-heading';
    header.innerHTML = `
      <h3>Node</h3>
      <span class="section-caption">${node.label || node.id}</span>
    `;
    
    const controls = document.createElement('div');
    controls.className = 'style-controls';
    controls.setAttribute('aria-disabled', state.saving || !node);
    
    // Fill color
    if (!node.image) {
      const fillControl = this.createColorControl('Fill', 'node-fill', node.fillColor, DEFAULT_NODE_COLORS[node.shape], (value) => {
        this.handleNodeFillChange(node.id, value);
      });
      controls.appendChild(fillControl);
    }
    
    // Stroke color
    const strokeControl = this.createColorControl('Stroke', 'node-stroke', node.strokeColor, DEFAULT_EDGE_COLOR, (value) => {
      this.handleNodeStrokeChange(node.id, value);
    });
    controls.appendChild(strokeControl);
    
    // Text color
    const textControl = this.createColorControl('Text', 'node-text', node.textColor, DEFAULT_NODE_TEXT, (value) => {
      this.handleNodeTextColorChange(node.id, value);
    });
    controls.appendChild(textControl);
    
    // Image controls (if node has image)
    if (node.image) {
      const imageControl = this.createImageControl(node, state);
      controls.appendChild(imageControl);
      
      // Title background color
      const labelFillControl = this.createColorControl(
        'Title background',
        'node-label-fill',
        node.labelFillColor,
        node.fillColor ?? DEFAULT_NODE_COLORS[node.shape],
        (value) => {
          this.handleNodeLabelFillChange(node.id, value);
        }
      );
      controls.appendChild(labelFillControl);
      
      // Image background color
      const imageFillControl = this.createColorControl(
        'Image background',
        'node-image-fill',
        node.imageFillColor,
        '#ffffff',
        (value) => {
          this.handleNodeImageFillChange(node.id, value);
        }
      );
      controls.appendChild(imageFillControl);
    }
    
    // Reset button
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'style-reset';
    resetBtn.textContent = 'Reset node style';
    resetBtn.disabled = state.saving || !node;
    resetBtn.addEventListener('click', () => {
      this.handleNodeStyleReset(node.id);
    });
    
    section.appendChild(header);
    section.appendChild(controls);
    section.appendChild(resetBtn);
    this.elements.stylePanelBody.appendChild(section);
  }
  
  renderEdgeStyleControls(edge, state) {
    const section = document.createElement('section');
    section.className = 'style-section';
    
    const header = document.createElement('header');
    header.className = 'section-heading';
    header.innerHTML = `
      <h3>Edge</h3>
      <span class="section-caption">${edge.label || `${edge.from}→${edge.to}`}</span>
    `;
    
    const controls = document.createElement('div');
    controls.className = 'style-controls';
    controls.setAttribute('aria-disabled', state.saving || !edge);
    
    // Color
    const colorControl = this.createColorControl('Color', 'edge-color', edge.color, DEFAULT_EDGE_COLOR, (value) => {
      this.handleEdgeColorChange(edge.id, value);
    });
    controls.appendChild(colorControl);
    
    // Line style
    const lineControl = this.createSelectControl('Line', 'edge-line', LINE_STYLE_OPTIONS, edge.kind || 'solid', (value) => {
      this.handleEdgeLineStyleChange(edge.id, value);
    });
    controls.appendChild(lineControl);
    
    // Arrow direction
    const arrowControl = this.createSelectControl('Arrows', 'edge-arrow', ARROW_DIRECTION_OPTIONS, edge.arrowDirection || 'forward', (value) => {
      this.handleEdgeArrowChange(edge.id, value);
    });
    controls.appendChild(arrowControl);
    
    // Add control point button
    const addJointBtn = document.createElement('button');
    addJointBtn.type = 'button';
    addJointBtn.className = 'style-reset';
    addJointBtn.textContent = 'Add control point';
    addJointBtn.disabled = state.saving || !edge;
    addJointBtn.addEventListener('click', () => {
      this.handleAddEdgeJoint();
    });
    
    // Reset button
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'style-reset';
    resetBtn.textContent = 'Reset edge style';
    resetBtn.disabled = state.saving || !edge;
    resetBtn.addEventListener('click', () => {
      this.handleEdgeStyleReset(edge.id);
    });
    
    section.appendChild(header);
    section.appendChild(controls);
    section.appendChild(addJointBtn);
    section.appendChild(resetBtn);
    this.elements.stylePanelBody.appendChild(section);
  }
  
  createColorControl(label, id, value, fallback, onChange) {
    const control = document.createElement('div');
    control.className = 'style-control';
    
    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    
    const input = document.createElement('input');
    input.type = 'color';
    input.id = id;
    input.value = resolveColor(value, fallback);
    input.addEventListener('change', (e) => {
      onChange(e.target.value);
    });
    
    control.appendChild(labelEl);
    control.appendChild(input);
    return control;
  }
  
  createSelectControl(label, id, options, value, onChange) {
    const control = document.createElement('div');
    control.className = 'style-control';
    
    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    
    const select = document.createElement('select');
    select.id = id;
    options.forEach(option => {
      const optionEl = document.createElement('option');
      optionEl.value = option.value;
      optionEl.textContent = option.label;
      if (option.value === value) {
        optionEl.selected = true;
      }
      select.appendChild(optionEl);
    });
    select.addEventListener('change', (e) => {
      onChange(e.target.value);
    });
    
    control.appendChild(labelEl);
    control.appendChild(select);
    return control;
  }
  
  createImageControl(node, state) {
    const control = document.createElement('div');
    control.className = 'style-control image-control';
    
    const label = document.createElement('span');
    label.textContent = 'Image';
    
    const actions = document.createElement('div');
    actions.className = 'image-control-actions';
    
    const uploadBtn = document.createElement('button');
    uploadBtn.type = 'button';
    uploadBtn.textContent = node.image ? 'Replace PNG' : 'Upload PNG';
    uploadBtn.disabled = state.saving;
    uploadBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png';
      input.addEventListener('change', (e) => {
        this.handleNodeImageFileChange(node.id, e.target.files[0]);
      });
      input.click();
    });
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = 'Remove';
    removeBtn.disabled = state.saving || !node.image;
    removeBtn.addEventListener('click', () => {
      this.handleNodeImageRemove(node.id);
    });
    
    actions.appendChild(uploadBtn);
    actions.appendChild(removeBtn);
    
    const meta = document.createElement('span');
    meta.className = node.image ? 'image-control-meta' : 'image-control-meta muted';
    meta.textContent = node.image
      ? `${node.image.width}x${node.image.height}px (padding ${formatPaddingValue(node.image.padding)}px)`
      : 'No image attached';
    
    control.appendChild(label);
    control.appendChild(actions);
    control.appendChild(meta);
    
    // Add padding input if node has image
    if (node.image) {
      const paddingControl = document.createElement('div');
      paddingControl.className = 'style-control';
      
      const paddingLabel = document.createElement('span');
      paddingLabel.textContent = 'Image padding (px)';
      
      const paddingInput = document.createElement('input');
      paddingInput.type = 'number';
      paddingInput.min = '0';
      paddingInput.step = '1';
      paddingInput.value = formatPaddingValue(node.image.padding);
      paddingInput.disabled = state.saving || !node.image;
      
      let paddingValue = formatPaddingValue(node.image.padding);
      let commitTimer = null;
      
      paddingInput.addEventListener('input', (e) => {
        paddingValue = e.target.value;
        if (commitTimer) {
          clearTimeout(commitTimer);
        }
      });
      
      const commitPadding = async () => {
        const parsed = parseFloat(paddingValue);
        if (!isFinite(parsed)) {
          paddingInput.value = formatPaddingValue(node.image.padding);
          return;
        }
        
        const normalized = normalizePadding(Math.max(0, parsed));
        const current = normalizePadding(node.image.padding);
        const PADDING_EPSILON = 0.001;
        
        if (Math.abs(normalized - current) < PADDING_EPSILON) {
          paddingInput.value = formatPaddingValue(current);
          return;
        }
        
        try {
          this.stateManager.setState({ saving: true });
          const diagram = this.stateManager.diagram;
          if (diagram) {
            const nodeToUpdate = diagram.nodes.find(n => n.id === node.id);
            if (nodeToUpdate && nodeToUpdate.image) {
              nodeToUpdate.image.padding = normalized;
              await this.saveDiagram();
              this.diagramCanvas.setDiagram(diagram);
            }
          }
        } catch (error) {
          this.stateManager.setState({ error: error.message });
          paddingInput.value = formatPaddingValue(current);
        } finally {
          this.stateManager.setState({ saving: false });
        }
      };
      
      paddingInput.addEventListener('blur', () => {
        commitPadding();
      });
      
      paddingInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commitPadding();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          paddingInput.value = formatPaddingValue(node.image.padding);
          paddingInput.blur();
        }
      });
      
      paddingControl.appendChild(paddingLabel);
      paddingControl.appendChild(paddingInput);
      control.appendChild(paddingControl);
    }
    
    return control;
  }
  
  async handleNodeFillChange(nodeId, value) {
    const normalized = normalizeColorInput(value);
    await this.submitStyleUpdate({
      nodeStyles: { [nodeId]: { fill: normalized } },
    });
  }
  
  async handleNodeStrokeChange(nodeId, value) {
    const normalized = normalizeColorInput(value);
    await this.submitStyleUpdate({
      nodeStyles: { [nodeId]: { stroke: normalized } },
    });
  }
  
  async handleNodeTextColorChange(nodeId, value) {
    const normalized = normalizeColorInput(value);
    await this.submitStyleUpdate({
      nodeStyles: { [nodeId]: { text: normalized } },
    });
  }
  
  async handleNodeLabelFillChange(nodeId, value) {
    const normalized = normalizeColorInput(value);
    await this.submitStyleUpdate({
      nodeStyles: { [nodeId]: { labelFill: normalized } },
    });
  }
  
  async handleNodeImageFillChange(nodeId, value) {
    const normalized = normalizeColorInput(value);
    await this.submitStyleUpdate({
      nodeStyles: { [nodeId]: { imageFill: normalized } },
    });
  }
  
  async handleEdgeColorChange(edgeId, value) {
    const normalized = normalizeColorInput(value);
    await this.submitStyleUpdate({
      edgeStyles: { [edgeId]: { color: normalized } },
    });
  }
  
  async handleEdgeLineStyleChange(edgeId, value) {
    await this.submitStyleUpdate({
      edgeStyles: { [edgeId]: { line: value } },
    });
  }
  
  async handleEdgeArrowChange(edgeId, value) {
    await this.submitStyleUpdate({
      edgeStyles: { [edgeId]: { arrow: value } },
    });
  }
  
  async handleNodeStyleReset(nodeId) {
    await this.submitStyleUpdate({
      nodeStyles: { [nodeId]: null },
    });
  }
  
  async handleEdgeStyleReset(edgeId) {
    await this.submitStyleUpdate({
      edgeStyles: { [edgeId]: null },
    });
  }
  
  async submitStyleUpdate(update) {
    const hasNodeStyles = update.nodeStyles && Object.keys(update.nodeStyles).length > 0;
    const hasEdgeStyles = update.edgeStyles && Object.keys(update.edgeStyles).length > 0;
    if (!hasNodeStyles && !hasEdgeStyles) {
      return;
    }
    
    const diagram = this.stateManager.diagram;
    if (!diagram) return;
    
    try {
      this.stateManager.setState({ saving: true, error: null });
      
      // 更新节点样式
      if (update.nodeStyles) {
        for (const [nodeId, styleUpdate] of Object.entries(update.nodeStyles)) {
          const node = diagram.nodes.find(n => n.id === nodeId);
          if (!node) continue;
          
          if (styleUpdate === null) {
            // 重置样式
            node.fillColor = undefined;
            node.strokeColor = undefined;
            node.textColor = undefined;
            node.labelFillColor = undefined;
            node.imageFillColor = undefined;
          } else {
            if (styleUpdate.fill !== undefined) node.fillColor = styleUpdate.fill;
            if (styleUpdate.stroke !== undefined) node.strokeColor = styleUpdate.stroke;
            if (styleUpdate.text !== undefined) node.textColor = styleUpdate.text;
            if (styleUpdate.labelFill !== undefined) node.labelFillColor = styleUpdate.labelFill;
            if (styleUpdate.imageFill !== undefined) node.imageFillColor = styleUpdate.imageFill;
          }
        }
      }
      
      // 更新边样式
      if (update.edgeStyles) {
        for (const [edgeId, styleUpdate] of Object.entries(update.edgeStyles)) {
          const edge = diagram.edges.find(e => e.id === edgeId);
          if (!edge) continue;
          
          if (styleUpdate === null) {
            // 重置样式
            edge.color = undefined;
            edge.kind = 'solid';
            edge.arrowDirection = 'forward';
          } else {
            if (styleUpdate.color !== undefined) edge.color = styleUpdate.color;
            if (styleUpdate.line !== undefined) edge.kind = styleUpdate.line;
            if (styleUpdate.arrow !== undefined) edge.arrowDirection = styleUpdate.arrow;
          }
        }
      }
      
      await this.saveDiagram();
      this.diagramCanvas.setDiagram(diagram);
    } catch (error) {
      this.stateManager.setState({ error: error.message });
    } finally {
      this.stateManager.setState({ saving: false });
    }
  }
  
  async handleNodeImageFileChange(nodeId, file) {
    if (!file) {
      return;
    }
    
    const diagram = this.stateManager.diagram;
    if (!diagram) return;
    
    const declaredType = file.type ? file.type.toLowerCase() : '';
    const effectiveType = declaredType || (file.name.toLowerCase().endsWith('.png') ? 'image/png' : '');
    
    if (effectiveType !== 'image/png') {
      this.stateManager.setState({ error: 'Only PNG images are supported for nodes.' });
      return;
    }
    
    try {
      const preparedImage = await ensureImageWithinLimit(file, MAX_IMAGE_FILE_BYTES);
      
      if (preparedImage.resized) {
        alert(
          `The selected image was ${formatByteSize(preparedImage.originalSize)}. We resized it to ${formatByteSize(preparedImage.finalSize)} to stay under the ${formatByteSize(MAX_IMAGE_FILE_BYTES)} limit.`
        );
      }
      
      this.stateManager.setState({ saving: true, error: null });
      
      // 更新节点图片 - 需要获取实际图片尺寸
      const node = diagram.nodes.find(n => n.id === nodeId);
      if (node) {
        // 从base64数据创建图片以获取尺寸
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = `data:${effectiveType};base64,${preparedImage.base64}`;
        });
        
        const existingPadding = node.image?.padding ?? 0;
        node.image = {
          mimeType: effectiveType,
          data: preparedImage.base64,
          width: img.naturalWidth || img.width || 100,
          height: img.naturalHeight || img.height || 100,
          padding: existingPadding,
        };
      }
      
      await this.saveDiagram();
      this.diagramCanvas.setDiagram(diagram);
    } catch (error) {
      this.stateManager.setState({ error: error.message });
      alert(`${error.message} Maximum allowed size is ${formatByteSize(MAX_IMAGE_FILE_BYTES)}.`);
    } finally {
      this.stateManager.setState({ saving: false });
    }
  }
  
  async handleNodeImageRemove(nodeId) {
    const diagram = this.stateManager.diagram;
    if (!diagram) return;
    
    try {
      this.stateManager.setState({ saving: true, error: null });
      
      const node = diagram.nodes.find(n => n.id === nodeId);
      if (node) {
        node.image = undefined;
      }
      
      await this.saveDiagram();
      this.diagramCanvas.setDiagram(diagram);
    } catch (error) {
      this.stateManager.setState({ error: error.message });
    } finally {
      this.stateManager.setState({ saving: false });
    }
  }
  
  onStateChange(state) {
    // Update status message
    let statusMessage = 'No diagram selected';
    if (state.loading) {
      statusMessage = 'Loading diagram...';
    } else if (state.saving) {
      statusMessage = 'Saving changes...';
    } else if (state.sourceSaving) {
      statusMessage = 'Syncing source...';
    } else if (state.error) {
      statusMessage = `Error: ${state.error}`;
    } else if (state.diagram) {
      statusMessage = `Editing ${state.diagram.sourcePath || 'diagram'}`;
    }
    this.elements.statusMessage.textContent = statusMessage;
    
    // Update error message
    if (state.error) {
      this.elements.errorMessage.textContent = state.error;
      this.elements.errorMessage.style.display = 'block';
    } else {
      this.elements.errorMessage.style.display = 'none';
    }
    
    // Update buttons
    this.elements.resetOverridesBtn.disabled = !this.stateManager.hasOverrides() || state.saving || state.sourceSaving;
    const hasSelection = state.selectedNodeId !== null || state.selectedEdgeId !== null;
    this.elements.deleteSelectedBtn.disabled = !hasSelection || state.saving || state.sourceSaving;
    
    // Update source status
    let sourceStatusText = 'Synced';
    let sourceStatusClass = 'synced';
    if (state.sourceError) {
      sourceStatusText = state.sourceError;
      sourceStatusClass = 'error';
    } else if (state.sourceSaving) {
      sourceStatusText = 'Saving changes…';
      sourceStatusClass = 'saving';
    } else if (state.sourceDraft !== state.source) {
      sourceStatusText = 'Pending changes…';
      sourceStatusClass = 'pending';
    }
    this.elements.sourceStatus.textContent = sourceStatusText;
    this.elements.sourceStatus.className = `source-status ${sourceStatusClass}`;
    
    // Update selection label
    let selectionLabel = 'No selection';
    if (state.selectedNodeId) {
      selectionLabel = `Selected node: ${state.selectedNodeId}`;
    } else if (state.selectedEdgeId) {
      selectionLabel = `Selected edge: ${state.selectedEdgeId}`;
    }
    this.elements.selectionLabel.textContent = selectionLabel;
    
    // Update style panel
    this.updateStylePanel();
    
    // Update diagram canvas selection
    if (this.diagramCanvas) {
      this.diagramCanvas.setSelectedNode(state.selectedNodeId);
      this.diagramCanvas.setSelectedEdge(state.selectedEdgeId);
    }
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.app = new MermaidEditorApp();
  });
} else {
  window.app = new MermaidEditorApp();
}

