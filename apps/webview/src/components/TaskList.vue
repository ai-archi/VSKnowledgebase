<template>
  <div class="task-list">
    <div class="task-list-header">
      <el-button
        type="primary"
        size="small"
        :icon="Plus"
        @click="handleCreate"
      >
        新建任务
      </el-button>
    </div>

    <div v-if="loading" class="loading-container">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>加载中...</span>
    </div>

    <div v-else-if="tasks.length === 0" class="empty-container">
      <el-empty description="暂无任务" :image-size="80" />
    </div>

    <div v-else class="tasks">
      <div
        v-for="task in tasks"
        :key="task.id"
        class="task-item"
        :class="{ active: selectedTaskId === task.id }"
        @click="handleSelect(task)"
      >
        <el-checkbox
          :model-value="task.status === 'completed'"
          @change="handleStatusChange(task, $event)"
          @click.stop
        />
        <div class="task-content">
          <div class="task-title">{{ task.title }}</div>
          <div class="task-meta">
            <el-tag
              :type="getStatusType(task.status)"
              size="small"
            >
              {{ getStatusText(task.status) }}
            </el-tag>
            <span v-if="task.priority" class="priority">
              {{ getPriorityText(task.priority) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus, Loading } from '@element-plus/icons-vue';
import type { Task } from '../types';

interface Props {
  tasks: Task[];
  loading?: boolean;
  selectedTaskId?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  selectedTaskId: null,
});

const emit = defineEmits<{
  select: [task: Task];
  create: [];
}>();

function handleSelect(task: Task) {
  emit('select', task);
}

function handleCreate() {
  emit('create');
}

function handleStatusChange(task: Task, checked: boolean) {
  emit('select', {
    ...task,
    status: checked ? 'completed' : 'in-progress',
  });
}

function getStatusType(status: Task['status']): string {
  switch (status) {
    case 'completed':
      return 'success';
    case 'in-progress':
      return 'warning';
    case 'pending':
      return 'info';
    case 'cancelled':
      return 'danger';
    default:
      return 'info';
  }
}

function getStatusText(status: Task['status']): string {
  switch (status) {
    case 'completed':
      return '已完成';
    case 'in-progress':
      return '进行中';
    case 'pending':
      return '待处理';
    case 'cancelled':
      return '已取消';
    default:
      return '未知';
  }
}

function getPriorityText(priority: string): string {
  const map: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
  };
  return map[priority] || priority;
}
</script>

<style scoped>
.task-list {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--vscode-panel-background, #1e1e1e);
}

.task-list-header {
  padding: 12px;
  border-bottom: 1px solid var(--vscode-panel-border, #3e3e3e);
  flex-shrink: 0;
}

.tasks {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.task-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  margin-bottom: 8px;
  border: 1px solid var(--vscode-panel-border, #3e3e3e);
  border-radius: 4px;
  cursor: pointer;
  background: var(--vscode-panel-background, #1e1e1e);
  transition: all 0.2s;
}

.task-item:hover {
  background: var(--vscode-list-hoverBackground, #2a2d2e);
  border-color: var(--vscode-panelTitle-activeBorder, #4ec9b0);
}

.task-item.active {
  background: var(--vscode-list-activeSelectionBackground, #094771);
  border-color: var(--vscode-panelTitle-activeBorder, #4ec9b0);
}

.task-content {
  flex: 1;
  min-width: 0;
}

.task-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--vscode-foreground, #cccccc);
  margin-bottom: 8px;
}

.task-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--vscode-descriptionForeground, #999999);
}

.loading-container,
.empty-container {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 40px;
  color: var(--vscode-descriptionForeground, #999999);
}
</style>

