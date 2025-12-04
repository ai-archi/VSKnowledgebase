// Archimate Editor App V2 - 基于 archimate-js (diagram-js) 的新版本
// 参考 MermaidEditorAppV2 的架构，使用 archimate-js 作为底层渲染引擎

import './styles.css';
// 导入 archimate-js 的 CSS（包含图标样式）
// 直接使用 vendors/archimate.js 的 CSS，避免重复
import '@vsknowledgebase/archimate-js/assets/archimate-js.css';
import { StateManager } from '../lib/StateManager.js';
import { ArchimateRenderer } from '../lib/ArchimateRenderer.js';
import { ArchimateParser } from '../lib/ArchimateParser.js';
import { ArchimateCodeGenerator } from '../lib/ArchimateCodeGenerator.js';
import {
  fetchDiagram,
  saveDiagram,
  isVSCodeWebview,
  vscode,
} from '../lib/vscodeApi.js';

// 确保 vscode API 在全局可用
if (typeof acquireVsCodeApi !== 'undefined') {
  try {
    window.vscode = acquireVsCodeApi();
  } catch (e) {
    // 已经初始化过了
  }
}

// 在 VSCode webview 中修复资源路径（图标、字体等）
// 参考 archimate-js/app/app.js 的实现
// 统一使用 https://file+.vscode-resource.vscode-cdn.net/ 格式（可访问），而不是 vscode-webview:// 格式
if (isVSCodeWebview) {
  // 优先使用 Provider 注入的 basePath（CDN 格式）
  // 如果没有，则从当前脚本的 URL 推断
  let basePath = window.__ARCHIMATE_EDITOR_BASE_PATH__;
  
  if (!basePath) {
    const scriptTag = document.querySelector('script[src*="ArchimateEditorApp.js"]') || 
                      document.querySelector('script[src*="vendors-ArchimateEditorApp.js"]');
    basePath = scriptTag 
      ? scriptTag.src.replace(/\/[^/]+\.js.*$/, '/')
      : '';
  }
  
  // 确保 basePath 以 / 结尾
  if (basePath && !basePath.endsWith('/')) {
    basePath += '/';
  }
  
  // 将 vscode-webview:// 格式统一转换为 https://file+.vscode-resource.vscode-cdn.net/ 格式
  // 因为 vscode-webview:// 格式在某些情况下无法访问，而 CDN 格式可以
  function convertToCdnFormat(url) {
    if (!url || typeof url !== 'string') return url;
    
    // 如果已经是 CDN 格式，直接返回
    if (url.includes('vscode-resource.vscode-cdn.net')) {
      return url;
    }
    
    // 如果是 vscode-webview:// 格式，转换为 CDN 格式
    if (url.includes('vscode-webview://')) {
      // 提取文件路径部分：vscode-webview://xxx/path/to/file
      const match = url.match(/vscode-webview:\/\/[^/]+\/(.+)$/);
      if (match && match[1]) {
        let filePath = match[1];
        
        // 如果是 assets/icons/ 路径，转换为 icons/
        if (filePath.includes('assets/icons/')) {
          filePath = filePath.replace('assets/icons/', 'icons/');
        }
        
        // 优先使用 basePath（应该是 CDN 格式）
        if (basePath && basePath.includes('vscode-resource.vscode-cdn.net')) {
          return basePath.replace(/\/$/, '') + '/' + filePath;
        }
        
        // 如果 basePath 不可用，尝试从已知路径构建
        // 从 basePath 或 script src 中提取基础路径
        const scriptTag = document.querySelector('script[src*="ArchimateEditorApp.js"]') || 
                          document.querySelector('script[src*="vendors-ArchimateEditorApp.js"]');
        if (scriptTag && scriptTag.src) {
          if (scriptTag.src.includes('vscode-resource.vscode-cdn.net')) {
            const scriptBase = scriptTag.src.replace(/\/[^/]+\.js.*$/, '/');
            return scriptBase.replace(/\/$/, '') + '/' + filePath;
          }
        }
      }
    }
    
    return url;
  }
  
  // 拦截 setAttribute 方法，在设置属性时立即修复路径
  // 必须在 convertToCdnFormat 定义之后
  const originalSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function(name, value) {
    if ((name === 'src' || name === 'href') && typeof value === 'string') {
      // 如果是 vscode-webview:// 格式，转换为 CDN 格式
      if (value.includes('vscode-webview://')) {
        value = convertToCdnFormat(value);
        console.log('[ArchimateEditorApp] Intercepted setAttribute (vscode-webview):', name, value);
      }
      // 如果是 assets/icons/，转换为 icons/
      if (value.includes('/assets/icons/')) {
        const iconMatch = value.match(/([^/]+\.svg)(\?.*)?$/);
        if (iconMatch && basePath) {
          value = basePath + 'icons/' + iconMatch[1] + (iconMatch[2] || '');
          console.log('[ArchimateEditorApp] Intercepted setAttribute (assets/icons):', name, value);
        }
      }
    }
    return originalSetAttribute.call(this, name, value);
  };
  
  // 拦截 jQuery 的 attr() 方法（如果存在）
  if (window.jQuery || window.$) {
    const $ = window.jQuery || window.$;
    const originalAttr = $.fn.attr;
    $.fn.attr = function(name, value) {
      if (arguments.length === 2 && (name === 'src' || name === 'href') && typeof value === 'string') {
        // 如果是 vscode-webview:// 格式，转换为 CDN 格式
        if (value.includes('vscode-webview://')) {
          value = convertToCdnFormat(value);
          console.log('[ArchimateEditorApp] Intercepted jQuery attr() (vscode-webview):', name, value);
        }
        // 如果是 assets/icons/，转换为 icons/
        if (value.includes('/assets/icons/')) {
          const iconMatch = value.match(/([^/]+\.svg)(\?.*)?$/);
          if (iconMatch && basePath) {
            value = basePath + 'icons/' + iconMatch[1] + (iconMatch[2] || '');
            console.log('[ArchimateEditorApp] Intercepted jQuery attr() (assets/icons):', name, value);
          }
        }
      }
      return originalAttr.apply(this, arguments);
    };
  }
  
  // 如果 basePath 是 vscode-webview:// 格式，尝试转换为 CDN 格式
  if (basePath && basePath.includes('vscode-webview://')) {
    const match = basePath.match(/vscode-webview:\/\/[^/]+\/(.+)$/);
    if (match && match[1]) {
      basePath = 'https://file+.vscode-resource.vscode-cdn.net/' + match[1];
      if (!basePath.endsWith('/')) {
        basePath += '/';
      }
    }
  }
  
  // 使用 WeakSet 跟踪已修复的元素，避免重复修复
  const fixedElements = new WeakSet();
  
  // 修复单个元素的属性（src, href, style 等）
  const fixElementAttributes = (el) => {
    if (!el || el.nodeType !== 1) return;
    
    // 如果已经修复过，跳过（避免重复修复导致图标重叠）
    if (fixedElements.has(el)) {
      return;
    }
    
    try {
      let fixed = false;
      
      // 修复 src 属性：统一转换所有 vscode-webview:// 格式
      if (el.src && el.src.includes('vscode-webview://')) {
        el.src = convertToCdnFormat(el.src);
        fixed = true;
      }
      // 如果是 assets/icons/（包括 CDN 格式），转换为 icons/
      if (el.src && el.src.includes('/assets/icons/')) {
        const iconMatch = el.src.match(/([^/]+\.svg)(\?.*)?$/);
        if (iconMatch && basePath) {
          el.src = basePath + 'icons/' + iconMatch[1] + (iconMatch[2] || '');
          fixed = true;
        }
      }
      
      // 修复 href 属性：统一转换所有 vscode-webview:// 格式
      if (el.href && el.href.includes('vscode-webview://')) {
        el.href = convertToCdnFormat(el.href);
        fixed = true;
      }
      // 如果是 assets/icons/（包括 CDN 格式），转换为 icons/
      if (el.href && el.href.includes('/assets/icons/')) {
        const iconMatch = el.href.match(/([^/]+\.svg)(\?.*)?$/);
        if (iconMatch && basePath) {
          el.href = basePath + 'icons/' + iconMatch[1] + (iconMatch[2] || '');
          fixed = true;
        }
      }
      
      // 修复 style 属性中的 background-image
      // 注意：只修复通过 JavaScript 直接设置到 style 属性的 background-image
      // 不修复通过 CSS 类设置的 background-image（已经在样式表修复中处理，避免重复）
      // 
      // 检查逻辑：
      // 1. 如果 el.style.backgroundImage 存在，说明是通过 JavaScript 设置的
      // 2. 如果 el.style.backgroundImage 为空，但 computedStyle.backgroundImage 存在，
      //    说明是通过 CSS 类设置的，不应该在这里修复
      if (el.style && el.style.backgroundImage) {
        const bgImage = el.style.backgroundImage;
        // 只修复 vscode-webview:// 或 assets/icons/ 格式，跳过已经是 CDN 格式的
        if ((bgImage.includes('vscode-webview://') || bgImage.includes('/assets/icons/')) && 
            !bgImage.includes('vscode-resource.vscode-cdn.net')) {
          let newBgImage = bgImage;
          if (newBgImage.includes('vscode-webview://')) {
            newBgImage = convertToCdnFormat(newBgImage);
          }
          if (newBgImage.includes('/assets/icons/')) {
            const iconMatch = newBgImage.match(/([^/]+\.svg)(\?.*)?/);
            if (iconMatch && basePath) {
              newBgImage = 'url("' + basePath + 'icons/' + iconMatch[1] + (iconMatch[2] || '') + '")';
            }
          }
          if (newBgImage !== bgImage) {
            // 只设置 backgroundImage，不影响其他样式
            el.style.setProperty('background-image', newBgImage, 'important');
            fixed = true;
            console.log('[ArchimateEditorApp] Fixed inline style background-image:', el.className, bgImage, '->', newBgImage);
          }
        }
      } else {
        // 检查是否是通过 CSS 类设置的（不应该在这里修复）
        const computedBgImage = window.getComputedStyle(el).backgroundImage;
        if (computedBgImage && computedBgImage !== 'none' && 
            (computedBgImage.includes('vscode-webview://') || computedBgImage.includes('/assets/icons/'))) {
          // 这是通过 CSS 类设置的，不应该设置到 style 属性
          // 应该在 CSS 样式表修复中处理
          console.warn('[ArchimateEditorApp] Element has CSS class background-image but CSS rule not fixed:', el.className, computedBgImage);
        }
      }
      
      // 如果修复了任何属性，标记为已修复
      if (fixed) {
        fixedElements.add(el);
      }
      
      // 确保 palette 图标的尺寸和间距不被破坏
      // 如果元素有 palette 相关的类，确保其尺寸正确
      if (el.className && typeof el.className === 'string' && 
          (el.className.includes('djs-palette-entry') || el.className.includes('archimate-') || el.className.includes('ajs-tool-'))) {
        // 确保宽度和高度不被覆盖（如果 CSS 已经设置了 !important，这里不会影响）
        const computedStyle = window.getComputedStyle(el);
        if (computedStyle.width === '0px' || computedStyle.height === '0px') {
          // 如果尺寸为 0，可能是样式未加载，不强制设置，让 CSS 处理
        }
      }
    } catch (e) {
      // 忽略无法访问的元素
      console.warn('[ArchimateEditorApp] Error fixing element attributes:', e);
    }
  };
  
  function fixResourcePaths() {
    if (!basePath) return;
    
    const fixUrl = (url) => {
      if (!url || typeof url !== 'string') return url;
      
      // 统一转换所有 vscode-webview:// 格式为 CDN 格式
      if (url.includes('vscode-webview://')) {
        url = convertToCdnFormat(url);
        // 转换后直接返回，避免后续处理
        if (url.includes('vscode-resource.vscode-cdn.net')) {
          return url;
        }
      }
      
      // 跳过已经是绝对路径的（CDN 格式或其他）
      if (url.startsWith('http://') || 
          url.startsWith('https://') ||
          url.startsWith('data:') ||
          url.startsWith('#')) {
        return url;
      }
      
      // 修复图标路径：url("./icons/...") 或 url("../icons/...") 或 url("./assets/icons/...")
      // 统一转换为：url(basePath + "icons/...")
      // 与 archimate-js 保持一致，图标在根目录的 icons/ 目录
      url = url.replace(/url\(["']?([^"')]*(?:\/assets)?\/icons\/([^"')]+))["']?\)/g, 
        (match, fullPath, iconPath) => {
          const iconUrl = basePath + 'icons/' + iconPath;
          console.log('[ArchimateEditorApp] Fixing icon URL:', fullPath, '->', iconUrl);
          return 'url("' + iconUrl + '")';
        });
      
      // 修复字体路径（与 archimate-js 保持一致）
      url = url.replace(/url\(["']?\.\/(assets\/)?(font-awesome-5|ibm-plex-font)\/([^"')]+)["']?\)/g,
        (match, assetsPrefix, dir, fileName) => {
          const fontUrl = basePath + 'assets/' + dir + '/' + fileName;
          return 'url("' + fontUrl + '")';
        });
      
      return url;
    };
    
    // 修复样式表中的路径
    // 这是修复 palette 图标的主要方式，因为图标是通过 CSS 类（如 .ajs-tool-hand）设置的
    try {
      let fixedRulesCount = 0;
      for (let i = 0; i < document.styleSheets.length; i++) {
        try {
          const sheet = document.styleSheets[i];
          if (!sheet.cssRules) continue;
          
          for (let j = 0; j < sheet.cssRules.length; j++) {
            const rule = sheet.cssRules[j];
            if (rule.style && rule.style.backgroundImage) {
              const originalBgImage = rule.style.backgroundImage;
              const fixedBgImage = fixUrl(originalBgImage);
              if (fixedBgImage !== originalBgImage) {
                rule.style.backgroundImage = fixedBgImage;
                fixedRulesCount++;
                // 调试：只记录 palette 相关的规则
                if (rule.selectorText && (rule.selectorText.includes('ajs-tool-') || rule.selectorText.includes('archimate-'))) {
                  console.log('[ArchimateEditorApp] Fixed CSS rule:', rule.selectorText, originalBgImage, '->', fixedBgImage);
                }
              }
            }
            if (rule.type === CSSRule.FONT_FACE_RULE && rule.style) {
              const src = rule.style.getPropertyValue('src');
              if (src) {
                rule.style.setProperty('src', fixUrl(src), rule.style.getPropertyPriority('src'));
              }
            }
          }
        } catch (e) {
          // 跨域样式表可能无法访问，忽略
        }
      }
      console.log('[ArchimateEditorApp] Fixed', fixedRulesCount, 'CSS rules with background-image');
    } catch (e) {
      console.warn('[ArchimateEditorApp] Cannot access stylesheets:', e);
    }
    
    // 注意：不要修复元素的 computed style！
    // 原因：palette 图标是通过 CSS 类（如 .ajs-tool-hand）设置的 background-image
    // 我们已经修复了 CSS 样式表中的路径，如果这里再设置 el.style.backgroundImage，
    // 会导致 CSS 样式表中的 background-image 和元素的 style.backgroundImage 同时生效，
    // 从而造成图标重叠显示。
    // 
    // 只修复通过 JavaScript 直接设置到 style 属性的 background-image（在 fixElementAttributes 中处理）
    // 不修复通过 CSS 类设置的 background-image（已经在样式表修复中处理）
    // 
    // 注意：palette 条目中的 img 元素隐藏逻辑应该在 vendors/archimate.js 的 CSS 中处理
    // 这里只负责 VS Code webview 的路径转换
    
    // 修复所有元素的 src 和 href 属性（处理通过 JavaScript 设置的路径）
    // 使用 fixElementAttributes 函数统一处理
    document.querySelectorAll('[src], [href], [style]').forEach(el => {
      fixElementAttributes(el);
    });
    
    // 特别处理所有可能的图标元素（包括通过 attr() 设置的）
    document.querySelectorAll('img, svg, [class*="icon"], [class*="palette"]').forEach(el => {
      fixElementAttributes(el);
    });
  }
  
  // 拦截所有资源请求（包括通过 attr() 设置的路径）
  // 使用 MutationObserver 监听 DOM 变化，修复所有新添加的元素
  // 注意：只负责 VS Code webview 的路径转换，palette 的 img 隐藏由 vendors/archimate.js 的 CSS 处理
  const domObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          fixElementAttributes(node);
        }
      });
      
      // 监听属性变化（包括通过 attr() 设置的属性）
      if (mutation.type === 'attributes' && mutation.target && mutation.target.nodeType === 1) {
        fixElementAttributes(mutation.target);
      }
    });
  });
  
  // 监听整个文档的变化（包括属性变化）
  domObserver.observe(document.body, { 
    childList: true, 
    subtree: true, 
    attributes: true, 
    attributeFilter: ['src', 'href', 'style', 'background-image'] 
  });
  
  // 延迟执行路径修复，等待样式加载完成
  // 增加更多延迟，确保 diagram-js 的 Palette 初始化完成
  // 注意：fixResourcePaths 会被多次调用，但 CSS 样式表修复应该是幂等的
  let fixResourcePathsCallCount = 0;
  const originalFixResourcePaths = fixResourcePaths;
  fixResourcePaths = function() {
    fixResourcePathsCallCount++;
    console.log('[ArchimateEditorApp] fixResourcePaths called #' + fixResourcePathsCallCount);
    originalFixResourcePaths();
  };
  
  const runFix = () => {
    setTimeout(fixResourcePaths, 100);
    setTimeout(fixResourcePaths, 300);
    setTimeout(fixResourcePaths, 500);
    setTimeout(fixResourcePaths, 1000);
    setTimeout(fixResourcePaths, 2000);
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runFix);
  } else {
    runFix();
  }
  
  // 监听动态添加的元素（使用更频繁的检查）
  new MutationObserver(() => {
    setTimeout(fixResourcePaths, 50);
    setTimeout(fixResourcePaths, 200);
  })
    .observe(document.body, { childList: true, subtree: true });
}

