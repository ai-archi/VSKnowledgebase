<template>
  <div id="create-file-dialog-page">
    <CreateFileForm 
      @created="handleFileCreated"
      @close="handleClose"
    />
  </div>
</template>

<script setup lang="ts">
import CreateFileForm from './components/CreateFileForm.vue';

const handleFileCreated = (artifact: any) => {
  // 文件创建成功，不需要在这里发送 close 消息
  // CreateFileForm 组件已经发送了 fileCreated 消息，后端会在处理完后自动关闭
  console.log('File created:', artifact);
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
#create-file-dialog-page {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--vscode-editor-background, #1e1e1e);
  overflow: hidden;
}
</style>

