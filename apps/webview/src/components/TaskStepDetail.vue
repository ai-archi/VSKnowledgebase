<template>
  <el-dialog
    v-model="visible"
    :title="getStepTitle()"
    width="600px"
    @close="handleClose"
  >
    <div class="step-detail">
      <div v-if="stepType === 'draft-proposal'" class="step-content">
        <h4>起草提案 - 明确需求</h4>
        <p class="description">AI 将询问关键问题以明确需求</p>
        <div v-if="step?.questions" class="questions">
          <div
            v-for="(question, index) in step.questions"
            :key="index"
            class="question-item"
          >
            <p class="question-text">{{ question.text }}</p>
            <el-input
              v-model="question.answer"
              type="textarea"
              :rows="3"
              placeholder="请输入回答"
            />
          </div>
        </div>
        <div v-if="step?.proposal" class="proposal">
          <h5>生成的提案：</h5>
          <el-input
            v-model="step.proposal"
            type="textarea"
            :rows="10"
            readonly
          />
        </div>
      </div>

      <div v-else-if="stepType === 'review-alignment'" class="step-content">
        <h4>审查对齐 - 人和 AI 共同审查</h4>
        <p class="description">展示提案并收集反馈，反复迭代</p>
        <div v-if="step?.proposal" class="proposal">
          <h5>提案内容：</h5>
          <el-input
            v-model="step.proposal"
            type="textarea"
            :rows="8"
            readonly
          />
        </div>
        <div class="feedback">
          <h5>反馈意见：</h5>
          <el-input
            v-model="step.feedback"
            type="textarea"
            :rows="4"
            placeholder="请输入反馈意见"
          />
        </div>
      </div>

      <div v-else-if="stepType === 'implementation'" class="step-content">
        <h4>实现任务 - AI 按规范写代码</h4>
        <p class="description">根据批准的规范生成代码</p>
        <div v-if="step?.specification" class="specification">
          <h5>规范内容：</h5>
          <el-input
            v-model="step.specification"
            type="textarea"
            :rows="8"
            readonly
          />
        </div>
        <div v-if="step?.codeFiles" class="code-files">
          <h5>生成的代码文件：</h5>
          <el-tag
            v-for="file in step.codeFiles"
            :key="file"
            class="file-tag"
          >
            {{ file }}
          </el-tag>
        </div>
      </div>

      <div v-else-if="stepType === 'archive-update'" class="step-content">
        <h4>归档更新 - 变更归档，规范文档自动更新</h4>
        <p class="description">更新相关文档和规范</p>
        <div v-if="step?.updatedDocuments" class="documents">
          <h5>已更新的文档：</h5>
          <el-tag
            v-for="doc in step.updatedDocuments"
            :key="doc"
            class="doc-tag"
          >
            {{ doc }}
          </el-tag>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

interface Props {
  step: any;
  stepType: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  save: [data: any];
}>();

const visible = ref(true);
const stepData = ref<any>({ ...props.step });

watch(() => props.step, (newStep) => {
  stepData.value = { ...newStep };
}, { deep: true });

function getStepTitle(): string {
  const titles: Record<string, string> = {
    'draft-proposal': '起草提案',
    'review-alignment': '审查对齐',
    'implementation': '实现任务',
    'archive-update': '归档更新',
  };
  return titles[props.stepType] || '任务步骤';
}

function handleClose() {
  visible.value = false;
  emit('close');
}

function handleSave() {
  emit('save', stepData.value);
  handleClose();
}
</script>

<style scoped>
.step-detail {
  padding: 8px 0;
}

.step-content h4 {
  margin: 0 0 8px 0;
  color: var(--vscode-foreground, #cccccc);
  font-size: 16px;
}

.description {
  color: var(--vscode-descriptionForeground, #999999);
  margin-bottom: 16px;
  font-size: 13px;
}

.questions {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;
}

.question-item {
  padding: 12px;
  border: 1px solid var(--vscode-panel-border, #3e3e3e);
  border-radius: 4px;
}

.question-text {
  margin: 0 0 8px 0;
  font-weight: 500;
  color: var(--vscode-foreground, #cccccc);
}

.proposal,
.specification,
.feedback {
  margin-bottom: 16px;
}

.proposal h5,
.specification h5,
.feedback h5 {
  margin: 0 0 8px 0;
  color: var(--vscode-foreground, #cccccc);
  font-size: 14px;
}

.code-files,
.documents {
  margin-top: 16px;
}

.code-files h5,
.documents h5 {
  margin: 0 0 8px 0;
  color: var(--vscode-foreground, #cccccc);
  font-size: 14px;
}

.file-tag,
.doc-tag {
  margin-right: 8px;
  margin-bottom: 8px;
}
</style>

