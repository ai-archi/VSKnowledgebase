<template>
  <div class="create-file-form">
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
          创建文件
        </el-button>
      </div>
    </div>

    <!-- 中间：输入和选择区域 -->
    <div class="middle-section">
      <el-form :model="formData" label-width="100px" label-position="left">
        <el-form-item label="文件名">
          <el-input
            v-model="formData.fileName"
            placeholder="输入文件名（支持模糊搜索）"
            clearable
            @input="handleFileNameInput"
            :prefix-icon="Document"
          />
        </el-form-item>
            <el-form-item label="文件模板">
              <el-select
                v-model="formData.templateId"
                placeholder="选择模板（可选）"
                filterable
                clearable
                style="width: 100%"
                :disabled="!formData.vaultId || markdownTemplates.length === 0"
              >
                <el-option
                  v-for="template in markdownTemplates"
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
            :icon="Delete"
            @click="clearSelected"
          >
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
              <el-icon class="file-icon"><Document /></el-icon>
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
  ElIcon,
  ElEmpty,
  ElTag,
  ElMessage,
} from 'element-plus';
import {
  Document,
  Folder,
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
  category?: string;
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
  fileName: string;
  vaultId: string;
  templateId: string;
}

interface Emits {
  (e: 'created', artifact: any): void;
  (e: 'close'): void;
}

const emit = defineEmits<Emits>();

const formData = ref<FormData>({
  fileName: '',
  vaultId: '',
  templateId: '',
});
const initialFolderPath = ref<string | undefined>(undefined);
const vaults = ref<Vault[]>([]);
const templates = ref<Template[]>([]);
const commands = ref<Array<{ id: string; name: string; description?: string }>>([]);
const selectedFiles = ref<FileItem[]>([]);
const allFiles = ref<FileItem[]>([]);
const loadingFiles = ref(false);
const creating = ref(false);
const searchDebounceTimer = ref<ReturnType<typeof setTimeout> | null>(null);

// 过滤模板：只显示 markdown 模板，排除 mermaid、plantuml、archimate 和任务模板
const markdownTemplates = computed(() => {
  return templates.value.filter((template) => {
    const templateId = template.id.toLowerCase();
    // 排除任务模板（路径包含 /task/ 或 category 为 task）
    // 任务模板是 yaml 类型，属性 category: task
    if (templateId.includes('/task/') || template.category === 'task') {
      return false;
    }
    // 排除 mermaid 模板（路径包含 mermaid 或扩展名为 .mmd）
    if (templateId.includes('/mermaid/') || templateId.endsWith('.mmd')) {
      return false;
    }
    // 排除 plantuml 模板（路径包含 plantuml 或扩展名为 .puml）
    if (templateId.includes('/plantuml/') || templateId.endsWith('.puml')) {
      return false;
    }
    // 排除 archimate 模板（扩展名为 .archimate）
    if (templateId.endsWith('.archimate')) {
      return false;
    }
    // 只保留 markdown 模板（路径包含 markdown 或扩展名为 .md，或者没有明确类型的内容模板）
    return true;
  });
});

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
  return (
    formData.value.fileName.trim() !== '' &&
    formData.value.vaultId !== ''
  );
});

// 监听表单变化，自动搜索
watch(
  () => [formData.value.fileName],
  () => {
    // 当文件名变化时，自动触发搜索
    if (formData.value.fileName.trim()) {
      triggerAutoSearch();
    }
  },
  { deep: true }
);

