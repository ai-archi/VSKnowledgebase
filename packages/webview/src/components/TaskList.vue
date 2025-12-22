<template>
  <div class="task-list">
    <div v-if="loading" class="loading-container">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>加载中...</span>
    </div>

    <div v-else class="tasks">
      <!-- 按分类分组显示，即使没有任务也显示所有分类 -->
      <div
        v-for="(category, index) in taskCategories"
        :key="category.key"
        class="task-category"
      >
        <div
          class="category-header"
          @click="toggleCategory(category.key)"
        >
          <el-icon class="category-icon" :class="{ expanded: expandedCategories[category.key] }">
            <ArrowRight />
          </el-icon>
          <span class="category-title">{{ category.label }}</span>
          <span class="category-count">({{ category.tasks.length }})</span>
          <el-button
            v-if="index === 0"
            type="primary"
            size="small"
            :icon="Plus"
            @click.stop="handleCreate"
            class="create-task-button"
          >
            新建任务
          </el-button>
        </div>
        <div
          v-show="expandedCategories[category.key]"
          class="category-tasks"
        >
          <div
            v-if="category.tasks.length === 0"
            class="empty-category"
          >
            <span class="empty-text">暂无{{ category.label }}</span>
          </div>
          <div
            v-for="task in category.tasks"
            :key="task.id"
            class="task-item"
            :class="{ active: selectedTaskId === task.id }"
            @click="handleSelect(task)"
          >
            <div class="task-content">
              <div class="task-title">{{ task.title }}</div>
              <div class="task-meta">
                <div class="task-meta-left">
                  <el-tag
                    :type="getStatusType(task.status)"
                    size="small"
                    @click.stop="handleStatusClick(task)"
                    style="cursor: pointer;"
                  >
                    {{ getStatusText(task.status) }}
                  </el-tag>
                  <el-tag
                    v-if="task.priority"
                    :type="getPriorityType(task.priority)"
                    size="small"
                  >
                    {{ getPriorityText(task.priority) }}
                  </el-tag>
                  <span v-if="task.createdAt" class="created-time">
                    {{ formatDate(task.createdAt) }}
                  </span>
                </div>
                <el-button
                  type="danger"
                  size="small"
                  :icon="Delete"
                  @click.stop="handleDelete(task)"
                  class="delete-button"
                >
                  删除
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Plus, Loading, ArrowRight, Delete } from '@element-plus/icons-vue';
import type { Task } from '@/types';

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
  delete: [task: Task];
}>();

// 分类定义
const categoryConfig = [
  { key: 'task', label: '任务' },
  { key: 'issue', label: '问题' },
  { key: 'story', label: '故事' },
];

// 展开/折叠状态
const expandedCategories = ref<Record<string, boolean>>({
  task: true, // 默认展开任务分类
  issue: true,
  story: true,
});

// 按分类分组任务
const taskCategories = computed(() => {
  return categoryConfig.map(category => {
    const categoryTasks = props.tasks.filter(
      task => (task.category || 'task') === category.key
    );
    return {
      ...category,
      tasks: categoryTasks,
    };
  });
});

function toggleCategory(categoryKey: string) {
  expandedCategories.value[categoryKey] = !expandedCategories.value[categoryKey];
}

function handleSelect(task: Task) {
  emit('select', task);
}

function handleCreate() {
  emit('create');
}

function handleStatusClick(task: Task) {
  // 切换状态：completed <-> in-progress
  const newStatus = task.status === 'completed' ? 'in-progress' : 'completed';
  emit('select', {
    ...task,
    status: newStatus,
  });
}

function handleDelete(task: Task) {
  emit('delete', task);
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

function getPriorityType(priority: string): string {
  const types: Record<string, string> = {
    low: 'info',
    medium: 'warning',
    high: 'danger',
  };
  return types[priority] || 'info';
}

function getPriorityText(priority: string): string {
  const map: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
  };
  return map[priority] || priority;
}

function formatDate(date: Date | string): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>

<style scoped>
.task-list {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--vscode-panel-background, #1e1e1e);
  overflow: hidden;
}


.tasks {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.task-category {
  margin-bottom: 12px;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--vscode-list-hoverBackground, #2a2d2e);
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;
}

.category-header:hover {
  background: var(--vscode-list-activeSelectionBackground, #094771);
}

.category-icon {
  font-size: 12px;
  color: var(--vscode-foreground, #cccccc);
  transition: transform 0.2s;
}

.category-icon.expanded {
  transform: rotate(90deg);
}

.category-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--vscode-foreground, #cccccc);
}

.category-count {
  font-size: 12px;
  color: var(--vscode-descriptionForeground, #999999);
  margin-left: auto;
}

.create-task-button {
  margin-left: auto;
  margin-right: 0;
}

.category-tasks {
  padding: 4px 0 0 20px;
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
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: var(--vscode-descriptionForeground, #999999);
  flex-wrap: wrap;
}

.task-meta-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  flex: 1;
}

.created-time {
  font-size: 11px;
  color: var(--vscode-descriptionForeground, #999999);
}

.delete-button {
  flex-shrink: 0;
}

.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 40px;
  color: var(--vscode-descriptionForeground, #999999);
}

.empty-category {
  padding: 12px;
  text-align: center;
  color: var(--vscode-descriptionForeground, #999999);
  font-size: 12px;
}

.empty-text {
  display: inline-block;
}
</style>

