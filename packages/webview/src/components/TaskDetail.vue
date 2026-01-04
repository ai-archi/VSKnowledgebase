<template>
  <div class="task-detail-wrapper" v-if="task">
    <div class="task-detail">
      <!-- 工作流可视化 -->
      <div class="workflow-section">
        <div class="workflow-header">
          <h3>任务详情</h3>
          <div class="header-actions">
            <el-button size="small" @click="handleOpenSolution">打开方案</el-button>
            <el-button size="small" @click="handleEditRelations">编辑</el-button>
            <el-button
              type="primary"
              size="small"
              @click="handleTriggerGeneratePrompt"
              v-if="selectedStepId && hasForm"
            >
              生成提示词
            </el-button>
            <div class="step-navigation-buttons" v-if="selectedStepId">
              <el-button
                type="default"
                size="small"
                @click="handlePrevStep"
                v-if="canGoPrev"
              >
                上一步
              </el-button>
              <el-button
                type="primary"
                size="small"
                @click="handleNextStep"
                v-if="canGoNext && !isLastStep && !isCurrentStepCompleted"
              >
                下一步
              </el-button>
              <el-button
                type="success"
                size="small"
                @click="handleCompleteTask"
                v-if="isLastStep && !isCurrentStepCompleted"
              >
                完成
              </el-button>
            </div>
          </div>
        </div>
        <!-- 工作流程图（横向展示） -->
        <div class="workflow-diagram-area">
          <TaskWorkflowDiagram
            :task="task"
            @step-click="handleStepClick"
          />
        </div>
        <!-- 步骤详情（下方） -->
        <div class="step-detail-area-wrapper">
          <StepDetailArea
            v-if="selectedStepId"
            ref="stepDetailAreaRef"
            :step-id="selectedStepId"
            :step-name="selectedStepName"
            :step-type="selectedStepType"
            :chapter-exists="chapterExists"
            :chapter-content="chapterContent"
            :form-schema="selectedFormSchema"
            :form-data="selectedFormData"
            :can-go-next="canGoNext"
            :can-go-prev="canGoPrev"
            @save="handleStepSave"
            @generate-prompt="handleGeneratePrompt"
            @prev-step="handlePrevStep"
            @jump-to-chapter="handleJumpToChapter"
          />
          <div v-else class="step-placeholder">
            <el-empty description="请点击工作流程图中的步骤查看详情" :image-size="80" />
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="empty-task">
    <el-empty description="请选择一个任务查看详情" :image-size="100" />
  </div>
  <!-- 编辑关联文件对话框 -->
  <el-dialog
    v-model="editRelationsDialogVisible"
    title="编辑关联文件"
    width="80%"
    :close-on-click-modal="false"
  >
    <EditRelationsForm
      v-if="editRelationsDialogVisible"
      :target-type="'file'"
      :target-id="task?.artifactPath"
      :vault-id="task?.vaultId"
      :initial-related-artifacts="relatedArtifacts"
      :initial-related-code-paths="relatedCodePaths"
      @saved="handleRelationsSaved"
      @close="editRelationsDialogVisible = false"
    />
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { ElEmpty, ElMessage } from 'element-plus';
import TaskWorkflowDiagram from './TaskWorkflowDiagram.vue';
import StepDetailArea from './StepDetailArea.vue';
import EditRelationsForm from './EditRelationsForm.vue';
import type { Task, RelatedFile } from '@/types';
import { extensionService } from '@/services/ExtensionService';

interface Props {
  task: Task | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  stepClick: [stepType: string, stepData: any];
}>();


// 新任务格式支持（TaskInstance）
const selectedStepId = ref<string>('');
const selectedStepName = ref<string>('');
const selectedStepType = ref<string>('');
const chapterExists = ref<boolean>(false);
const chapterContent = ref<string>('');
const selectedFormSchema = ref<Record<string, any>>({});
const selectedFormData = ref<Record<string, any>>({});
const canGoNext = ref<boolean>(false);
const canGoPrev = ref<boolean>(false);
const stepDetailAreaRef = ref<InstanceType<typeof StepDetailArea> | null>(null);

