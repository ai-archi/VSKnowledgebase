<template>
  <div id="plantuml-editor-page">
    <PlantUMLEditor />
  </div>
</template>

<script setup lang="ts">
import PlantUMLEditor from './components/PlantUMLEditor.vue';
</script>

<style>
#plantuml-editor-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--vscode-editor-background, #1e1e1e);
  overflow: hidden;
}
</style>

