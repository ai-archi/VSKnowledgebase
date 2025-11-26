<template>
  <el-dialog
    v-model="visible"
    title="创建/搜索文件"
    width="900px"
    :close-on-click-modal="false"
    :close-on-press-escape="true"
    @close="handleClose"
    class="create-file-dialog-wrapper"
  >
    <div class="create-file-dialog">
      <!-- 头部：操作按钮和提示词 -->
      <div class="header-section">
        <div class="action-buttons">
          <el-button-group>
            <el-button
              :type="mode === 'create' ? 'primary' : 'default'"
              @click="mode = 'create'"
              :icon="Plus"
            >
              创建文件
            </el-button>
            <el-button
              :type="mode === 'search' ? 'primary' : 'default'"
              @click="mode = 'search'"
              :icon="Search"
            >
              搜索文件
            </el-button>
          </el-button-group>
        </div>
        <div class="prompt-section">
          <el-input
            v-model="generatedPrompt"
            type="textarea"
            :rows="2"
            placeholder="提示词将根据您的选择和输入自动生成..."
            readonly
            class="prompt-input"
          >
            <template #append>
              <el-button :icon="CopyDocument" @click="copyPrompt">复制</el-button>
            </template>
          </el-input>
        </div>
      </div>

      <!-- 中间：输入和选择区域 -->
      <div class="middle-section">
        <el-form :model="formData" label-width="100px" label-position="left">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="文件名">
                <el-input
                  v-model="formData.fileName"
                  placeholder="输入文件名（支持模糊搜索）"
                  clearable
                  @input="handleFileNameInput"
                  :prefix-icon="Document"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="文件类型">
                <el-select
                  v-model="formData.fileType"
                  placeholder="选择文件类型"
                  clearable
                  style="width: 100%"
                  @change="updatePrompt"
                >
                  <el-option label="文档 (Markdown)" value="document" />
                  <el-option label="任务 (Task)" value="task" />
                  <el-option label="设计图 (Diagram)" value="diagram" />
                  <el-option label="模板 (Template)" value="template" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="Vault">
                <el-select
                  v-model="formData.vaultId"
                  placeholder="选择 Vault（可选）"
                  filterable
                  clearable
                  style="width: 100%"
                  @change="handleVaultChange"
                >
                  <el-option
                    v-for="vault in vaults"
                    :key="vault.id"
                    :label="vault.name"
                    :value="vault.id"
                  >
                    <div class="vault-option">
                      <span class="vault-name">{{ vault.name }}</span>
                      <span v-if="vault.description" class="vault-description">{{ vault.description }}</span>
                    </div>
                  </el-option>
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="文件模板">
                <el-select
                  v-model="formData.templateId"
                  placeholder="选择模板（可选）"
                  filterable
                  clearable
                  style="width: 100%"
                  :disabled="!formData.vaultId || templates.length === 0"
                  @change="updatePrompt"
                >
                  <el-option
                    v-for="template in templates"
                    :key="template.id"
                    :label="template.name"
                    :value="template.id"
                  >
                    <div class="template-option">
                      <span class="template-name">{{ template.name }}</span>
                      <span v-if="template.description" class="template-description">{{ template.description }}</span>
                      <el-tag :type="template.type === 'structure' ? 'success' : 'info'" size="small" style="margin-left: 8px">
                        {{ template.type === 'structure' ? '结构' : '内容' }}
                      </el-tag>
                    </div>
                  </el-option>
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </div>

      <!-- 下方：已选择文件和文件列表 -->
      <div class="bottom-section">
        <el-row :gutter="20" style="height: 100%">
          <!-- 已选择文件 -->
          <el-col :span="12">
            <div class="file-panel">
              <div class="panel-header">
                <h4>
                  <el-icon><FolderChecked /></el-icon>
                  已选择文件 ({{ selectedFiles.length }})
                </h4>
                <el-button
                  v-if="selectedFiles.length > 0"
                  type="danger"
                  size="small"
                  :icon="Delete"
                  @click="clearSelected"
                >
                  清空
                </el-button>
              </div>
              <div class="panel-content">
                <el-empty v-if="selectedFiles.length === 0" description="暂无已选择文件" :image-size="80" />
                <div v-else class="file-list">
                  <div
                    v-for="file in selectedFiles"
                    :key="file.id || file.path"
                    class="file-item selected"
                  >
                    <el-icon class="file-icon"><Document /></el-icon>
                    <div class="file-info">
                      <div class="file-name">{{ file.title || file.name }}</div>
                      <div class="file-path">{{ file.path }}</div>
                      <div v-if="file.vault" class="file-vault">{{ file.vault.name }}</div>
                    </div>
                    <el-button
                      type="danger"
                      :icon="Close"
                      size="small"
                      circle
                      @click="removeFromSelected(file)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </el-col>

          <!-- 文件列表 -->
          <el-col :span="12">
            <div class="file-panel">
              <div class="panel-header">
                <h4>
                  <el-icon><Files /></el-icon>
                  文件列表 ({{ filteredFiles.length }})
                </h4>
                <div class="search-options">
                  <el-radio-group v-model="searchScope" size="small" @change="handleSearchScopeChange">
                    <el-radio-button label="vault">Vault</el-radio-button>
                    <el-radio-button label="workspace">Workspace</el-radio-button>
                  </el-radio-group>
                </div>
              </div>
              <div class="panel-content">
                <div v-if="loadingFiles" class="loading-state">
                  <el-icon class="is-loading"><Loading /></el-icon>
                  <span>加载中...</span>
                </div>
                <el-empty
                  v-else-if="filteredFiles.length === 0"
                  description="没有找到匹配的文件"
                  :image-size="80"
                />
                <div v-else class="file-list">
                  <div
                    v-for="file in filteredFiles"
                    :key="file.id || file.path"
                    class="file-item"
                    :class="{ 'is-selected': isFileSelected(file) }"
                    @click="toggleFileSelection(file)"
                  >
                    <el-icon class="file-icon"><Document /></el-icon>
                    <div class="file-info">
                      <div class="file-name">{{ file.title || file.name }}</div>
                      <div class="file-path">{{ file.path }}</div>
                      <div v-if="file.vault" class="file-vault">{{ file.vault.name }}</div>
                    </div>
                    <el-icon v-if="isFileSelected(file)" class="check-icon"><Check /></el-icon>
                  </div>
                </div>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button
          v-if="mode === 'create'"
          type="primary"
          @click="handleCreate"
          :loading="creating"
          :disabled="!canCreate"
        >
          创建文件
        </el-button>
        <el-button
          v-if="mode === 'search' && selectedFiles.length > 0"
          type="primary"
          @click="handleOpenSelected"
        >
          打开已选择 ({{ selectedFiles.length }})
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import {
  ElDialog,
  ElButton,
  ElButtonGroup,
  ElInput,
  ElSelect,
  ElOption,
  ElForm,
  ElFormItem,
  ElRow,
  ElCol,
  ElIcon,
  ElEmpty,
  ElTag,
  ElRadioGroup,
  ElRadioButton,
  ElMessage,
} from 'element-plus';
import {
  Plus,
  Search,
  CopyDocument,
  Document,
  FolderChecked,
  Files,
  Delete,
  Close,
  Check,
  Loading,
} from '@element-plus/icons-vue';
import { extensionService } from '../services/ExtensionService';

