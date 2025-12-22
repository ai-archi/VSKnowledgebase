// Mermaid 源代码解析器
// 解析 mermaid 源代码为 AST，用于编辑操作

export interface ParsedNode {
  id: string;
  label: string;
  shape: string;
  lineNumber?: number;
}

export interface ParsedEdge {
  from: string;
  to: string;
  label: string;
  type: string;
  index?: number;
  lineNumber?: number;
}

export interface ClassDef {
  name: string;
  styles: Record<string, string>;
  lineNumber: number;
}

export interface ClassApplication {
  nodes: string[];
  className: string;
  lineNumber: number;
}

export interface NodeStyle {
  nodeId: string;
  styles: Record<string, string>;
  lineNumber: number;
}

export interface LinkStyle {
  styles: Record<string, string>;
  lineNumber: number;
}

export interface Subgraph {
  id: string;
  label: string;
  nodes: string[];
  lineNumber: number;
}

export interface MermaidAST {
  type: string;
  direction: string;
  nodes: ParsedNode[];
  edges: ParsedEdge[];
  classDefs: ClassDef[];
  linkStyles: LinkStyle[];
  subgraphs: Subgraph[];
  classApplications: ClassApplication[];
  nodeStyles: NodeStyle[];
  styles: Record<string, string>;
  source: string;
}

