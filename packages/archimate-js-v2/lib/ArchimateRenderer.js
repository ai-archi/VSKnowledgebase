// Archimate 渲染器
// 基于 archimate-js (diagram-js) 的渲染引擎

import Modeler from 'archimate-js/lib/Modeler';
// 注意：CSS 需要在 HTML 中通过 link 标签引入，或使用 style-loader
// import 'archimate-js/assets/archimate-js.css';

export class ArchimateRenderer {
  constructor(container) {
    this.container = container;
    this.modeler = null;
    this.currentXML = null;
    
    // 缩放相关
    this.scale = 1.0;
    this.minScale = 0.1;
    this.maxScale = 5.0;
    this.scaleStep = 0.1;
    
    this.init();
  }
  
  async init() {
    // 初始化 archimate-js Modeler
    this.modeler = new Modeler({
      container: this.container,
      keyboard: {
        bindTo: window,
      }
    });
  }
  
  /**
   * 渲染 Archimate XML
   */
  async render(xml) {
    try {
      this.currentXML = xml;
      
      // 使用 archimate-js 导入 XML
      const result = await this.modeler.importXML(xml);
      
      if (result.warnings && result.warnings.length > 0) {
        console.warn('Import warnings:', result.warnings);
      }
      
      return this.modeler;
    } catch (error) {
      console.error('Archimate render error:', error);
      throw new Error(`渲染失败: ${error.message}`);
    }
  }
  
  /**
   * 获取当前模型的 XML
   */
  async getXML() {
    try {
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

