<template>
  <div class="edit-relations-form">
    <!-- 头部：保存按钮 -->
    <div class="header-section">
      <div class="title-section">
        <h3>{{ displayName }}</h3>
      </div>
      <div class="save-button-section">
        <el-button
          type="primary"
          @click="handleSave"
          :loading="saving"
          :disabled="!hasChanges"
        >
          保存
        </el-button>
        <el-button @click="handleClose">取消</el-button>
      </div>
    </div>

    <!-- 中间：搜索框 -->
    <div class="middle-section">
      <el-input
        v-model="searchQuery"
        placeholder="搜索文档或代码文件（支持模糊搜索）"
        clearable
        @input="handleSearchInput"
        :prefix-icon="Search"
      />
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
              :key="getFileKey(file)"
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
              :key="getFileKey(file)"
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
import { ref, computed, onMounted } from 'vue';
import {
  ElButton,
  ElInput,
  ElIcon,
  ElEmpty,
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
  Search,
} from '@element-plus/icons-vue';
import { extensionService } from '../services/ExtensionService';

interface Vault {
  id: string;
  name: string;
  description?: string;
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
  isCodeFile?: boolean; // 标记是否为代码文件
}

interface Emits {
  (e: 'saved'): void;
  (e: 'close'): void;
}

const emit = defineEmits<Emits>();

const displayName = ref<string>('');
const vaultId = ref<string>('');
const targetId = ref<string>('');
const targetType = ref<'artifact' | 'file' | 'folder' | 'vault'>('artifact');

// 统一的搜索和选择
const searchQuery = ref('');
const selectedFiles = ref<FileItem[]>([]);
const allFiles = ref<FileItem[]>([]);
const loadingFiles = ref(false);
const searchDebounceTimer = ref<number | null>(null);

const saving = ref(false);

// 初始选中的文件（用于判断是否有变化）
const initialSelectedFileKeys = ref<Set<string>>(new Set());

const filteredFiles = computed(() => {
  if (!searchQuery.value.trim()) {
    return allFiles.value;
  }
  const query = searchQuery.value.toLowerCase();
  return allFiles.value.filter(
    (file) =>
      file.name.toLowerCase().includes(query) ||
      file.title?.toLowerCase().includes(query) ||
      file.path.toLowerCase().includes(query)
  );
});

const hasChanges = computed(() => {
  const currentKeys = new Set(selectedFiles.value.map(f => getFileKey(f)));
  if (currentKeys.size !== initialSelectedFileKeys.value.size) {
    return true;
  }
  for (const key of currentKeys) {
    if (!initialSelectedFileKeys.value.has(key)) {
      return true;
    }
  }
  return false;
});

const getFileKey = (file: FileItem): string => {
  // 对于文档，使用id或path；对于代码文件，使用path
  if (file.id) {
    return file.id;
  }
  return file.path;
};

onMounted(async () => {
  // 从 window.initialData 获取初始数据
  if ((window as any).initialData) {
    const initialData = (window as any).initialData;
    vaultId.value = initialData.vaultId || '';
    targetId.value = initialData.targetId || '';
    targetType.value = initialData.targetType || 'artifact';
    displayName.value = initialData.displayName || '';

    // 加载当前的关联关系（内部会先加载文件，然后加载关联关系并设置选中状态）
    await loadCurrentRelations();
  } else {
    // 如果没有初始数据，只加载文件
    await loadFiles();
  }
});

const loadCurrentRelations = async () => {
  try {
    // 先加载所有文件
    await loadFiles();

    // 然后获取当前的关联关系
    const [artifactsResult, codePathsResult] = await Promise.all([
      extensionService.call<string[]>('artifact.getRelatedArtifacts', {
        vaultId: vaultId.value,
        targetId: targetId.value,
        targetType: targetType.value,
      }),
      extensionService.call<string[]>('artifact.getRelatedCodePaths', {
        vaultId: vaultId.value,
        targetId: targetId.value,
        targetType: targetType.value,
      }),
    ]);

    const artifactIds = artifactsResult || [];
    const codePaths = codePathsResult || [];

    // 设置初始选中的文件
    const selected: FileItem[] = [];
    for (const file of allFiles.value) {
      const fileKey = getFileKey(file);
      // 检查是否是关联的文档（通过ID或path匹配）
      if (file.id && artifactIds.includes(file.id)) {
        selected.push(file);
        initialSelectedFileKeys.value.add(fileKey);
      } else if (!file.isCodeFile && artifactIds.includes(file.path)) {
        selected.push(file);
        initialSelectedFileKeys.value.add(fileKey);
      } else if (file.isCodeFile && codePaths.includes(file.path)) {
        selected.push(file);
        initialSelectedFileKeys.value.add(fileKey);
      }
    }
    
    selectedFiles.value = selected;
  } catch (err: any) {
    console.error('Failed to load current relations', err);
    ElMessage.error(`加载当前关联关系失败: ${err.message || '未知错误'}`);
  }
};

