<template>
  <div class="create-task-form">
    <!-- 头部：操作按钮和创建按钮 -->
    <div class="header-section">
      <div class="action-buttons-section">
        <el-button-group>
          <el-button
            v-for="cmd in commands"
            :key="cmd.id"
            @click="executeCommand(cmd.id)"
            :disabled="!canCreate"
          >
            {{ cmd.name }}
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
          创建任务
        </el-button>
      </div>
    </div>

    <!-- 中间：输入和选择区域 -->
    <div class="middle-section">
      <el-form :model="formData" label-width="120px" label-position="left">
        <el-form-item label="任务标题" required>
          <el-input
            v-model="formData.title"
            placeholder="输入任务标题（支持模糊搜索关联文件）"
            clearable
          />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="Vault" required>
              <el-select
                v-model="formData.vaultId"
                placeholder="选择 Vault"
                clearable
                style="width: 100%"
                @change="handleVaultChange"
              >
                <el-option
                  v-for="vault in vaults"
                  :key="vault.id"
                  :label="vault.name"
                  :value="vault.id"
                  :disabled="vault.readOnly"
                >
                  <div>
                    <span>{{ vault.name }}</span>
                    <el-tag v-if="vault.readOnly" size="small" type="info" style="margin-left: 8px">
                      只读
                    </el-tag>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="流程模板">
              <el-select
                v-model="formData.workflowTemplate"
                placeholder="选择流程模板（可选）"
                clearable
                style="width: 100%"
                :loading="loadingTemplates"
              >
                <el-option
                  v-for="template in workflowTemplates"
                  :key="template.id"
                  :label="template.name"
                  :value="template.id"
                >
                  <div>
                    <span>{{ template.name }}</span>
                    <span v-if="template.description" class="template-description">
                      {{ template.description }}
                    </span>
                  </div>
                </el-option>
              </el-select>
              <div v-if="workflowTemplates.length === 0 && !loadingTemplates" class="template-hint">
                未找到任务模板，请检查 archi-templates/task 目录
              </div>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="优先级">
          <el-radio-group v-model="formData.priority">
            <el-radio label="low">低</el-radio>
            <el-radio label="medium">中</el-radio>
            <el-radio label="high">高</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
    </div>

    <!-- 下方：已选择和检索结果（左右结构） -->
    <div class="bottom-section">
      <!-- 已选择 -->
      <div class="file-panel selected-panel">
        <div class="panel-header">
          <h4>
            <el-icon><FolderChecked /></el-icon>
            已选择 ({{ selectedFiles.length }})
          </h4>
          <el-button
            v-if="selectedFiles.length > 0"
            type="danger"
            size="small"
            @click="clearSelectedFiles"
          >
            <el-icon><Delete /></el-icon>
            清空
          </el-button>
        </div>
        <div class="panel-content">
          <el-empty v-if="selectedFiles.length === 0" description="暂无已选择" :image-size="80" />
          <div v-else class="file-list">
            <div
              v-for="file in selectedFiles"
              :key="file.id || file.path"
              class="file-item selected"
            >
              <el-icon class="file-icon">
                <Document v-if="file.type === 'document'" />
                <Picture v-else-if="file.type === 'design'" />
                <Document v-else />
              </el-icon>
              <div class="file-info">
                <div class="file-path">
                  <span v-if="file.vault" class="vault-name">{{ file.vault.name }}(vault): </span>{{ file.path }}
                </div>
              </div>
              <el-button
                type="danger"
                size="small"
                circle
                @click="removeFile(file)"
              >
                <el-icon><Close /></el-icon>
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 检索结果 -->
      <div class="file-panel search-panel">
        <div class="panel-header">
          <h4>
            <el-icon><Files /></el-icon>
            检索结果 ({{ filteredFiles.length }})
          </h4>
        </div>
        <div class="panel-content">
          <div v-if="loadingFiles" class="loading-state">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>加载中...</span>
          </div>
          <el-empty
            v-else-if="filteredFiles.length === 0"
            description="没有找到匹配的结果"
            :image-size="80"
          />
          <div v-else class="file-list">
            <div
              v-for="file in filteredFiles"
              :key="file.id || file.path"
              class="file-item"
              :class="{ 'is-selected': isFileSelected(file) }"
              @click="toggleFile(file)"
            >
              <el-icon class="file-icon">
                <Document v-if="file.type === 'document'" />
                <Picture v-else-if="file.type === 'design'" />
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
// @ts-ignore - window is available in webview context
declare const window: any;

import { ref, computed, onMounted, watch } from 'vue';
import { extensionService } from '../services/ExtensionService';
// 图标已在 create-task-dialog-main.ts 中全局注册，无需导入

interface Vault {
  id: string;
  name: string;
  description?: string;
  readOnly?: boolean;
  type?: 'document' | 'ai-enhancement' | 'template' | 'task';
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
}