interface Vault {
  id: string;
  name: string;
  description?: string;
}

interface Template {
  id: string;
  name: string;
  description?: string;
  type: 'structure' | 'content';
}

interface FileItem {
  id?: string;
  path: string;
  name: string;
  title?: string;
  vault?: {
    id: string;
    name: string;
  };
}

interface FormData {
  fileName: string;
  fileType: string;
  vaultId: string;
  templateId: string;
}

interface Props {
  modelValue: boolean;
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'created', artifact: any): void;
  (e: 'filesSelected', files: FileItem[]): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const mode = ref<'create' | 'search'>('create');
const formData = ref<FormData>({
  fileName: '',
  fileType: '',
  vaultId: '',
  templateId: '',
});
const generatedPrompt = ref('');
const vaults = ref<Vault[]>([]);
const templates = ref<Template[]>([]);
const selectedFiles = ref<FileItem[]>([]);
const allFiles = ref<FileItem[]>([]);
const searchScope = ref<'vault' | 'workspace'>('vault');
const loadingFiles = ref(false);
const creating = ref(false);

const filteredFiles = computed(() => {
  if (!formData.value.fileName.trim()) {
    return allFiles.value;
  }
  const query = formData.value.fileName.toLowerCase();
  return allFiles.value.filter(
    (file) =>
      file.name.toLowerCase().includes(query) ||
      file.title?.toLowerCase().includes(query) ||
      file.path.toLowerCase().includes(query)
  );
});

