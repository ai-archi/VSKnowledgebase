// Mermaid 代码生成器
// 从 AST 生成 mermaid 源代码，尽量保留原始格式

import type { MermaidAST, NodeStyle, ClassDef, LinkStyle, ClassApplication } from './MermaidParser';

export class MermaidCodeGenerator {
  /**
   * 生成 mermaid 源代码
   */
  generate(ast: MermaidAST, originalSource: string = ''): string {
    // 如果只是样式修改，尝试保留原始格式
    if (originalSource && this.canPreserveFormat(ast, originalSource)) {
      return this.updatePreservingFormat(ast, originalSource);
    }
    
    // 否则生成新代码
    return this.generateNew(ast);
  }
  
  /**
   * 检查是否可以保留格式
   */
  private canPreserveFormat(newAST: MermaidAST, originalSource: string): boolean {
    // 简单检查：如果节点和边的数量相同，可能可以保留格式
    const originalAST = this.parse(originalSource);
    return (
      newAST.nodes.length === originalAST.nodes.length &&
      newAST.edges.length === originalAST.edges.length &&
      newAST.subgraphs.length === originalAST.subgraphs.length
    );
  }
  
  /**
   * 更新代码，保留原始格式（包括 subgraph）
   */
  private updatePreservingFormat(newAST: MermaidAST, originalSource: string): string {
    const lines = originalSource.split('\n');
    const updatedLines = [...lines]; // 保留所有原始行，包括 subgraph
    
    // 标记哪些行是样式相关的，需要更新
    const styleLineNumbers = new Set<number>();
    if (newAST.nodeStyles) {
      newAST.nodeStyles.forEach(styleDef => {
        if (styleDef.lineNumber !== undefined && styleDef.lineNumber >= 0) {
          styleLineNumbers.add(styleDef.lineNumber);
        }
      });
    }
    newAST.classDefs.forEach(classDef => {
      if (classDef.lineNumber >= 0) {
        styleLineNumbers.add(classDef.lineNumber);
      }
    });
    newAST.linkStyles.forEach((linkStyle) => {
      if (linkStyle && linkStyle.lineNumber >= 0) {
        styleLineNumbers.add(linkStyle.lineNumber);
      }
    });
    newAST.classApplications.forEach(app => {
      if (app.lineNumber >= 0) {
        styleLineNumbers.add(app.lineNumber);
      }
    });
    
    // 更新 style 指令（最常用的方式）
    if (newAST.nodeStyles) {
      newAST.nodeStyles.forEach(styleDef => {
        if (styleDef.lineNumber !== undefined && styleDef.lineNumber >= 0 && styleDef.lineNumber < lines.length) {
          // 检查原行的缩进
          const originalLine = lines[styleDef.lineNumber];
          const indent = originalLine.match(/^\s*/)?.[0] || '    ';
          updatedLines[styleDef.lineNumber] = indent + this.generateStyle(styleDef);
        } else if (styleDef.lineNumber === -1) {
          // 新添加的 style，添加到文件末尾（在 subgraph end 之后）
          const insertIndex = this.findInsertIndexForStyle(updatedLines);
          updatedLines.splice(insertIndex, 0, '    ' + this.generateStyle(styleDef));
        }
      });
    }
    
    // 更新 classDef（保留兼容性）
    newAST.classDefs.forEach(classDef => {
      if (classDef.lineNumber >= 0 && classDef.lineNumber < lines.length) {
        // 检查原行的缩进
        const originalLine = lines[classDef.lineNumber];
        const indent = originalLine.match(/^\s*/)?.[0] || '    ';
        updatedLines[classDef.lineNumber] = indent + this.generateClassDef(classDef);
      } else if (classDef.lineNumber === -1) {
        // 新添加的 classDef，添加到文件末尾（在 subgraph end 之前）
        const insertIndex = this.findInsertIndexForStyle(updatedLines);
        updatedLines.splice(insertIndex, 0, '    ' + this.generateClassDef(classDef));
      }
    });
    
    // 更新 linkStyle（需要添加缩进）
    newAST.linkStyles.forEach((linkStyle, index) => {
      if (linkStyle && linkStyle.lineNumber >= 0 && linkStyle.lineNumber < lines.length) {
        // 检查原行的缩进
        const originalLine = lines[linkStyle.lineNumber];
        const indent = originalLine.match(/^\s*/)?.[0] || '    ';
        updatedLines[linkStyle.lineNumber] = indent + this.generateLinkStyle(index, linkStyle);
      } else if (linkStyle && linkStyle.lineNumber === -1) {
        // 新添加的 linkStyle，添加到文件末尾（在 subgraph end 之前）
        const insertIndex = this.findInsertIndexForStyle(updatedLines);
        updatedLines.splice(insertIndex, 0, '    ' + this.generateLinkStyle(index, linkStyle));
      }
    });
    
    // 更新 class 应用（需要添加缩进）
    newAST.classApplications.forEach(app => {
      if (app.lineNumber >= 0 && app.lineNumber < lines.length) {
        // 检查原行的缩进
        const originalLine = lines[app.lineNumber];
        const indent = originalLine.match(/^\s*/)?.[0] || '    ';
        updatedLines[app.lineNumber] = indent + this.generateClassApplication(app);
      } else if (app.lineNumber === -1) {
        // 新添加的 class 应用，添加到文件末尾（在 subgraph end 之前）
        const insertIndex = this.findInsertIndexForStyle(updatedLines);
        updatedLines.splice(insertIndex, 0, '    ' + this.generateClassApplication(app));
      }
    });
    
    return updatedLines.join('\n');
  }
  