interface FileItem {
  id?: string;
  path: string;
  name: string;
  type?: 'document' | 'design';
  vault?: {
    id: string;
    name: string;
  };
}

interface FormData {
  title: string;
  vaultId: string;
  workflowTemplate: string;
  priority: 'low' | 'medium' | 'high';
}

interface Emits {
  (e: 'created', task: any): void;
  (e: 'close'): void;
}

const emit = defineEmits<Emits>();

const formData = ref<FormData>({
  title: '',
  vaultId: '',
  workflowTemplate: '',
  priority: 'medium',
});

const vaults = ref<Vault[]>([]);
const workflowTemplates = ref<WorkflowTemplate[]>([]);
const commands = ref<Array<{ id: string; name: string; description?: string }>>([]);
const selectedFiles = ref<FileItem[]>([]);
const allFiles = ref<FileItem[]>([]);
const loadingFiles = ref(false);
const loadingTemplates = ref(false);
const creating = ref(false);
const searchDebounceTimer = ref<number | null>(null);

const filteredFiles = computed(() => {
  if (!formData.value.title.trim()) {
    return allFiles.value;
  }
  const query = formData.value.title.toLowerCase();
  return allFiles.value.filter(
    (file) =>
      file.name.toLowerCase().includes(query) ||
      file.path.toLowerCase().includes(query)
  );
});

const canCreate = computed(() => {
  return (
    formData.value.title.trim() !== '' &&
    formData.value.vaultId !== ''
  );
});

// 监听任务标题变化，自动搜索
watch(
  () => formData.value.title,
  () => {
    if (formData.value.title.trim()) {
      triggerAutoSearch();
    }
  },
  { deep: true }
);

onMounted(async () => {
  // 从 window.initialData 获取初始数据
  if ((window as any).initialData) {
    const initialData = (window as any).initialData;
    if (initialData.vaultId) {
      formData.value.vaultId = initialData.vaultId;
    }
  }
  await loadVaults();
  // 加载所有文件（不传查询条件）
  loadFiles();
  loadCommands();
  // 加载所有模板（明确传 null，确保从所有 vault 加载）
  loadTaskTemplates(null);
});

const loadVaults = async () => {
  try {
    const result = await extensionService.call<Vault[]>('vault.list', {});

    // 过滤 vaults，只显示 task 或 document 类型的 vault
    const allVaults = (result || []) as Vault[];
    vaults.value = allVaults.filter(vault => vault.type === 'task' || vault.type === 'document');
    
    if (vaults.value.length === 0 && allVaults.length > 0) {
      console.warn('No task or document type vaults found. Available vaults:', allVaults.map(v => `${v.name} (${v.type || 'unknown'})`));
    }
    
    // 验证当前设置的 vaultId 是否在过滤后的列表中
    // 如果不在（比如是 assistant 类型），清空并重新设置默认值
    if (formData.value.vaultId) {
      const isValidVault = vaults.value.some(v => v.id === formData.value.vaultId);
      if (!isValidVault) {
        console.warn(`Initial vaultId ${formData.value.vaultId} is not a valid task/document vault, clearing it`);
        formData.value.vaultId = '';
      }
    }
    
    // 如果没有有效的 vaultId，且过滤后有可用的 vault，设置默认值
    if (!formData.value.vaultId && vaults.value.length > 0) {
      // 优先选择 task 类型的 vault，如果没有则选择 document 类型
      const taskVault = vaults.value.find(v => v.type === 'task');
      const defaultVault = taskVault || vaults.value[0];
      if (defaultVault) {
        formData.value.vaultId = defaultVault.id;
      }
    }
  } catch (err: any) {
    console.error('Failed to load vaults', err);
    vaults.value = [];
  }
};

const handleVaultChange = () => {
  // Vault 变更时重新加载所有模板（展示所有 vault 的模板，不限制为当前选择的 vault）
  // 这样用户可以看到所有可用的模板，即使选择了某个 vault
  loadTaskTemplates(null);
};

