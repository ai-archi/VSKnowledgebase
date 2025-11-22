<template>
  <div id="app">
    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['tab', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>
    <div class="content">
      <DocumentView v-if="activeTab === 'document'" />
      <TaskView v-if="activeTab === 'task'" />
      <ViewpointView v-if="activeTab === 'viewpoint'" />
      <TemplateView v-if="activeTab === 'template'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import DocumentView from './modules/document-view/DocumentView.vue';
import TaskView from './modules/task-view/TaskView.vue';
import ViewpointView from './modules/viewpoint-view/ViewpointView.vue';
import TemplateView from './modules/template-view/TemplateView.vue';

const activeTab = ref('document');

const tabs = [
  { id: 'document', label: '文档' },
  { id: 'task', label: '任务' },
  { id: 'viewpoint', label: '视点' },
  { id: 'template', label: '模板' },
];
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
  background: #f5f5f5;
}

.tab {
  padding: 12px 24px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  transition: all 0.2s;
}

.tab:hover {
  background: #e0e0e0;
}

.tab.active {
  color: #007acc;
  border-bottom-color: #007acc;
  background: white;
}

.content {
  flex: 1;
  overflow: auto;
}
</style>

