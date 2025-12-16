<template>
  <div class="viewpoint-panel">
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
import { extensionService } from './services/ExtensionService';
import RelatedFiles from './components/RelatedFiles.vue';
import TaskList from './components/TaskList.vue';
import TaskDetail from './components/TaskDetail.vue';
import type { RelatedFile, Task } from './types';

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
  console.log('[ViewpointPanelPage] Task selected', {
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


async function handleEditTask(task: Task) {
  try {
    // 打开编辑任务弹窗或直接打开任务文件
    await extensionService.call('openFile', {
      filePath: task.artifactPath,
      vaultId: task.vaultId,
    });
  } catch (error) {
    console.error('Failed to edit task:', error);
  }
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
  console.log('[ViewpointPanelPage] Tasks list changed', {
    selectedTaskId: selectedTaskId.value,
    newTasksCount: newTasks.length,
    oldTasksCount: oldTasks?.length || 0
  });
  
  if (selectedTaskId.value) {
    const updatedTask = newTasks.find(t => t.id === selectedTaskId.value);
    if (updatedTask) {
      console.log('[ViewpointPanelPage] Updating selectedTask reference', {
        taskId: updatedTask.id,
        taskTitle: updatedTask.title,
        stepsCount: (updatedTask as any).steps?.length || 0
      });
      // 更新引用，确保 TaskDetail 和 TaskWorkflowDiagram 能检测到变化
      selectedTask.value = updatedTask;
    } else {
      console.log('[ViewpointPanelPage] Selected task not found in new list, clearing selection');
      // 如果任务不在列表中，清空选中状态
      selectedTaskId.value = null;
      selectedTask.value = null;
    }
  }
}, { deep: true });

// 生命周期
onMounted(() => {
  loadRelatedFiles();
  loadTasks();

  // 监听文件变更事件
  extensionService.on('fileChanged', async () => {
    await loadRelatedFiles();
  });

  // 监听任务变更事件
  extensionService.on('taskChanged', async () => {
    await loadTasks();
  });
});
</script>

<style scoped>
.viewpoint-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--vscode-panel-background, #1e1e1e);
  color: var(--vscode-panel-foreground, #cccccc);
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
  border-right: 1px solid var(--vscode-panel-border, #3e3e3e);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}

.workflow-container {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}

.empty-workflow {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--vscode-descriptionForeground, #999999);
}
</style>

