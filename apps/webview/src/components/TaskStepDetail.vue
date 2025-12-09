<template>
  <el-dialog
    v-model="visible"
    :title="getStepTitle()"
    width="600px"
    @close="handleClose"
  >
    <div class="step-detail">
      <!-- 如果有步骤定义，使用动态渲染 -->
      <div v-if="stepDefinition" class="step-content">
        <h4>{{ stepDefinition.label }}</h4>
        <p v-if="stepDefinition.description" class="description">{{ stepDefinition.description }}</p>
        <div v-if="stepDefinition.fields" class="step-fields">
          <div
            v-for="field in stepDefinition.fields"
            :key="field.key"
            class="field-container"
          >
            <h5>{{ field.label }}：</h5>
            <!-- textarea 类型 -->
            <el-input
              v-if="field.type === 'textarea'"
              v-model="stepData[field.key]"
              type="textarea"
              :rows="8"
              :readonly="field.readonly"
              :placeholder="field.readonly ? '' : `请输入${field.label}`"
            />
            <!-- 字符串数组类型 -->
            <div v-else-if="field.type === 'array' && field.items?.type === 'string'" class="array-field">
              <el-tag
                v-for="(item, index) in (stepData[field.key] || [])"
                :key="index"
                class="field-tag"
              >
                {{ item }}
              </el-tag>
            </div>
            <!-- 对象数组类型 -->
            <div v-else-if="field.type === 'array' && field.items?.type === 'object'" class="array-field">
              <div
                v-for="(item, itemIndex) in (stepData[field.key] || [])"
                :key="itemIndex"
                class="array-item"
              >
                <div
                  v-for="prop in (field.items?.properties || [])"
                  :key="prop.key"
                  class="array-item-field"
                >
                  <label>{{ prop.label }}：</label>
                  <el-input
                    v-if="prop.type === 'string'"
                    v-model="stepData[field.key][itemIndex][prop.key]"
                    :placeholder="`请输入${prop.label}`"
                  />
                  <el-select
                    v-else-if="prop.type === 'string' && prop.enum"
                    v-model="stepData[field.key][itemIndex][prop.key]"
                    :placeholder="`请选择${prop.label}`"
                  >
                    <el-option
                      v-for="option in prop.enum"
                      :key="option"
                      :label="option"
                      :value="option"
                    />
                  </el-select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 否则使用硬编码的默认渲染（向后兼容） -->
      <div v-else class="step-content">
        <div v-if="stepType === 'draft-proposal'">
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
                v-model="stepData.questions[index].answer"
                type="textarea"
                :rows="3"
                placeholder="请输入回答"
              />
            </div>
          </div>
          <div v-if="step?.proposal" class="proposal">
            <h5>生成的提案：</h5>
            <el-input
              v-model="stepData.proposal"
              type="textarea"
              :rows="10"
              readonly
            />
          </div>
        </div>

        <div v-else-if="stepType === 'review-alignment'">
          <h4>审查对齐 - 人和 AI 共同审查</h4>
          <p class="description">展示提案并收集反馈，反复迭代</p>
          <div v-if="step?.proposal" class="proposal">
            <h5>提案内容：</h5>
            <el-input
              v-model="stepData.proposal"
              type="textarea"
              :rows="8"
              readonly
            />
          </div>
          <div class="feedback">
            <h5>反馈意见：</h5>
            <el-input
              v-model="stepData.feedback"
              type="textarea"
              :rows="4"
              placeholder="请输入反馈意见"
            />
          </div>
        </div>

        <div v-else-if="stepType === 'implementation'">
          <h4>实现任务 - AI 按规范写代码</h4>
          <p class="description">根据批准的规范生成代码</p>
          <div v-if="step?.specification" class="specification">
            <h5>规范内容：</h5>
            <el-input
              v-model="stepData.specification"
              type="textarea"
              :rows="8"
              readonly
            />
          </div>
          <div v-if="step?.codeFiles" class="code-files">
            <h5>生成的代码文件：</h5>
            <el-tag
              v-for="file in stepData.codeFiles"
              :key="file"
              class="file-tag"
            >
              {{ file }}
            </el-tag>
          </div>
        </div>

        <div v-else-if="stepType === 'archive-update'">
          <h4>归档更新 - 变更归档，规范文档自动更新</h4>
          <p class="description">更新相关文档和规范</p>
          <div v-if="step?.updatedDocuments" class="documents">
            <h5>已更新的文档：</h5>
            <el-tag
              v-for="doc in stepData.updatedDocuments"
              :key="doc"
              class="doc-tag"
            >
              {{ doc }}
            </el-tag>
          </div>
        </div>

        <div v-else-if="stepType === 'test-verification'">
          <h4>测试验证</h4>
          <p class="description">验证代码的正确性和完整性</p>
          <div v-if="step?.testCases" class="test-cases">
            <h5>测试用例：</h5>
            <div
              v-for="(testCase, index) in (stepData.testCases || [])"
              :key="index"
              class="test-case-item"
            >
              <label>测试用例名称：</label>
              <el-input v-model="testCase.name" placeholder="请输入测试用例名称" />
              <label>状态：</label>
              <el-select v-model="testCase.status" placeholder="请选择状态">
                <el-option label="待测试" value="pending" />
                <el-option label="通过" value="passed" />
                <el-option label="失败" value="failed" />
              </el-select>
            </div>
          </div>
          <div v-if="step?.testResults" class="test-results">
            <h5>测试结果：</h5>
            <el-input
              v-model="stepData.testResults"
              type="textarea"
              :rows="8"
              placeholder="请输入测试结果"
            />
          </div>
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

interface StepField {
  key: string;
  type: string;
  label: string;
  readonly?: boolean;
  items?: any;
}

interface StepDefinition {
  key: string;
  label: string;
  description?: string;
  order: number;
  fields?: StepField[];
}

interface Props {
  step: any;
  stepType: string;
  stepDefinition?: StepDefinition;
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
  if (props.stepDefinition) {
    return props.stepDefinition.label;
  }
  const titles: Record<string, string> = {
    'draft-proposal': '起草提案',
    'review-alignment': '审查对齐',
    'implementation': '实现任务',
    'archive-update': '归档更新',
    'test-verification': '测试验证',
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
.doc-tag,
.field-tag {
  margin-right: 8px;
  margin-bottom: 8px;
}

.step-fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field-container {
  margin-bottom: 16px;
}

.field-container h5 {
  margin: 0 0 8px 0;
  color: var(--vscode-foreground, #cccccc);
  font-size: 14px;
}

.array-field {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.array-item {
  padding: 12px;
  border: 1px solid var(--vscode-panel-border, #3e3e3e);
  border-radius: 4px;
  margin-bottom: 8px;
}

.array-item-field {
  margin-bottom: 8px;
}

.array-item-field label {
  display: block;
  margin-bottom: 4px;
  color: var(--vscode-foreground, #cccccc);
  font-size: 13px;
}

.test-cases {
  margin-bottom: 16px;
}

.test-case-item {
  padding: 12px;
  border: 1px solid var(--vscode-panel-border, #3e3e3e);
  border-radius: 4px;
  margin-bottom: 8px;
}

.test-case-item label {
  display: block;
  margin-bottom: 4px;
  color: var(--vscode-foreground, #cccccc);
  font-size: 13px;
}

.test-case-item .el-input,
.test-case-item .el-select {
  margin-bottom: 8px;
  width: 100%;
}

.test-results {
  margin-top: 16px;
}
</style>

