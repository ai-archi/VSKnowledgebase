<template>
  <div class="mermaid-editor">
    <!-- 工作区布局 -->
    <div class="workspace" ref="workspaceRef">
      <!-- 图表面板 -->
      <div class="diagram-panel" ref="diagramPanelRef">
        <div class="diagram-container" ref="diagramContainerRef"></div>
        <!-- 缩放控制 -->
        <div class="zoom-controls">
          <button @click="zoomIn" :disabled="zoomDisabled.in" title="放大">+</button>
          <button @click="zoomOut" :disabled="zoomDisabled.out" title="缩小">−</button>
          <button @click="zoomReset" title="重置">⌂</button>
        </div>
      </div>
      <!-- 分隔条 -->
      <div 
        class="workspace-divider" 
        ref="dividerRef"
        @mousedown="startResize"
      ></div>
      <!-- 源代码面板 -->
      <div class="source-panel">
        <div class="panel-header">
          <span class="panel-title">源代码</span>
        </div>
        <textarea 
          ref="sourceEditorRef" 
          class="source-editor"
          spellcheck="false"
        ></textarea>
      </div>
    </div>
    <!-- 底部横向错误提示弹窗 -->
    <Transition name="slide-up">
      <div v-if="error" class="error-toast" role="alert">
        <span class="error-icon">⚠</span>
        <span class="error-text">{{ error }}</span>
        <button class="error-close" @click="dismissError" title="关闭">×</button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive, watch } from 'vue';
import { MermaidEditorAppV2 } from '../lib/mermaid-editor/MermaidEditorAppV2';

const workspaceRef = ref<HTMLElement>();
const diagramPanelRef = ref<HTMLElement>();
const diagramContainerRef = ref<HTMLElement>();
const dividerRef = ref<HTMLElement>();
const sourceEditorRef = ref<HTMLTextAreaElement>();

const error = ref<string | null>(null);
const zoomDisabled = reactive({ in: false, out: false });
let errorTimer: NodeJS.Timeout | null = null;

let editorApp: MermaidEditorAppV2 | null = null;

// 监听错误状态变化，自动关闭错误提示
watch(error, (newError) => {
  if (errorTimer) {
    clearTimeout(errorTimer);
    errorTimer = null;
  }
  
  if (newError) {
    // 5秒后自动关闭错误提示
    errorTimer = setTimeout(() => {
      error.value = null;
    }, 5000);
  }
});

onMounted(() => {
  if (workspaceRef.value && diagramContainerRef.value && sourceEditorRef.value) {
    editorApp = new MermaidEditorAppV2({
      workspace: workspaceRef.value,
      diagramContainer: diagramContainerRef.value,
      sourceEditor: sourceEditorRef.value,
      diagramPanel: diagramPanelRef.value || null,
      divider: dividerRef.value || null,
      // 传递错误回调函数而不是 DOM 元素
      onError: (errorMessage: string | null) => {
        error.value = errorMessage;
      },
    });
  }
});

onUnmounted(() => {
  if (errorTimer) {
    clearTimeout(errorTimer);
  }
  editorApp?.destroy?.();
  editorApp = null;
});

const zoomIn = () => editorApp?.zoomIn();
const zoomOut = () => editorApp?.zoomOut();
const zoomReset = () => editorApp?.zoomReset();

const startResize = (e: MouseEvent) => {
  editorApp?.startResize?.(e);
};

const dismissError = () => {
  error.value = null;
};
</script>

<style scoped>
@import '../styles/mermaid-editor.css';

.mermaid-editor {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.mermaid-editor .workspace {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

/* 底部横向错误提示弹窗 */
.error-toast {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 20px;
  background: var(--vscode-errorForeground, #f48771);
  color: var(--vscode-editor-background, #1e1e1e);
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.3);
  z-index: 10000;
  font-size: 13px;
  line-height: 1.6;
  max-height: 50vh;
  overflow-y: auto;
  box-sizing: border-box;
}

.error-icon {
  font-size: 18px;
  flex-shrink: 0;
  margin-top: 2px;
}

.error-text {
  flex: 1;
  word-break: break-word;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  min-width: 0;
}

.error-close {
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.error-close:hover {
  opacity: 1;
}

/* 滑入动画 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(100%);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(100%);
}
</style>

