<template>
  <div class="task-detail" v-if="task">
    <!-- 任务基本信息 -->
    <div class="task-info-section">
      <div class="task-header">
        <h2 class="task-title">{{ task.title }}</h2>
        <div class="task-actions">
          <el-button
            type="primary"
            size="small"
            :icon="Edit"
            @click="handleEdit"
          >
            编辑
          </el-button>
          <el-button
            type="danger"
            size="small"
            :icon="Delete"
            @click="handleDelete"
          >
            删除
          </el-button>
        </div>
      </div>

      <div class="task-meta">
        <div class="meta-item">
          <span class="meta-label">状态：</span>
          <el-tag :type="getStatusType(task.status)" size="small">
            {{ getStatusText(task.status) }}
          </el-tag>
        </div>
        <div class="meta-item" v-if="task.priority">
          <span class="meta-label">优先级：</span>
          <el-tag :type="getPriorityType(task.priority)" size="small">
            {{ getPriorityText(task.priority) }}
          </el-tag>
        </div>
        <div class="meta-item" v-if="task.dueDate">
          <span class="meta-label">截止日期：</span>
          <span class="meta-value">{{ formatDate(task.dueDate) }}</span>
        </div>
        <div class="meta-item" v-if="task.createdAt">
          <span class="meta-label">创建时间：</span>
          <span class="meta-value">{{ formatDate(task.createdAt) }}</span>
        </div>
      </div>

      <div class="task-description" v-if="taskDescription">
        <h3>任务描述</h3>
        <div class="description-content" v-html="formatMarkdown(taskDescription)"></div>
      </div>
    </div>

    <!-- 工作流可视化 -->
    <div class="workflow-section">
      <h3>工作流程</h3>
      <TaskWorkflowDiagram
        :task="task"
        :workflow-data="task.workflowData || {}"
        @step-click="handleStepClick"
        @step-update="handleStepUpdate"
      />
    </div>

    <!-- 当前步骤详情 -->
    <div class="current-step-section" v-if="currentStepData">
      <h3>当前步骤：{{ getCurrentStepLabel() }}</h3>
      <div class="step-content">
        <div v-if="currentStepType === 'draft-proposal'">
          <div v-if="currentStepData.questions" class="questions">
            <h4>问题列表</h4>
            <div
              v-for="(question, index) in currentStepData.questions"
              :key="index"
              class="question-item"
            >
              <p class="question-text">{{ question.text }}</p>
              <p class="question-answer" v-if="question.answer">{{ question.answer }}</p>
            </div>
          </div>
          <div v-if="currentStepData.proposal" class="proposal">
            <h4>生成的提案</h4>
            <div class="proposal-content" v-html="formatMarkdown(currentStepData.proposal)"></div>
          </div>
        </div>
        <div v-else-if="currentStepType === 'review-alignment'">
          <div v-if="currentStepData.proposal" class="proposal">
            <h4>提案内容</h4>
            <div class="proposal-content" v-html="formatMarkdown(currentStepData.proposal)"></div>
          </div>
          <div v-if="currentStepData.feedback" class="feedback">
            <h4>反馈意见</h4>
            <div class="feedback-content" v-html="formatMarkdown(currentStepData.feedback)"></div>
          </div>
        </div>
        <div v-else-if="currentStepType === 'implementation'">
          <div v-if="currentStepData.specification" class="specification">
            <h4>规范内容</h4>
            <div class="specification-content" v-html="formatMarkdown(currentStepData.specification)"></div>
          </div>
          <div v-if="currentStepData.codeFiles && currentStepData.codeFiles.length > 0" class="code-files">
            <h4>生成的代码文件</h4>
            <div class="files-list">
              <el-tag
                v-for="file in currentStepData.codeFiles"
                :key="file"
                class="file-tag"
                @click="handleOpenFile(file)"
              >
                {{ file }}
              </el-tag>
            </div>
          </div>
        </div>
        <div v-else-if="currentStepType === 'archive-update'">
          <div v-if="currentStepData.updatedDocuments && currentStepData.updatedDocuments.length > 0" class="documents">
            <h4>已更新的文档</h4>
            <div class="documents-list">
              <el-tag
                v-for="doc in currentStepData.updatedDocuments"
                :key="doc"
                class="doc-tag"
              >
                {{ doc }}
              </el-tag>
            </div>
          </div>
        </div>
        <div v-else class="step-empty">
          <el-empty description="暂无步骤数据" :image-size="60" />
        </div>
      </div>
    </div>
  </div>
  <div v-else class="empty-task">
    <el-empty description="请选择一个任务查看详情" :image-size="100" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Edit, Delete } from '@element-plus/icons-vue';
