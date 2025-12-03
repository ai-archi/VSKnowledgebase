// Archimate XML 解析器
// 解析 Archimate 3.1 XML 格式为内部数据结构

export class ArchimateParser {
  /**
   * 解析 Archimate XML
   */
  parse(xml) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');
      
      // 检查解析错误
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        throw new Error('XML 解析错误: ' + parseError.textContent);
      }
      
      const model = doc.querySelector('archimate\\:Model, Model');
      if (!model) {
        throw new Error('未找到 Model 元素');
      }
      
      return {
        name: this.getTextContent(model, 'name'),
        documentation: this.getTextContent(model, 'documentation'),
        elements: this.parseElements(model),
        relationships: this.parseRelationships(model),
        views: this.parseViews(model),
        propertyDefinitions: this.parsePropertyDefinitions(model),
        source: xml
      };
    } catch (error) {
      console.error('Parse error:', error);
      throw new Error(`解析失败: ${error.message}`);
    }
  }
  
  /**
   * 解析元素
   */
  parseElements(model) {
    const elements = [];
    const elementsContainer = model.querySelector('archimate\\:Elements, Elements');
    
    if (!elementsContainer) {
      return elements;
    }
    
    const elementNodes = elementsContainer.querySelectorAll('archimate\\:element, element');
    elementNodes.forEach(elementNode => {
      const type = elementNode.getAttribute('xsi:type') || 
                   elementNode.getAttribute('type') ||
                   elementNode.tagName.replace('archimate:', '');
      
      elements.push({
        identifier: elementNode.getAttribute('identifier'),
        type: type,
        name: this.getTextContent(elementNode, 'name'),
        documentation: this.getTextContent(elementNode, 'documentation'),
        properties: this.parseProperties(elementNode)
      });
    });
    
    return elements;
  }
  
  /**
   * 解析关系
   */
  parseRelationships(model) {
    const relationships = [];
    const relationshipsContainer = model.querySelector('archimate\\:Relationships, Relationships');
    
    if (!relationshipsContainer) {
      return relationships;
    }
    
    const relationshipNodes = relationshipsContainer.querySelectorAll('archimate\\:relationship, relationship');
    relationshipNodes.forEach(relNode => {
      const type = relNode.getAttribute('xsi:type') || 
                   relNode.getAttribute('type') ||
                   relNode.tagName.replace('archimate:', '');
      
      relationships.push({
        identifier: relNode.getAttribute('identifier'),
        type: type,
        source: relNode.getAttribute('source'),
        target: relNode.getAttribute('target'),
        name: this.getTextContent(relNode, 'name'),
        documentation: this.getTextContent(relNode, 'documentation'),
        properties: this.parseProperties(relNode),
        accessType: relNode.getAttribute('accessType'),
        isDirected: relNode.getAttribute('isDirected') === 'true',
        modifier: relNode.getAttribute('modifier')
      });
    });
    
    return relationships;
  }
  
  /**
   * 解析视图
   */
  parseViews(model) {
    const views = [];
    const viewsContainer = model.querySelector('archimate\\:Views, Views');
    
    if (!viewsContainer) {
      return views;
    }
    
    const diagramsContainer = viewsContainer.querySelector('archimate\\:Diagrams, Diagrams');
    if (!diagramsContainer) {
      return views;
    }
    
    const viewNodes = diagramsContainer.querySelectorAll('archimate\\:View, View');
    viewNodes.forEach(viewNode => {
      views.push({
        identifier: viewNode.getAttribute('identifier'),
        name: this.getTextContent(viewNode, 'name'),
        documentation: this.getTextContent(viewNode, 'documentation'),
        viewpoint: viewNode.getAttribute('viewpoint'),
        viewpointRef: viewNode.getAttribute('viewpointRef'),
        nodes: this.parseViewNodes(viewNode),
        connections: this.parseViewConnections(viewNode)
      });
    });
    
    return views;
  }
  
  /**
   * 解析视图节点
   */
  parseViewNodes(view) {
    const nodes = [];
    const nodeNodes = view.querySelectorAll('archimate\\:node, node');
    
    nodeNodes.forEach(nodeNode => {
      nodes.push({
        identifier: nodeNode.getAttribute('identifier'),
        elementRef: nodeNode.getAttribute('elementRef'),
        relationshipRef: nodeNode.getAttribute('relationshipRef'),
        conceptRef: nodeNode.getAttribute('conceptRef'),
        x: parseInt(nodeNode.getAttribute('x') || '0'),
        y: parseInt(nodeNode.getAttribute('y') || '0'),
        w: parseInt(nodeNode.getAttribute('w') || '120'),
        h: parseInt(nodeNode.getAttribute('h') || '60'),
        label: this.getTextContent(nodeNode, 'label'),
        documentation: this.getTextContent(nodeNode, 'documentation'),
        style: this.parseStyle(nodeNode)
      });
    });
    
    return nodes;
  }
  
  /**
   * 解析视图连接
   */
  parseViewConnections(view) {
    const connections = [];
    const connectionNodes = view.querySelectorAll('archimate\\:connection, connection');
    
    connectionNodes.forEach(connNode => {
      connections.push({
        identifier: connNode.getAttribute('identifier'),
        relationshipRef: connNode.getAttribute('relationshipRef'),
        source: connNode.getAttribute('source'),
        target: connNode.getAttribute('target'),
        label: this.getTextContent(connNode, 'label'),
        documentation: this.getTextContent(connNode, 'documentation'),
        style: this.parseStyle(connNode),
        bendpoints: this.parseBendpoints(connNode)
      });
    });
    
    return connections;
  }
  
  /**
   * 解析属性定义
   */
  parsePropertyDefinitions(model) {
    const definitions = [];
    const defsContainer = model.querySelector('archimate\\:PropertyDefinitions, PropertyDefinitions');
    
    if (!defsContainer) {
      return definitions;
    }
    
    const defNodes = defsContainer.querySelectorAll('archimate\\:propertyDefinition, propertyDefinition');
    defNodes.forEach(defNode => {
      definitions.push({
        identifier: defNode.getAttribute('identifier'),
        name: this.getTextContent(defNode, 'name'),
        type: defNode.getAttribute('type')
      });
    });
    
    return definitions;
  }
  
  /**
   * 解析属性
   */
  parseProperties(element) {
    const properties = [];
    const propsContainer = element.querySelector('archimate\\:properties, properties');
    
    if (!propsContainer) {
      return properties;
    }
    
    const propNodes = propsContainer.querySelectorAll('archimate\\:property, property');
    propNodes.forEach(propNode => {
      properties.push({
        propertyDefinitionRef: propNode.getAttribute('propertyDefinitionRef'),
        value: this.getTextContent(propNode, 'value')
      });
    });
    
    return properties;
  }
  
  /**
   * 解析样式
   */
  parseStyle(element) {
    const styleNode = element.querySelector('archimate\\:style, style');
    if (!styleNode) {
      return null;
    }
    
    const style = {};
    
    // 解析颜色
    const lineColor = styleNode.querySelector('archimate\\:lineColor, lineColor');
    if (lineColor) {
      style.lineColor = {
        r: parseInt(lineColor.getAttribute('r') || '0'),
        g: parseInt(lineColor.getAttribute('g') || '0'),
        b: parseInt(lineColor.getAttribute('b') || '0'),
        a: parseInt(lineColor.getAttribute('a') || '100')
      };
    }
    
    const fillColor = styleNode.querySelector('archimate\\:fillColor, fillColor');
    if (fillColor) {
      style.fillColor = {
        r: parseInt(fillColor.getAttribute('r') || '0'),
        g: parseInt(fillColor.getAttribute('g') || '0'),
        b: parseInt(fillColor.getAttribute('b') || '0'),
        a: parseInt(fillColor.getAttribute('a') || '100')
      };
    }
    
    // 解析字体
    const font = styleNode.querySelector('archimate\\:font, font');
    if (font) {
      style.font = {
        name: font.getAttribute('name'),
        size: font.getAttribute('size'),
        style: font.getAttribute('style'),
        color: this.parseRGBColor(font.querySelector('archimate\\:color, color'))
      };
    }
    
    style.lineWidth = styleNode.getAttribute('lineWidth');
    
    return style;
  }
  
  /**
   * 解析 RGB 颜色
   */
  parseRGBColor(colorNode) {
    if (!colorNode) {
      return null;
    }
    
    return {
      r: parseInt(colorNode.getAttribute('r') || '0'),
      g: parseInt(colorNode.getAttribute('g') || '0'),
      b: parseInt(colorNode.getAttribute('b') || '0'),
      a: parseInt(colorNode.getAttribute('a') || '100')
    };
  }
  
  /**
   * 解析折点
   */
  parseBendpoints(connection) {
    const bendpoints = [];
    const bendpointNodes = connection.querySelectorAll('archimate\\:bendpoint, bendpoint');
    
    bendpointNodes.forEach(bpNode => {
      bendpoints.push({
        x: parseInt(bpNode.getAttribute('x') || '0'),
        y: parseInt(bpNode.getAttribute('y') || '0')
      });
    });
    
    return bendpoints;
  }
  
  /**
   * 获取文本内容（支持多语言）
   */
  getTextContent(element, tagName) {
    const nodes = element.querySelectorAll(`${tagName}[xml\\:lang], ${tagName}`);
    if (nodes.length === 0) {
      return '';
    }
    
    // 优先返回默认语言（无 xml:lang 属性）或第一个
    for (let node of nodes) {
      if (!node.getAttribute('xml:lang')) {
        return node.textContent.trim();
      }
    }
    
    return nodes[0].textContent.trim();
  }
}