export class MermaidParser {
  /**
   * 解析 mermaid 源代码
   */
  parse(source: string): MermaidAST {
    const ast: MermaidAST = {
      type: this.detectDiagramType(source),
      direction: this.extractDirection(source),
      nodes: [],
      edges: [],
      classDefs: [],
      linkStyles: [],
      subgraphs: [],
      classApplications: [],
      nodeStyles: [],
      styles: this.extractStyles(source),
      source: source
    };
    
    const lines = source.split('\n');
    let inSubgraph = false;
    let currentSubgraph: Subgraph | null = null;
    let edgeIndex = 0;
    
    lines.forEach((line, lineIndex) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('%%')) {
        return; // 跳过空行和注释
      }
      
      // 解析节点
      const nodeMatch = this.parseNode(trimmed);
      if (nodeMatch) {
        const node: ParsedNode = {
          ...nodeMatch,
          lineNumber: lineIndex
        };
        
        if (inSubgraph && currentSubgraph) {
          if (!currentSubgraph.nodes) {
            currentSubgraph.nodes = [];
          }
          currentSubgraph.nodes.push(node.id);
        } else {
          ast.nodes.push(node);
        }
        return;
      }
      
      // 解析边
      const edgeMatch = this.parseEdge(trimmed);
      if (edgeMatch) {
        ast.edges.push({
          ...edgeMatch,
          index: edgeIndex++,
          lineNumber: lineIndex
        });
        return;
      }
      
      // 解析 classDef
      const classDefMatch = trimmed.match(/classDef\s+(\w+)\s+(.+)/);
      if (classDefMatch) {
        ast.classDefs.push({
          name: classDefMatch[1],
          styles: this.parseStyles(classDefMatch[2]),
          lineNumber: lineIndex
        });
        return;
      }
      
      // 解析 class 应用
      const classMatch = trimmed.match(/class\s+([\w,]+)\s+(\w+)/);
      if (classMatch) {
        ast.classApplications.push({
          nodes: classMatch[1].split(',').map(s => s.trim()),
          className: classMatch[2],
          lineNumber: lineIndex
        });
        return;
      }
      
      // 解析 style 指令（最常用的方式）
      const styleMatch = trimmed.match(/style\s+(\w+)\s+(.+)/);
      if (styleMatch) {
        ast.nodeStyles.push({
          nodeId: styleMatch[1],
          styles: this.parseStyles(styleMatch[2]),
          lineNumber: lineIndex
        });
        return;
      }
      
      // 解析 linkStyle
      const linkStyleMatch = trimmed.match(/linkStyle\s+(\d+)\s+(.+)/);
      if (linkStyleMatch) {
        const index = parseInt(linkStyleMatch[1]);
        ast.linkStyles[index] = {
          styles: this.parseStyles(linkStyleMatch[2]),
          lineNumber: lineIndex
        };
        return;
      }
      
      // 解析 subgraph
      if (trimmed.match(/subgraph/)) {
        inSubgraph = true;
        const subgraphMatch = trimmed.match(/subgraph\s+(\w+)?\[?([^\]]*)\]?/);
        currentSubgraph = {
          id: subgraphMatch?.[1] || `subgraph-${ast.subgraphs.length}`,
          label: subgraphMatch?.[2] || '',
          nodes: [],
          lineNumber: lineIndex
        };
        ast.subgraphs.push(currentSubgraph);
      } else if (trimmed === 'end' && inSubgraph) {
        inSubgraph = false;
        currentSubgraph = null;
      }
    });
    
    return ast;
  }
  
  /**
   * 解析节点
   */
  parseNode(line: string): ParsedNode | null {
    const patterns = [
      { regex: /^(\w+)\[([^\]]*)\]$/, shape: 'rectangle' },
      { regex: /^(\w+)\(([^)]*)\)$/, shape: 'stadium' },
      { regex: /^(\w+)\{([^}]*)\}$/, shape: 'diamond' },
      { regex: /^(\w+)\(\(([^)]*)\)\)$/, shape: 'circle' },
      { regex: /^(\w+)\[\[([^\]]*)\]\]$/, shape: 'subroutine' },
      { regex: /^(\w+)\[(\/\/[^\]]*)\]$/, shape: 'cylinder' },
      { regex: /^(\w+)\{(\/\/[^}]*)\}$/, shape: 'hexagon' },
      { regex: /^(\w+)\[(\/\/\/[^\]]*)\]$/, shape: 'parallelogram' },
    ];
    
    for (const pattern of patterns) {
      const match = line.match(pattern.regex);
      if (match) {
        return {
          id: match[1],
          label: match[2] || match[1],
          shape: pattern.shape
        };
      }
    }
    
    return null;
  }
  
  /**
   * 解析边
   */
  parseEdge(line: string): Omit<ParsedEdge, 'index' | 'lineNumber'> | null {
    const patterns = [
      { regex: /^(\w+)\s*-->\s*(\w+)(?:\s*\|\s*([^|]+)\s*\|)?$/, type: 'arrow' },
      { regex: /^(\w+)\s*---\s*(\w+)(?:\s*\|\s*([^|]+)\s*\|)?$/, type: 'line' },
      { regex: /^(\w+)\s*-\.->\s*(\w+)(?:\s*\|\s*([^|]+)\s*\|)?$/, type: 'dotted-arrow' },
      { regex: /^(\w+)\s*-\.-\s*(\w+)(?:\s*\|\s*([^|]+)\s*\|)?$/, type: 'dotted-line' },
      { regex: /^(\w+)\s*==>\s*(\w+)(?:\s*\|\s*([^|]+)\s*\|)?$/, type: 'thick-arrow' },
      { regex: /^(\w+)\s*===\s*(\w+)(?:\s*\|\s*([^|]+)\s*\|)?$/, type: 'thick-line' },
    ];
    
    for (const pattern of patterns) {
      const match = line.match(pattern.regex);
      if (match) {
        return {
          from: match[1],
          to: match[2],
          label: match[3]?.trim() || '',
          type: pattern.type
        };
      }
    }
    
    return null;
  }
  
  /**
   * 解析样式字符串
   */
  parseStyles(styleString: string): Record<string, string> {
    const styles: Record<string, string> = {};
    const pairs = styleString.split(',');
    
    pairs.forEach(pair => {
      const [key, value] = pair.split(':').map(s => s.trim());
      if (key && value) {
        styles[key] = value;
      }
    });
    
    return styles;
  }
  
  /**
   * 检测图表类型
   */
  detectDiagramType(source: string): string {
    if (source.match(/^graph\s+/)) return 'flowchart';
    if (source.match(/^sequenceDiagram/)) return 'sequence';
    if (source.match(/^classDiagram/)) return 'class';
    if (source.match(/^stateDiagram/)) return 'state';
    if (source.match(/^gantt/)) return 'gantt';
    return 'flowchart';
  }
  
  /**
   * 提取方向
   */
  extractDirection(source: string): string {
    const match = source.match(/^graph\s+(TD|LR|BT|RL)/);
    return match ? match[1] : 'TD';
  }
  
  /**
   * 提取样式配置
   */
  extractStyles(source: string): Record<string, string> {
    const styles: Record<string, string> = {};
    const initMatch = source.match(/%%\{init:\s*\{([^}]+)\}\}%%/);
    if (initMatch) {
      // 简单解析 themeVariables
      const themeMatch = initMatch[1].match(/themeVariables:\s*\{([^}]+)\}/);
      if (themeMatch) {
        const themeVars = themeMatch[1];
        const varPairs = themeVars.split(',');
        varPairs.forEach(pair => {
          const [key, value] = pair.split(':').map(s => s.trim().replace(/['"]/g, ''));
          if (key && value) {
            styles[key] = value;
          }
        });
      }
    }
    return styles;
  }
}