import { ElButton, ElTag, ElEmpty } from 'element-plus';
import TaskWorkflowDiagram from './TaskWorkflowDiagram.vue';
import type { Task } from '../types';
import { extensionService } from '../services/ExtensionService';

interface Props {
  task: Task | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  edit: [task: Task];
  delete: [task: Task];
  stepClick: [stepType: string, stepData: any];
}>();

const currentStepType = ref<string>('');
const currentStepData = ref<any>(null);

// 计算任务描述
const taskDescription = computed(() => {
  return (props.task as any)?.description || '';
});

// 计算当前步骤数据
const currentStep = computed(() => {
  if (!props.task || !props.task.workflowStep) return null;
  return props.task.workflowStep;
});

// 监听任务变化，加载当前步骤数据
watch(() => props.task, (newTask) => {
  if (newTask) {
    loadCurrentStepData();
  } else {
    currentStepData.value = null;
    currentStepType.value = '';
  }
}, { immediate: true });

function loadCurrentStepData() {
  if (!props.task || !props.task.workflowStep) {
    currentStepData.value = null;
    currentStepType.value = '';
    return;
  }

  currentStepType.value = props.task.workflowStep;
  currentStepData.value = props.task.workflowData?.[props.task.workflowStep] || null;
}

function getCurrentStepLabel(): string {
  const labels: Record<string, string> = {
    'draft-proposal': '起草提案',
    'review-alignment': '审查对齐',
    'implementation': '实现任务',
    'archive-update': '归档更新',
  };
  return labels[currentStepType.value] || currentStepType.value;
}

function getStatusType(status: string): string {
  const types: Record<string, string> = {
    'pending': 'info',
    'in-progress': 'warning',
    'completed': 'success',
    'cancelled': 'danger',
  };
  return types[status] || 'info';
}

function getStatusText(status: string): string {
  const texts: Record<string, string> = {
    'pending': '待处理',
    'in-progress': '进行中',
    'completed': '已完成',
    'cancelled': '已取消',
  };
  return texts[status] || status;
}

function getPriorityType(priority: string): string {
  const types: Record<string, string> = {
    'low': 'info',
    'medium': 'warning',
    'high': 'danger',
  };
  return types[priority] || 'info';
}

function getPriorityText(priority: string): string {
  const texts: Record<string, string> = {
    'low': '低',
    'medium': '中',
    'high': '高',
  };
  return texts[priority] || priority;
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

function formatMarkdown(text: string): string {
  if (!text) return '';
  // 简单的 markdown 格式化（可以后续使用 markdown 库）
  return text
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

function handleEdit() {
  if (props.task) {
    emit('edit', props.task);
  }
}

function handleDelete() {
  if (props.task) {
    emit('delete', props.task);
  }
}

function handleStepClick(stepType: string, stepData: any) {
  currentStepType.value = stepType;
  currentStepData.value = stepData;
  emit('stepClick', stepType, stepData);
}

function handleStepUpdate(stepType: string, data: any) {
  // 更新当前步骤数据
  if (stepType === currentStepType.value) {
    currentStepData.value = data;
  }
}

function handleOpenFile(filePath: string) {
  extensionService.call('openFile', {
    filePath: filePath,
  });
}
</script>

<style scoped>
.task-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
  overflow-y: auto;
  background: var(--vscode-panel-background, #1e1e1e);
  color: var(--vscode-panel-foreground, #cccccc);
}

.task-info-section {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--vscode-panel-border, #3e3e3e);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.task-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--vscode-foreground, #cccccc);
}

.task-actions {
  display: flex;
  gap: 8px;
}

.task-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.meta-label {
  color: var(--vscode-descriptionForeground, #999999);
  font-size: 13px;
}

.meta-value {
  color: var(--vscode-foreground, #cccccc);
  font-size: 13px;
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
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--vscode-panel-border, #3e3e3e);
}

.workflow-section h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--vscode-foreground, #cccccc);
}

.current-step-section {
  flex: 1;
}

.current-step-section h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--vscode-foreground, #cccccc);
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

