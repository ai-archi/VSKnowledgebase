<template>
  <div id="create-folder-dialog-page">
    <CreateFolderForm 
      @created="handleFolderCreated"
      @close="handleClose"
    />
  </div>
</template>

<script setup lang="ts">
import CreateFolderForm from './components/CreateFolderForm.vue';

const handleFolderCreated = (result: any) => {
  // 文件夹创建成功，通知后端关闭 webview
  console.log('Folder created:', result);
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
#create-folder-dialog-page {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--vscode-editor-background, #1e1e1e);
  overflow: hidden;
}
</style>