// 关联文件相关
const relatedFiles = ref<RelatedFile[]>([]);
const relatedFilesLoading = ref<boolean>(false);
const relatedArtifacts = ref<string[]>([]);
const relatedCodePaths = ref<string[]>([]);
const editRelationsDialogVisible = ref<boolean>(false);

// 计算是否有表单（用于显示生成提示词按钮）
const hasForm = computed(() => {
  return Object.keys(selectedFormSchema.value).length > 0;
});

// 计算是否是最后一个步骤
const isLastStep = computed(() => {
  if (!props.task || !selectedStepId.value) return false;
  const taskInstance = props.task as any;
  if (!taskInstance.steps || !Array.isArray(taskInstance.steps)) return false;
  
  const steps = taskInstance.steps;
  const currentIndex = steps.findIndex((s: any) => s.id === selectedStepId.value);
  return currentIndex >= 0 && currentIndex === steps.length - 1;
});


// 监听任务变化，加载当前步骤数据
watch(() => props.task?.id, async (newTaskId, oldTaskId) => {
  console.log('[TaskDetail] Task ID watch triggered', { oldTaskId, newTaskId, task: props.task });
  
  // 如果任务被清空，重置所有状态
  if (!newTaskId) {
    console.log('[TaskDetail] Task cleared, resetting state');
    resetTaskState();
    relatedFiles.value = [];
    relatedArtifacts.value = [];
    relatedCodePaths.value = [];
    return;
  }
  
  // 如果任务 ID 变化（切换任务）或首次加载（oldTaskId 为 undefined），先重置状态，再加载新任务数据
  if (newTaskId !== oldTaskId || oldTaskId === undefined) {
    console.log('[TaskDetail] Task switched or initial load', { from: oldTaskId, to: newTaskId });
    resetTaskState();
    await nextTick();
    
    if (props.task) {
      console.log('[TaskDetail] Opening current step for new task', {
        taskId: props.task.id,
        stepsCount: (props.task as any).steps?.length || 0
      });
      await Promise.all([
        openCurrentStep(),
        loadRelatedFiles(),
      ]);
    } else {
      console.warn('[TaskDetail] Task is null after reset');
    }
  } else {
    console.log('[TaskDetail] Task ID unchanged');
  }
}, { immediate: true });

// 监听任务对象的变化（用于同一任务内的数据更新）
watch(() => props.task, async (newTask, oldTask) => {
  if (newTask && oldTask && newTask.id === oldTask.id) {
    // 如果当前没有选中的步骤，自动打开当前进行中的步骤
    if (!selectedStepId.value) {
      await openCurrentStep();
    }
  }
}, { deep: true });

/**
 * 重置任务相关的所有状态
 */
function resetTaskState() {
  selectedStepId.value = '';
  selectedStepName.value = '';
  selectedStepType.value = '';
  chapterExists.value = false;
  chapterContent.value = '';
  selectedFormSchema.value = {};
  selectedFormData.value = {};
  canGoNext.value = false;
  canGoPrev.value = false;
}


/**
 * 找到当前进行中的步骤
 * 优先级：in-progress > pending > currentStep > workflowStep > 第一个步骤
 */
