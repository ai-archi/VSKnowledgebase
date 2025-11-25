/**
 * Mermaid 源代码到 DiagramData 的转换器
 * 这是一个简化版本，用于在 VS Code 扩展中生成基本的 DiagramData 结构
 */

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface NodeData {
  id: string;
  label: string;
  shape: string;
  autoPosition: Point;
  renderedPosition: Point;
  overridePosition?: Point;
  fillColor?: string;
  strokeColor?: string;
  textColor?: string;
  labelFillColor?: string;
  imageFillColor?: string;
  membership?: string[];
  image?: any;
  width: number;
  height: number;
}

export interface EdgeData {
  id: string;
  from: string;
  to: string;
  label?: string;
  kind: string;
  autoPoints: Point[];
  renderedPoints: Point[];
  overridePoints?: Point[];
  color?: string;
  arrowDirection?: string;
}

export interface DiagramData {
  sourcePath: string;
  background: string;
  autoSize: Size;
  renderSize: Size;
  nodes: NodeData[];
  edges: EdgeData[];
  subgraphs?: any[];
  source: string;
}

/**
 * 将 Mermaid 源代码转换为基本的 DiagramData
 * 这是一个简化版本，主要用于提供基本结构
 */
export function mermaidToDiagramData(source: string, sourcePath: string = ''): DiagramData {
  // 解析 Mermaid 源代码，提取节点和边
  // 这是一个简化的解析器，只处理基本的 graph TD 和 graph LR 格式
  
  const nodes: NodeData[] = [];
  const edges: EdgeData[] = [];
  
  // 默认节点尺寸
  const DEFAULT_NODE_WIDTH = 140;
  const DEFAULT_NODE_HEIGHT = 60;
  
  // 简单的正则表达式匹配节点和边
  // 匹配节点定义：A[Label] 或 A(Label) 或 A{Label} 等
  const nodePattern = /(\w+)\[([^\]]*)\]|(\w+)\(([^)]*)\)|(\w+)\{([^}]*)\}/g;
  const edgePattern = /(\w+)\s*-->\s*(\w+)(?:\s*\|\s*([^|]+)\s*\|)?/g;
  
  // 提取节点
  let nodeMatch;
  const nodeMap = new Map<string, { id: string; label: string; shape: string }>();
  
  while ((nodeMatch = nodePattern.exec(source)) !== null) {
    const id = nodeMatch[1] || nodeMatch[3] || nodeMatch[5];
    const label = (nodeMatch[2] || nodeMatch[4] || nodeMatch[6] || id).trim();
    const shape = nodeMatch[1] ? 'rectangle' : nodeMatch[3] ? 'stadium' : 'diamond';
    
    if (!nodeMap.has(id)) {
      nodeMap.set(id, { id, label, shape });
    }
  }
  
  // 创建节点数据
  let index = 0;
  nodeMap.forEach((nodeInfo) => {
    const x = 200 + (index % 3) * 300;
    const y = 200 + Math.floor(index / 3) * 200;
    const position: Point = { x, y };
    
    nodes.push({
      id: nodeInfo.id,
      label: nodeInfo.label,
      shape: nodeInfo.shape,
      autoPosition: position,
      renderedPosition: position,
      width: DEFAULT_NODE_WIDTH,
      height: DEFAULT_NODE_HEIGHT,
    });
    
    index++;
  });
  
  // 提取边
  let edgeMatch;
  let edgeIndex = 0;
  
  while ((edgeMatch = edgePattern.exec(source)) !== null) {
    const from = edgeMatch[1];
    const to = edgeMatch[2];
    const label = edgeMatch[3]?.trim();
    
    if (nodeMap.has(from) && nodeMap.has(to)) {
      const fromNode = nodes.find(n => n.id === from);
      const toNode = nodes.find(n => n.id === to);
      
      if (fromNode && toNode) {
        const autoPoints: Point[] = [
          { x: fromNode.renderedPosition.x, y: fromNode.renderedPosition.y },
          { x: toNode.renderedPosition.x, y: toNode.renderedPosition.y },
        ];
        
        edges.push({
          id: `edge-${edgeIndex++}`,
          from,
          to,
          label,
          kind: 'solid',
          autoPoints,
          renderedPoints: autoPoints,
        });
      }
    }
  }
  
  // 计算图表尺寸
  const minX = Math.min(...nodes.map(n => n.renderedPosition.x - n.width / 2), 0);
  const maxX = Math.max(...nodes.map(n => n.renderedPosition.x + n.width / 2), 800);
  const minY = Math.min(...nodes.map(n => n.renderedPosition.y - n.height / 2), 0);
  const maxY = Math.max(...nodes.map(n => n.renderedPosition.y + n.height / 2), 600);
  
  const autoSize: Size = {
    width: maxX - minX + 200,
    height: maxY - minY + 200,
  };
  
  return {
    sourcePath,
    background: '#ffffff',
    autoSize,
    renderSize: autoSize,
    nodes,
    edges,
    source,
  };
}

/**
 * 将 DiagramData 转换回 Mermaid 源代码
 * 这是一个简化版本，只保留基本的节点和边信息
 */
export function diagramDataToMermaid(diagram: DiagramData): string {
  // 如果有源代码，优先使用源代码（可能包含样式注释等）
  if (diagram.source) {
    return diagram.source;
  }
  
  // 否则，从节点和边重新生成
  let result = 'graph TD\n';
  
  // 生成节点定义
  diagram.nodes.forEach(node => {
    const shapeChar = node.shape === 'stadium' ? '(' : node.shape === 'diamond' ? '{' : '[';
    const shapeCharEnd = node.shape === 'stadium' ? ')' : node.shape === 'diamond' ? '}' : ']';
    result += `  ${node.id}${shapeChar}${node.label}${shapeCharEnd}\n`;
  });
  
  // 生成边定义
  diagram.edges.forEach(edge => {
    const label = edge.label ? `|${edge.label}|` : '';
    result += `  ${edge.from} --> ${label} ${edge.to}\n`;
  });
  
  return result;
}

