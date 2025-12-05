// Mermaid 代码编辑器
// 集成语法高亮和自动补全功能

export class MermaidCodeEditor {
  constructor(textareaElement, callbacks = {}) {
    this.textarea = textareaElement;
    this.callbacks = {
      onChange: callbacks.onChange || (() => {}),
      onError: callbacks.onError || (() => {})
    };
    
    this.editor = null;
    this.init();
  }
  
  async init() {
    // 动态导入 CodeMirror（如果可用）
    try {
      // 尝试使用 CodeMirror
      if (typeof CodeMirror !== 'undefined') {
        this.initCodeMirror();
      } else {
        // 降级到原生 textarea，但添加基础样式
        this.initNativeEditor();
      }
    } catch (error) {
      console.warn('CodeMirror not available, using native editor', error);
      this.initNativeEditor();
    }
  }
  
  /**
   * 初始化 CodeMirror 编辑器
   */
  initCodeMirror() {
    // 检查 CodeMirror 是否已加载
    if (typeof CodeMirror === 'undefined') {
      this.initNativeEditor();
      return;
    }
    
    // 尝试定义 Mermaid 语法模式（简化版）
    // 如果 defineSimpleMode 不可用，使用 text/plain 模式
    try {
      if (typeof CodeMirror.defineSimpleMode === 'function') {
        CodeMirror.defineSimpleMode('mermaid', {
          start: [
            { regex: /(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|gantt|pie|gitgraph|journey|erDiagram|requirementDiagram|mindmap|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment)\s+(TD|LR|BT|RL|V|H)/, token: 'keyword' },
            { regex: /(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|gantt|pie|gitgraph|journey|erDiagram|requirementDiagram|mindmap|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment)/, token: 'keyword' },
            { regex: /(TD|LR|BT|RL|V|H)/, token: 'atom' },
            { regex: /(subgraph|end)/, token: 'keyword' },
            { regex: /(classDef|class|linkStyle|style|click)/, token: 'keyword' },
            { regex: /(\w+)\[([^\]]*)\]/, token: ['variable', null, 'string'] },
            { regex: /(\w+)\(([^)]*)\)/, token: ['variable', null, 'string'] },
            { regex: /(\w+)\{([^}]*)\}/, token: ['variable', null, 'string'] },
            { regex: /(\w+)\s*(-->|--|==>|===|-\.->|-\.-)\s*(\w+)/, token: ['variable', 'operator', 'variable'] },
            { regex: /(\w+)\s*(-->|--|==>|===|-\.->|-\.-)\s*\|([^|]+)\|\s*(\w+)/, token: ['variable', 'operator', 'string', 'variable'] },
            { regex: /%%.*/, token: 'comment' },
            { regex: /\/\/.*/, token: 'comment' },
            { regex: /#[0-9a-fA-F]{6}/, token: 'number' },
            { regex: /"[^"]*"/, token: 'string' },
            { regex: /'[^']*'/, token: 'string' },
            { regex: /\s+/, token: null }
          ]
        });
      }
    } catch (error) {
      console.warn('Failed to define Mermaid mode, using plain text mode', error);
    }
    
    // 创建 CodeMirror 编辑器
    this.editor = CodeMirror.fromTextArea(this.textarea, {
      mode: typeof CodeMirror.defineSimpleMode === 'function' ? 'mermaid' : 'text/plain',
      theme: 'default',
      lineNumbers: true,
      lineWrapping: true,
      indentUnit: 2,
      tabSize: 2,
      autofocus: false,
      viewportMargin: Infinity, // 确保可以滚动查看所有内容
      extraKeys: {
        'Ctrl-Space': 'autocomplete',
        'Tab': (cm) => {
          if (cm.somethingSelected()) {
            cm.indentSelection('add');
          } else {
            cm.replaceSelection('  ', 'end');
          }
        }
      }
    });
    
    // 确保编辑器高度正确
    if (this.editor) {
      setTimeout(() => {
        this.editor.refresh();
      }, 100);
    }
    
    // 监听变化
    this.editor.on('change', (cm) => {
      const value = cm.getValue();
      this.callbacks.onChange(value);
    });
    
    // 添加自动补全（如果可用）
    if (typeof CodeMirror.showHint !== 'undefined') {
      this.setupAutocomplete();
    }
  }
  
  /**
   * 初始化原生编辑器（降级方案）
   */
  initNativeEditor() {
    // 添加基础样式类
    this.textarea.classList.add('mermaid-source-editor');
    
    // 监听变化
    this.textarea.addEventListener('input', () => {
      this.callbacks.onChange(this.textarea.value);
    });
    
    // 添加基础语法高亮（通过 CSS）
    this.textarea.addEventListener('input', () => {
      this.applyBasicHighlighting();
    });
  }
  
  /**
   * 设置自动补全
   */
  setupAutocomplete() {
    if (!this.editor || typeof CodeMirror.registerHelper === 'undefined') return;
    
    try {
      CodeMirror.registerHelper('hint', 'mermaid', (cm) => {
        const cursor = cm.getCursor();
        const line = cm.getLine(cursor.line);
        const start = cursor.ch;
        const end = cursor.ch;
        
        const suggestions = [
          'graph TD', 'graph LR', 'graph BT', 'graph RL',
          'flowchart TD', 'flowchart LR',
          'A[Label]', 'A(Label)', 'A{Label}', 'A((Label))',
          'A --> B', 'A --- B', 'A -.-> B', 'A ==> B',
          'classDef', 'class', 'linkStyle', 'style',
          'subgraph', 'end'
        ];
        
        const word = line.slice(0, start).match(/\w+$/);
        const prefix = word ? word[0] : '';
        
        const filtered = suggestions.filter(s => s.startsWith(prefix));
        
        return {
          list: filtered.length > 0 ? filtered : suggestions,
          from: CodeMirror.Pos(cursor.line, start - prefix.length),
          to: CodeMirror.Pos(cursor.line, end)
        };
      });
    } catch (error) {
      console.warn('Failed to setup autocomplete', error);
    }
  }
  
  /**
   * 基础语法高亮（降级方案）
   */
  applyBasicHighlighting() {
    // 这是一个非常简单的实现，主要通过 CSS 类来实现
    // 实际项目中建议使用 CodeMirror 或 Monaco Editor
  }
  
  /**
   * 获取编辑器内容
   */
  getValue() {
    if (this.editor) {
      return this.editor.getValue();
    }
    return this.textarea.value;
  }
  
  /**
   * 设置编辑器内容
   */
  setValue(value) {
    if (this.editor) {
      // 保存当前滚动位置和光标位置
      const scrollInfo = this.editor.getScrollInfo();
      const cursor = this.editor.getCursor();
      
      // 设置新值
      this.editor.setValue(value);
      
      // 恢复滚动位置和光标位置
      this.editor.scrollTo(scrollInfo.left, scrollInfo.top);
      this.editor.setCursor(cursor);
    } else {
      // 对于 textarea，保存滚动位置
      const scrollTop = this.textarea.scrollTop;
      const scrollLeft = this.textarea.scrollLeft;
      const selectionStart = this.textarea.selectionStart;
      const selectionEnd = this.textarea.selectionEnd;
      
      this.textarea.value = value;
      
      // 恢复滚动位置和选择范围
      this.textarea.scrollTop = scrollTop;
      this.textarea.scrollLeft = scrollLeft;
      
      // 如果选择范围仍然有效，恢复它
      if (selectionStart <= value.length && selectionEnd <= value.length) {
        this.textarea.setSelectionRange(selectionStart, selectionEnd);
      }
    }
  }
  
  /**
   * 聚焦编辑器
   */
  focus() {
    if (this.editor) {
      this.editor.focus();
    } else {
      this.textarea.focus();
    }
  }
  
  /**
   * 设置只读
   */
  setReadOnly(readOnly) {
    if (this.editor) {
      this.editor.setOption('readOnly', readOnly);
    } else {
      this.textarea.readOnly = readOnly;
    }
  }
  
  /**
   * 标记错误行
   */
  markError(line, message) {
    if (this.editor) {
      this.editor.addLineClass(line - 1, 'background', 'error-line');
      // 可以添加错误提示
    }
  }
  
  /**
   * 清除错误标记
   */
  clearErrors() {
    if (this.editor) {
      this.editor.removeLineClass(null, 'background', 'error-line');
    }
  }
  
  /**
   * 获取光标位置
   */
  getCursor() {
    if (this.editor) {
      return this.editor.getCursor();
    }
    return { line: 0, ch: 0 };
  }
  
  /**
   * 设置光标位置
   */
  setCursor(line, ch) {
    if (this.editor) {
      this.editor.setCursor(line, ch);
    } else {
      // 对于 textarea，设置选择范围
      const text = this.textarea.value;
      const lines = text.split('\n');
      let pos = 0;
      for (let i = 0; i < line && i < lines.length; i++) {
        pos += lines[i].length + 1; // +1 for newline
      }
      pos += ch;
      this.textarea.setSelectionRange(pos, pos);
    }
  }
}

