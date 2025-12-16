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
              v-for="(_item, itemIndex) in (stepData[field.key] || [])"
              :key="itemIndex"
              class="array-item"
            >
                <div
                  v-for="prop in (field.items?.properties || [])"
                  :key="prop.key"
                  class="array-item-field"
                >
                  <label>{{ prop.label }}：</label>
                  <el-select
                    v-if="prop.type === 'string' && prop.enum"
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
                  <el-input
                    v-else-if="prop.type === 'string'"
                    v-model="stepData[field.key][itemIndex][prop.key]"
                    :placeholder="`请输入${prop.label}`"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 如果没有步骤定义，显示提示 -->
      <div v-else class="step-content">
        <p class="description">该步骤没有定义，无法显示详情。</p>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

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
  return '任务步骤';
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
</style>

