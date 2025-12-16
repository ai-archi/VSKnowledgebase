<template>
  <div class="editor-toolbar">
    <el-button
      size="small"
      @click="handleExportMarkdown"
    >
      导出 Markdown
    </el-button>
    <el-button
      size="small"
      @click="handleFormat"
    >
      格式化
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { ElButton } from 'element-plus';

const emit = defineEmits<{
  'export-markdown': [];
  'format': [];
}>();

const handleExportMarkdown = () => {
  emit('export-markdown');
};

const handleFormat = () => {
  emit('format');
};
</script>

<style scoped>
.editor-toolbar {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  background: var(--vscode-editor-background, #1e1e1e);
  border-bottom: 1px solid var(--vscode-panel-border, #3e3e3e);
}
</style>