  /**
   * 找到插入样式代码的位置（在最后一个 subgraph end 之后，或文件末尾）
   */
  private findInsertIndexForStyle(lines: string[]): number {
    // 从后往前找最后一个 'end'（subgraph 结束标记）
    // 但要确保不是在 subgraph 内部
    let lastEndIndex = -1;
    
    for (let i = lines.length - 1; i >= 0; i--) {
      const trimmed = lines[i].trim();
      if (trimmed === 'end') {
        lastEndIndex = i;
        if (lastEndIndex >= 0) {
          // 找到了完整的 subgraph，在 end 之后插入
          return lastEndIndex + 1;
        }
      }
    }
    
    // 如果找到了 end，在 end 之后插入
    if (lastEndIndex >= 0) {
      return lastEndIndex + 1;
    }
    
    // 如果没有找到 end，返回文件末尾
    return lines.length;
  }
  
  /**
   * 生成新代码
   */
  private generateNew(ast: MermaidAST): string {
    let code = '';
    
    // 生成 init 配置（如果有）
    if (ast.styles && Object.keys(ast.styles).length > 0) {
      code += this.generateInit(ast.styles) + '\n';
    }
    
    // 生成图表声明
    code += `graph ${ast.direction}\n`;
    
    // 生成节点
    ast.nodes.forEach(node => {
      code += `    ${this.generateNode(node)}\n`;
    });
    
    // 生成边
    ast.edges.forEach(edge => {
      code += `    ${this.generateEdge(edge)}\n`;
    });
    
    // 生成 style 指令（最常用的方式）
    if (ast.nodeStyles) {
      ast.nodeStyles.forEach(styleDef => {
        code += `    ${this.generateStyle(styleDef)}\n`;
      });
    }
    
    // 生成 classDef（保留兼容性）
    ast.classDefs.forEach(classDef => {
      code += `    ${this.generateClassDef(classDef)}\n`;
    });
    
    // 生成 class 应用
    ast.classApplications.forEach(app => {
      code += `    ${this.generateClassApplication(app)}\n`;
    });
    
    // 生成 linkStyle
    ast.linkStyles.forEach((linkStyle, index) => {
      if (linkStyle) {
        code += `    ${this.generateLinkStyle(index, linkStyle)}\n`;
      }
    });
    
    return code.trim();
  }
  
  /**
   * 生成节点代码
   */
  private generateNode(node: { id: string; label: string; shape?: string }): string {
    const shapeChars: Record<string, [string, string]> = {
      rectangle: ['[', ']'],
      stadium: ['(', ')'],
      diamond: ['{', '}'],
      circle: ['((', '))'],
      subroutine: ['[[', ']]'],
      cylinder: ['[//', ']'],
      hexagon: ['{//', '}'],
      parallelogram: ['[///', ']'],
    };
    
    const [start, end] = shapeChars[node.shape || 'rectangle'] || ['[', ']'];
    return `${node.id}${start}${node.label}${end}`;
  }
  
  /**
   * 生成边代码
   */
  private generateEdge(edge: { from: string; to: string; label?: string; type: string }): string {
    const typeMap: Record<string, string> = {
      'arrow': '-->',
      'line': '---',
      'dotted-arrow': '-.->',
      'dotted-line': '-.-',
      'thick-arrow': '==>',
      'thick-line': '==='
    };
    
    const connector = typeMap[edge.type] || '-->';
    const label = edge.label ? `|${edge.label}|` : '';
    return `${edge.from} ${connector} ${label} ${edge.to}`;
  }
  
