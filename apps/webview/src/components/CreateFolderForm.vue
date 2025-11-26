<template>
  <div class="create-folder-form">
    <!-- 头部：操作按钮和创建按钮 -->
    <div class="header-section">
      <div class="action-buttons-section">
        <el-button-group>
          <el-button @click="generatePrompt('summarize')" :disabled="selectedFiles.length === 0">
            总结
          </el-button>
          <el-button @click="generatePrompt('refactor')" :disabled="selectedFiles.length === 0">
            重构
          </el-button>
          <el-button @click="generatePrompt('review')" :disabled="selectedFiles.length === 0">
            检查
          </el-button>
          <el-button @click="generatePrompt('analyze')" :disabled="selectedFiles.length === 0">
            分析
          </el-button>
          <el-button @click="generatePrompt('optimize')" :disabled="selectedFiles.length === 0">
            优化
          </el-button>
        </el-button-group>
      </div>
      <div class="create-button-section">
        <el-button
          type="primary"
          @click="handleCreate"
          :loading="creating"
          :disabled="!canCreate"
        >
          创建文件夹
        </el-button>
      </div>
    </div>

    <!-- 中间：输入和选择区域 -->
    <div class="middle-section">
      <el-form :model="formData" label-width="100px" label-position="left">
        <el-form-item label="文件夹名称" required>
          <el-input
            v-model="formData.folderName"
            placeholder="输入文件夹名称（支持模糊搜索）"
            clearable
            @input="handleFolderNameInput"
            :prefix-icon="Folder"
          />
          <div v-if="validationError" class="error-message">
            {{ validationError }}
          </div>
        </el-form-item>
        <el-form-item label="文件夹模板">
          <el-select
            v-model="formData.templateId"
            placeholder="选择文件夹模板（可选）"
            filterable
            clearable
            style="width: 100%"
            :disabled="!formData.vaultId || folderTemplates.length === 0"
          >
            <el-option
              v-for="template in folderTemplates"
              :key="template.id"
              :label="template.name"
              :value="template.id"
            >
              <div class="template-option">
                <span class="template-name">{{ template.name }}</span>
                <span v-if="template.description" class="template-description">{{ template.description }}</span>
                <el-tag type="success" size="small" style="margin-left: 8px">
                  结构
                </el-tag>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
    </div>

    <!-- 下方：已选择文件和文件列表（上下结构） -->
    <div class="bottom-section">
      <!-- 已选择文件 -->
      <div class="file-panel selected-panel">
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
              <el-icon class="file-icon">
                <Folder v-if="file.type === 'folder'" />
                <Document v-else />
              </el-icon>
              <div class="file-info">
                <div class="file-path">
                  <span v-if="file.vault" class="vault-name">{{ file.vault.name }}(vault): </span>{{ file.path }}
                </div>
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

      <!-- 文件检索结果 -->
      <div class="file-panel search-panel">
        <div class="panel-header">
          <h4>
            <el-icon><Files /></el-icon>
            文件检索结果 ({{ filteredFiles.length }})
          </h4>
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
              <el-icon class="file-icon">
                <Folder v-if="file.type === 'folder'" />
                <Document v-else />
              </el-icon>
              <div class="file-info">
                <div class="file-path">
                  <span v-if="file.vault" class="vault-name">{{ file.vault.name }}(vault): </span>{{ file.path }}
                </div>
              </div>
              <el-icon v-if="isFileSelected(file)" class="check-icon"><Check /></el-icon>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import {
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
  ElMessage,
} from 'element-plus';
import {
  Folder,
  FolderChecked,
  Files,
  Document,
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
  libraryName: string;
}

interface FileItem {
  id?: string;
  path: string;
  name: string;
  title?: string;
  type?: 'file' | 'folder';
  vault?: {
    id: string;
    name: string;
  };
}

interface FormData {
  folderName: string;
  vaultId: string;
  templateId: string;
}

interface Emits {
  (e: 'created', result: any): void;
  (e: 'close'): void;
}

const emit = defineEmits<Emits>();

const formData = ref<FormData>({
  folderName: '',
  vaultId: '',
  templateId: '',
});

