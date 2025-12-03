// Archimate XML 代码生成器
// 从内部数据结构生成 Archimate 3.1 XML 格式

export class ArchimateCodeGenerator {
  /**
   * 生成 Archimate XML
   */
  generate(ast, originalXML = '') {
    // 如果只是样式修改，尝试保留原始格式
    if (originalXML && this.canPreserveFormat(ast, originalXML)) {
      return this.updatePreservingFormat(ast, originalXML);
    }
    
    // 否则生成新代码
    return this.generateNew(ast);
  }
  
  /**
   * 检查是否可以保留格式
   */
  canPreserveFormat(newAST, originalXML) {
    try {
      const originalAST = this.parse(originalXML);
      return (
        newAST.elements.length === originalAST.elements.length &&
        newAST.relationships.length === originalAST.relationships.length &&
        newAST.views.length === originalAST.views.length
      );
    } catch (e) {
      return false;
    }
  }
  
  /**
   * 更新代码，保留原始格式
   */
  updatePreservingFormat(newAST, originalXML) {
    // TODO: 实现格式保留更新
    // 目前简单返回新生成的代码
    return this.generateNew(newAST);
  }
  
  /**
   * 生成新 XML
   */
  generateNew(ast) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<archimate:Model xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ';
    xml += 'xmlns:archimate="http://www.opengroup.org/xsd/archimate/3.0/" ';
    xml += 'xsi:schemaLocation="http://www.opengroup.org/xsd/archimate/3.0/ ';
    xml += 'http://www.opengroup.org/xsd/archimate/3.1/archimate3_Diagram.xsd">\n';
    
    // 模型名称和文档
    if (ast.name) {
      xml += `  <name>${this.escapeXML(ast.name)}</name>\n`;
    }
    if (ast.documentation) {
      xml += `  <documentation>${this.escapeXML(ast.documentation)}</documentation>\n`;
    }
    
    // 元素
    if (ast.elements && ast.elements.length > 0) {
      xml += '  <archimate:Elements>\n';
      ast.elements.forEach(element => {
        xml += this.generateElement(element);
      });
      xml += '  </archimate:Elements>\n';
    }
    
    // 关系
    if (ast.relationships && ast.relationships.length > 0) {
      xml += '  <archimate:Relationships>\n';
      ast.relationships.forEach(relationship => {
        xml += this.generateRelationship(relationship);
      });
      xml += '  </archimate:Relationships>\n';
    }
    
    // 视图
    if (ast.views && ast.views.length > 0) {
      xml += '  <archimate:Views>\n';
      xml += '    <archimate:Diagrams>\n';
      ast.views.forEach(view => {
        xml += this.generateView(view);
      });
      xml += '    </archimate:Diagrams>\n';
      xml += '  </archimate:Views>\n';
    }
    
    // 属性定义
    if (ast.propertyDefinitions && ast.propertyDefinitions.length > 0) {
      xml += '  <archimate:PropertyDefinitions>\n';
      ast.propertyDefinitions.forEach(def => {
        xml += this.generatePropertyDefinition(def);
      });
      xml += '  </archimate:PropertyDefinitions>\n';
    }
    
    xml += '</archimate:Model>';
    