const canCreate = computed(() => {
  if (mode.value !== 'create') return false;
  return (
    formData.value.fileName.trim() !== '' &&
    formData.value.fileType !== '' &&
    formData.value.vaultId !== ''
  );
});

// 监听弹窗打开
watch(visible, (newVal) => {
  if (newVal) {
    resetDialog();
    loadVaults();
  }
});

// 监听表单变化，更新提示词
watch(
  () => [formData.value, mode.value, selectedFiles.value.length],
  () => {
    updatePrompt();
  },
  { deep: true }
);

const resetDialog = () => {
  mode.value = 'create';
  formData.value = {
    fileName: '',
    fileType: '',
    vaultId: '',
    templateId: '',
  };
  generatedPrompt.value = '';
  selectedFiles.value = [];
  allFiles.value = [];
  templates.value = [];
  searchScope.value = 'vault';
  loadingFiles.value = false;
  creating.value = false;
};

const loadVaults = async () => {
  try {
    const result = await extensionService.call<Vault[]>('vault.list', {});
    vaults.value = result || [];
  } catch (err: any) {
    console.error('Failed to load vaults', err);
    vaults.value = [];
  }
};

const handleVaultChange = async (vaultId: string) => {
  if (vaultId) {
    await loadTemplates(vaultId);
    await loadFiles();
  } else {
    templates.value = [];
    allFiles.value = [];
  }
  updatePrompt();
};

const loadTemplates = async (vaultId: string) => {
  try {
    const templatesList = await extensionService.call<any[]>('template.list', { vaultId });
    templates.value = templatesList || [];
  } catch (err: any) {
    console.error('Failed to load templates', err);
    templates.value = [];
  }
};

const loadFiles = async () => {
  if (!formData.value.vaultId && searchScope.value === 'vault') {
    allFiles.value = [];
    return;
  }

  try {
    loadingFiles.value = true;
    if (searchScope.value === 'vault' && formData.value.vaultId) {
      // 从 Vault 加载文件
      const result = await extensionService.call<FileItem[]>('document.list', {
        vaultId: formData.value.vaultId,
      });
      allFiles.value = result || [];
    } else if (searchScope.value === 'workspace') {
      // 从 Workspace 加载文件
      const result = await extensionService.call<FileItem[]>('workspace.listFiles', {});
      allFiles.value = result || [];
    }
  } catch (err: any) {
    console.error('Failed to load files', err);
    allFiles.value = [];
  } finally {
    loadingFiles.value = false;
  }
};

const handleFileNameInput = () => {
  updatePrompt();
  // 实时过滤文件列表（已在 computed 中处理）
};

const handleSearchScopeChange = () => {
  loadFiles();
  updatePrompt();
};

const updatePrompt = () => {
  const parts: string[] = [];

  if (mode.value === 'create') {
    parts.push('创建文件');
    if (formData.value.fileName) {
      parts.push(`文件名: ${formData.value.fileName}`);
    }
    if (formData.value.fileType) {
      const typeMap: Record<string, string> = {
        document: '文档',
        task: '任务',
        diagram: '设计图',
        template: '模板',
      };
      parts.push(`类型: ${typeMap[formData.value.fileType] || formData.value.fileType}`);
    }
    if (formData.value.vaultId) {
      const vault = vaults.value.find((v) => v.id === formData.value.vaultId);
      if (vault) {
        parts.push(`Vault: ${vault.name}`);
      }
    }
    if (formData.value.templateId) {
      const template = templates.value.find((t) => t.id === formData.value.templateId);
      if (template) {
        parts.push(`模板: ${template.name}`);
      }
    }
  } else {
    parts.push('搜索文件');
    if (formData.value.fileName) {
      parts.push(`关键词: ${formData.value.fileName}`);
    }
    if (searchScope.value === 'vault' && formData.value.vaultId) {
      const vault = vaults.value.find((v) => v.id === formData.value.vaultId);
      if (vault) {
        parts.push(`范围: ${vault.name} Vault`);
      }
    } else if (searchScope.value === 'workspace') {
      parts.push('范围: Workspace');
    }
    if (selectedFiles.value.length > 0) {
      parts.push(`已选择: ${selectedFiles.value.length} 个文件`);
    }
  }

  generatedPrompt.value = parts.join(' | ');
};