export class ArchimateEditorApp {
  constructor() {
    this.stateManager = new StateManager();
    this.renderer = null;
    this.parser = new ArchimateParser();
    this.codeGenerator = new ArchimateCodeGenerator();
    
    this.saveTimer = null;
    this.lastSubmittedSource = null;
    this.isSaving = false;
    
    // DOM elements
    this.elements = {
      errorMessage: document.getElementById('error-message'),
      workspace: document.getElementById('workspace'),
      diagramPanel: document.getElementById('diagram-panel'),
      workspaceDivider: document.getElementById('workspace-divider'),
      diagramContainer: document.getElementById('diagram-container'),
      sourcePanel: document.getElementById('source-panel'),
      sourceEditor: document.getElementById('source-editor'),
      zoomIn: document.getElementById('zoom-in'),
      zoomOut: document.getElementById('zoom-out'),
      zoomReset: document.getElementById('zoom-reset'),
    };
    
    this.init();
  }
  
  async init() {
    // 设置 VSCode 消息监听（必须在初始化渲染器之前设置）
    if (isVSCodeWebview) {
      window.addEventListener('message', (event) => {
        const data = event.data;
        if (data.type === 'load') {
          if (this.isSaving) return;
          if (data.content) {
            this.handleDiagramLoad(data.content);
          }
        }
      });
    }
    
    // 初始化 archimate 渲染器
    this.renderer = new ArchimateRenderer(this.elements.diagramContainer);
    
    // 订阅状态变化
    this.stateManager.subscribe((state) => this.onStateChange(state));
    
    // 设置事件监听
    this.setupEventListeners();
    this.setupWorkspaceResizer();
    
    // 加载图表（延迟一点确保渲染器已初始化）
    setTimeout(() => {
      this.loadDiagram();
    }, 100);
  }
  
