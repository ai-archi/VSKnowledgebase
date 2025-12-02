// Mermaid 标签编辑器
// 实现节点和边标签的内联编辑功能

export class MermaidLabelEditor {
  constructor(renderer, parser, codeGenerator) {
    this.renderer = renderer;
    this.parser = parser;
    this.codeGenerator = codeGenerator;
    this.currentEdit = null;
  }
  
  /**
   * 开始编辑节点标签
   */
  startNodeLabelEdit(nodeId, onComplete) {
    const nodeInfo = this.renderer.getNode(nodeId);
    if (!nodeInfo) return;
    
    const svg = this.renderer.getCurrentSVG();
    const nodeElement = svg.querySelector(`[data-node-id="${nodeId}"]`);
    if (!nodeElement) return;
    
    const textElement = nodeElement.querySelector('text');
    if (!textElement) return;
    
    const currentLabel = textElement.textContent.trim();
    this.startEdit(textElement, nodeElement, currentLabel, (newLabel) => {
      this.updateNodeLabel(nodeId, newLabel, onComplete);
    });
  }
  
  /**
   * 开始编辑边标签
   */
  startEdgeLabelEdit(edgeIndex, onComplete) {
    const edgeInfo = this.renderer.getEdge(edgeIndex);
    if (!edgeInfo) return;
    
    const svg = this.renderer.getCurrentSVG();
    const edgeElement = svg.querySelector(`[data-edge-index="${edgeIndex}"]`);
    if (!edgeElement) return;
    
    // 查找边标签（可能在 edgeLabel 中）
    const labelElement = edgeElement.parentElement?.querySelector('.edgeLabel text') ||
                        edgeElement.parentElement?.querySelector('.edgeLabel');
    
    if (!labelElement) {
      // 如果没有标签元素，创建一个
      this.createEdgeLabel(edgeElement, edgeIndex, onComplete);
      return;
    }
    
    const currentLabel = labelElement.textContent?.trim() || '';
    this.startEdit(labelElement, edgeElement, currentLabel, (newLabel) => {
      this.updateEdgeLabel(edgeIndex, newLabel, onComplete);
    });
  }
  
  /**
   * 开始编辑（通用方法）
   */
  startEdit(textElement, parentElement, currentText, onComplete) {
    // 如果正在编辑，先取消
    if (this.currentEdit) {
      this.cancelEdit();
    }
    
    const bbox = textElement.getBBox();
    const svg = this.renderer.getCurrentSVG();
    
    // 创建输入框容器
    const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    foreignObject.setAttribute('x', bbox.x - 10);
    foreignObject.setAttribute('y', bbox.y - 5);
    foreignObject.setAttribute('width', Math.max(bbox.width + 20, 150));
    foreignObject.setAttribute('height', bbox.height + 10);
    foreignObject.setAttribute('class', 'mermaid-label-editor');
    
    // 创建输入框
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    input.style.width = '100%';
    input.style.height = '100%';
    input.style.padding = '2px 5px';
    input.style.border = '2px solid #007bff';
    input.style.borderRadius = '4px';
    input.style.fontSize = textElement.getAttribute('font-size') || '14px';
    input.style.fontFamily = textElement.getAttribute('font-family') || 'Arial, sans-serif';
    input.style.backgroundColor = '#ffffff';
    input.style.boxSizing = 'border-box';
    
    foreignObject.appendChild(input);
    svg.appendChild(foreignObject);
    
    // 保存编辑状态
    this.currentEdit = {
      foreignObject,
      input,
      textElement,
      originalText: currentText,
      onComplete
    };
    
    // 聚焦并选中文本
    input.focus();
    input.select();
    
    // 绑定事件
    const save = () => {
      const newText = input.value.trim();
      if (newText !== currentText) {
        onComplete(newText);
      } else {
        this.cancelEdit();
      }
    };
    
    const cancel = () => {
      this.cancelEdit();
    };
    
    input.addEventListener('blur', save);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        save();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      }
    });
    
    // 阻止点击事件冒泡
    foreignObject.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }
  
  /**
   * 取消编辑
   */
  cancelEdit() {
    if (this.currentEdit) {
      const svg = this.renderer.getCurrentSVG();
      if (svg && svg.contains(this.currentEdit.foreignObject)) {
        svg.removeChild(this.currentEdit.foreignObject);
      }
      this.currentEdit = null;
    }
  }
  
  /**
   * 更新节点标签
   */
  updateNodeLabel(nodeId, newLabel, onComplete) {
    const source = this.renderer.getCurrentSource();
    const ast = this.parser.parse(source);
    
    // 更新节点标签
    const node = ast.nodes.find(n => n.id === nodeId);
    if (node) {
      node.label = newLabel;
    }
    
    // 生成新代码
    const newSource = this.codeGenerator.generate(ast, source);
    
    // 取消编辑状态
    this.cancelEdit();
    
    // 重新渲染
    if (onComplete) {
      onComplete(newSource);
    }
  }
  
  /**
   * 更新边标签
   */
  updateEdgeLabel(edgeIndex, newLabel, onComplete) {
    const source = this.renderer.getCurrentSource();
    const ast = this.parser.parse(source);
    
    // 更新边标签
    const edge = ast.edges[edgeIndex];
    if (edge) {
      edge.label = newLabel;
    }
    
    // 生成新代码
    const newSource = this.codeGenerator.generate(ast, source);
    
    // 取消编辑状态
    this.cancelEdit();
    
    // 重新渲染
    if (onComplete) {
      onComplete(newSource);
    }
  }
  
  /**
   * 为没有标签的边创建标签
   */
  createEdgeLabel(edgeElement, edgeIndex, onComplete) {
    const svg = this.renderer.getCurrentSVG();
    const path = edgeElement.querySelector('path');
    if (!path) return;
    
    // 获取路径中点
    const pathLength = path.getTotalLength();
    const midPoint = path.getPointAtLength(pathLength / 2);
    
    // 创建标签元素
    const labelGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    labelGroup.setAttribute('class', 'edgeLabel');
    labelGroup.setAttribute('transform', `translate(${midPoint.x}, ${midPoint.y})`);
    
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.textContent = '';
    
    labelGroup.appendChild(text);
    edgeElement.parentElement.appendChild(labelGroup);
    
    // 开始编辑
    this.startEdit(text, edgeElement, '', (newLabel) => {
      this.updateEdgeLabel(edgeIndex, newLabel, onComplete);
    });
  }
  
  /**
   * 检查是否正在编辑
   */
  isEditing() {
    return this.currentEdit !== null;
  }
}

