// Archimate Editor App V2 - 基于 archimate-js (diagram-js) 的新版本
// 参考 MermaidEditorAppV2 的架构，使用 archimate-js 作为底层渲染引擎

import './styles.css';
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
    // 初始化 archimate 渲染器
    this.renderer = new ArchimateRenderer(this.elements.diagramContainer);
    
    // 订阅状态变化
    this.stateManager.subscribe((state) => this.onStateChange(state));
    
    // 设置事件监听
    this.setupEventListeners();
    this.setupWorkspaceResizer();
    
    // 设置 VSCode 消息监听
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
      
      this.loadDiagram();
    } else {
      this.loadDiagram();
    }
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
        } else {
          // 否则尝试获取（可能会超时，但没关系，消息会通过事件处理）
          try {
            const content = await fetchDiagram();
            if (content) {
              this.handleDiagramLoad(content);
            }
          } catch (error) {
            // 忽略超时错误，等待消息
            console.log('Waiting for load message...');
          }
        }
      } else {
        // 开发模式：加载示例
        const exampleContent = this.getExampleContent();
        this.handleDiagramLoad(exampleContent);
      }
    } catch (error) {
      this.showError(`加载失败: ${error.message}`);
    }
  }
  
  handleDiagramLoad(content) {
    try {
      this.elements.sourceEditor.value = content;
      this.stateManager.setState({ source: content });
      this.renderDiagram(content);
    } catch (error) {
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
      this.hideError();
      
      if (!source || source.trim() === '') {
        this.elements.diagramContainer.innerHTML = '<p>请输入 Archimate XML 内容</p>';
        return;
      }
      
      // 使用 archimate-js 渲染
      await this.renderer.render(source);
      
      // 自动保存
      this.scheduleSave(source);
    } catch (error) {
      this.showError(`渲染错误: ${error.message}`);
      console.error('Render error:', error);
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

