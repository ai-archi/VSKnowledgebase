// Mermaid 节点添加器
// 实现快速添加节点功能

import type { MermaidRenderer, ExtendedSVGElement } from './MermaidRenderer';
import type { MermaidParser, MermaidAST, ParsedNode } from './MermaidParser';
import type { MermaidCodeGenerator } from './MermaidCodeGenerator';

export interface SVGPoint {
  x: number;
  y: number;
}

export interface SVGPoint {
  x: number;
  y: number;
}

export class MermaidNodeAdder {
  private renderer: MermaidRenderer;
  private parser: MermaidParser;
  private codeGenerator: MermaidCodeGenerator;
  private nodeCounter: number = 1;
  
  constructor(renderer: MermaidRenderer, parser: MermaidParser, codeGenerator: MermaidCodeGenerator) {
    this.renderer = renderer;
    this.parser = parser;
    this.codeGenerator = codeGenerator;
  }
  
  /**
   * 在指定位置添加节点
   */
  addNodeAtPosition(
    _x: number, 
    _y: number, 
    label: string = '', 
    shape: string = 'rectangle', 
    onComplete?: (newSource: string, nodeId: string) => void
  ): { newSource: string; nodeId: string } {
    const source = this.renderer.getCurrentSource();
    const ast = this.parser.parse(source);
    
    // 生成节点 ID
    const nodeId = this.generateNodeId(ast);
    
    // 创建新节点
    const newNode: ParsedNode = {
      id: nodeId,
      label: label || `节点${this.nodeCounter++}`,
      shape: shape,
      lineNumber: -1
    };
    
    ast.nodes.push(newNode);
    
    // 生成新代码
    const newSource = this.codeGenerator.generate(ast, source);
    
    if (onComplete) {
      onComplete(newSource, nodeId);
    }
    
    return { newSource, nodeId };
  }
  
  /**
   * 生成唯一的节点 ID
   */
  private generateNodeId(ast: MermaidAST): string {
    const existingIds = new Set(ast.nodes.map(n => n.id));
    let id = 'A';
    let counter = 0;
    
    while (existingIds.has(id)) {
      counter++;
      if (counter < 26) {
        id = String.fromCharCode(65 + counter); // A-Z
      } else {
        id = `Node${counter}`;
      }
    }
    
    return id;
  }
  
  /**
   * 显示添加节点对话框
   */
  showAddNodeDialog(svgPoint: SVGPoint, onComplete?: (newSource: string, nodeId: string) => void): void {
    // 创建对话框
    const dialog = document.createElement('div');
    dialog.className = 'mermaid-add-node-dialog';
    // 设置对话框样式（不使用 cssText，避免覆盖其他样式）
    dialog.style.position = 'fixed';
    dialog.style.left = `${svgPoint.x}px`;
    dialog.style.top = `${svgPoint.y}px`;
    dialog.style.background = 'white';
    dialog.style.border = '2px solid #007bff';
    dialog.style.borderRadius = '8px';
    dialog.style.padding = '16px';
    dialog.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    dialog.style.zIndex = '10000';
    dialog.style.minWidth = '200px';
    
    // 标签输入
    const labelLabel = document.createElement('label');
    labelLabel.textContent = '节点标签:';
    labelLabel.style.display = 'block';
    labelLabel.style.marginBottom = '8px';
    labelLabel.style.fontSize = '14px';
    labelLabel.style.fontWeight = '500';
    
    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.placeholder = '输入节点标签';
    labelInput.style.width = '100%';
    labelInput.style.padding = '6px';
    labelInput.style.border = '1px solid #ddd';
    labelInput.style.borderRadius = '4px';
    labelInput.style.marginBottom = '12px';
    labelInput.style.boxSizing = 'border-box';
    
    // 形状选择
    const shapeLabel = document.createElement('label');
    shapeLabel.textContent = '节点形状:';
    shapeLabel.style.display = 'block';
    shapeLabel.style.marginBottom = '8px';
    shapeLabel.style.fontSize = '14px';
    shapeLabel.style.fontWeight = '500';
    
    const shapeSelect = document.createElement('select');
    shapeSelect.style.width = '100%';
    shapeSelect.style.padding = '6px';
    shapeSelect.style.border = '1px solid #ddd';
    shapeSelect.style.borderRadius = '4px';
    shapeSelect.style.marginBottom = '12px';
    shapeSelect.style.boxSizing = 'border-box';
    
    const shapes = [
      { value: 'rectangle', label: '矩形' },
      { value: 'stadium', label: '圆角矩形' },
      { value: 'diamond', label: '菱形' },
      { value: 'circle', label: '圆形' },
      { value: 'subroutine', label: '子程序' }
    ];
    
    shapes.forEach(shape => {
      const option = document.createElement('option');
      option.value = shape.value;
      option.textContent = shape.label;
      shapeSelect.appendChild(option);
    });
    
    // 按钮容器
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '8px';
    buttonContainer.style.justifyContent = 'flex-end';
    
    // 取消按钮
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    // 设置取消按钮样式（不使用 cssText，避免覆盖其他样式）
    cancelBtn.style.padding = '6px 12px';
    cancelBtn.style.border = '1px solid #ddd';
    cancelBtn.style.background = 'white';
    cancelBtn.style.borderRadius = '4px';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.style.fontSize = '14px';
    
    // 添加按钮
    const addBtn = document.createElement('button');
    addBtn.textContent = '添加';
    // 设置添加按钮样式（不使用 cssText，避免覆盖其他样式）
    addBtn.style.padding = '6px 12px';
    addBtn.style.border = 'none';
    addBtn.style.background = '#007bff';
    addBtn.style.color = 'white';
    addBtn.style.borderRadius = '4px';
    addBtn.style.cursor = 'pointer';
    addBtn.style.fontSize = '14px';
    
    // 组装对话框
    dialog.appendChild(labelLabel);
    dialog.appendChild(labelInput);
    dialog.appendChild(shapeLabel);
    dialog.appendChild(shapeSelect);
    buttonContainer.appendChild(cancelBtn);
    buttonContainer.appendChild(addBtn);
    dialog.appendChild(buttonContainer);
    
    document.body.appendChild(dialog);
    
    // 聚焦输入框
    labelInput.focus();
    
    // 添加事件
    const cleanup = () => {
      if (document.body.contains(dialog)) {
        document.body.removeChild(dialog);
      }
    };
    
    const add = () => {
      const label = labelInput.value.trim() || `节点${this.nodeCounter++}`;
      const shape = shapeSelect.value;
      const result = this.addNodeAtPosition(svgPoint.x, svgPoint.y, label, shape);
      cleanup();
      if (onComplete) {
        onComplete(result.newSource, result.nodeId);
      }
    };
    
    addBtn.addEventListener('click', add);
    cancelBtn.addEventListener('click', cleanup);
    
    labelInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        add();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cleanup();
      }
    });
    
    // 点击外部关闭
    const clickOutside = (e: MouseEvent) => {
      if (!dialog.contains(e.target as Node)) {
        cleanup();
        document.removeEventListener('click', clickOutside);
      }
    };
    setTimeout(() => {
      document.addEventListener('click', clickOutside);
    }, 100);
  }
  
  /**
   * 将屏幕坐标转换为 SVG 坐标
   */
  getSVGPoint(svg: ExtendedSVGElement, clientX: number, clientY: number): SVGPoint | null {
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    return point.matrixTransform(ctm.inverse());
  }
}

