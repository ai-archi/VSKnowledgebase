// Mermaid.js 渲染器和增强层
// 负责使用 mermaid.js 渲染图表，并添加交互功能

import mermaid from 'mermaid';
import zenuml from '@mermaid-js/mermaid-zenuml';

export interface NodeInfo {
  id: string;
  element: SVGGElement;
  bbox: DOMRect;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EdgeInfo {
  index: number;
  element: SVGElement;
  path: SVGPathElement;
  pathData: string | null;
  label: string;
}

export interface ExtendedSVGElement extends SVGSVGElement {
  _selectionBox?: SVGRectElement;
}

export class MermaidRenderer {
  public container: HTMLElement;
  private currentSVG: ExtendedSVGElement | null = null;
  private currentSource = '';
  
  constructor(container: HTMLElement) {
    this.container = container;
    this.init();
  }
  
  /**
   * 检测当前 VSCode 主题（dark 或 light）
   * 通过检查背景色的亮度来判断
   */
  private detectVSCodeTheme(): 'dark' | 'light' {
    if (typeof document === 'undefined') {
      return 'dark'; // 默认返回 dark
    }
    
    // 获取 VSCode 背景色
    const root = document.documentElement;
    const bgColor = getComputedStyle(root).getPropertyValue('--vscode-editor-background').trim();
    
    // 如果没有设置，使用默认值
    if (!bgColor || bgColor === '') {
      return 'dark'; // 默认 dark 主题
    }
    
    // 解析颜色值（支持 hex、rgb、rgba）
    let r: number, g: number, b: number;
    
    if (bgColor.startsWith('#')) {
      // Hex 格式：#1e1e1e 或 #fff
      const hex = bgColor.slice(1);
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else {
        r = parseInt(hex.slice(0, 2), 16);
        g = parseInt(hex.slice(2, 4), 16);
        b = parseInt(hex.slice(4, 6), 16);
      }
    } else if (bgColor.startsWith('rgb')) {
      // RGB 或 RGBA 格式：rgb(30, 30, 30) 或 rgba(30, 30, 30, 1)
      const match = bgColor.match(/\d+/g);
      if (match && match.length >= 3) {
        r = parseInt(match[0], 10);
        g = parseInt(match[1], 10);
        b = parseInt(match[2], 10);
      } else {
        return 'dark'; // 解析失败，默认 dark
      }
    } else {
      return 'dark'; // 未知格式，默认 dark
    }
    
    // 计算亮度（使用相对亮度公式）
    // L = 0.2126 * R + 0.7152 * G + 0.0722 * B
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    
    // 如果亮度小于 0.5，认为是 dark 主题；否则是 light 主题
    return luminance < 0.5 ? 'dark' : 'light';
  }
  
