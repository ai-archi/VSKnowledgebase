<template>
  <div class="dialog-page">
    <component :is="formComponent" @created="handleCreated" @saved="handleSaved" @close="handleClose" />
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue';

defineProps<{
  formComponent: Component;
}>();

const handleCreated = () => {
  // 创建成功，Form 组件已经发送了消息，后端会在处理完后自动关闭
  console.log('Item created');
};

const handleSaved = () => {
  // 保存成功，通知后端关闭 webview
  if (window.acquireVsCodeApi) {
    const vscode = window.acquireVsCodeApi();
    vscode.postMessage({ method: 'close' });
  }
};

const handleClose = () => {
  // 通知后端关闭 webview
  if (window.acquireVsCodeApi) {
    const vscode = window.acquireVsCodeApi();
    vscode.postMessage({ method: 'close' });
  }
};
</script>

<style scoped>
.dialog-page {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--vscode-editor-background, #1e1e1e);
  overflow-y: auto;
}
</style>

