<template>
  <div class="editor-page">
    <component :is="editorComponent" />
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue';

defineProps<{
  editorComponent: Component;
}>();
</script>

<style>
/* 使用全局样式，不限制作用域，确保编辑器样式正确应用 */
/* 注意：详细的编辑器样式在 diagram-editor.css 中定义，这里只定义页面容器样式 */
.editor-page {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

/* 确保编辑器组件占满整个页面 */
.editor-page > * {
  width: 100%;
  height: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
</style>

