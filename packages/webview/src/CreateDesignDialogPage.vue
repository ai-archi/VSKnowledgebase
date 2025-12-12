<template>
  <div id="create-design-dialog-page">
    <CreateDesignForm 
      @created="handleDesignCreated"
      @close="handleClose"
    />
  </div>
</template>

<script setup lang="ts">
import CreateDesignForm from './components/CreateDesignForm.vue';

const handleDesignCreated = (artifact: any) => {
  // 设计图创建成功，不需要在这里发送 close 消息
  // CreateDesignForm 组件已经发送了 designCreated 消息，后端会在处理完后自动关闭
  console.log('Design diagram created:', artifact);
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
#create-design-dialog-page {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--vscode-editor-background, #1e1e1e);
  overflow: hidden;
}
</style>