const initialFolderPath = ref<string | undefined>(undefined);
const vaults = ref<Vault[]>([]);
const allTemplates = ref<Template[]>([]);
const selectedFiles = ref<FileItem[]>([]);
const allFiles = ref<FileItem[]>([]);
const loadingFiles = ref(false);
const creating = ref(false);
const validationError = ref<string | null>(null);
const searchDebounceTimer = ref<number | null>(null);

const folderTemplates = computed(() => {
  return allTemplates.value.filter(t => t.type === 'structure');
});

const selectedVault = computed(() => {
  return vaults.value.find(v => v.id === formData.value.vaultId);
});

const filteredFiles = computed(() => {
  if (!formData.value.folderName.trim()) {
    return allFiles.value;
  }
  const query = formData.value.folderName.toLowerCase();
  return allFiles.value.filter(
    (file) =>
      file.name.toLowerCase().includes(query) ||
      file.title?.toLowerCase().includes(query) ||
      file.path.toLowerCase().includes(query)
  );
});

const canCreate = computed(() => {
  return (
    formData.value.folderName.trim() !== '' &&
    formData.value.vaultId !== '' &&
    validationError.value === null
  );
});

// 监听文件夹名称变化，自动搜索
watch(
  () => formData.value.folderName,
  () => {
    if (formData.value.folderName.trim()) {
      triggerAutoSearch();
    }
  },
  { deep: true }
);

onMounted(() => {
  // 从 window.initialData 获取初始数据
  if ((window as any).initialData) {
    const initialData = (window as any).initialData;
    if (initialData.vaultId) {
      formData.value.vaultId = initialData.vaultId;
    } else {
      ElMessage.error('无法获取 Vault 信息，请从 Vault 或文件夹节点右键创建');
      // 延迟关闭
      setTimeout(() => {
        if (window.acquireVsCodeApi) {
          const vscode = window.acquireVsCodeApi();
          vscode.postMessage({ method: 'close' });
        }
      }, 2000);
      return;
    }
    if (initialData.folderPath !== undefined) {
      initialFolderPath.value = initialData.folderPath;
    }
  } else {
    ElMessage.error('无法获取初始数据，请从 Vault 或文件夹节点右键创建');
    // 延迟关闭
    setTimeout(() => {
      if (window.acquireVsCodeApi) {
        const vscode = window.acquireVsCodeApi();
        vscode.postMessage({ method: 'close' });
      }
    }, 2000);
    return;
  }
  loadVaults();
  // 加载模板和文件
  if (formData.value.vaultId) {
    loadTemplates(formData.value.vaultId);
    loadFiles();
  }
});

const loadVaults = async () => {
  try {
    const result = await extensionService.call<Vault[]>('vault.list', {});
    vaults.value = result || [];
  } catch (err: any) {
    console.error('Failed to load vaults', err);
    vaults.value = [];
  }
};

const loadTemplates = async (vaultId: string) => {
  try {
    const libraries = await extensionService.call<any[]>('template.listLibraries', { vaultId });
    allTemplates.value = [];
    if (libraries && libraries.length > 0) {
      for (const library of libraries) {
        if (library.templates && library.templates.length > 0) {
          allTemplates.value.push(...library.templates);
        }
      }
    }
  } catch (err: any) {
    console.error('Failed to load templates', err);
    allTemplates.value = [];
  }
};

const loadFiles = async () => {
  try {
    loadingFiles.value = true;
    const allResults: FileItem[] = [];
    
    // 同时加载所有 vault 的文件
    if (vaults.value.length > 0) {
      for (const vault of vaults.value) {
        try {
          const result = await extensionService.call<FileItem[]>('document.list', {
            vaultId: vault.id,
          });
          if (result) {
            allResults.push(...result);
          }
        } catch (err: any) {
          console.error(`Failed to load files from vault ${vault.name}`, err);
        }
      }
    }
    
    // 同时加载 workspace 的文件
    try {
      const workspaceResult = await extensionService.call<FileItem[]>('workspace.listFiles', {});
      if (workspaceResult) {
        allResults.push(...workspaceResult);
      }
    } catch (err: any) {
      console.error('Failed to load workspace files', err);
    }
    
    allFiles.value = allResults;
  } catch (err: any) {
    console.error('Failed to load files', err);
    allFiles.value = [];
  } finally {
    loadingFiles.value = false;
  }
};

