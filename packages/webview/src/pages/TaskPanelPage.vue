<template>
  <div class="task-panel">
    <!-- 关联文件区 -->
    <RelatedFiles
      v-if="relatedFiles.length > 0 || loadingRelatedFiles"
      :files="relatedFiles"
      :loading="loadingRelatedFiles"
      @open="handleOpenFile"
    />

    <!-- 左右分栏 -->
    <div class="content-area">
      <!-- 左侧：任务列表 -->
      <div class="task-list-container">
        <TaskList
          :tasks="tasks"
          :loading="loadingTasks"
          :selected-task-id="selectedTaskId"
          @select="handleSelectTask"
          @create="handleCreateTask"
          @delete="handleDeleteTask"
        />
      </div>

      <!-- 右侧：任务详情 -->
      <div class="workflow-container">
        <TaskDetail
          v-if="selectedTask"
          :task="selectedTask"
        />
        <div v-else class="empty-workflow">
          <el-empty description="请选择一个任务查看详情" :image-size="100" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { extensionService } from '@/services/ExtensionService';
import RelatedFiles from '@/components/RelatedFiles.vue';
import TaskList from '@/components/TaskList.vue';
import TaskDetail from '@/components/TaskDetail.vue';
import type { RelatedFile, Task } from '@/types';

// 状态
const relatedFiles = ref<RelatedFile[]>([]);
const loadingRelatedFiles = ref(false);
const tasks = ref<Task[]>([]);
const loadingTasks = ref(false);
const selectedTaskId = ref<string | null>(null);
const selectedTask = ref<Task | null>(null);

// 方法
async function loadRelatedFiles() {
  loadingRelatedFiles.value = true;
  try {
    const files = await extensionService.call('getRelatedFiles');
    relatedFiles.value = files || [];
  } catch (error) {
    console.error('Failed to load related files:', error);
  } finally {
    loadingRelatedFiles.value = false;
  }
}

async function loadTasks() {
  loadingTasks.value = true;
  try {
    const taskList = await extensionService.call('getTasks');
    tasks.value = taskList || [];
  } catch (error) {
    console.error('Failed to load tasks:', error);
  } finally {
    loadingTasks.value = false;
  }
}

async function handleSelectTask(task: Task) {
  console.log('[TaskPanelPage] Task selected', {
    taskId: task.id,
    taskTitle: task.title,
    stepsCount: (task as any).steps?.length || 0
  });
  selectedTaskId.value = task.id;
  selectedTask.value = task;
  
  // 自动打开任务方案文件
  try {
    await extensionService.call('openSolution', {
      taskId: task.id,
    });
  } catch (error) {
    console.error('Failed to open solution file:', error);
    // 不显示错误消息，因为方案文件可能不存在（新任务）
  }
}

async function handleCreateTask() {
  try {
    // 打开创建任务弹窗
    await extensionService.call('openCreateTaskDialog');
  } catch (error) {
    console.error('Failed to open create task dialog:', error);
  }
}

function handleOpenFile(file: RelatedFile) {
  // 优先使用 contentLocation（完整文件路径），如果没有则使用 path 和 vaultId
  extensionService.call('openFile', {
    contentLocation: file.contentLocation,
    filePath: file.path,
    vaultId: file.vault?.id,
  });
}

async function handleDeleteTask(task: Task) {
  try {
    // 使用 ElMessageBox 确认删除
    await ElMessageBox.confirm(
      `确定要删除任务 "${task.title}" 吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
        dangerouslyUseHTMLString: false,
      }
    );

    // 调用删除任务方法
    await extensionService.call('deleteTask', {
      taskId: task.id,
    });

    // 显示成功消息
    ElMessage.success('任务已删除');

    // 重新加载任务列表
    await loadTasks();

    // 如果删除的是当前选中的任务，清空选中状态
    if (selectedTaskId.value === task.id) {
      selectedTaskId.value = null;
      selectedTask.value = null;
    }
  } catch (error: any) {
    // 如果用户取消删除，ElMessageBox 会抛出错误，需要忽略
    if (error === 'cancel' || error === 'close') {
      return;
    }
    console.error('Failed to delete task:', error);
    ElMessage.error(`删除任务失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 监听选中任务变化
watch(selectedTaskId, (newId) => {
  if (newId) {
    const task = tasks.value.find(t => t.id === newId);
    if (task) {
      selectedTask.value = task;
    }
  } else {
    selectedTask.value = null;
  }
});

// 监听任务列表变化，同步更新选中的任务对象引用
watch(tasks, (newTasks, oldTasks) => {
  if (selectedTaskId.value) {
    const task = newTasks.find(t => t.id === selectedTaskId.value);
    if (task) {
      selectedTask.value = task;
    } else {
      // 如果任务不在列表中（可能被删除），清空选中状态
      selectedTaskId.value = null;
      selectedTask.value = null;
    }
  }
}, { deep: true });

// 监听后端事件
extensionService.on('taskChanged', async () => {
  console.log('[TaskPanelPage] Task changed event received, reloading tasks');
  await loadTasks();
});

extensionService.on('fileChanged', async () => {
  console.log('[TaskPanelPage] File changed event received, reloading related files');
  await loadRelatedFiles();
});

// 初始化
onMounted(async () => {
  await Promise.all([
    loadRelatedFiles(),
    loadTasks(),
  ]);
});
</script>

<style scoped>
.task-panel {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--vscode-panel-background, #1e1e1e);
  overflow: hidden;
}

.content-area {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

.task-list-container {
  width: 300px;
  flex-shrink: 0;
  border-right: 1px solid var(--vscode-panel-border, #3e3e3e);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.workflow-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.empty-workflow {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vscode-editor-background, #1e1e1e);
}
</style>