  setupEventListeners() {
    // 源代码编辑器变化
    this.elements.sourceEditor.addEventListener('input', () => {
      this.handleSourceChange();
    });
    
    // 键盘删除快捷键
    if (!this.boundHandleKeyDown) {
      this.boundHandleKeyDown = this.handleKeyDown.bind(this);
      document.addEventListener('keydown', this.boundHandleKeyDown);
    }
    
    // 缩放控制
    if (this.elements.zoomIn) {
      this.elements.zoomIn.addEventListener('click', () => {
        this.renderer?.zoomIn();
      });
    }
    
    if (this.elements.zoomOut) {
      this.elements.zoomOut.addEventListener('click', () => {
        this.renderer?.zoomOut();
      });
    }
    
    if (this.elements.zoomReset) {
      this.elements.zoomReset.addEventListener('click', () => {
        this.renderer?.zoomReset();
      });
    }
  }
  
  setupWorkspaceResizer() {
    const divider = this.elements.workspaceDivider;
    if (!divider) return;
    
    let isResizing = false;
    
    divider.addEventListener('mousedown', (e) => {
      isResizing = true;
      document.body.style.cursor = 'col-resize';
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      
      const workspace = this.elements.workspace;
      const rect = workspace.getBoundingClientRect();
      const newLeftWidth = ((e.clientX - rect.left) / rect.width) * 100;
      
      if (newLeftWidth > 20 && newLeftWidth < 80) {
        this.elements.diagramPanel.style.width = `${100 - newLeftWidth}%`;
        this.elements.sourcePanel.style.width = `${newLeftWidth}%`;
      }
    });
    
    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        document.body.style.cursor = '';
      }
    });
  }
  
  handleKeyDown(e) {
    // Delete 或 Backspace 删除选中元素
    if ((e.key === 'Delete' || e.key === 'Backspace') && !this.isEditing()) {
      // TODO: 实现删除逻辑
      e.preventDefault();
    }
  }
  
  isEditing() {
    const activeElement = document.activeElement;
    return (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.isContentEditable
    );
  }
  
  async loadDiagram() {
    try {
      if (isVSCodeWebview) {
        // 在 VSCode 中，内容通过 postMessage 传递
        // 如果已经有待处理的内容，直接使用
        if (window.pendingContent) {
          const content = window.pendingContent;
          window.pendingContent = null;
          this.handleDiagramLoad(content);
          return;
        }
        
        // 否则尝试通过 API 获取
        try {
          const content = await fetchDiagram();
          if (content && content.trim()) {
            this.handleDiagramLoad(content);
          } else {
            console.log('No content received, waiting for load message...');
          }
        } catch (error) {
          // 忽略超时错误，等待消息
          console.log('fetchDiagram timeout, waiting for load message...', error.message);
        }
      } else {
        // 开发模式：加载示例
        const exampleContent = this.getExampleContent();
        this.handleDiagramLoad(exampleContent);
      }
    } catch (error) {
      this.showError(`加载失败: ${error.message}`);
      console.error('loadDiagram error:', error);
    }
  }
  
  handleDiagramLoad(content) {
    try {
      console.log('[ArchimateEditorApp] handleDiagramLoad, content length:', content ? content.length : 0);
      
      if (!content || !content.trim()) {
        console.warn('[ArchimateEditorApp] Empty content received');
        return;
      }
      
      // 更新源代码编辑器
      if (this.elements.sourceEditor) {
        this.elements.sourceEditor.value = content;
      }
      
      // 更新状态
      this.stateManager.setState({ source: content });
      
      // 渲染图表（延迟一点确保渲染器已初始化）
      if (this.renderer) {
        setTimeout(() => {
          this.renderDiagram(content);
        }, 200);
      } else {
        console.warn('[ArchimateEditorApp] Renderer not initialized yet, will retry');
        setTimeout(() => {
          if (this.renderer) {
            this.renderDiagram(content);
          }
        }, 500);
      }
    } catch (error) {
      console.error('[ArchimateEditorApp] handleDiagramLoad error:', error);
      this.showError(`加载错误: ${error.message}`);
    }
  }
  
  handleSourceChange() {
    const source = this.elements.sourceEditor.value;
    this.stateManager.setState({ source });
    this.scheduleRender();
  }
  
  scheduleRender() {
    const source = this.stateManager.source;
    if (!source || source.trim() === '') {
      return;
    }
    
    // 防抖：1秒后自动渲染
    this.stateManager.setRenderTimer(() => {
      this.renderDiagram(source);
    }, 1000);
  }
  
  async renderDiagram(source) {
    try {
      console.log('[ArchimateEditorApp] renderDiagram, source length:', source ? source.length : 0);
      this.hideError();
      
      if (!source || source.trim() === '') {
        if (this.elements.diagramContainer) {
          this.elements.diagramContainer.innerHTML = '<p>请输入 Archimate XML 内容</p>';
        }
        return;
      }
      
      if (!this.renderer) {
        console.error('[ArchimateEditorApp] Renderer not available');
        this.showError('渲染器未初始化');
        return;
      }
      
      // 使用 archimate-js 渲染
      console.log('[ArchimateEditorApp] Calling renderer.render...');
      await this.renderer.render(source);
      console.log('[ArchimateEditorApp] Render completed successfully');
      
      // 自动保存
      this.scheduleSave(source);
    } catch (error) {
      console.error('[ArchimateEditorApp] Render error:', error);
      console.error('[ArchimateEditorApp] Error stack:', error.stack);
      this.showError(`渲染错误: ${error.message}`);
    }
  }
  
  scheduleSave(source) {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    
    this.saveTimer = setTimeout(async () => {
      await this.saveSource(source);
    }, 2000);
  }
  
  async saveSource(source) {
    if (this.isSaving || source === this.lastSubmittedSource) {
      return;
    }
    
    this.isSaving = true;
    this.lastSubmittedSource = source;
    
    try {
      if (isVSCodeWebview) {
        await saveDiagram(source);
      } else {
        console.log('Save (dev mode):', source.substring(0, 100) + '...');
      }
    } catch (error) {
      this.showError(`保存失败: ${error.message}`);
      this.lastSubmittedSource = null; // 允许重试
    } finally {
      this.isSaving = false;
    }
  }
  
  onStateChange(state) {
    if (state.error) {
      this.showError(state.error);
    } else {
      this.hideError();
    }
  }
  
  showError(message) {
    if (this.elements.errorMessage) {
      this.elements.errorMessage.textContent = message;
      this.elements.errorMessage.style.display = 'block';
    }
  }
  
  hideError() {
    if (this.elements.errorMessage) {
      this.elements.errorMessage.style.display = 'none';
    }
  }
  
  getExampleContent() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<archimate:Model xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:archimate="http://www.opengroup.org/xsd/archimate/3.0/" xsi:schemaLocation="http://www.opengroup.org/xsd/archimate/3.0/ http://www.opengroup.org/xsd/archimate/3.1/archimate3_Diagram.xsd">
  <name>Example Model</name>
  <documentation></documentation>
  <archimate:Elements>
    <archimate:element xsi:type="archimate:BusinessActor" identifier="actor1">
      <name>Customer</name>
    </archimate:element>
    <archimate:element xsi:type="archimate:BusinessService" identifier="service1">
      <name>Order Service</name>
    </archimate:element>
  </archimate:Elements>
  <archimate:Relationships>
    <archimate:relationship xsi:type="archimate:Serving" identifier="rel1" source="service1" target="actor1">
      <name>serves</name>
    </archimate:relationship>
  </archimate:Relationships>
  <archimate:Views>
    <archimate:Diagrams>
      <archimate:View identifier="view1">
        <name>Default View</name>
        <archimate:node identifier="node1" elementRef="actor1" x="100" y="100" w="120" h="60"/>
        <archimate:node identifier="node2" elementRef="service1" x="300" y="100" w="120" h="60"/>
        <archimate:connection identifier="conn1" relationshipRef="rel1" source="node1" target="node2"/>
      </archimate:View>
    </archimate:Diagrams>
  </archimate:Views>
</archimate:Model>`;
  }
}

// 初始化应用
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.app = new ArchimateEditorApp();
  });
} else {
  window.app = new ArchimateEditorApp();
}