  async init(): Promise<void> {
    // 注册 ZenUML 外部图表类型
    try {
      await mermaid.registerExternalDiagrams([zenuml]);
    } catch (error) {
      console.warn('Failed to register ZenUML diagram type:', error);
    }
    
    // 检测 VSCode 主题
    const vsTheme = this.detectVSCodeTheme();
    
    // 根据 VSCode 主题设置 Mermaid 主题
    // dark 主题使用 'dark'，light 主题使用 'base'
    const mermaidTheme = vsTheme === 'dark' ? 'dark' : 'base';
    
    // 初始化 mermaid
    mermaid.initialize({
      startOnLoad: false,
      theme: mermaidTheme,
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
    try {
      this.currentSource = source;
      
      // 渲染前清理 body 中可能存在的错误 div
      this.cleanupMermaidErrorDivs();
      
      // 使用 mermaid 渲染（在清空容器之前先渲染，减少空白期）
      const id = `mermaid-${Date.now()}`;
      const { svg } = await mermaid.render(id, source);
      
      // 渲染后立即清理 body 中可能被追加的错误 div（Mermaid 可能在渲染过程中追加）
      this.cleanupMermaidErrorDivs();
      
      // 检查 SVG 是否包含错误信息
      if (this.isErrorSVG(svg)) {
        // 如果是错误 SVG，淡出旧内容后清空容器并抛出错误
        const oldSVG = this.container.querySelector('svg');
        if (oldSVG) {
          oldSVG.style.transition = 'opacity 0.1s ease-out';
          oldSVG.style.opacity = '0';
          setTimeout(() => {
            this.container.innerHTML = '';
          }, 100);
        } else {
          this.container.innerHTML = '';
        }
        // 再次清理，确保 body 中没有残留的错误 div
        this.cleanupMermaidErrorDivs();
        throw new Error('Mermaid syntax error detected');
      }
      
      // 解析 SVG（Mermaid 11.x 可能会返回包含 div 包装器的 HTML）
      let svgElement: SVGSVGElement | null = null;
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = svg;
      
      // 移除容器内 Mermaid 自动添加的 div 包装器（id="dmermaid-xxxx"）
      const dmermaidDiv = tempDiv.querySelector('div[id^="dmermaid-"]');
      if (dmermaidDiv) {
        // 提取内部的 SVG 元素
        svgElement = dmermaidDiv.querySelector('svg');
      } else {
        // 如果没有包装器，直接获取 SVG
        svgElement = tempDiv.querySelector('svg');
      }
      
      if (!svgElement) {
        throw new Error('Failed to extract SVG from mermaid render result');
      }
      
      // 使用 requestAnimationFrame 确保平滑过渡，避免闪烁
      await new Promise(resolve => requestAnimationFrame(resolve));
      
      // 获取旧 SVG（如果存在）
      const oldSVG = this.container.querySelector('svg');
      
      // 先添加新 SVG（设置为透明），避免容器空白导致的闪烁
      svgElement.style.opacity = '0';
      svgElement.style.transition = 'opacity 0.15s ease-in';
      this.container.appendChild(svgElement);
      
      // 再次清理 body（防止异步追加）
      this.cleanupMermaidErrorDivs();
      
      this.currentSVG = svgElement as ExtendedSVGElement;
      
      // 后处理增强
      this.enhanceSVG(this.currentSVG);
      
      // 使用 requestAnimationFrame 确保新 SVG 已添加到 DOM
      await new Promise(resolve => requestAnimationFrame(resolve));
      
      // 淡出旧 SVG（如果存在）
      if (oldSVG && oldSVG !== svgElement) {
        oldSVG.style.transition = 'opacity 0.1s ease-out';
        oldSVG.style.opacity = '0';
        // 等待淡出完成后再移除，避免闪烁
        setTimeout(() => {
          if (oldSVG.parentNode && oldSVG !== this.currentSVG) {
            oldSVG.parentNode.removeChild(oldSVG);
          }
        }, 100);
      }
      
      // 淡入新 SVG
      await new Promise(resolve => requestAnimationFrame(resolve));
      this.currentSVG.style.opacity = '1';
      
      // 淡入完成后移除 transition，避免影响后续操作
      setTimeout(() => {
        if (this.currentSVG) {
          this.currentSVG.style.transition = '';
        }
      }, 150);
      
      return this.currentSVG;
    } catch (error) {
      console.error('Mermaid render error:', error);
      // 错误时清理 body 中的错误 div
      this.cleanupMermaidErrorDivs();
      // 淡出旧内容后清空容器
      const oldSVG = this.container.querySelector('svg');
      if (oldSVG) {
        oldSVG.style.transition = 'opacity 0.1s ease-out';
        oldSVG.style.opacity = '0';
        setTimeout(() => {
          this.container.innerHTML = '';
        }, 100);
      } else {
        this.container.innerHTML = '';
      }
      throw error;
    }
  }
  
  /**
   * 清理 body 中 Mermaid 自动添加的错误 div
   * Mermaid 在渲染错误时会在 body 下追加 div#dmermaid-xxxx
   * 这是 Mermaid 的默认错误处理行为，我们需要主动清理
   */
  private cleanupMermaidErrorDivs(): void {
    if (typeof document === 'undefined' || !document.body) {
      return;
    }
    
    // 查找所有 id 以 "dmermaid-" 开头的 div
    const errorDivs = document.body.querySelectorAll('div[id^="dmermaid-"]');
    errorDivs.forEach(div => {
      // 检查是否是错误 div（包含错误 SVG 或错误文本）
      const hasErrorSVG = div.querySelector('svg[aria-roledescription="error"]');
      const hasErrorIcon = div.querySelector('.error-icon');
      const hasErrorText = div.querySelector('.error-text');
      const textContent = div.textContent || '';
      const isErrorDiv = hasErrorSVG || hasErrorIcon || hasErrorText || 
                         textContent.includes('Syntax error') || 
                         textContent.includes('mermaid version');
      
      if (isErrorDiv) {
        div.remove();
      }
    });
  }
  
  /**
   * 检查 SVG 是否包含错误信息
   */
  private isErrorSVG(svgString: string): boolean {
    if (!svgString || typeof svgString !== 'string') {
      return false;
    }
    
    // 检查是否包含错误相关的标识
    const errorIndicators = [
      'aria-roledescription="error"',
      'class="error-icon"',
      'class="error-text"',
      'Syntax error in text',
      'mermaid version'
    ];
    
    // 如果包含任何错误标识，认为是错误 SVG
    return errorIndicators.some(indicator => svgString.includes(indicator));
  }

  /**
   * 增强 SVG（简化版，只做基本处理）
   */
  private enhanceSVG(svg: ExtendedSVGElement): void {
    // 简化：只设置基本样式，不添加交互功能
    svg.style.display = 'block';
    svg.style.maxWidth = '100%';
    svg.style.maxHeight = '100%';
    svg.style.width = 'auto';
    svg.style.height = 'auto';
    svg.style.margin = 'auto';
    svg.style.cursor = 'grab';
    svg.style.visibility = 'visible';
  }
  
  /**
   * 获取当前 SVG 元素
   */
  getCurrentSVG(): ExtendedSVGElement | null {
    return this.currentSVG;
  }
  
  /**
   * 获取当前源码
   */
  getCurrentSource(): string {
    return this.currentSource;
  }
}

// 保留接口定义（用于类型检查，但不再使用）
export interface NodeInfo {
  id: string;
  element: SVGGElement;
  bbox: DOMRect;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EdgeInfo {
  index: number;
  element: SVGElement;
  path: SVGPathElement;
  pathData: string | null;
  label: string;
}
