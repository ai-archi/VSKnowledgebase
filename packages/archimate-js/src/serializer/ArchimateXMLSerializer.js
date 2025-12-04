import { ArchimateModel } from '../utils/ArchimateModel.js';

/**
 * ArchiMate XML 序列化器
 * 将模型序列化为 ArchiMate 3.x XML 格式
 */
export class ArchimateXMLSerializer {
  constructor() {
    this.namespace = 'http://www.opengroup.org/xsd/archimate/3.0/';
    this.schemaLocation = 'http://www.opengroup.org/xsd/archimate/3.0/ http://www.opengroup.org/xsd/archimate/3.1/archimate3_Diagram.xsd';
  }

  /**
   * 序列化模型为 XML 字符串
   */
  serialize(model, format = false) {
    const doc = document.implementation.createDocument(this.namespace, 'model', null);
    const modelEl = doc.documentElement;

    // 设置命名空间和属性
    modelEl.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns', this.namespace);
    modelEl.setAttributeNS('http://www.w3.org/2001/XMLSchema-instance', 'xsi:schemaLocation', this.schemaLocation);
    modelEl.setAttribute('identifier', model.identifier);

    // 添加名称
    if (model.name) {
      const nameEl = doc.createElementNS(this.namespace, 'name');
      nameEl.textContent = model.name;
      modelEl.appendChild(nameEl);
    }

    // 添加文档
    if (model.documentation) {
      const docEl = doc.createElementNS(this.namespace, 'documentation');
      docEl.textContent = model.documentation;
      modelEl.appendChild(docEl);
    }

    // 添加元素
    if (model.elements.length > 0) {
      const elementsEl = doc.createElementNS(this.namespace, 'elements');
      model.elements.forEach(element => {
        const elementEl = this.serializeElement(doc, element);
        elementsEl.appendChild(elementEl);
      });
      modelEl.appendChild(elementsEl);
    }

    // 添加关系
    if (model.relationships.length > 0) {
      const relationshipsEl = doc.createElementNS(this.namespace, 'relationships');
      model.relationships.forEach(relationship => {
        const relEl = this.serializeRelationship(doc, relationship);
        relationshipsEl.appendChild(relEl);
      });
      modelEl.appendChild(relationshipsEl);
    }

    // 添加视图
    if (model.views.length > 0) {
      const viewsEl = doc.createElementNS(this.namespace, 'views');
      const diagramsEl = doc.createElementNS(this.namespace, 'diagrams');
      model.views.forEach(view => {
        const viewEl = this.serializeView(doc, view);
        diagramsEl.appendChild(viewEl);
      });
      viewsEl.appendChild(diagramsEl);
      modelEl.appendChild(viewsEl);
    }

    // 序列化为字符串
    const serializer = new XMLSerializer();
    let xmlString = serializer.serializeToString(doc);

    // 格式化（如果请求）
    if (format) {
      xmlString = this.formatXML(xmlString);
    }

    return xmlString;
  }

  /**
   * 序列化元素
   */
  serializeElement(doc, element) {
    const elementEl = doc.createElementNS(this.namespace, 'element');
    elementEl.setAttribute('identifier', element.id);
    
    if (element.xsiType) {
      elementEl.setAttributeNS('http://www.w3.org/2001/XMLSchema-instance', 'xsi:type', element.xsiType);
    } else if (element.type) {
      elementEl.setAttribute('type', element.type);
    }

    if (element.name) {
      const nameEl = doc.createElementNS(this.namespace, 'name');
      nameEl.textContent = element.name;
      elementEl.appendChild(nameEl);
    }

    if (element.documentation) {
      const docEl = doc.createElementNS(this.namespace, 'documentation');
      docEl.textContent = element.documentation;
      elementEl.appendChild(docEl);
    }

    // 序列化属性
    Object.keys(element.properties).forEach(key => {
      const propEl = doc.createElementNS(this.namespace, 'property');
      propEl.setAttribute('propertyDefinitionRef', key);
      propEl.textContent = element.properties[key];
      elementEl.appendChild(propEl);
    });

    return elementEl;
  }