    return xml;
  }
  
  /**
   * 生成元素
   */
  generateElement(element) {
    let xml = `    <archimate:element xsi:type="archimate:${element.type}" identifier="${element.identifier}">\n`;
    
    if (element.name) {
      xml += `      <name>${this.escapeXML(element.name)}</name>\n`;
    }
    if (element.documentation) {
      xml += `      <documentation>${this.escapeXML(element.documentation)}</documentation>\n`;
    }
    if (element.properties && element.properties.length > 0) {
      xml += this.generateProperties(element.properties);
    }
    
    xml += '    </archimate:element>\n';
    return xml;
  }
  
  /**
   * 生成关系
   */
  generateRelationship(relationship) {
    let xml = `    <archimate:relationship xsi:type="archimate:${relationship.type}" `;
    xml += `identifier="${relationship.identifier}" `;
    xml += `source="${relationship.source}" `;
    xml += `target="${relationship.target}"`;
    
    if (relationship.accessType) {
      xml += ` accessType="${relationship.accessType}"`;
    }
    if (relationship.isDirected) {
      xml += ` isDirected="true"`;
    }
    if (relationship.modifier) {
      xml += ` modifier="${this.escapeXML(relationship.modifier)}"`;
    }
    
    xml += '>\n';
    
    if (relationship.name) {
      xml += `      <name>${this.escapeXML(relationship.name)}</name>\n`;
    }
    if (relationship.documentation) {
      xml += `      <documentation>${this.escapeXML(relationship.documentation)}</documentation>\n`;
    }
    if (relationship.properties && relationship.properties.length > 0) {
      xml += this.generateProperties(relationship.properties);
    }
    
    xml += '    </archimate:relationship>\n';
    return xml;
  }
  
  /**
   * 生成视图
   */
  generateView(view) {
    let xml = `      <archimate:View identifier="${view.identifier}"`;
    
    if (view.viewpoint) {
      xml += ` viewpoint="${this.escapeXML(view.viewpoint)}"`;
    }
    if (view.viewpointRef) {
      xml += ` viewpointRef="${view.viewpointRef}"`;
    }
    
    xml += '>\n';
    
    if (view.name) {
      xml += `        <name>${this.escapeXML(view.name)}</name>\n`;
    }
    if (view.documentation) {
      xml += `        <documentation>${this.escapeXML(view.documentation)}</documentation>\n`;
    }
    
    // 节点
    if (view.nodes && view.nodes.length > 0) {
      view.nodes.forEach(node => {
        xml += this.generateViewNode(node);
      });
    }
    
    // 连接
    if (view.connections && view.connections.length > 0) {
      view.connections.forEach(connection => {
        xml += this.generateViewConnection(connection);
      });
    }
    
    xml += '      </archimate:View>\n';
    return xml;
  }
  
  /**
   * 生成视图节点
   */
  generateViewNode(node) {
    let xml = `        <archimate:node identifier="${node.identifier}"`;
    
    if (node.elementRef) {
      xml += ` elementRef="${node.elementRef}"`;
    }
    if (node.relationshipRef) {
      xml += ` relationshipRef="${node.relationshipRef}"`;
    }
    if (node.conceptRef) {
      xml += ` conceptRef="${node.conceptRef}"`;
    }
    
    xml += ` x="${node.x || 0}" y="${node.y || 0}" w="${node.w || 120}" h="${node.h || 60}"`;
    
    xml += '>\n';
    
    if (node.label) {
      xml += `          <label>${this.escapeXML(node.label)}</label>\n`;
    }
    if (node.documentation) {
      xml += `          <documentation>${this.escapeXML(node.documentation)}</documentation>\n`;
    }
    if (node.style) {
      xml += this.generateStyle(node.style);
    }
    
    xml += '        </archimate:node>\n';
    return xml;
  }
  
  /**
   * 生成视图连接
   */
  generateViewConnection(connection) {
    let xml = `        <archimate:connection identifier="${connection.identifier}"`;
    
    if (connection.relationshipRef) {
      xml += ` relationshipRef="${connection.relationshipRef}"`;
    }
    
    xml += ` source="${connection.source}" target="${connection.target}"`;
    
    xml += '>\n';
    
    if (connection.label) {
      xml += `          <label>${this.escapeXML(connection.label)}</label>\n`;
    }
    if (connection.documentation) {
      xml += `          <documentation>${this.escapeXML(connection.documentation)}</documentation>\n`;
    }
    if (connection.style) {
      xml += this.generateStyle(connection.style);
    }
    if (connection.bendpoints && connection.bendpoints.length > 0) {
      connection.bendpoints.forEach(bp => {
        xml += `          <archimate:bendpoint x="${bp.x}" y="${bp.y}"/>\n`;
      });
    }
    
    xml += '        </archimate:connection>\n';
    return xml;
  }
  
  /**
   * 生成样式
   */
  generateStyle(style) {
    let xml = '          <archimate:style';
    if (style.lineWidth) {
      xml += ` lineWidth="${style.lineWidth}"`;
    }
    xml += '>\n';
    
    if (style.lineColor) {
      xml += `            <archimate:lineColor r="${style.lineColor.r}" g="${style.lineColor.g}" b="${style.lineColor.b}"`;
      if (style.lineColor.a !== undefined) {
        xml += ` a="${style.lineColor.a}"`;
      }
      xml += '/>\n';
    }
    
    if (style.fillColor) {
      xml += `            <archimate:fillColor r="${style.fillColor.r}" g="${style.fillColor.g}" b="${style.fillColor.b}"`;
      if (style.fillColor.a !== undefined) {
        xml += ` a="${style.fillColor.a}"`;
      }
      xml += '/>\n';
    }
    
    if (style.font) {
      xml += '            <archimate:font';
      if (style.font.name) {
        xml += ` name="${this.escapeXML(style.font.name)}"`;
      }
      if (style.font.size) {
        xml += ` size="${style.font.size}"`;
      }
      if (style.font.style) {
        xml += ` style="${this.escapeXML(style.font.style)}"`;
      }
      xml += '>\n';
      
      if (style.font.color) {
        xml += `              <archimate:color r="${style.font.color.r}" g="${style.font.color.g}" b="${style.font.color.b}"`;
        if (style.font.color.a !== undefined) {
          xml += ` a="${style.font.color.a}"`;
        }
        xml += '/>\n';
      }
      
      xml += '            </archimate:font>\n';
    }
    
    xml += '          </archimate:style>\n';
    return xml;
  }
  
  /**
   * 生成属性定义
   */
  generatePropertyDefinition(def) {
    let xml = `    <archimate:propertyDefinition identifier="${def.identifier}" type="${def.type}">\n`;
    if (def.name) {
      xml += `      <name>${this.escapeXML(def.name)}</name>\n`;
    }
    xml += '    </archimate:propertyDefinition>\n';
    return xml;
  }
  
  /**
   * 生成属性
   */
  generateProperties(properties) {
    let xml = '      <archimate:properties>\n';
    properties.forEach(prop => {
      xml += `        <archimate:property propertyDefinitionRef="${prop.propertyDefinitionRef}">\n`;
      xml += `          <value>${this.escapeXML(prop.value)}</value>\n`;
      xml += '        </archimate:property>\n';
    });
    xml += '      </archimate:properties>\n';
    return xml;
  }
  
  /**
   * 转义 XML 特殊字符
   */
  escapeXML(text) {
    if (!text) {
      return '';
    }
    
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
  
  /**
   * 简单解析（用于格式保留检查）
   */
  parse(xml) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');
      const model = doc.querySelector('archimate\\:Model, Model');
      
      if (!model) {
        return { elements: [], relationships: [], views: [] };
      }
      
      const elementsContainer = model.querySelector('archimate\\:Elements, Elements');
      const relationshipsContainer = model.querySelector('archimate\\:Relationships, Relationships');
      const viewsContainer = model.querySelector('archimate\\:Views, Views');
      
      return {
        elements: elementsContainer ? elementsContainer.querySelectorAll('archimate\\:element, element').length : 0,
        relationships: relationshipsContainer ? relationshipsContainer.querySelectorAll('archimate\\:relationship, relationship').length : 0,
        views: viewsContainer ? viewsContainer.querySelectorAll('archimate\\:View, View').length : 0
      };
    } catch (e) {
      return { elements: [], relationships: [], views: [] };
    }
  }
}

