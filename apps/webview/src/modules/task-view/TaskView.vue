<template>
  <div class="task-view">
    <div class="header">
      <h2>任务视图</h2>
      <button @click="refresh">刷新</button>
      <button @click="createTask">创建任务</button>
    </div>
    <div class="content">
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else class="task-list">
        <div
          v-for="task in tasks"
          :key="task.id"
          class="task-item"
          :class="{ completed: task.status === 'completed' }"
        >
          <input
            type="checkbox"
            :checked="task.status === 'completed'"
            @change="toggleTask(task)"
          />
          <div class="task-content">
            <h3>{{ task.title }}</h3>
            <p v-if="task.description" class="description">{{ task.description }}</p>
            <div class="task-meta">
              <span v-if="task.category" class="category">{{ task.category }}</span>
              <span v-if="task.priority" class="priority" :class="`priority-${task.priority}`">
                {{ task.priority }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { extensionService } from '../../services/ExtensionService';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed';
  category?: string;
  priority?: 'low' | 'medium' | 'high';
}

const tasks = ref<Task[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const loadTasks = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await extensionService.call<Task[]>('task.list', {});
    tasks.value = result || [];
  } catch (err: any) {
    error.value = err.message || '加载任务失败';
    console.error('Failed to load tasks', err);
  } finally {
    loading.value = false;
  }
};

const refresh = () => {
  loadTasks();
};

const toggleTask = async (task: Task) => {
  try {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await extensionService.call('task.update', {
      taskId: task.id,
      updates: { status: newStatus },
    });
    await loadTasks();
  } catch (err: any) {
    console.error('Failed to update task', err);
  }
};

const createTask = async () => {
  try {
    const title = prompt('输入任务标题');
    if (!title) return;

    await extensionService.call('task.create', {
      title,
      status: 'pending',
    });
    await loadTasks();
  } catch (err: any) {
    console.error('Failed to create task', err);
  }
};

onMounted(() => {
  loadTasks();
});
</script>

<style scoped>
.task-view {
  padding: 20px;
}

.header {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 20px;
}

.header h2 {
  margin: 0;
  flex: 1;
}

.header button {
  padding: 8px 16px;
  background: #007acc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.header button:hover {
  background: #005a9e;
}

.loading,
.error {
  text-align: center;
  padding: 40px;
  color: #666;
}

.error {
  color: #d32f2f;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-item {
  display: flex;
  gap: 12px;
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: white;
}

.task-item.completed {
  opacity: 0.6;
}

.task-item.completed .task-content h3 {
  text-decoration: line-through;
}

.task-content {
  flex: 1;
}

.task-content h3 {
  margin: 0 0 8px 0;
  color: #333;
}

.task-content .description {
  margin: 4px 0;
  color: #666;
  font-size: 14px;
}

.task-meta {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.category {
  padding: 2px 8px;
  background: #f5f5f5;
  border-radius: 12px;
  font-size: 12px;
}

.priority {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.priority-low {
  background: #c8e6c9;
  color: #2e7d32;
}

.priority-medium {
  background: #fff9c4;
  color: #f57f17;
}

.priority-high {
  background: #ffcdd2;
  color: #c62828;
}
</style>

