<template>
  <div id="edit-relations-dialog-page">
    <EditRelationsForm 
      @saved="handleSaved"
      @close="handleClose"
    />
  </div>
</template>

<script setup lang="ts">
import EditRelationsForm from './components/EditRelationsForm.vue';

const handleSaved = () => {
  // 关联关系保存成功，通知后端关闭 webview
  console.log('Relations saved');
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

<style>
#edit-relations-dialog-page {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--vscode-editor-background, #1e1e1e);
  overflow: hidden;
}
</style>

