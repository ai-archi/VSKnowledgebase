<template>
  <div class="diagram-editor">
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
import { ref, onMounted, onUnmounted, reactive, watch, nextTick } from 'vue';
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

onMounted(async () => {
  // 等待 DOM 完全渲染
  await nextTick();
  
  // 使用 requestAnimationFrame 确保浏览器完成渲染
  await new Promise(resolve => requestAnimationFrame(resolve));
  
  if (workspaceRef.value && diagramContainerRef.value && sourceEditorRef.value) {
    console.log('[MermaidEditor] Initializing editor app...');
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
  } else {
    console.error('[MermaidEditor] Missing required elements:', {
      workspace: !!workspaceRef.value,
      diagramContainer: !!diagramContainerRef.value,
      sourceEditor: !!sourceEditorRef.value,
      diagramPanel: !!diagramPanelRef.value,
      divider: !!dividerRef.value,
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
/* 样式已在 mermaid-editor-main.ts 中导入，确保在 CodeMirror CSS 之后加载 */
</style>