function findCurrentActiveStep(): { stepId: string; step: any } | null {
  if (!props.task) return null;

  const taskInstance = props.task as any;
  if (!taskInstance.steps || !Array.isArray(taskInstance.steps)) {
    return null;
  }

  const steps = taskInstance.steps;

  // 1. 优先找状态为 'in-progress' 的步骤
  let activeStep = steps.find((s: any) => s.status === 'in-progress');
  if (activeStep) {
    return { stepId: activeStep.id, step: activeStep };
  }

  // 2. 如果没有，找第一个状态为 'pending' 的步骤
  activeStep = steps.find((s: any) => s.status === 'pending');
  if (activeStep) {
    return { stepId: activeStep.id, step: activeStep };
  }

  // 3. 如果都没有，使用 task.currentStep
  if (taskInstance.currentStep) {
    activeStep = steps.find((s: any) => s.id === taskInstance.currentStep);
    if (activeStep) {
      return { stepId: activeStep.id, step: activeStep };
    }
  }

  // 4. 如果都没有，使用第一个步骤
  if (steps.length > 0) {
    return { stepId: steps[0].id, step: steps[0] };
  }

  return null;
}

/**
 * 自动打开当前进行中的步骤
 */
async function openCurrentStep() {
  const activeStep = findCurrentActiveStep();
  if (activeStep) {
    // 使用 handleStepClick 来打开步骤（这会加载所有相关数据）
    await handleStepClick(activeStep.stepId, activeStep.step);
  }
}



async function handleStepClick(stepType: string, stepData: any) {
  if (!props.task) return;
  
  const taskInstance = props.task as any;
  if (!taskInstance.steps || !Array.isArray(taskInstance.steps)) {
    return;
  }
  
  selectedStepId.value = stepType;
  const step = taskInstance.steps.find((s: any) => s.id === stepType);
  if (step) {
    selectedStepName.value = step.form?.title || stepType;
    selectedStepType.value = step.type || stepType;
    selectedFormData.value = step.formData || {};
    selectedFormSchema.value = step.form?.schema || {};
    canGoNext.value = canGoToNextStep(stepType);
    canGoPrev.value = canGoToPrevStep(stepType);
    
    try {
      await ensureSolutionFileAndChapter(stepType);
    } catch (error) {
      console.error('Failed to ensure solution file and chapter:', error);
    }
    
    await checkChapterExists(stepType);
  }
  
  emit('stepClick', stepType, stepData);
}

async function checkChapterExists(stepId: string) {
  if (!props.task) return;
  try {
    const result = await extensionService.call('checkSolutionChapter', {
      taskId: props.task.id,
      stepId,
    });
    chapterExists.value = result?.exists || false;
    chapterContent.value = result?.content || '';
  } catch (error) {
    console.error('Failed to check chapter existence:', error);
    chapterExists.value = false;
  }
}

function canGoToNextStep(stepId: string): boolean {
  if (!props.task || !(props.task as any).steps || !Array.isArray((props.task as any).steps)) return false;
  const taskInstance = props.task as any;
  const steps = taskInstance.steps;
  const currentIndex = steps.findIndex((s: any) => s.id === stepId);
  return currentIndex >= 0 && currentIndex < steps.length - 1;
}

function canGoToPrevStep(stepId: string): boolean {
  if (!props.task || !(props.task as any).steps || !Array.isArray((props.task as any).steps)) return false;
  const taskInstance = props.task as any;
  const steps = taskInstance.steps;
  const currentIndex = steps.findIndex((s: any) => s.id === stepId);
  return currentIndex > 0;
}

async function handleStepSave(data: Record<string, any>) {
  if (!props.task || !selectedStepId.value) return;
  try {
    await extensionService.call('saveStepFormData', {
      taskId: props.task.id,
      stepId: selectedStepId.value,
      formData: data,
    });
    // 保存后重新检查章节是否存在
    await checkChapterExists(selectedStepId.value);
  } catch (error) {
    console.error('Failed to save step data:', error);
  }
}

/**
 * 触发生成提示词（从按钮点击）
 */
function handleTriggerGeneratePrompt() {
  if (stepDetailAreaRef.value) {
    // 调用子组件的 handleGeneratePrompt 方法
    stepDetailAreaRef.value.handleGeneratePrompt();
  } else {
    console.warn('[TaskDetail] stepDetailAreaRef is not available');
  }
}

