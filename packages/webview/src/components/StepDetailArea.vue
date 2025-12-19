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
            :rules="getFieldRules(field)"
          >
            <!-- 文本输入框 -->
            <el-input
              v-if="field.type === 'string'"
              v-model="formData[key]"
              :placeholder="field.placeholder || field.default || `请输入${field.title}`"
              clearable
            />
            
            <!-- 多行文本 -->
            <el-input
              v-else-if="field.type === 'textarea'"
              v-model="formData[key]"
              type="textarea"
              :rows="field.rows || 4"
              :placeholder="field.placeholder || field.default || `请输入${field.title}`"
              clearable
            />
            
            <!-- 数字输入 -->
            <el-input-number
              v-else-if="field.type === 'number'"
              v-model="formData[key]"
              :min="field.min"
              :max="field.max"
              :step="field.step || 1"
              :placeholder="field.placeholder || field.default"
              style="width: 100%"
            />
            
            <!-- 下拉选择 -->
            <el-select
              v-else-if="field.type === 'enum'"
              v-model="formData[key]"
              :placeholder="field.placeholder || `请选择${field.title}`"
              clearable
              style="width: 100%"
            >
              <el-option
                v-for="option in getEnumOptions(field)"
                :key="option.value"
                :label="option.label || option.value"
                :value="option.value"
              />
            </el-select>
            
            <!-- 布尔值开关 -->
            <el-switch
              v-else-if="field.type === 'boolean'"
              v-model="formData[key]"
            />
            
            <!-- 复选框 -->
            <el-checkbox
              v-else-if="field.type === 'checkbox'"
              v-model="formData[key]"
            >
              {{ field.title }}
            </el-checkbox>
            
            <!-- 数组类型 -->
            <div v-else-if="field.type === 'array'" class="array-field">
              <div
                v-for="(_item, index) in (formData[key] || [])"
                :key="index"
                class="array-item"
              >
                <el-input
                  v-if="!field.items || field.items.type === 'string'"
                  v-model="formData[key][index]"
                  :placeholder="field.itemPlaceholder || `请输入${field.title}项`"
                  clearable
                >
                  <template #append>
                    <el-button
                      :icon="DeleteIcon"
                      @click="removeArrayItem(key, index)"
                      link
                      type="danger"
                    />
                  </template>
                </el-input>
                <div v-else class="array-item-complex">
                  <el-input
                    v-for="(prop, propKey) in field.items.properties"
                    :key="propKey"
                    v-model="formData[key][index][propKey]"
                    :placeholder="prop.placeholder || `请输入${prop.title || propKey}`"
                    :type="prop.type === 'textarea' ? 'textarea' : 'text'"
                    clearable
                    style="margin-bottom: 8px"
                  />
                  <el-button
                    :icon="DeleteIcon"
                    @click="removeArrayItem(key, index)"
                    link
                    type="danger"
                    size="small"
                  >
                    删除
                  </el-button>
                </div>
              </div>
              <el-button
                :icon="PlusIcon"
                @click="addArrayItem(key, field)"
                link
                type="primary"
                style="margin-top: 8px"
              >
                添加{{ field.title }}
              </el-button>
            </div>
            
            <!-- 字段描述 -->
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
import { computed, watch, ref, toRaw } from 'vue';
import { Plus, Delete } from '@element-plus/icons-vue';

// Icons are used in template via :icon binding
// Explicitly reference to avoid linter warnings
const PlusIcon = Plus;
const DeleteIcon = Delete;

interface FormField {
  type: 'string' | 'textarea' | 'number' | 'enum' | 'boolean' | 'checkbox' | 'array';
  title: string;
  description?: string;
  placeholder?: string;
  default?: any;
  required?: boolean;
  options?: Array<{ label?: string; value: any }> | string[];
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  items?: {
    type?: string;
    properties?: Record<string, FormField>;
  };
  itemPlaceholder?: string;
}