onMounted(() => {
  // 从 window.initialData 获取初始数据
  let initialFileName: string | undefined;
  let initialTemplateId: string | undefined;
  
  const win = globalThis as any;
  if (win.initialData) {
    const initialData = win.initialData;
    if (initialData.vaultId) {
      formData.value.vaultId = initialData.vaultId;
    }
    // 只有当 folderPath 是有效的非空字符串时才设置
    // vault 节点的 folderPath 应该是 undefined 或 null
    if (initialData.folderPath && typeof initialData.folderPath === 'string' && initialData.folderPath.trim() !== '') {
      initialFolderPath.value = initialData.folderPath;
    } else {
      initialFolderPath.value = undefined;
    }
    // 读取初始文件名和模板ID
    if (initialData.initialFileName && typeof initialData.initialFileName === 'string') {
      initialFileName = initialData.initialFileName;
      formData.value.fileName = initialData.initialFileName;
    }
    if (initialData.initialTemplateId && typeof initialData.initialTemplateId === 'string') {
      initialTemplateId = initialData.initialTemplateId;
    }
    console.log('[CreateFileForm] Initial data loaded', {
      vaultId: initialData.vaultId,
      folderPath: initialData.folderPath,
      initialFolderPath: initialFolderPath.value,
      initialFileName: initialFileName,
      initialTemplateId: initialTemplateId
    });
  }
  loadVaults();
  loadCommands(); // 加载所有 vault 的命令
  // 加载所有模板（不传 vaultId，从所有 vault 加载）
  // 模板加载完成后，设置初始模板ID
  loadTemplates(undefined).then(() => {
    if (initialTemplateId) {
      // 检查模板是否存在于列表中
      const templateExists = templates.value.some(t => t.id === initialTemplateId);
      if (templateExists) {
        formData.value.templateId = initialTemplateId;
        console.log('[CreateFileForm] Initial template ID set', initialTemplateId);
      } else {
        console.warn('[CreateFileForm] Initial template ID not found in templates list', initialTemplateId);
      }
    }
  });
  // 如果有初始 vaultId，加载文件
  if (formData.value.vaultId) {
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

// 移除 handleVaultChange，不再需要

const loadTemplates = async (vaultId?: string) => {
  try {
    const templatesList = await extensionService.call<any[]>('template.list', vaultId ? { vaultId } : {});
    templates.value = templatesList || [];
  } catch (err: any) {
    console.error('Failed to load templates', err);
    templates.value = [];
  }
};

const loadCommands = async () => {
  try {
    // 不传递 vaultId，加载所有 vault 的命令
    const commandsList = await extensionService.call<any[]>('aiCommand.list', { targetType: 'file' });
    commands.value = commandsList || [];
    console.log('[CreateFileForm] Commands loaded:', commands.value.length, commands.value);
  } catch (err: any) {
    console.error('Failed to load commands', err);
    commands.value = [];
  }
};

const loadFiles = async (query?: string) => {
  try {
    loadingFiles.value = true;
    const allResults: FileItem[] = [];
    
    // 同时加载所有 vault 的文件（使用 document.list，支持查询）
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

const handleFileNameInput = () => {
  // 自动触发搜索（带防抖）
  triggerAutoSearch();
};

const triggerAutoSearch = () => {
  // 清除之前的定时器
  if (searchDebounceTimer.value !== null) {
    clearTimeout(searchDebounceTimer.value);
  }
  // 设置新的定时器，300ms 后执行搜索
  searchDebounceTimer.value = setTimeout(() => {
    const query = formData.value.fileName.trim();
    if (query) {
      // 使用 VSCode API 实时过滤，传入查询条件
      loadFiles(query);
    } else {
      // 如果没有查询条件，加载所有文件
      loadFiles();
    }
  }, 300);
};

// 移除 handleSearchScopeChange，不再需要


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

  try {
    creating.value = true;
    // 固定为 md 文件
    const extension = 'md';
    const fileName = formData.value.fileName.trim();
    
    // 构建文件路径：如果有初始文件夹路径，在文件夹下创建；否则在根目录创建
    let filePath: string;
    // 确保 initialFolderPath 是有效的非空字符串
    const folderPath = initialFolderPath.value && typeof initialFolderPath.value === 'string' && initialFolderPath.value.trim() !== ''
      ? initialFolderPath.value.trim()
      : undefined;
    
    if (folderPath) {
      // 在文件夹下创建：文件夹路径/文件名.扩展名
      filePath = `${folderPath}/${fileName}.${extension}`;
    } else {
      // 在 vault 根目录创建：文件名.扩展名
      filePath = `${fileName}.${extension}`;
    }
    
    console.log('[CreateFileForm] Path building', {
      initialFolderPath: initialFolderPath.value,
      folderPath,
      fileName,
      extension,
      finalPath: filePath
    });
    
    console.log('[CreateFileForm] Creating document', {
      vaultId: formData.value.vaultId,
      path: filePath,
      title: formData.value.fileName,
      hasTemplate: !!formData.value.templateId
    });
    
    console.log('[CreateFileForm] Calling document.create', {
      vaultId: formData.value.vaultId,
      path: filePath,
      title: formData.value.fileName,
      templateId: formData.value.templateId || undefined,
    });
    
    // 分离文档和代码文件
    const relatedArtifacts: string[] = [];
    const relatedCodePaths: string[] = [];

    for (const file of selectedFiles.value) {
      if (file.vault) {
        // 文档，优先使用id，否则使用path
        if (file.id) {
          relatedArtifacts.push(file.id);
        } else {
          relatedArtifacts.push(file.path);
        }
      } else {
        // 代码文件，使用path
        relatedCodePaths.push(file.path);
      }
    }

    console.log('[CreateFileForm] Selected files for relations', {
      selectedFiles: selectedFiles.value,
      relatedArtifacts,
      relatedCodePaths
    });

    const requestParams = {
      vaultId: formData.value.vaultId,
      path: filePath,
      title: formData.value.fileName,
      templateId: formData.value.templateId || undefined, // 传递模板ID，后端会进行渲染
      relatedArtifacts: relatedArtifacts.length > 0 ? relatedArtifacts : undefined,
      relatedCodePaths: relatedCodePaths.length > 0 ? relatedCodePaths : undefined,
    };
    
    console.log('[CreateFileForm] Request params for document.create:', JSON.stringify(requestParams, null, 2));
    
    const result = await extensionService.call('document.create', requestParams);

    console.log('[CreateFileForm] Document created successfully', result);
    console.log('[CreateFileForm] Full result object:', JSON.stringify(result, null, 2));
    console.log('[CreateFileForm] contentLocation from result:', result?.contentLocation);
    console.log('[CreateFileForm] Has contentLocation:', !!result?.contentLocation);
    
    if (!result?.contentLocation) {
      console.error('[CreateFileForm] WARNING: contentLocation is missing in result!', result);
    }
    
    ElMessage.success('文件创建成功');
    emit('created', result);
    
    // 通知后端刷新和展开
      const vault = vaults.value.find(v => v.id === formData.value.vaultId);
    // 重用上面定义的 folderPath，如果为 undefined 则使用空字符串
    const folderPathForMessage = folderPath || '';
      const messageParams = {
        vaultName: vault?.name,
      folderPath: folderPathForMessage,
        filePath: filePath,
        contentLocation: result?.contentLocation,
      };
      console.log('[CreateFileForm] Sending fileCreated message with params:', messageParams);
    extensionService.postEvent('fileCreated', messageParams);
      // 注意：不需要单独发送 close 消息，后端会在处理完 fileCreated 后自动关闭
  } catch (err: any) {
    console.error('[CreateFileForm] Failed to create document', {
      error: err,
      message: err.message,
      stack: err.stack,
      vaultId: formData.value.vaultId,
      fileName: formData.value.fileName
    });
    ElMessage.error(`创建文件失败: ${err.message || '未知错误'}`);
  } finally {
    creating.value = false;
  }
};



const executeCommand = async (commandId: string) => {
  if (!canCreate.value) {
    ElMessage.warning('请先输入文件名并选择 Vault');
    return;
  }

  try {
    // 构建执行上下文（确保所有数据都是可序列化的）
    const folderPath = initialFolderPath.value && typeof initialFolderPath.value === 'string' && initialFolderPath.value.trim() !== ''
      ? initialFolderPath.value.trim()
      : undefined;
    
    // 从 templateId 获取模板文件信息
    let templateFile: any = undefined;
    if (formData.value.templateId) {
      const templateId = formData.value.templateId;
      let templatePath = templateId;
      let templateVault: { id: string; name: string } | undefined = undefined;
      
      // 解析 templateId：可能是 "vaultName/path" 或 "path"
      if (templateId.includes('/')) {
        const parts = templateId.split('/');
        // 检查第一部分是否是 vault 名称（不是 "archi-templates"）
        if (!templateId.startsWith('archi-templates/') && parts.length > 1) {
          const vaultName = parts[0];
          const foundVault = vaults.value.find(v => v.name === vaultName);
          if (foundVault) {
            templateVault = { id: foundVault.id, name: foundVault.name };
            templatePath = parts.slice(1).join('/');
          }
        }
      }
      
      // 如果没找到 vault，使用当前 vault
      if (!templateVault) {
        const currentVault = vaults.value.find(v => v.id === formData.value.vaultId);
        if (currentVault) {
          templateVault = { id: currentVault.id, name: currentVault.name };
        }
      }
      
      // 从模板列表中找到对应的模板，获取 name
      const template = templates.value.find(t => t.id === templateId);
      const templateName = template?.name || templatePath.split('/').pop() || templatePath;
      
      if (templatePath && templateName && templateVault) {
        templateFile = {
          path: templatePath,
          name: templateName,
          vault: templateVault,
        };
      }
    }
    
    const context = {
      fileName: formData.value.fileName.trim() || undefined,
      folderPath: folderPath,
      templateFile: templateFile,
      selectedFiles: selectedFiles.value
        .filter(f => f.path && f.name) // 只保留有 path 和 name 的文件
        .map(f => ({
          path: f.path,
          name: f.name,
      })),
    };

    // 调用后端执行命令
    const result = await extensionService.call<string>('aiCommand.execute', {
      commandId,
      vaultId: formData.value.vaultId,
      context,
    });

  // 复制到剪贴板
    navigator.clipboard.writeText(result).then(() => {
      const command = commands.value.find(c => c.id === commandId);
      ElMessage.success(`提示词已复制到剪贴板：${command?.name || commandId}`);
  }).catch(err => {
    console.error('Failed to copy to clipboard', err);
    ElMessage.error('复制到剪贴板失败');
  });
  } catch (err: any) {
    console.error('Failed to execute command', err);
    ElMessage.error(`执行命令失败：${err.message || '未知错误'}`);
  }
};
</script>

<style scoped>
.create-file-form {
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
  flex: 1; /* 占据剩余空间，确保创建按钮在右侧 */
}

.create-button-section {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0; /* 防止创建按钮被压缩 */
}

/* 中间区域 */
.middle-section {
  flex-shrink: 0;
  margin-bottom: 20px;
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
  color: var(--vscode-foreground, #cccccc);
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
  flex-direction: row;
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
  padding: 12px 16px;
  background: var(--vscode-panel-background, #252526);
  border-bottom: 1px solid var(--vscode-panel-border, #3e3e3e);
}

.selected-panel .panel-header {
  border-right: 1px solid var(--vscode-panel-border, #3e3e3e);
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

