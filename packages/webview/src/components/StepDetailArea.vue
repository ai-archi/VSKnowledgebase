<template>
  <div class="step-detail-area">
    <div v-if="chapterExists" class="chapter-preview">
      <h4>步骤：{{ stepName }} ({{ stepType }})</h4>
      <div class="chapter-content" v-html="formatMarkdown(chapterContent)"></div>
      <div class="actions">
        <div class="actions-left">
          <el-button size="small" @click="handleJumpToChapter">跳转到章节</el-button>
          <el-button size="small" @click="handlePrevStep" v-if="canGoPrev">上一步</el-button>
        </div>
        <div class="actions-right">
        </div>
      </div>
    </div>
    <div v-else class="step-form">
      <div v-if="hasForm" class="form-container">
        <el-form :model="formData" label-width="120px">
          <el-form-item
            v-for="(field, key) in formSchema"
            :key="key"
            :label="field.title"
            :required="field.required"
          >
            <el-input
              v-if="field.type === 'string' || field.type === 'textarea'"
              v-model="formData[key]"
              :type="field.type === 'textarea' ? 'textarea' : 'text'"
              :placeholder="field.placeholder || field.default"
            />
            <el-input-number
              v-else-if="field.type === 'number'"
              v-model="formData[key]"
              :placeholder="field.default"
            />
            <el-select
              v-else-if="field.type === 'enum'"
              v-model="formData[key]"
              :placeholder="field.placeholder"
            >
              <el-option
                v-for="option in field.options"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
            <el-switch
              v-else-if="field.type === 'boolean'"
              v-model="formData[key]"
            />
            <div v-if="field.description" class="field-description">
              {{ field.description }}
            </div>
          </el-form-item>
        </el-form>
      </div>
      <div v-else class="step-info">
        <p>此步骤无需配置，可直接执行。</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

interface Props {
  stepId: string;
  stepName: string;
  stepType: string;
  chapterExists: boolean;
  chapterContent?: string;
  formSchema?: Record<string, any>;
  formData?: Record<string, any>;
  canGoNext?: boolean;
  canGoPrev?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  chapterContent: '',
  formSchema: () => ({}),
  formData: () => ({}),
  canGoNext: false,
  canGoPrev: false,
});

const emit = defineEmits<{
  'save': [data: Record<string, any>];
  'generate-prompt': [data: Record<string, any>];
  'prev-step': [];
  'jump-to-chapter': [];
}>();

const formData = ref({ ...props.formData });
const hasForm = computed(() => Object.keys(props.formSchema).length > 0);

watch(
  () => props.formData,
  (newData) => {
    formData.value = { ...newData };
  },
  { deep: true }
);

const formatMarkdown = (content: string): string => {
  // 简单的 Markdown 格式化（可以使用 markdown-it 等库）
  if (!content) return '';
  return content
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
};

const handleSave = () => {
  emit('save', formData.value);
};

const handleGeneratePrompt = () => {
  emit('generate-prompt', formData.value);
};

const handlePrevStep = () => {
  emit('prev-step');
};

const handleJumpToChapter = () => {
  emit('jump-to-chapter');
};
</script>

<style scoped>
.step-detail-area {
  padding: 16px;
  background: var(--vscode-editor-background, #1e1e1e);
  border: 1px solid var(--vscode-panel-border, #3e3e3e);
  border-radius: 4px;
}

.chapter-preview,
.step-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chapter-content {
  padding: 12px;
  background: var(--vscode-textCodeBlock-background, #2d2d2d);
  border-radius: 4px;
  max-height: 400px;
  overflow-y: auto;
}

.warning {
  margin-bottom: 16px;
}

.form-container {
  padding: 12px;
  background: var(--vscode-textCodeBlock-background, #2d2d2d);
  border-radius: 4px;
}

.step-info {
  padding: 12px;
  color: var(--vscode-descriptionForeground, #cccccc);
}

.actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.actions-left {
  display: flex;
  gap: 8px;
}

.actions-right {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.field-description {
  font-size: 12px;
  color: var(--vscode-descriptionForeground, #cccccc);
  margin-top: 4px;
}

h4 {
  margin: 0 0 12px 0;
  color: var(--vscode-editor-foreground, #d4d4d4);
}
</style>