const loadFiles = async (query?: string) => {
  try {
    loadingFiles.value = true;
    const allResults: FileItem[] = [];

    // 加载所有 vault 的文件（使用 document.list，支持查询）
    if (vaults.value.length > 0) {
      for (const vault of vaults.value) {
        try {
          const result = await extensionService.call<FileItem[]>('document.list', {
                vaultId: vault.id,
                query: query,
          });

          if (result) {
            allResults.push(...result);
          }
        } catch (err: any) {
          console.error(`Failed to load files from vault ${vault.name}`, err);
        }
      }
    }

    // 同时加载 workspace 的文件（支持查询）
    try {
      const workspaceResult = await extensionService.call<FileItem[]>('workspace.listFiles', {
            query: query,
      });

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

const triggerAutoSearch = () => {
  // 清除之前的定时器
  if (searchDebounceTimer.value !== null) {
    clearTimeout(searchDebounceTimer.value);
  }
  // 设置新的定时器，300ms 后执行搜索
  searchDebounceTimer.value = window.setTimeout(() => {
    const query = formData.value.title.trim();
    if (query) {
      // 使用后端 API 实时搜索，传入查询条件
      loadFiles(query);
    } else {
      // 如果没有查询条件，加载所有文件
      loadFiles();
    }
  }, 300);
};

const loadCommands = async () => {
  try {
    // 暂时不加载命令，如果需要可以后续添加
    commands.value = [];
  } catch (err: any) {
    console.error('Failed to load commands', err);
    commands.value = [];
  }
};

const loadTaskTemplates = async (vaultId?: string | null) => {
  loadingTemplates.value = true;
  try {
    // 如果明确传入了 null 或 undefined，或者没有传入参数，则加载所有 vault 的模板
    // 如果传入了具体的 vaultId，则只加载该 vault 的模板
    const targetVaultId = vaultId === null ? undefined : (vaultId || undefined);
    console.log('Loading task templates, vaultId:', targetVaultId || 'all vaults');
    
    const result = await extensionService.call<WorkflowTemplate[]>('getTaskTemplates', {
          vaultId: targetVaultId,
    });

    workflowTemplates.value = result || [];
    console.log('Loaded task templates:', workflowTemplates.value.length, 'templates');
  } catch (err: any) {
    console.error('Failed to load task templates', err);
    workflowTemplates.value = [];
  } finally {
    loadingTemplates.value = false;
  }
};

const isFileSelected = (file: FileItem): boolean => {
  const fileKey = file.id || file.path;
  return selectedFiles.value.some(f => (f.id || f.path) === fileKey);
};

const toggleFile = (file: FileItem) => {
  if (isFileSelected(file)) {
    removeFile(file);
  } else {
    selectedFiles.value.push(file);
  }
};

const removeFile = (file: FileItem) => {
  const fileKey = file.id || file.path;
  selectedFiles.value = selectedFiles.value.filter(f => (f.id || f.path) !== fileKey);
};

const clearSelectedFiles = () => {
  selectedFiles.value = [];
};

const executeCommand = async (commandId: string) => {
  try {
    // TODO: 实现命令执行
    console.log('Execute command:', commandId);
  } catch (err: any) {
    console.error('Failed to execute command', err);
  }
};

const handleCreate = async () => {
  if (!canCreate.value) {
    return;
  }

  creating.value = true;
  try {
    // 使用 ExtensionService 创建任务
    const task = await extensionService.call<any>('createTask', {
          title: formData.value.title,
          vaultId: formData.value.vaultId,
          priority: formData.value.priority,
          relatedFiles: selectedFiles.value.map(f => f.id || f.path),
          workflowTemplate: formData.value.workflowTemplate || 'default',
    });

    if (task) {
      // 发送任务创建成功事件
      extensionService.postEvent('taskCreated', { task });
      emit('created', task);
    }
  } catch (err: any) {
    console.error('Failed to create task', err);
    // 显示错误消息（在 webview 中无法使用 alert，通过消息通知后端）
    extensionService.postEvent('showErrorMessage', { message: `创建任务失败: ${err.message}` });
    console.error('创建任务失败:', err);
  } finally {
    creating.value = false;
  }
};
</script>

<style scoped>
.create-task-form {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--vscode-editor-background, #1e1e1e);
  color: var(--vscode-editor-foreground, #cccccc);
  overflow: hidden;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--vscode-panel-border, #3e3e3e);
  flex-shrink: 0;
}

.action-buttons-section {
  display: flex;
  align-items: center;
  flex: 1; /* 占据剩余空间，确保创建按钮在右侧 */
}

.create-button-section {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0; /* 防止创建按钮被压缩 */
}

.middle-section {
  padding: 16px;
  border-bottom: 1px solid var(--vscode-panel-border, #3e3e3e);
  flex-shrink: 0;
  overflow-y: auto;
}

.bottom-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: row;
  gap: 16px;
  padding: 16px;
  overflow: hidden;
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
  flex: 0 0 300px; /* 已选择面板固定宽度 */
  min-width: 300px;
  max-width: 400px;
}

.search-panel {
  flex: 1 1 auto; /* 检索结果面板占据剩余空间 */
  min-width: 0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--vscode-panel-background, #1e1e1e);
  border-bottom: 1px solid var(--vscode-panel-border, #3e3e3e);
}

.selected-panel .panel-header {
  border-right: 1px solid var(--vscode-panel-border, #3e3e3e);
}

.panel-header h4 {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
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
  color: var(--vscode-textLink-foreground, #4ec9b0);
  flex-shrink: 0;
}

.template-description {
  font-size: 11px;
  color: var(--vscode-descriptionForeground, #999999);
  margin-left: 8px;
}

.template-hint {
  font-size: 12px;
  color: var(--vscode-descriptionForeground, #999999);
  margin-top: 4px;
  font-style: italic;
}
</style>