async function handleGeneratePrompt(data: Record<string, any>) {
  if (!props.task || !selectedStepId.value) return;
  try {
    // 确保 data 是纯 JSON 对象
    // 使用 JSON 序列化/反序列化来确保是纯对象
    let cleanFormData: Record<string, any>;
    try {
      // 先序列化为 JSON 字符串，再反序列化，确保是纯对象
      const jsonString = JSON.stringify(data);
      cleanFormData = JSON.parse(jsonString);
      
      // 验证是普通对象
      if (!cleanFormData || typeof cleanFormData !== 'object' || Array.isArray(cleanFormData)) {
        throw new Error('Data is not a plain object');
      }
    } catch (e) {
      console.warn('[TaskDetail] Failed to serialize received data, using manual extraction:', e);
      // 如果序列化失败，手动提取
      cleanFormData = {};
      for (const key in data) {
        const value = data[key];
        // 只包含可序列化的值
        if (value !== undefined) {
          try {
            JSON.stringify(value);
            cleanFormData[key] = value;
          } catch (err) {
            console.warn(`[TaskDetail] Skipping non-serializable value for key ${key}:`, value);
          }
        }
      }
    }
    
    // 调试日志
    console.log('[TaskDetail] Generating prompt with formData:', {
      receivedData: data,
      receivedDataKeys: Object.keys(data),
      receivedDataEntries: Object.entries(data),
      cleanFormData,
      cleanFormDataKeys: Object.keys(cleanFormData),
      cleanFormDataEntries: Object.entries(cleanFormData),
      cleanFormDataJson: JSON.stringify(cleanFormData),
      isPlainObject: cleanFormData.constructor === Object
    });
    
    // 调用后端生成提示词，确保传递的是纯 JSON 对象
    const result = await extensionService.call<string>('generateStepPrompt', {
      taskId: props.task.id,
      stepId: selectedStepId.value,
      formData: cleanFormData,
    });

    // 复制到剪贴板
    navigator.clipboard.writeText(result).then(() => {
      ElMessage.success('提示词已复制到剪贴板');
    }).catch(err => {
      console.error('Failed to copy to clipboard', err);
      ElMessage.error('复制到剪贴板失败');
    });
  } catch (error: any) {
    console.error('Failed to generate prompt', error);
    ElMessage.error(`生成提示词失败：${error.message || '未知错误'}`);
  }
}

async function handleNextStep() {
  if (!props.task || !selectedStepId.value) return;
  try {
    // 先保存当前步骤的表单数据
    if (Object.keys(selectedFormData.value).length > 0) {
      await handleStepSave(selectedFormData.value);
    }
    
    // 调用后端方法更新步骤状态并切换到下一步
    const result = await extensionService.call<{ success: boolean; nextStepId?: string }>('goToNextStep', {
      taskId: props.task.id,
      currentStepId: selectedStepId.value,
    });
    
    if (result.success && result.nextStepId) {
      // 重新加载任务数据（因为后端已经更新了 yaml 文件）
      // 通过触发任务变更通知来刷新数据
      const taskInstance = props.task as any;
      const steps = taskInstance.steps || [];
      const nextStep = steps.find((s: any) => s.id === result.nextStepId);
      if (nextStep) {
        // 等待一下，确保后端文件已保存
        await new Promise(resolve => setTimeout(resolve, 100));
        // 打开下一步
        await handleStepClick(nextStep.id, nextStep);
      }
    }
  } catch (error: any) {
    console.error('Failed to go to next step:', error);
    ElMessage.error(`切换到下一步失败：${error.message || '未知错误'}`);
  }
}

