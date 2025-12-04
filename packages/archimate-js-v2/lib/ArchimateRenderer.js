// Archimate 渲染器
// 基于 vendors/archimate.js (diagram-js) 的渲染引擎
// 严格遵守 OpenGroup Archimate 3.1 规范

import Modeler from '@vsknowledgebase/archimate-js/lib/Modeler';

export class ArchimateRenderer {
  constructor(container) {
    this.container = container;
    this.modeler = null;
    this.currentXML = null;
    this._initPromise = null;
    
    // 缩放相关
    this.scale = 1.0;
    this.minScale = 0.1;
    this.maxScale = 5.0;
    this.scaleStep = 0.1;
    
    this._initPromise = this.init();
  }
  
  async init() {
    // 确保容器是 DOM 元素
    let containerElement = this.container;
    if (typeof this.container === 'string') {
      containerElement = document.querySelector(this.container);
    }
    
    if (!containerElement) {
      throw new Error('Container element not found');
    }
    
    // 初始化 archimate-js Modeler
    this.modeler = new Modeler({
      container: containerElement,
      keyboard: {
        bindTo: window,
      }
    });
    
    return this.modeler;
  }
  
  /**
   * 确保 Modeler 已初始化
   */
  async ensureInitialized() {
    if (this._initPromise) {
      await this._initPromise;
    }
    if (!this.modeler) {
      await this.init();
    }
  }
  
  /**
   * 渲染 Archimate XML
   */
  async render(xml) {
    try {
      // 确保 Modeler 已初始化
      await this.ensureInitialized();
      
      this.currentXML = xml;
      
      // 使用 archimate-js 导入 XML
      const result = await this.modeler.importXML(xml);
      
      if (result.warnings && result.warnings.length > 0) {
        console.warn('Import warnings:', result.warnings);
      }
      
      // 获取模型并打开第一个视图
      const model = this.modeler.getModel();
      if (model && model.views && model.views.diagrams && model.views.diagrams.view) {
        const views = model.views.diagrams.view;
        if (views.length > 0) {
          // 打开第一个视图
          try {
            await this.modeler.openView(views[0].identifier);
            console.log('View opened successfully:', views[0].identifier);
          } catch (viewError) {
            console.error('Failed to open view:', viewError);
            // 即使打开视图失败，也继续执行
          }
        } else {
          console.warn('No views found in model');
        }
      } else {
        console.warn('No model or views found');
      }
      
      return this.modeler;
    } catch (error) {
      console.error('Archimate render error:', error);
      console.error('Error stack:', error.stack);
      throw new Error(`渲染失败: ${error.message}`);
    }
  }
  
  /**
   * 获取当前模型的 XML
   */
  async getXML() {
    try {
      await this.ensureInitialized();
      const result = await this.modeler.saveXML({ format: true });
      return result.xml;
    } catch (error) {
      console.error('Export XML error:', error);
      throw new Error(`导出失败: ${error.message}`);
    }
  }
  
  /**
   * 获取当前模型的 SVG
   */
  async getSVG() {
    try {
      await this.ensureInitialized();
      const result = await this.modeler.saveSVG();
      return result.svg;
    } catch (error) {
      console.error('Export SVG error:', error);
      throw new Error(`导出 SVG 失败: ${error.message}`);
    }
  }
  
  /**
   * 缩放控制
   */
  zoomIn() {
    if (this.modeler && this.modeler.get('canvas')) {
      const canvas = this.modeler.get('canvas');
      const zoom = canvas.zoom();
      const newZoom = Math.min(zoom + this.scaleStep, this.maxScale);
      canvas.zoom(newZoom);
    }
  }
  
  zoomOut() {
    if (this.modeler && this.modeler.get('canvas')) {
      const canvas = this.modeler.get('canvas');
      const zoom = canvas.zoom();
      const newZoom = Math.max(zoom - this.scaleStep, this.minScale);
      canvas.zoom(newZoom);
    }
  }
  
  zoomReset() {
    if (this.modeler && this.modeler.get('canvas')) {
      const canvas = this.modeler.get('canvas');
      canvas.zoom(1.0);
    }
  }
  
  /**
   * 销毁渲染器
   */
  destroy() {
    if (this.modeler) {
      this.modeler.destroy();
      this.modeler = null;
    }
  }
}

