<template>
  <div id="mermaid-editor-page">
    <MermaidEditor />
  </div>
</template>

<script setup lang="ts">
import MermaidEditor from './components/MermaidEditor.vue';
</script>

<style>
#mermaid-editor-page {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--vscode-editor-background, #1e1e1e);
  overflow: hidden;
}
</style>

