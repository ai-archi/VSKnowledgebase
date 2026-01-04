<template>
  <div class="task-list">
    <div v-if="loading" class="loading-container">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>加载中...</span>
    </div>

    <div v-else class="tasks-container">
      <!-- 第一行：新建任务按钮 -->
      <div class="task-header-row">
          <el-button
            type="primary"
            size="small"
            :icon="Plus"
          @click="handleCreate"
            class="create-task-button"
          >
            新建任务
          </el-button>
        </div>

      <!-- 第二行：搜索和筛选工具栏 -->
      <div class="task-toolbar">
        <el-input
          v-model="searchQuery"
          placeholder="搜索任务标题..."
          clearable
          size="small"
          style="width: 200px;"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select
          v-model="filterPriority"
          placeholder="优先级"
          size="small"
          style="width: 120px;"
          clearable
        >
          <el-option label="全部" value="all" />
          <el-option label="高" value="high" />
          <el-option label="中" value="medium" />
          <el-option label="低" value="low" />
        </el-select>
        <el-select
          v-model="filterCreatedDate"
          placeholder="创建时间"
          size="small"
          style="width: 120px;"
          clearable
        >
          <el-option label="全部" value="all" />
          <el-option label="今天" value="today" />
          <el-option label="本周" value="week" />
          <el-option label="本月" value="month" />
        </el-select>
      </div>

      <!-- 状态分组显示 -->
      <div class="status-groups">
        <div
          v-for="statusGroup in taskStatusGroups"
          :key="statusGroup.key"
          class="status-group"
        >
          <div
            class="status-group-header"
            @click="toggleStatusGroup(statusGroup.key)"
          >
            <el-icon class="status-group-icon" :class="{ expanded: expandedStatusGroups[statusGroup.key] }">
              <ArrowRight />
            </el-icon>
            <span class="status-group-title">{{ statusGroup.label }}</span>
            <span class="status-group-count">({{ statusGroup.totalCount }})</span>
          </div>
          <div
            v-show="expandedStatusGroups[statusGroup.key]"
            class="status-group-tasks"
          >
            <div
              v-if="statusGroup.tasks.length === 0"
              class="empty-status-group"
            >
              <span class="empty-text">暂无{{ statusGroup.label }}</span>
            </div>
            <div
              v-for="task in statusGroup.tasks"
            :key="task.id"
            class="task-item"
            :class="{ active: selectedTaskId === task.id }"
            @click="handleSelect(task)"
          >
            <div class="task-content">
                <div class="task-header">
                  <span class="task-title">{{ task.title }}</span>
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
              <div class="task-meta">
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
              </div>
            </div>
            <!-- 加载更多按钮 -->
            <div
              v-if="statusGroup.tasks.length < statusGroup.totalCount"
              class="load-more-container"
            >
              <el-button
                size="small"
                @click.stop="loadMore(statusGroup.key)"
              >
                加载更多 ({{ statusGroup.totalCount - statusGroup.tasks.length }})
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 无结果提示 -->
      <div
        v-if="hasNoResults"
        class="no-results"
      >
        <span>未找到匹配的任务</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Plus, Loading, ArrowRight, Delete, Search } from '@element-plus/icons-vue';
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

// 分类配置（保留所有分类，但暂时只启用 task）
const categoryConfig = [
  { key: 'task', label: '任务', enabled: true },
  { key: 'issue', label: '问题', enabled: false },  // 暂时隐藏
  { key: 'story', label: '故事', enabled: false },  // 暂时隐藏
];

// 只显示启用的分类
const enabledCategories = computed(() => {
  return categoryConfig.filter(category => category.enabled);
});

// 状态配置
const statusConfig = [
  { key: 'pending', label: '待处理', defaultExpanded: true },
  { key: 'in-progress', label: '进行中', defaultExpanded: true },
  { key: 'completed', label: '已完成', defaultExpanded: false },
];

// 当前选中的分类
const selectedCategory = ref<string>('task');

// 状态组展开/折叠状态
const expandedStatusGroups = ref<Record<string, boolean>>({});

// 初始化状态组展开状态
function initStatusGroupExpanded() {
  statusConfig.forEach(status => {
    if (expandedStatusGroups.value[status.key] === undefined) {
      expandedStatusGroups.value[status.key] = status.defaultExpanded;
    }
  });
}

// 初始化
initStatusGroupExpanded();

// 监听分类切换
watch(selectedCategory, () => {
  initStatusGroupExpanded();
  resetLoadedCounts();
});

// 切换状态组展开/折叠
function toggleStatusGroup(statusKey: string) {
  expandedStatusGroups.value[statusKey] = !expandedStatusGroups.value[statusKey];
}

// 搜索和筛选状态
const searchQuery = ref<string>('');
const filterPriority = ref<string>('all');
const filterCreatedDate = ref<string>('all');

// 每次加载的任务数量
const taskPageSize = 20;

// 每个状态组已加载的任务数量
const loadedCounts = ref<Record<string, number>>({});

// 初始化加载数量
function initLoadedCounts() {
  statusConfig.forEach(status => {
    if (loadedCounts.value[status.key] === undefined) {
      loadedCounts.value[status.key] = taskPageSize;
    }
  });
}

// 初始化
initLoadedCounts();

