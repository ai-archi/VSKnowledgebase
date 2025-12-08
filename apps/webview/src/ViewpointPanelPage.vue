<template>
  <div class="viewpoint-panel">
    <!-- 关联文件区 -->
    <RelatedFiles
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
        />
      </div>

      <!-- 右侧：任务流程可视化 -->
      <div class="workflow-container">
        <TaskWorkflowDiagram
          v-if="selectedTask"
          :task="selectedTask"
          :workflow-data="selectedTask.workflowData || {}"
          @step-click="handleStepClick"
          @step-update="handleStepUpdate"
        />
        <div v-else class="empty-workflow">
          <el-empty description="请选择一个任务查看流程" :image-size="100" />
        </div>
      </div>
    </div>

    <!-- 任务步骤详情弹窗 -->
    <TaskStepDetail
      v-if="showStepDetail"
      :step="currentStep"
      :step-type="currentStepType"
      @close="showStepDetail = false"
      @save="handleStepSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { extensionService } from './services/ExtensionService';
import RelatedFiles from './components/RelatedFiles.vue';
import TaskList from './components/TaskList.vue';
import TaskWorkflowDiagram from './components/TaskWorkflowDiagram.vue';
import TaskStepDetail from './components/TaskStepDetail.vue';
import type { RelatedFile, Task } from './types';

// 状态
const relatedFiles = ref<RelatedFile[]>([]);
const loadingRelatedFiles = ref(false);
const tasks = ref<Task[]>([]);
const loadingTasks = ref(false);
const selectedTaskId = ref<string | null>(null);
const selectedTask = ref<Task | null>(null);
const showStepDetail = ref(false);
const currentStep = ref<any>(null);
const currentStepType = ref<string>('');

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

function handleSelectTask(task: Task) {
  selectedTaskId.value = task.id;
  selectedTask.value = task;
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

function handleStepClick(stepType: string, stepData: any) {
  currentStepType.value = stepType;
  currentStep.value = stepData;
  showStepDetail.value = true;
}

async function handleStepUpdate(stepType: string, data: any) {
  if (!selectedTask.value) return;
  
  try {
    await extensionService.call('updateTaskWorkflow', {
      taskId: selectedTask.value.id,
      stepType,
      data,
    });
    await loadTasks();
    // 更新选中的任务
    const updatedTask = tasks.value.find(t => t.id === selectedTask.value!.id);
    if (updatedTask) {
      selectedTask.value = updatedTask;
    }
  } catch (error) {
    console.error('Failed to update workflow step:', error);
  }
}

function handleStepSave(stepData: any) {
  handleStepUpdate(currentStepType.value, stepData);
  showStepDetail.value = false;
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
  overflow: hidden;
  flex-shrink: 0;
}

.workflow-container {
  flex: 1;
  overflow: hidden;
  min-width: 0;
}

.empty-workflow {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--vscode-descriptionForeground, #999999);
}
</style>