interface Props {
  stepId: string;
  stepName: string;
  stepType: string;
  chapterExists: boolean;
  chapterContent?: string;
  formSchema?: Record<string, FormField>;
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

/**
 * 根据字段类型获取默认值
 */
const getDefaultValue = (field: FormField): any => {
  if (field.default !== undefined) {
    return field.default;
  }
  switch (field.type) {
    case 'array':
      return [];
    case 'boolean':
    case 'checkbox':
      return false;
    case 'number':
      return null;
    default:
      return '';
  }
};

/**
 * 初始化表单数据，合并 props.formData 和 schema 默认值
 */
const initializeFormData = (): Record<string, any> => {
  const data: Record<string, any> = {};
  
  // 先设置所有 schema 字段的默认值
  for (const key in props.formSchema) {
    data[key] = getDefaultValue(props.formSchema[key]);
  }
  
  // 然后合并外部传入的数据（覆盖默认值）
  if (props.formData && typeof props.formData === 'object') {
    for (const key in props.formData) {
      // 只合并 schema 中定义的字段
      if (key in props.formSchema) {
        const value = props.formData[key];
        // 只有当外部数据有值时才覆盖（避免用 undefined 覆盖默认值）
        if (value !== undefined) {
          data[key] = value;
        }
      }
    }
  }
  
  return data;
};

/**
 * 表单数据，使用 ref 管理
 */
const formData = ref<Record<string, any>>(initializeFormData());

/**
 * 是否有表单字段
 */
const hasForm = computed(() => Object.keys(props.formSchema).length > 0);

/**
 * 同步外部 formData 变化到内部
 * 注意：要保留用户已输入的值，只更新外部传入的新值
 */
watch(
  () => props.formData,
  (newData) => {
    if (newData && typeof newData === 'object') {
      // 合并外部数据，但保留用户已输入的值（只更新外部有值的字段）
    for (const key in newData) {
        // 只有当外部数据不是 undefined 时才更新（包括 null、空字符串、false、0 等）
        if (newData[key] !== undefined) {
          // 如果字段在 schema 中定义，则更新
          if (key in props.formSchema) {
            formData.value[key] = newData[key];
          }
        }
      }
      // 确保所有 schema 字段都存在
      for (const key in props.formSchema) {
        if (!(key in formData.value) || formData.value[key] === undefined) {
          formData.value[key] = getDefaultValue(props.formSchema[key]);
        }
      }
    }
  },
  { immediate: true, deep: true }
);

/**
 * 当 schema 变化时，重新初始化表单数据
 * 注意：要保留用户已输入的值
 */
watch(
  () => props.formSchema,
  (newSchema) => {
    if (newSchema && Object.keys(newSchema).length > 0) {
      // 保留现有数据，只添加新字段
      const currentData = { ...formData.value };
      const initialized = initializeFormData();
      // 合并：保留现有值，添加新字段的默认值
      formData.value = { ...initialized, ...currentData };
    }
  },
  { immediate: true, deep: true }
);

/**
 * 获取字段验证规则
 */
const getFieldRules = (field: FormField) => {
  const rules: any[] = [];
  
  if (field.required) {
    rules.push({
      required: true,
      message: `请输入${field.title}`,
      trigger: field.type === 'enum' ? 'change' : 'blur'
    });
  }
  
  if (field.type === 'number') {
    if (field.min !== undefined) {
      rules.push({
        type: 'number',
        min: field.min,
        message: `${field.title}不能小于${field.min}`
      });
    }
    if (field.max !== undefined) {
      rules.push({
        type: 'number',
        max: field.max,
        message: `${field.title}不能大于${field.max}`
      });
    }
  }
  
  return rules.length > 0 ? rules : undefined;
};

/**
 * 获取枚举选项
 */
const getEnumOptions = (field: FormField): Array<{ label: string; value: any }> => {
  if (!field.options) {
    return [];
  }
  
  // 如果是字符串数组，转换为对象数组
  if (Array.isArray(field.options) && field.options.length > 0) {
    if (typeof field.options[0] === 'string') {
      return (field.options as string[]).map(value => ({ label: value, value }));
    }
    return field.options as Array<{ label: string; value: any }>;
  }
  
  return [];
};

/**
 * 添加数组项
 */
const addArrayItem = (key: string, field: FormField) => {
  if (!formData.value[key]) {
    formData.value[key] = [];
  }
  
  if (field.items && field.items.type === 'object' && field.items.properties) {
    // 复杂对象数组
    const newItem: Record<string, any> = {};
    for (const propKey in field.items.properties) {
      newItem[propKey] = getDefaultValue(field.items.properties[propKey]);
    }
    formData.value[key].push(newItem);
  } else {
    // 简单字符串数组
    formData.value[key].push('');
  }
};

/**
 * 删除数组项
 */
const removeArrayItem = (key: string, index: number) => {
  if (formData.value[key] && Array.isArray(formData.value[key])) {
    formData.value[key].splice(index, 1);
    }
};

/**
 * 格式化 Markdown 内容
 */
const formatMarkdown = (content: string): string => {
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

/**
 * 获取纯对象数据（去除响应式代理）
 */
const getPlainFormData = (): Record<string, any> => {
  // 直接使用 toRaw 获取原始对象，然后深拷贝
  const raw = toRaw(formData.value);
  // 使用 JSON 序列化/反序列化来获取纯对象
  try {
    return JSON.parse(JSON.stringify(raw));
  } catch (e) {
    // 如果序列化失败，返回原始对象的浅拷贝
    console.warn('Failed to serialize formData, using shallow copy', e);
    return { ...raw };
  }
};

/**
 * 保存表单数据
 * 通过 emit 事件暴露给父组件使用
 */
const handleSave = () => {
  const data = getPlainFormData();
  console.log('[StepDetailArea] Saving formData:', {
    keys: Object.keys(data),
    values: data,
    formDataValue: formData.value,
    formDataValueKeys: Object.keys(formData.value)
  });
  emit('save', data);
};

/**
 * 生成提示词
 * 通过 emit 事件暴露给父组件使用
 * 确保返回的是纯 JSON 格式的对象
 */
const handleGeneratePrompt = () => {
  // 先获取原始数据（使用 toRaw 去除响应式代理）
  const rawFormData = toRaw(formData.value);
  
  console.log('[StepDetailArea] Before generating prompt:', {
    formDataValue: formData.value,
    formDataValueKeys: Object.keys(formData.value),
    formDataValueEntries: Object.entries(formData.value),
    rawFormData: rawFormData,
    rawFormDataKeys: Object.keys(rawFormData),
    rawFormDataEntries: Object.entries(rawFormData),
    schemaKeys: Object.keys(props.formSchema),
    schemaEntries: Object.entries(props.formSchema)
  });
  
  // 构建要发送的表单数据对象
  const formDataToSend: Record<string, any> = {};
  
  // 遍历 schema 中定义的所有字段
  for (const key in props.formSchema) {
    // 从原始数据获取值
    let value = rawFormData[key];
    
    // 如果值为 undefined，尝试从 formData.value 获取（可能因为响应式问题）
    if (value === undefined) {
      value = formData.value[key];
    }
    
    // 如果值仍然是 undefined，使用默认值
    if (value === undefined) {
      value = getDefaultValue(props.formSchema[key]);
    }
    
    // 将值添加到发送对象中（包括 null、false、0、空字符串、空数组等）
    // 只有 undefined 才不包含
    formDataToSend[key] = value;
    
    console.log(`[StepDetailArea] Field ${key}:`, {
      rawValue: rawFormData[key],
      reactiveValue: formData.value[key],
      finalValue: value,
      valueType: typeof value,
      isArray: Array.isArray(value)
    });
  }
  
  console.log('[StepDetailArea] FormData to send (before serialization):', {
    formDataToSend,
    formDataToSendKeys: Object.keys(formDataToSend),
    formDataToSendEntries: Object.entries(formDataToSend)
  });
  
  // 使用 JSON 序列化/反序列化确保是纯 JSON 对象（去除所有响应式代理和不可序列化的属性）
  let plainData: Record<string, any>;
  try {
    // 先序列化为 JSON 字符串，再反序列化，确保是纯对象
    const jsonString = JSON.stringify(formDataToSend);
    console.log('[StepDetailArea] JSON string:', jsonString);
    plainData = JSON.parse(jsonString);
    
    // 验证序列化后的对象
    if (!plainData || typeof plainData !== 'object' || Array.isArray(plainData)) {
      throw new Error('Serialized data is not a plain object');
    }
  } catch (e) {
    console.error('[StepDetailArea] Failed to serialize formData:', e, {
      formDataToSend,
      formDataValue: formData.value,
      formDataValueKeys: Object.keys(formData.value)
    });
    // 如果序列化失败，尝试手动构建纯对象
    plainData = {};
    for (const key in formDataToSend) {
      const value = formDataToSend[key];
      // 只包含可序列化的值
      try {
        JSON.stringify(value);
        plainData[key] = value;
      } catch (err) {
        console.warn(`[StepDetailArea] Skipping non-serializable value for key ${key}:`, value);
      }
    }
  }
  
  console.log('[StepDetailArea] Generating prompt with formData:', {
    formDataValue: formData.value,
    formDataValueKeys: Object.keys(formData.value),
    formDataToSend: formDataToSend,
    formDataToSendKeys: Object.keys(formDataToSend),
    plainData: plainData,
    plainDataKeys: Object.keys(plainData),
    plainDataEntries: Object.entries(plainData),
    plainDataJson: JSON.stringify(plainData),
    schemaKeys: Object.keys(props.formSchema)
  });
  
  // 确保 emit 的是纯 JSON 对象
  emit('generate-prompt', plainData);
};

// 暴露方法供父组件通过 ref 调用（如果需要）
defineExpose({
  handleSave,
  handleGeneratePrompt,
  getPlainFormData,
});

/**
 * 上一步
 */
const handlePrevStep = () => {
  emit('prev-step');
};

/**
 * 跳转到章节
 */
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

.array-field {
  width: 100%;
}

.array-item {
  margin-bottom: 12px;
}

.array-item-complex {
  padding: 12px;
  border: 1px solid var(--vscode-panel-border, #3e3e3e);
  border-radius: 4px;
  background: var(--vscode-input-background, #2d2d2d);
}

h4 {
  margin: 0 0 12px 0;
  color: var(--vscode-editor-foreground, #d4d4d4);
}
</style>