async function handlePrevStep() {
  if (!props.task || !selectedStepId.value) return;
  try {
    // 先保存当前步骤的表单数据
    if (Object.keys(selectedFormData.value).length > 0) {
      await handleStepSave(selectedFormData.value);
    }
    
    // 调用后端方法更新步骤状态并切换到上一步
    const result = await extensionService.call<{ success: boolean; prevStepId?: string }>('goToPreviousStep', {
      taskId: props.task.id,
      currentStepId: selectedStepId.value,
    });
    
    if (result.success && result.prevStepId) {
      // 重新加载任务数据（因为后端已经更新了 yaml 文件）
      const taskInstance = props.task as any;
      const steps = taskInstance.steps || [];
      const prevStep = steps.find((s: any) => s.id === result.prevStepId);
      if (prevStep) {
        // 等待一下，确保后端文件已保存
        await new Promise(resolve => setTimeout(resolve, 100));
        // 打开上一步
        await handleStepClick(prevStep.id, prevStep);
      }
    }
  } catch (error: any) {
    console.error('Failed to go to prev step:', error);
    ElMessage.error(`切换到上一步失败：${error.message || '未知错误'}`);
  }
}

async function handleCompleteTask() {
  if (!props.task || !selectedStepId.value) return;
  try {
    // 先保存当前步骤的表单数据
    if (Object.keys(selectedFormData.value).length > 0) {
      await handleStepSave(selectedFormData.value);
    }
    
    // 调用后端方法完成任务
    const result = await extensionService.call<{ success: boolean }>('completeTask', {
      taskId: props.task.id,
      stepId: selectedStepId.value,
    });
    
    if (result.success) {
      ElMessage.success('任务已完成');
      // 等待一下，确保后端文件已保存
      await new Promise(resolve => setTimeout(resolve, 100));
      // 后端会通过 notifyTaskChanged 通知前端刷新任务列表
      // 这里不需要额外操作，ViewpointPanelPage 会监听 taskChanged 事件
    }
  } catch (error: any) {
    console.error('Failed to complete task:', error);
    ElMessage.error(`完成任务失败：${error.message || '未知错误'}`);
  }
}


async function handleJumpToChapter() {
  if (!props.task || !selectedStepId.value) return;
  try {
    await extensionService.call('jumpToSolutionChapter', {
      taskId: props.task.id,
      stepId: selectedStepId.value,
    });
  } catch (error) {
    console.error('Failed to jump to chapter:', error);
  }
}

async function handleOpenSolution() {
  if (!props.task) return;
  try {
    await extensionService.call('openSolution', {
      taskId: props.task.id,
    });
  } catch (error) {
    console.error('Failed to open solution:', error);
  }
}

/**
 * 加载任务的关联文件
 */
async function loadRelatedFiles() {
  if (!props.task) {
    console.log('[TaskDetail] loadRelatedFiles: task is null');
    relatedFiles.value = [];
    return;
  }

  console.log('[TaskDetail] loadRelatedFiles: loading files for task', { taskId: props.task.id });
  relatedFilesLoading.value = true;
  try {
    const files = await extensionService.call<RelatedFile[]>('getTaskRelatedFiles', {
      taskId: props.task.id,
    });
    console.log('[TaskDetail] loadRelatedFiles: received files', { count: files?.length || 0, files });
    relatedFiles.value = files || [];

    // 分离 artifacts 和 code paths，用于编辑对话框
    relatedArtifacts.value = files
      ?.filter(f => f.type === 'document' || f.type === 'design')
      .map(f => f.id) || [];
    relatedCodePaths.value = files
      ?.filter(f => f.type === 'code')
      .map(f => f.path) || [];
  } catch (error: any) {
    console.error('[TaskDetail] Failed to load related files:', error);
    ElMessage.error(`加载关联文件失败：${error.message || '未知错误'}`);
    relatedFiles.value = [];
  } finally {
    relatedFilesLoading.value = false;
  }
}

/**
 * 打开关联文件
 */
