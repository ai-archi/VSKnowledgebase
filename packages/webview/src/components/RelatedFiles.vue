<template>
  <div class="related-files">
    <div v-if="loading" class="loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>加载中...</span>
    </div>
    <div v-else-if="files.length === 0" class="empty">
      <span>暂无关联文件</span>
    </div>
    <div v-else class="files-scroll">
      <div
        v-for="file in files"
        :key="file.id"
        class="file-card"
        @click="handleOpen(file)"
      >
        <el-icon class="file-icon">
          <Document v-if="file.type === 'document'" />
          <Picture v-else-if="file.type === 'design'" />
          <Document v-else />
        </el-icon>
        <div class="file-info">
          <div class="file-name">{{ file.name }}</div>
          <div class="file-path">{{ file.path }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Document, Picture, Loading } from '@element-plus/icons-vue';
import type { RelatedFile } from '@/types';

interface Props {
  files: RelatedFile[];
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<{
  open: [file: RelatedFile];
}>();

function handleOpen(file: RelatedFile) {
  emit('open', file);
}
</script>

<style scoped>
.related-files {
  padding: 8px 12px;
  border-bottom: 1px solid var(--vscode-panel-border, #3e3e3e);
  background: var(--vscode-panel-background, #1e1e1e);
  flex-shrink: 0;
  max-height: 100px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.files-scroll {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 4px 0;
  flex: 1;
  min-height: 0;
}

.file-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--vscode-panel-border, #3e3e3e);
  border-radius: 4px;
  background: var(--vscode-editor-background, #1e1e1e);
  cursor: pointer;
  min-width: 200px;
  flex-shrink: 0;
  transition: all 0.2s;
}

.file-card:hover {
  background: var(--vscode-list-hoverBackground, #2a2d2e);
  border-color: var(--vscode-panelTitle-activeBorder, #4ec9b0);
}

.file-icon {
  font-size: 20px;
  color: var(--vscode-foreground, #cccccc);
  flex-shrink: 0;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--vscode-foreground, #cccccc);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-path {
  font-size: 11px;
  color: var(--vscode-descriptionForeground, #999999);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 2px;
}

.loading,
.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  color: var(--vscode-descriptionForeground, #999999);
  font-size: 12px;
}
</style>

