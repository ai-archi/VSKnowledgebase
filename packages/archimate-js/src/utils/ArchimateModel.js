/**
 * ArchiMate 数据模型定义
 */

/**
 * ArchiMate 元素
 */
export class ArchimateElement {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.name = data.name || '';
    this.type = data.type || '';
    this.documentation = data.documentation || '';
    this.properties = data.properties || {};
    this.xsiType = data.xsiType || null;
  }

  generateId() {
    return 'id-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
  }
}

/**
 * ArchiMate 关系
 */
export class ArchimateRelationship {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.sourceId = data.sourceId || '';
    this.targetId = data.targetId || '';
    this.type = data.type || '';
    this.name = data.name || '';
    this.documentation = data.documentation || '';
    this.properties = data.properties || {};
    this.xsiType = data.xsiType || null;
  }

  generateId() {
    return 'id-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
  }
}

/**
 * 视图节点（在视图中的元素表示）
 */
export class ViewNode {
  constructor(data = {}) {
    this.modelNodeId = data.modelNodeId || '';
    this.viewNodeId = data.viewNodeId || this.generateId();
    this.name = data.name || '';
    this.type = data.type || '';
    this.x = data.x || 0;
    this.y = data.y || 0;
    this.width = data.width || 140;
    this.height = data.height || 50;
    this.parent = data.parent || null;
  }

  generateId() {
    return 'id-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
  }
}

/**
 * 视图关系（在视图中的关系表示）
 */
export class ViewRelationship {
  constructor(data = {}) {
    this.modelRelationshipId = data.modelRelationshipId || '';
    this.sourceId = data.sourceId || '';
    this.targetId = data.targetId || '';
    this.viewRelationshipId = data.viewRelationshipId || this.generateId();
    this.type = data.type || '';
    this.bendpoints = data.bendpoints || [];
  }

  generateId() {
    return 'id-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
  }
}

/**
 * ArchiMate 视图
 */
export class ArchimateView {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.name = data.name || '';
    this.documentation = data.documentation || '';
    this.viewNodes = data.viewNodes || [];
    this.viewRelationships = data.viewRelationships || [];
    this.xsiType = data.xsiType || 'Diagram';
  }

  generateId() {
    return 'id-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
  }
}

/**
 * ArchiMate 模型
 */
export class ArchimateModel {
  constructor(data = {}) {
    this.identifier = data.identifier || this.generateId();
    this.name = data.name || 'New Model';
    this.documentation = data.documentation || '';
    this.elements = data.elements || [];
    this.relationships = data.relationships || [];
    this.views = data.views || [];
    this.namespace = data.namespace || 'http://www.opengroup.org/xsd/archimate/3.0/';
  }

  generateId() {
    return 'id-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
  }

  /**
   * 获取元素
   */
  getElement(id) {
    return this.elements.find(el => el.id === id);
  }

  /**
   * 获取关系
   */
  getRelationship(id) {
    return this.relationships.find(rel => rel.id === id);
  }

  /**
   * 获取视图
   */
  getView(id) {
    return this.views.find(view => view.id === id);
  }

  /**
   * 添加元素
   */
  addElement(element) {
    this.elements.push(element);
  }

  /**
   * 添加关系
   */
  addRelationship(relationship) {
    this.relationships.push(relationship);
  }

  /**
   * 添加视图
   */
  addView(view) {
    this.views.push(view);
  }
}