const loadFiles = async (query?: string) => {
  try {
    loadingFiles.value = true;
    const allResults: FileItem[] = [];
    
    // 加载所有 vault 的文档
    const vaultsResult = await extensionService.call<Vault[]>('vault.list', {});
    if (vaultsResult && vaultsResult.length > 0) {
      for (const vault of vaultsResult) {
        try {
          const result = await extensionService.call<FileItem[]>('document.list', {
            vaultId: vault.id,
            query: query,
          });
          if (result) {
            // 标记为文档（非代码文件）
            allResults.push(...result.map(f => ({ ...f, isCodeFile: false })));
          }
        } catch (err: any) {
          console.error(`Failed to load files from vault ${vault.name}`, err);
        }
      }
    }
    
    // 加载 workspace 的代码文件
    try {
      const workspaceResult = await extensionService.call<FileItem[]>('workspace.listFiles', {
        query: query,
      });
      if (workspaceResult) {
        // 标记为代码文件
        allResults.push(...workspaceResult.map(f => ({ ...f, isCodeFile: true })));
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

const handleSearchInput = () => {
  if (searchDebounceTimer.value !== null) {
    clearTimeout(searchDebounceTimer.value);
  }
  searchDebounceTimer.value = window.setTimeout(() => {
    const query = searchQuery.value.trim();
    loadFiles(query || undefined);
  }, 300);
};

const isFileSelected = (file: FileItem): boolean => {
  const fileKey = getFileKey(file);
  return selectedFiles.value.some(f => getFileKey(f) === fileKey);
};

const toggleFileSelection = (file: FileItem) => {
  if (isFileSelected(file)) {
    removeFromSelected(file);
  } else {
    selectedFiles.value.push(file);
  }
};

const removeFromSelected = (file: FileItem) => {
  const fileKey = getFileKey(file);
  const index = selectedFiles.value.findIndex(f => getFileKey(f) === fileKey);
  if (index > -1) {
    selectedFiles.value.splice(index, 1);
  }
};

const clearSelected = () => {
  selectedFiles.value = [];
};

const handleSave = async () => {
  try {
    saving.value = true;

    // 分离文档和代码文件
    const artifactIds: string[] = [];
    const codePaths: string[] = [];

    for (const file of selectedFiles.value) {
      if (file.isCodeFile) {
        // 代码文件，使用path
        codePaths.push(file.path);
      } else {
        // 文档，优先使用id，否则使用path
        if (file.id) {
          artifactIds.push(file.id);
        } else {
          artifactIds.push(file.path);
        }
      }
    }

    await Promise.all([
      extensionService.call('artifact.updateRelatedArtifacts', {
        vaultId: vaultId.value,
        targetId: targetId.value,
        targetType: targetType.value,
        relatedArtifacts: artifactIds,
      }),
      extensionService.call('artifact.updateRelatedCodePaths', {
        vaultId: vaultId.value,
        targetId: targetId.value,
        targetType: targetType.value,
        relatedCodePaths: codePaths,
      }),
    ]);

    ElMessage.success('关联关系已保存');
    emit('saved');
    
    // 通知后端关闭 webview
    if (window.acquireVsCodeApi) {
      const vscode = window.acquireVsCodeApi();
      vscode.postMessage({ method: 'close' });
    }
  } catch (err: any) {
    console.error('Failed to save relations', err);
    ElMessage.error(`保存关联关系失败: ${err.message || '未知错误'}`);
  } finally {
    saving.value = false;
  }
};

const handleClose = () => {
  if (window.acquireVsCodeApi) {
    const vscode = window.acquireVsCodeApi();
    vscode.postMessage({ method: 'close' });
  }
  emit('close');
};
</script>

<style scoped>
.edit-relations-form {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 20px;
  box-sizing: border-box;
  background: var(--vscode-editor-background, #1e1e1e);
  color: var(--vscode-editor-foreground, #cccccc);
  overflow: hidden;
}

.header-section {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid var(--vscode-panel-border, #3e3e3e);
  margin-bottom: 20px;
}

.title-section h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--vscode-editor-foreground, #cccccc);
}

.save-button-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.middle-section {
  flex-shrink: 0;
  margin-bottom: 20px;
}

.bottom-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: row;
  gap: 16px;
}

.panels-section {
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