const handleFolderNameInput = () => {
  validationError.value = validateFileName(formData.value.folderName);
  // 自动触发搜索（带防抖）
  triggerAutoSearch();
};

const triggerAutoSearch = () => {
  // 清除之前的定时器
  if (searchDebounceTimer.value !== null) {
    clearTimeout(searchDebounceTimer.value);
  }
  // 设置新的定时器，300ms 后执行搜索
  searchDebounceTimer.value = window.setTimeout(() => {
    if (formData.value.folderName.trim()) {
      loadFiles();
    } else {
      allFiles.value = [];
    }
  }, 300);
};

const validateFileName = (value: string): string | null => {
  if (!value || value.trim().length === 0) {
    return '文件夹名称不能为空';
  }
  if (/[<>:"/\\|?*]/.test(value)) {
    return '文件夹名称包含非法字符';
  }
  return null;
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
  }
};

const removeFromSelected = (file: FileItem) => {
  const index = selectedFiles.value.findIndex(
    (f) => (f.id && f.id === file.id) || f.path === file.path
  );
  if (index > -1) {
    selectedFiles.value.splice(index, 1);
  }
};

const clearSelected = () => {
  selectedFiles.value = [];
};

const handleCreate = async () => {
  if (!canCreate.value) {
    return;
  }

  // 再次验证
  const error = validateFileName(formData.value.folderName);
  if (error) {
    validationError.value = error;
    ElMessage.warning(error);
    return;
  }

  try {
    creating.value = true;
    
    // 确定文件夹路径
    const folderPath = initialFolderPath.value || '';
    
    // 如果有模板，需要获取模板内容并创建文件夹结构
    let templateContent: any = null;
    if (formData.value.templateId) {
      const template = folderTemplates.value.find(t => t.id === formData.value.templateId);
      if (template) {
        try {
          templateContent = await extensionService.call<any>('template.getContent', {
            templateId: formData.value.templateId,
            libraryName: template.libraryName,
            vaultId: formData.value.vaultId,
          });
        } catch (err: any) {
          console.error('Failed to get template content', err);
        }
      }
    }
    
    const result = await extensionService.call('document.createFolder', {
      vaultId: formData.value.vaultId,
      folderPath: folderPath,
      folderName: formData.value.folderName.trim(),
      template: templateContent, // 传递模板内容用于创建文件夹结构
    });

    ElMessage.success('文件夹创建成功');
    emit('created', result);
    
    // 通知后端刷新和展开
    if (window.acquireVsCodeApi) {
      const vscode = window.acquireVsCodeApi();
      const vault = vaults.value.find(v => v.id === formData.value.vaultId);
      const folderPath = initialFolderPath.value || '';
      vscode.postMessage({ 
        method: 'folderCreated',
        params: {
          vaultName: vault?.name,
          folderPath: folderPath,
        }
      });
    }
    
    // 延迟关闭，确保刷新完成
    setTimeout(() => {
      if (window.acquireVsCodeApi) {
        const vscode = window.acquireVsCodeApi();
        vscode.postMessage({ method: 'close' });
      }
    }, 100);
  } catch (err: any) {
    console.error('Failed to create folder', err);
    ElMessage.error(`创建文件夹失败: ${err.message || '未知错误'}`);
  } finally {
    creating.value = false;
  }
};