  /**
   * 序列化关系
   */
  serializeRelationship(doc, relationship) {
    const relEl = doc.createElementNS(this.namespace, 'relationship');
    relEl.setAttribute('identifier', relationship.id);
    relEl.setAttribute('source', relationship.sourceId);
    relEl.setAttribute('target', relationship.targetId);
    
    if (relationship.xsiType) {
      relEl.setAttributeNS('http://www.w3.org/2001/XMLSchema-instance', 'xsi:type', relationship.xsiType);
    } else if (relationship.type) {
      relEl.setAttribute('type', relationship.type);
    }

    if (relationship.name) {
      const nameEl = doc.createElementNS(this.namespace, 'name');
      nameEl.textContent = relationship.name;
      relEl.appendChild(nameEl);
    }

    if (relationship.documentation) {
      const docEl = doc.createElementNS(this.namespace, 'documentation');
      docEl.textContent = relationship.documentation;
      relEl.appendChild(docEl);
    }

    // 序列化属性
    Object.keys(relationship.properties).forEach(key => {
      const propEl = doc.createElementNS(this.namespace, 'property');
      propEl.setAttribute('propertyDefinitionRef', key);
      propEl.textContent = relationship.properties[key];
      relEl.appendChild(propEl);
    });

    return relEl;
  }

  /**
   * 序列化视图
   */
  serializeView(doc, view) {
    const viewEl = doc.createElementNS(this.namespace, 'view');
    viewEl.setAttribute('identifier', view.id);
    viewEl.setAttributeNS('http://www.w3.org/2001/XMLSchema-instance', 'xsi:type', view.xsiType || 'Diagram');

    if (view.name) {
      const nameEl = doc.createElementNS(this.namespace, 'name');
      nameEl.textContent = view.name;
      viewEl.appendChild(nameEl);
    }

    if (view.documentation) {
      const docEl = doc.createElementNS(this.namespace, 'documentation');
      docEl.textContent = view.documentation;
      viewEl.appendChild(docEl);
    }

    // 序列化视图节点
    view.viewNodes.forEach(viewNode => {
      const nodeEl = doc.createElementNS(this.namespace, 'node');
      nodeEl.setAttribute('id', viewNode.viewNodeId);
      nodeEl.setAttribute('elementRef', viewNode.modelNodeId);
      nodeEl.setAttribute('x', viewNode.x.toString());
      nodeEl.setAttribute('y', viewNode.y.toString());
      nodeEl.setAttribute('w', viewNode.width.toString());
      nodeEl.setAttribute('h', viewNode.height.toString());
      if (viewNode.parent) {
        nodeEl.setAttribute('parent', viewNode.parent);
      }
      viewEl.appendChild(nodeEl);
    });

    // 序列化视图关系
    view.viewRelationships.forEach(viewRelationship => {
      const relEl = doc.createElementNS(this.namespace, 'relationship');
      relEl.setAttribute('id', viewRelationship.viewRelationshipId);
      relEl.setAttribute('relationshipRef', viewRelationship.modelRelationshipId);
      
      // 序列化折点
      if (viewRelationship.bendpoints && viewRelationship.bendpoints.length > 0) {
        viewRelationship.bendpoints.forEach(bp => {
          const bpEl = doc.createElementNS(this.namespace, 'bendpoint');
          bpEl.setAttribute('x', bp.x.toString());
          bpEl.setAttribute('y', bp.y.toString());
          relEl.appendChild(bpEl);
        });
      }
      
      viewEl.appendChild(relEl);
    });

    return viewEl;
  }

  /**
   * 格式化 XML
   */
  formatXML(xmlString) {
    let formatted = '';
    let indent = 0;
    const tab = '  ';
    
    xmlString.split(/>\s*</).forEach(node => {
      if (node.match(/^\/\w/)) {
        indent--;
      }
      formatted += tab.repeat(Math.max(0, indent)) + '<' + node + '>\n';
      if (node.match(/^<?\w[^>]*[^\/]$/) && !node.startsWith('<?xml')) {
        indent++;
      }
    });
    
    return formatted.trim();
  }
}

