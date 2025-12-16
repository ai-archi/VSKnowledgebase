<template>
  <div id="solution-editor-page">
    <SolutionEditor />
  </div>
</template>

<script setup lang="ts">
import SolutionEditor from './components/SolutionEditor.vue';
</script>

<style>
#solution-editor-page {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--vscode-editor-background, #1e1e1e);
  overflow: hidden;
}
</style>