const generatePrompt = (action: string) => {
  if (selectedFiles.value.length === 0) {
    ElMessage.warning('请先选择文件');
    return;
  }

  const actionMap: Record<string, string> = {
    summarize: '总结',
    refactor: '重构',
    review: '检查',
    analyze: '分析',
    optimize: '优化',
  };

  const actionName = actionMap[action] || action;
  const fileNames = selectedFiles.value.map(f => f.title || f.name).join('、');
  const filePaths = selectedFiles.value.map(f => f.path).join('\n');

  let prompt = '';
  switch (action) {
    case 'summarize':
      prompt = `请总结以下文件的内容：\n\n文件：${fileNames}\n\n路径：\n${filePaths}`;
      break;
    case 'refactor':
      prompt = `请重构以下文件：\n\n文件：${fileNames}\n\n路径：\n${filePaths}\n\n请提供重构建议和优化方案。`;
      break;
    case 'review':
      prompt = `请检查以下文件的代码质量和潜在问题：\n\n文件：${fileNames}\n\n路径：\n${filePaths}\n\n请提供代码审查意见。`;
      break;
    case 'analyze':
      prompt = `请分析以下文件：\n\n文件：${fileNames}\n\n路径：\n${filePaths}\n\n请分析文件结构、依赖关系和设计模式。`;
      break;
    case 'optimize':
      prompt = `请优化以下文件：\n\n文件：${fileNames}\n\n路径：\n${filePaths}\n\n请提供性能优化和代码优化建议。`;
      break;
    default:
      prompt = `${actionName}以下文件：\n\n文件：${fileNames}\n\n路径：\n${filePaths}`;
  }

  // 复制到剪贴板
  navigator.clipboard.writeText(prompt).then(() => {
    ElMessage.success(`提示词已复制到剪贴板：${actionName}`);
  }).catch(err => {
    console.error('Failed to copy to clipboard', err);
    ElMessage.error('复制到剪贴板失败');
  });
};
</script>

<style scoped>
.create-folder-form {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 20px;
  box-sizing: border-box;
  background: var(--vscode-editor-background, #1e1e1e);
  color: var(--vscode-editor-foreground, #cccccc);
  overflow: hidden;
}

/* 头部区域 */
.header-section {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid var(--vscode-panel-border, #3e3e3e);
  margin-bottom: 20px;
}

.action-buttons-section {
  display: flex;
  align-items: center;
}

.create-button-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 中间区域 */
.middle-section {
  flex-shrink: 0;
  margin-bottom: 20px;
}

.error-message {
  color: var(--vscode-errorForeground, #f48771);
  font-size: 12px;
  margin-top: 4px;
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
  color: var(--vscode-editor-foreground, #cccccc);
}

.vault-description,
.template-description {
  font-size: 12px;
  color: var(--vscode-descriptionForeground, #999999);
}

/* 下方区域 */
.bottom-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.file-panel {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--vscode-panel-border, #3e3e3e);
  border-radius: 4px;
  overflow: hidden;
  background: var(--vscode-editor-background, #1e1e1e);
}

.selected-panel {
  flex: 0 0 300px;
  min-height: 300px;
}

.search-panel {
  flex: 0 1 auto;
  min-height: 0;
  max-height: calc(100vh - 500px);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--vscode-panel-background, #252526);
  border-bottom: 1px solid var(--vscode-panel-border, #3e3e3e);
}

.panel-header h4 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--vscode-editor-foreground, #cccccc);
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
  color: var(--vscode-descriptionForeground, #999999);
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  border: none;
  border-bottom: 1px solid var(--vscode-panel-border, #3e3e3e);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  background: var(--vscode-editor-background, #1e1e1e);
  min-height: 32px;
  line-height: 1.4;
}

.file-item:hover {
  background: var(--vscode-list-hoverBackground, #2a2d2e);
}

.file-item.is-selected {
  background: var(--vscode-list-activeSelectionBackground, #094771);
}

.file-item.selected {
  background: var(--vscode-list-activeSelectionBackground, #094771);
}

.file-icon {
  font-size: 14px;
  color: var(--vscode-textLink-foreground, #4ec9b0);
  flex-shrink: 0;
}

.file-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.file-path {
  font-size: 13px;
  color: var(--vscode-editor-foreground, #cccccc);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4;
}

.vault-name {
  color: var(--vscode-textLink-foreground, #4ec9b0);
  font-weight: 500;
}

.check-icon {
  font-size: 16px;
  color: var(--vscode-testing-iconPassed, #4ec9b0);
  flex-shrink: 0;
}
</style>
