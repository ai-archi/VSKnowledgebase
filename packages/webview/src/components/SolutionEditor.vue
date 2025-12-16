<template>
  <div class="solution-editor">
    <EditorToolbar
      @export-markdown="handleExportMarkdown"
      @format="handleFormat"
    />
    <div ref="editorContainer" class="editor-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core';
import { commonmark } from '@milkdown/preset-commonmark';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { nord } from '@milkdown/theme-nord';
import EditorToolbar from './EditorToolbar.vue';

const editorContainer = ref<HTMLElement | null>(null);
let editor: Editor | null = null;
let currentContent = ref('');

// 获取 VSCode API
const vscode = (window as any).vscode || (window as any).acquireVsCodeApi?.();

// 防抖保存
let saveTimeout: NodeJS.Timeout | null = null;
const debounceSave = (content: string) => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    if (vscode && content !== currentContent.value) {
      currentContent.value = content;
      vscode.postMessage({
        method: 'saveSolution',
        params: { content },
      });
    }
  }, 500);
};

onMounted(async () => {
  // 等待 DOM 完全渲染
  await nextTick();
  
  // 确保容器元素已完全准备好
  if (!editorContainer.value) {
    console.error('Editor container not found');
    return;
  }

  if (!editorContainer.value.parentElement) {
    console.error('Editor container parent not found');
    return;
  }

  // 使用 requestAnimationFrame 确保浏览器完成渲染
  requestAnimationFrame(async () => {
    try {
      // 再次检查容器是否仍然存在
      if (!editorContainer.value) {
        console.error('Editor container lost during initialization');
        return;
      }

      console.log('Initializing Milkdown editor...');
      
      // 检查必要的模块是否已加载
      if (!Editor || !commonmark || !listener) {
        throw new Error('Milkdown modules not loaded properly. Editor: ' + !!Editor + ', commonmark: ' + !!commonmark + ', listener: ' + !!listener);
      }

      // 初始化 Milkdown 编辑器
      // 根据官方文档，初始化顺序应该是：config -> preset -> plugins -> theme -> create
      // 注意：theme 应该在最后，避免初始化错误
      const editorBuilder = Editor.make()
        .config((ctx) => {
          if (!editorContainer.value) {
            throw new Error('Editor container is null');
          }
          ctx.set(rootCtx, editorContainer.value);
          ctx.set(defaultValueCtx, currentContent.value);
          ctx.set(listenerCtx, {
            markdownUpdated: (ctx, markdown, prevMarkdown) => {
              if (markdown !== prevMarkdown) {
                debounceSave(markdown);
              }
            },
          });
        })
        .use(commonmark) // preset 应该在最前面
        .use(listener); // 其他插件在 preset 之后
      
      // 尝试使用主题，如果失败则不使用主题
      if (nord) {
        try {
          editorBuilder.use(nord); // theme 应该在最后
        } catch (themeError) {
          console.warn('Failed to load nord theme, continuing without theme:', themeError);
        }
      } else {
        console.warn('Nord theme not available, continuing without theme');
      }
      
      editor = await editorBuilder.create();

      console.log('Milkdown editor initialized successfully');

      // 监听来自扩展的消息
      if (vscode) {
        window.addEventListener('message', handleMessage);
        
        // 请求初始内容
        vscode.postMessage({
          method: 'loadSolution',
        });
      }
    } catch (error) {
      console.error('Failed to initialize Milkdown editor:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        containerExists: !!editorContainer.value,
        containerParentExists: !!editorContainer.value?.parentElement,
      });
      
      // 如果 Milkdown 初始化失败，显示错误信息
      if (editorContainer.value) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : '';
        editorContainer.value.innerHTML = `
          <div style="padding: 20px; color: var(--vscode-errorForeground, #f48771);">
            <h3>编辑器初始化失败</h3>
            <p><strong>错误信息:</strong> ${errorMessage}</p>
            ${errorStack ? `<details><summary>错误堆栈</summary><pre style="font-size: 12px; overflow: auto;">${errorStack}</pre></details>` : ''}
            <p>请检查 Milkdown 依赖是否正确安装。</p>
            <p>如果问题持续，请尝试重新构建 webview: <code>cd packages/webview && pnpm build</code></p>
          </div>
        `;
      }
    }
  });
});

onBeforeUnmount(() => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  if (editor) {
    editor.destroy();
  }
  window.removeEventListener('message', handleMessage);
});

