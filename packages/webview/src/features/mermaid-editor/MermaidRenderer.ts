// Mermaid.js 渲染器和增强层
// 负责使用 mermaid.js 渲染图表，并添加交互功能

import mermaid from 'mermaid';
import zenuml from '@mermaid-js/mermaid-zenuml';

export type ExtendedSVGElement = SVGSVGElement;

export class MermaidRenderer {
  public container: HTMLElement;
  private currentSVG: ExtendedSVGElement | null = null;
  
  constructor(container: HTMLElement) {
    this.container = container;
    this.init();
  }
  
  async init(): Promise<void> {
    // 注册 ZenUML 外部图表类型
    try {
      await mermaid.registerExternalDiagrams([zenuml]);
    } catch (error) {
      console.warn('Failed to register ZenUML diagram type:', error);
    }
    
    // 初始化 mermaid
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose', // 允许交互
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis'
      }
    });
  }
  
  /**
   * 渲染 mermaid 图表
   */
  async render(source: string): Promise<ExtendedSVGElement> {
    // 清空容器
    this.container.innerHTML = '';
    
    // 使用 mermaid 渲染
    const id = `mermaid-${Date.now()}`;
    const { svg } = await mermaid.render(id, source);
    
    this.container.innerHTML = svg;
    
    // 查找 ZenUML 的包装 div 并设置 margin: auto
    const zenUMLDiv = this.container.querySelector('div[id^="zenUMLApp-"]');
    if (zenUMLDiv) {
      (zenUMLDiv as HTMLElement).style.margin = 'auto';
    }
    
    // 获取 SVG 元素
    const svgElement = this.container.querySelector('svg');
    if (!svgElement) {
      throw new Error('Failed to extract SVG from mermaid render result');
    }
    
    this.currentSVG = svgElement as ExtendedSVGElement;
    return this.currentSVG;
  }
  

}
