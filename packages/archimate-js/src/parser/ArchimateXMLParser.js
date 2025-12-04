import { ArchimateModel, ArchimateElement, ArchimateRelationship, ArchimateView, ViewNode, ViewRelationship } from '../utils/ArchimateModel.js';

/**
 * ArchiMate XML 解析器
 * 解析 ArchiMate 3.x XML 格式
 */
export class ArchimateXMLParser {
  constructor() {
    this.namespace = 'http://www.opengroup.org/xsd/archimate/3.0/';
  }

  /**
   * 解析 XML 字符串
   */
  parse(xmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'text/xml');
    
    // 检查解析错误
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      throw new Error('XML parsing error: ' + parserError.textContent);
    }

    // 获取 model 元素
    const modelElement = doc.querySelector('model') || doc.documentElement;
    if (!modelElement) {
      throw new Error('No model element found in XML');
    }

    // 解析模型
    const model = this.parseModel(modelElement);
    
    return model;
  }

  /**
   * 解析模型
   */
  parseModel(modelElement) {
    const model = new ArchimateModel({
      identifier: modelElement.getAttribute('identifier') || this.generateId(),
      name: this.getTextContent(modelElement, 'name'),
      documentation: this.getTextContent(modelElement, 'documentation'),
      namespace: modelElement.namespaceURI || this.namespace
    });

    // 解析元素
    const elements = modelElement.querySelectorAll('elements > element');
    elements.forEach(elementEl => {
      const element = this.parseElement(elementEl);
      model.addElement(element);
    });

    // 解析关系
    const relationships = modelElement.querySelectorAll('relationships > relationship');
    relationships.forEach(relEl => {
      const relationship = this.parseRelationship(relEl);
      model.addRelationship(relationship);
    });

    // 解析视图
    const views = modelElement.querySelectorAll('views > diagrams > view');
    views.forEach(viewEl => {
      const view = this.parseView(viewEl, model);
      model.addView(view);
    });

    return model;
  }

  /**
   * 解析元素
   */
  parseElement(elementEl) {
    const element = new ArchimateElement({
      id: elementEl.getAttribute('identifier') || this.generateId(),
      name: this.getTextContent(elementEl, 'name'),
      documentation: this.getTextContent(elementEl, 'documentation'),
      type: elementEl.getAttribute('xsi:type') || elementEl.getAttribute('type') || '',
      xsiType: elementEl.getAttribute('xsi:type')
    });

    // 解析属性
    const properties = elementEl.querySelectorAll('property');
    properties.forEach(propEl => {
      const key = propEl.getAttribute('propertyDefinitionRef') || propEl.getAttribute('key');
      const value = propEl.textContent || propEl.getAttribute('value');
      if (key) {
        element.properties[key] = value;
      }
    });

    return element;
  }

  /**
   * 解析关系
   */
  parseRelationship(relEl) {
    const relationship = new ArchimateRelationship({
      id: relEl.getAttribute('identifier') || this.generateId(),
      sourceId: relEl.getAttribute('source') || relEl.getAttribute('sourceRef'),
      targetId: relEl.getAttribute('target') || relEl.getAttribute('targetRef'),
      name: this.getTextContent(relEl, 'name'),
      documentation: this.getTextContent(relEl, 'documentation'),
      type: relEl.getAttribute('xsi:type') || relEl.getAttribute('type') || '',
      xsiType: relEl.getAttribute('xsi:type')
    });

    // 解析属性
    const properties = relEl.querySelectorAll('property');
    properties.forEach(propEl => {
      const key = propEl.getAttribute('propertyDefinitionRef') || propEl.getAttribute('key');
      const value = propEl.textContent || propEl.getAttribute('value');
      if (key) {
        relationship.properties[key] = value;
      }
    });

    return relationship;
  }

  /**
   * 解析视图
   */
  parseView(viewEl, model) {
    const view = new ArchimateView({
      id: viewEl.getAttribute('identifier') || this.generateId(),
      name: this.getTextContent(viewEl, 'name'),
      documentation: this.getTextContent(viewEl, 'documentation'),
      xsiType: viewEl.getAttribute('xsi:type') || 'Diagram'
    });

    // 解析视图节点（支持命名空间）
    const nodeElements = viewEl.querySelectorAll('node, *[local-name()="node"]');
    nodeElements.forEach(nodeEl => {
      // 尝试多种属性名
      const elementRef = nodeEl.getAttribute('elementRef') || 
                         nodeEl.getAttribute('element') ||
                         nodeEl.getAttribute('ref');
      
      if (!elementRef) {
        console.warn('[ArchimateParser] No element reference found in node:', nodeEl);
        return;
      }
      
      const element = model.getElement(elementRef);
      
      if (element) {
        const viewNode = new ViewNode({
          modelNodeId: elementRef,
          viewNodeId: nodeEl.getAttribute('id') || nodeEl.getAttribute('identifier') || this.generateId(),
          name: element.name,
          type: element.type || element.xsiType,
          x: parseFloat(nodeEl.getAttribute('x')) || 0,
          y: parseFloat(nodeEl.getAttribute('y')) || 0,
          width: parseFloat(nodeEl.getAttribute('w')) || parseFloat(nodeEl.getAttribute('width')) || 140,
          height: parseFloat(nodeEl.getAttribute('h')) || parseFloat(nodeEl.getAttribute('height')) || 50,
          parent: nodeEl.getAttribute('parent')
        });
        view.viewNodes.push(viewNode);
      } else {
        console.warn('[ArchimateParser] Element not found:', elementRef);
      }
    });

    // 解析视图关系（支持 relationship 和 connection 两种格式，以及命名空间）
    const relationshipElements = viewEl.querySelectorAll('relationship, connection, *[local-name()="relationship"], *[local-name()="connection"]');
    relationshipElements.forEach(relEl => {
      // 尝试多种属性名：relationshipRef, relationship, ref, id
      const relationshipRef = relEl.getAttribute('relationshipRef') || 
                              relEl.getAttribute('relationship') || 
                              relEl.getAttribute('ref') ||
                              relEl.getAttribute('id');
      
      if (!relationshipRef) {
        console.warn('[ArchimateParser] No relationship reference found in element:', relEl, {
          attributes: Array.from(relEl.attributes).map(attr => `${attr.name}="${attr.value}"`)
        });
        return;
      }
      
      const relationship = model.getRelationship(relationshipRef);
      
      if (relationship) {
        // 查找对应的视图节点
        const sourceViewNode = view.viewNodes.find(n => n.modelNodeId === relationship.sourceId);
        const targetViewNode = view.viewNodes.find(n => n.modelNodeId === relationship.targetId);
        
        if (sourceViewNode && targetViewNode) {
          const viewRelationship = new ViewRelationship({
            modelRelationshipId: relationshipRef,
            sourceId: sourceViewNode.viewNodeId,
            targetId: targetViewNode.viewNodeId,
            viewRelationshipId: relEl.getAttribute('id') || this.generateId(),
            type: relationship.type || relationship.xsiType
          });

          // 解析折点
          const bendpoints = relEl.querySelectorAll('bendpoint');
          bendpoints.forEach(bpEl => {
            viewRelationship.bendpoints.push({
              x: parseFloat(bpEl.getAttribute('x')) || 0,
              y: parseFloat(bpEl.getAttribute('y')) || 0
            });
          });

          view.viewRelationships.push(viewRelationship);
        } else {
          console.warn('[ArchimateParser] Could not find view nodes for relationship:', {
            relationshipRef,
            sourceId: relationship.sourceId,
            targetId: relationship.targetId,
            availableViewNodes: view.viewNodes.map(n => n.modelNodeId)
          });
        }
      } else {
        console.warn('[ArchimateParser] Relationship not found:', relationshipRef);
      }
    });

    return view;
  }

  /**
   * 获取元素的文本内容
   */
  getTextContent(parent, tagName) {
    const element = parent.querySelector(tagName);
    return element ? element.textContent.trim() : '';
  }

  /**
   * 生成 ID
   */
  generateId() {
    return 'id-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
  }
}

