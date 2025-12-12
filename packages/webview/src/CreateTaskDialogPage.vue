<template>
  <div id="create-task-dialog-page">
    <CreateTaskForm 
      @created="handleTaskCreated"
      @close="handleClose"
    />
  </div>
</template>

<script setup lang="ts">
import CreateTaskForm from './components/CreateTaskForm.vue';

const handleTaskCreated = (task: any) => {
  // 任务创建成功，不需要在这里发送 close 消息
  // CreateTaskForm 组件已经发送了 taskCreated 消息，后端会在处理完后自动关闭
  console.log('Task created:', task);
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
#create-task-dialog-page {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--vscode-editor-background, #1e1e1e);
  overflow: hidden;
}
</style>