const copyPrompt = () => {
  if (generatedPrompt.value) {
    navigator.clipboard.writeText(generatedPrompt.value).then(() => {
      ElMessage.success('提示词已复制到剪贴板');
    });
  }
};

const isFileSelected = (file: FileItem): boolean => {
  return selectedFiles.value.some(
    (f) => (f.id && f.id === file.id) || f.path === file.path
  );
};

const toggleFileSelection = (file: FileItem) => {
  if (isFileSelected(file)) {
    removeFromSelected(file);
  } else {
    selectedFiles.value.push(file);
    updatePrompt();
  }
};

const removeFromSelected = (file: FileItem) => {
  const index = selectedFiles.value.findIndex(
    (f) => (f.id && f.id === file.id) || f.path === file.path
  );
  if (index > -1) {
    selectedFiles.value.splice(index, 1);
    updatePrompt();
  }
};

const clearSelected = () => {
  selectedFiles.value = [];
  updatePrompt();
};

const handleCreate = async () => {
  if (!canCreate.value) {
    return;
  }

  try {
    creating.value = true;
    const result = await extensionService.call('document.create', {
      vaultId: formData.value.vaultId,
      path: `${formData.value.fileType}/${formData.value.fileName}.md`,
      title: formData.value.fileName,
      content: formData.value.templateId
        ? await getTemplateContent(formData.value.templateId)
        : `# ${formData.value.fileName}\n\n`,
    });

    ElMessage.success('文件创建成功');
    emit('created', result);
    handleClose();
  } catch (err: any) {
    console.error('Failed to create document', err);
    ElMessage.error(`创建文件失败: ${err.message || '未知错误'}`);
  } finally {
    creating.value = false;
  }
};

const getTemplateContent = async (templateId: string): Promise<string> => {
  try {
    const template = templates.value.find((t) => t.id === templateId);
    if (template) {
      // 这里需要调用后端获取模板内容
      const result = await extensionService.call<string>('template.getContent', {
        templateId,
        vaultId: formData.value.vaultId,
      });
      return result || '';
    }
  } catch (err: any) {
    console.error('Failed to get template content', err);
  }
  return '';
};

const handleOpenSelected = () => {
  if (selectedFiles.value.length > 0) {
    emit('filesSelected', selectedFiles.value);
    handleClose();
  }
};

const handleClose = () => {
  visible.value = false;
  resetDialog();
};
</script>

<style scoped>
.create-file-dialog-wrapper {
  --el-dialog-padding-primary: 20px;
}

.create-file-dialog {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 600px;
}

/* 头部区域 */
.header-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.action-buttons {
  display: flex;
  justify-content: flex-start;
}

.prompt-section {
  flex: 1;
}

.prompt-input {
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

/* 中间区域 */
.middle-section {
  flex-shrink: 0;
}

.vault-option,
.template-option {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.vault-name,
.template-name {
  font-weight: 500;
  color: #303133;
}

.vault-description,
.template-description {
  font-size: 12px;
  color: #909399;
}

/* 下方区域 */
.bottom-section {
  flex: 1;
  min-height: 300px;
  display: flex;
  flex-direction: column;
}

.file-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f5f7fa;
  border-bottom: 1px solid #e0e0e0;
}

.panel-header h4 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.search-options {
  display: flex;
  align-items: center;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  color: #909399;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.file-item:hover {
  border-color: #409eff;
  background: #f0f9ff;
}

.file-item.is-selected {
  border-color: #409eff;
  background: #ecf5ff;
}

.file-item.selected {
  border-color: #67c23a;
  background: #f0f9ff;
}

.file-icon {
  font-size: 20px;
  color: #409eff;
  flex-shrink: 0;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-path {
  font-size: 12px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-vault {
  font-size: 11px;
  color: #c0c4cc;
  margin-top: 2px;
}

.check-icon {
  font-size: 18px;
  color: #67c23a;
  flex-shrink: 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