const handleMessage = (event: MessageEvent) => {
  const message = event.data;
  
  if (message.method === 'load') {
    const { content } = message.params || {};
    if (editor && content !== undefined && content !== currentContent.value) {
      currentContent.value = content;
      // 使用 action 更新内容
      editor.action((ctx) => {
        try {
          const view = ctx.get('editorViewCtx');
          const parser = ctx.get('parserCtx');
          if (view && parser) {
            const doc = parser(content);
            if (doc) {
              const tr = view.state.tr.replaceWith(0, view.state.doc.content.size, doc.content);
              view.dispatch(tr);
            }
          }
        } catch (error) {
          console.error('Failed to parse markdown:', error);
          // 如果解析失败，尝试直接设置默认值
          try {
            ctx.set(defaultValueCtx, content);
          } catch (e) {
            console.error('Failed to set default value:', e);
          }
        }
      });
    }
  } else if (message.method === 'save-success') {
    console.log('Solution saved successfully');
  } else if (message.method === 'initialize-success') {
    console.log('Missing chapters initialized successfully');
    // 重新加载内容
    if (vscode) {
      vscode.postMessage({
        method: 'loadSolution',
      });
    }
  } else if (message.method === 'initialize-error') {
    const { error } = message.params || {};
    console.error('Failed to initialize missing chapters:', error);
  } else if (message.method === 'locate-chapter') {
    const { lineNumber } = message.params || {};
    if (editor && lineNumber && editorContainer.value) {
      // 简单的滚动到指定行（Milkdown 内部会处理）
      const targetElement = editorContainer.value.querySelector(`[data-line="${lineNumber}"]`);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        // 如果找不到元素，尝试滚动到容器顶部
        editorContainer.value.scrollTop = 0;
      }
    }
  }
};

const handleExportMarkdown = () => {
  if (editor && vscode) {
    editor.action((ctx) => {
      const view = ctx.get('editorViewCtx');
      const serializer = ctx.get('serializerCtx');
      if (view && serializer) {
        try {
          const markdown = serializer(view.state.doc);
          vscode.postMessage({
            method: 'exportMarkdown',
            params: { content: markdown },
          });
        } catch (error) {
          console.error('Failed to serialize markdown:', error);
        }
      }
    });
  }
};

const handleFormat = () => {
  if (editor) {
    // Milkdown 会自动格式化，这里可以添加额外的格式化逻辑
    console.log('Formatting markdown...');
  }
};
</script>

<style scoped>
.solution-editor {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--vscode-editor-background, #1e1e1e);
}

.editor-container {
  flex: 1;
  overflow: auto;
  padding: 20px;
  color: var(--vscode-editor-foreground, #d4d4d4);
  font-family: var(--vscode-font-family, 'Consolas', 'Monaco', monospace);
  font-size: var(--vscode-font-size, 14px);
  line-height: 1.6;
}

/* Milkdown 主题适配 */
:deep(.milkdown) {
  background: transparent;
  color: var(--vscode-editor-foreground, #d4d4d4);
}

:deep(.milkdown h1),
:deep(.milkdown h2),
:deep(.milkdown h3),
:deep(.milkdown h4),
:deep(.milkdown h5),
:deep(.milkdown h6) {
  color: var(--vscode-editor-foreground, #d4d4d4);
  border-color: var(--vscode-panel-border, #3e3e3e);
}

:deep(.milkdown code) {
  background: var(--vscode-textCodeBlock-background, #2d2d2d);
  color: var(--vscode-textLink-foreground, #4ec9b0);
  padding: 2px 4px;
  border-radius: 3px;
}

:deep(.milkdown pre) {
  background: var(--vscode-textCodeBlock-background, #2d2d2d);
  border: 1px solid var(--vscode-panel-border, #3e3e3e);
  border-radius: 4px;
  padding: 12px;
}

:deep(.milkdown table) {
  border-collapse: collapse;
  border: 1px solid var(--vscode-panel-border, #3e3e3e);
}

:deep(.milkdown th),
:deep(.milkdown td) {
  border: 1px solid var(--vscode-panel-border, #3e3e3e);
  padding: 8px;
}

:deep(.milkdown th) {
  background: var(--vscode-editor-lineHighlightBackground, #2a2a2a);
}

:deep(.milkdown blockquote) {
  border-left: 4px solid var(--vscode-textLink-foreground, #4ec9b0);
  padding-left: 16px;
  margin-left: 0;
  color: var(--vscode-descriptionForeground, #cccccc);
}
</style>