// 加载更多任务
function loadMore(statusKey: string) {
  if (!loadedCounts.value[statusKey]) {
    loadedCounts.value[statusKey] = taskPageSize;
  }
  loadedCounts.value[statusKey] += taskPageSize;
}

// 重置加载数量（切换分类或搜索/筛选时）
function resetLoadedCounts() {
  statusConfig.forEach(status => {
    loadedCounts.value[status.key] = taskPageSize;
  });
}

// 监听搜索和筛选变化，重置加载数量
watch([searchQuery, filterPriority, filterCreatedDate], () => {
  resetLoadedCounts();
});

// 搜索函数
function filterTasksBySearch(tasks: Task[], query: string): Task[] {
  if (!query.trim()) return tasks;
  const lowerQuery = query.toLowerCase();
  return tasks.filter(task => 
    task.title.toLowerCase().includes(lowerQuery)
  );
}

// 优先级筛选
function filterTasksByPriority(tasks: Task[], priority: string): Task[] {
  if (priority === 'all' || !priority) return tasks;
  return tasks.filter(task => task.priority === priority);
}

// 创建时间筛选
function filterTasksByCreatedDate(tasks: Task[], dateRange: string): Task[] {
  if (dateRange === 'all' || !dateRange) return tasks;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay()); // 本周一
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  return tasks.filter(task => {
    if (!task.createdAt) return false;
    const createdDate = new Date(task.createdAt);
    
    switch (dateRange) {
      case 'today':
        return createdDate >= today;
      case 'week':
        return createdDate >= weekStart;
      case 'month':
        return createdDate >= monthStart;
      default:
        return true;
    }
  });
}

// 按状态分组（只显示当前选中分类的任务）
const taskStatusGroups = computed(() => {
  // 1. 先过滤掉 cancelled 状态
  let filteredTasks = props.tasks.filter(task => task.status !== 'cancelled');
  
  // 2. 根据选中的分类过滤
  filteredTasks = filteredTasks.filter(
    task => (task.category || 'task') === selectedCategory.value
  );
  
  // 3. 应用搜索
  filteredTasks = filterTasksBySearch(filteredTasks, searchQuery.value);
  
  // 4. 应用筛选
  filteredTasks = filterTasksByPriority(filteredTasks, filterPriority.value);
  filteredTasks = filterTasksByCreatedDate(filteredTasks, filterCreatedDate.value);
  
  // 5. 按状态分组
  return statusConfig.map(statusGroup => {
    let statusTasks = filteredTasks.filter(
      task => task.status === statusGroup.key
    );
    
    // 按创建时间倒序排列（最新的在前）
    statusTasks = statusTasks.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA; // 倒序
    });
    
    const totalCount = statusTasks.length;
    const loadedCount = loadedCounts.value[statusGroup.key] || taskPageSize;
    
    // 根据已加载数量限制显示
    const displayedTasks = statusTasks.slice(0, loadedCount);
    
    return {
      ...statusGroup,
      tasks: displayedTasks,
      totalCount, // 保存总数，用于显示"加载更多"
    };
  });
});

// 检查是否有结果
const hasNoResults = computed(() => {
  return taskStatusGroups.value.every(group => group.totalCount === 0);
});

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

.tasks-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 8px;
}

/* 第一行：新建任务按钮 */
.task-header-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 8px 0;
  margin-bottom: 8px;
}

.create-task-button {
  flex-shrink: 0;
  height: 32px;
}

/* 第二行：搜索和筛选工具栏 */
.task-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  margin-bottom: 8px;
}

/* 状态分组 */
.status-groups {
  flex: 1;
  overflow-y: auto;
}

.status-group {
  margin-bottom: 12px;
}

.status-group-header {
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

.status-group-header:hover {
  background: var(--vscode-list-activeSelectionBackground, #094771);
}

.status-group-icon {
  font-size: 12px;
  color: var(--vscode-foreground, #cccccc);
  transition: transform 0.2s;
}

.status-group-icon.expanded {
  transform: rotate(90deg);
}

.status-group-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--vscode-foreground, #cccccc);
}

.status-group-count {
  font-size: 12px;
  color: var(--vscode-descriptionForeground, #999999);
  margin-left: 4px;
}

.status-group-tasks {
  padding: 4px 0 0 0;
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
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
}

.task-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--vscode-foreground, #cccccc);
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--vscode-descriptionForeground, #999999);
  flex-wrap: wrap;
}

.created-time {
  font-size: 11px;
  color: var(--vscode-descriptionForeground, #999999);
}

.delete-button {
  flex-shrink: 0;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s, visibility 0.2s;
}

.task-item:hover .delete-button {
  opacity: 1;
  visibility: visible;
}

.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 40px;
  color: var(--vscode-descriptionForeground, #999999);
}

.empty-status-group {
  padding: 12px;
  text-align: center;
  color: var(--vscode-descriptionForeground, #999999);
  font-size: 12px;
}

.empty-text {
  display: inline-block;
}

/* 加载更多按钮 */
.load-more-container {
  display: flex;
  justify-content: center;
  padding: 12px 0;
  margin-top: 8px;
}

/* 无结果提示 */
.no-results {
  padding: 40px;
  text-align: center;
  color: var(--vscode-descriptionForeground, #999999);
  font-size: 14px;
}
</style>