async function handleOpenRelatedFile(file: RelatedFile) {
  try {
    if (file.type === 'code') {
      // 代码文件，使用 openFile
      await extensionService.call('openFile', {
        filePath: file.path,
      });
    } else {
      // 文档或设计文件，使用 openFile
      await extensionService.call('openFile', {
        filePath: file.path,
        vaultId: file.vault?.id,
      });
    }
  } catch (error: any) {
    console.error('Failed to open related file:', error);
    ElMessage.error(`打开文件失败：${error.message || '未知错误'}`);
  }
}

/**
 * 打开编辑关联文件对话框
 */
function handleEditRelations() {
  if (!props.task) return;
  editRelationsDialogVisible.value = true;
}

/**
 * 关联文件保存后的处理
 */
async function handleRelationsSaved() {
  if (!props.task) return;
  
  // 重新加载关联文件
  await loadRelatedFiles();
  editRelationsDialogVisible.value = false;
}

async function ensureSolutionFileAndChapter(_stepId: string) {
  if (!props.task) return;
  try {
    await extensionService.call('openSolution', {
      taskId: props.task.id,
    });
  } catch (error) {
    console.error('Failed to open solution:', error);
  }
}

</script>

<style scoped>
.task-detail-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.task-detail {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 20px;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--vscode-panel-background, #1e1e1e);
  color: var(--vscode-panel-foreground, #cccccc);
  box-sizing: border-box;
}

.task-info-section {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--vscode-panel-border, #3e3e3e);
}



.task-description {
  margin-top: 16px;
}

.task-description h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--vscode-foreground, #cccccc);
}

.description-content {
  color: var(--vscode-foreground, #cccccc);
  font-size: 14px;
  line-height: 1.6;
  padding: 12px;
  background: var(--vscode-editor-background, #1e1e1e);
  border-radius: 4px;
  border: 1px solid var(--vscode-panel-border, #3e3e3e);
}

.workflow-section {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--vscode-panel-border, #3e3e3e);
}

.workflow-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.step-navigation-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

.workflow-section h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--vscode-foreground, #cccccc);
}

.workflow-diagram-area {
  width: 100%;
  margin-bottom: 12px;
}

.step-detail-area-wrapper {
  width: 100%;
}

.step-placeholder {
  padding: 40px;
  text-align: center;
  background: var(--vscode-editor-background, #1e1e1e);
  border: 1px solid var(--vscode-panel-border, #3e3e3e);
  border-radius: 4px;
}

.step-content {
  padding: 16px;
  background: var(--vscode-editor-background, #1e1e1e);
  border-radius: 4px;
  border: 1px solid var(--vscode-panel-border, #3e3e3e);
}

.step-content h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--vscode-foreground, #cccccc);
}

.questions {
  margin-bottom: 16px;
}

.question-item {
  padding: 12px;
  margin-bottom: 12px;
  background: var(--vscode-panel-background, #252526);
  border-radius: 4px;
  border: 1px solid var(--vscode-panel-border, #3e3e3e);
}

.question-text {
  margin: 0 0 8px 0;
  font-weight: 500;
  color: var(--vscode-foreground, #cccccc);
}

.question-answer {
  margin: 0;
  color: var(--vscode-descriptionForeground, #999999);
  font-size: 13px;
}

.proposal,
.specification,
.feedback {
  margin-bottom: 16px;
}

.proposal-content,
.specification-content,
.feedback-content {
  padding: 12px;
  background: var(--vscode-panel-background, #252526);
  border-radius: 4px;
  border: 1px solid var(--vscode-panel-border, #3e3e3e);
  color: var(--vscode-foreground, #cccccc);
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.code-files,
.documents {
  margin-top: 16px;
}

.files-list,
.documents-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.file-tag,
.doc-tag {
  cursor: pointer;
}

.file-tag:hover {
  opacity: 0.8;
}

.step-empty {
  padding: 40px;
  text-align: center;
}

.empty-task {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--vscode-descriptionForeground, #999999);
}
</style>