  /**
   * 生成 style 指令（最常用的方式）
   */
  private generateStyle(styleDef: NodeStyle): string {
    const styles = Object.entries(styleDef.styles)
      .map(([key, value]) => {
        // 规范化颜色值
        if ((key === 'fill' || key === 'stroke' || key === 'color') && typeof value === 'string' && value.startsWith('#')) {
          value = this.normalizeColor(value);
        }
        // stroke-width 可以保留 px 单位（Mermaid 支持）
        return `${key}:${value}`;
      })
      .join(',');
    return `style ${styleDef.nodeId} ${styles}`;
  }
  
  /**
   * 生成 classDef
   */
  private generateClassDef(classDef: ClassDef): string {
    const styles = Object.entries(classDef.styles)
      .map(([key, value]) => {
        // 规范化颜色值
        if ((key === 'fill' || key === 'stroke' || key === 'color') && typeof value === 'string' && value.startsWith('#')) {
          // 规范化颜色值格式
          value = this.normalizeColor(value);
        }
        // 规范化 stroke-width 值（移除 px 单位）
        if (key === 'stroke-width' && typeof value === 'string') {
          value = value.replace(/px\s*$/, '');
        }
        return `${key}:${value}`;
      })
      .join(',');
    return `classDef ${classDef.name} ${styles}`;
  }
  
  /**
   * 规范化颜色值
   */
  private normalizeColor(color: string): string {
    if (!color || !color.startsWith('#')) {
      return color;
    }
    
    // 移除 # 号
    const hex = color.slice(1);
    
    // 如果是 3 位十六进制，扩展为 6 位
    if (hex.length === 3) {
      return '#' + hex.split('').map(c => c + c).join('');
    }
    
    // 如果是 1 位，扩展为 6 位（重复 6 次）
    if (hex.length === 1) {
      return '#' + hex.repeat(6);
    }
    
    // 如果是 2 位，扩展为 6 位（灰度值）
    if (hex.length === 2) {
      return '#' + hex.repeat(3);
    }
    
    // 如果已经是 6 位，直接返回
    if (hex.length === 6) {
      return color;
    }
    
    // 其他情况，尝试补齐到 6 位
    if (hex.length < 6) {
      return '#' + hex.padEnd(6, '0');
    }
    
    return color;
  }
  
  /**
   * 生成 class 应用
   */
  private generateClassApplication(app: ClassApplication): string {
    return `class ${app.nodes.join(',')} ${app.className}`;
  }
  
  /**
   * 生成 linkStyle
   */
  private generateLinkStyle(index: number, linkStyle: LinkStyle): string {
    const styles = Object.entries(linkStyle.styles)
      .map(([key, value]) => `${key}:${value}`)
      .join(',');
    return `linkStyle ${index} ${styles}`;
  }
  
  /**
   * 生成 init 配置
   */
  private generateInit(styles: Record<string, string>): string {
    const themeVars = Object.entries(styles)
      .map(([key, value]) => `'${key}':'${value}'`)
      .join(',');
    return `%%{init: {'themeVariables': {${themeVars}}}}%%`;
  }
  
  /**
   * 简单解析（用于格式保留检查）
   */
  private parse(source: string): { nodes: Array<{ id: string }>; edges: Array<{ from: string; to: string }>; subgraphs: Array<{ id: string }> } {
    // 简化版解析，只用于检查结构
    const nodes: Array<{ id: string }> = [];
    const edges: Array<{ from: string; to: string }> = [];
    
    const nodePattern = /(\w+)\[([^\]]*)\]|(\w+)\(([^)]*)\)|(\w+)\{([^}]*)\}/g;
    const edgePattern = /(\w+)\s*-->\s*(\w+)/g;
    
    let match;
    while ((match = nodePattern.exec(source)) !== null) {
      nodes.push({ id: match[1] || match[3] || match[5] || '' });
    }
    
    while ((match = edgePattern.exec(source)) !== null) {
      edges.push({ from: match[1], to: match[2] });
    }
    
    // 简单解析 subgraphs（仅用于格式检查）
    const subgraphPattern = /subgraph\s+(\w+)/gi;
    const subgraphs: Array<{ id: string }> = [];
    while ((match = subgraphPattern.exec(source)) !== null) {
      subgraphs.push({ id: match[1] || '' });
    }
    
    return { nodes, edges, subgraphs };
  }
}

