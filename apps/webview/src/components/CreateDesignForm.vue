<template>
  <div class="create-design-form">
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
          创建设计图
        </el-button>
      </div>
    </div>

    <!-- 中间：输入和选择区域 -->
    <div class="middle-section">
      <el-form :model="formData" label-width="100px" label-position="left">
        <el-form-item label="设计图名称">
          <el-input
            v-model="formData.diagramName"
            placeholder="输入设计图名称（支持模糊搜索）"
            clearable
            @input="handleDiagramNameInput"
            :prefix-icon="Document"
          />
        </el-form-item>
        <el-form-item v-if="formData.diagramType === 'archimate'" label="视图类型">
          <el-select
            v-model="formData.archimateViewType"
            placeholder="选择 Archimate 视图类型"
            style="width: 100%"
          >
            <el-option-group label="业务层">
              <el-option label="业务流程图" value="business-process-view" />
              <el-option label="业务功能视图" value="business-function-view" />
              <el-option label="业务服务视图" value="business-service-view" />
              <el-option label="业务协作视图" value="business-collaboration-view" />
              <el-option label="业务交互视图" value="business-interaction-view" />
            </el-option-group>
            <el-option-group label="应用层">
              <el-option label="应用组件视图" value="application-component-view" />
              <el-option label="应用协作视图" value="application-collaboration-view" />
              <el-option label="应用序列视图" value="application-sequence-view" />
              <el-option label="应用服务视图" value="application-service-view" />
              <el-option label="应用功能视图" value="application-function-view" />
            </el-option-group>
            <el-option-group label="技术层">
              <el-option label="技术组件视图" value="technology-component-view" />
              <el-option label="技术节点视图" value="technology-node-view" />
              <el-option label="技术部署视图" value="technology-deployment-view" />
              <el-option label="技术服务视图" value="technology-service-view" />
            </el-option-group>
            <el-option-group label="其他">
              <el-option label="跨层视图" value="cross-layered-view" />
              <el-option label="默认模板" value="" />
            </el-option-group>
          </el-select>
        </el-form-item>
      </el-form>
    </div>

    <!-- 下方：已选择和检索结果（上下结构） -->
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
  ElForm,
  ElFormItem,
  ElRow,
  ElCol,
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
}

interface FormData {
  diagramName: string;
  diagramType: string;
  archimateViewType?: string; // Archimate 视图类型
}

interface Emits {
  (e: 'created', artifact: any): void;
  (e: 'close'): void;
}

const emit = defineEmits<Emits>();

const formData = ref<FormData>({
  diagramName: '',
  diagramType: '', // 将从 initialData 中读取
  archimateViewType: '', // Archimate 视图类型
});
const initialVaultId = ref<string | undefined>(undefined);
const initialFolderPath = ref<string | undefined>(undefined);
const selectedFiles = ref<FileItem[]>([]);
const allFiles = ref<FileItem[]>([]);
const loadingFiles = ref(false);
const creating = ref(false);
const searchDebounceTimer = ref<number | null>(null);

const filteredFiles = computed(() => {
  if (!formData.value.diagramName.trim()) {
    return allFiles.value;
  }
  const query = formData.value.diagramName.toLowerCase();
  return allFiles.value.filter(
    (file) =>
      file.name.toLowerCase().includes(query) ||
      file.title?.toLowerCase().includes(query) ||
      file.path.toLowerCase().includes(query)
  );
});

const canCreate = computed(() => {
  return (
    formData.value.diagramName.trim() !== '' &&
    formData.value.diagramType !== '' &&
    initialVaultId.value !== undefined
  );
});

// 监听表单变化，自动搜索
watch(
  () => [formData.value.diagramName],
  () => {
    // 当设计图名称变化时，自动触发搜索
    if (formData.value.diagramName.trim()) {
      triggerAutoSearch();
    }
  },
  { deep: true }
);

onMounted(() => {
  // 从 window.initialData 获取初始数据
  if ((window as any).initialData) {
    const initialData = (window as any).initialData;
    // vaultId 必须从 initialData 获取，不能为空
    if (initialData.vaultId) {
      initialVaultId.value = initialData.vaultId;
    } else {
      console.error('[CreateDesignForm] vaultId is required but not provided in initialData');
      ElMessage.error('无法确定目标 Vault，请从文档树中选择一个节点');
    }
    // 只有当 folderPath 是有效的非空字符串时才设置
    if (initialData.folderPath && typeof initialData.folderPath === 'string' && initialData.folderPath.trim() !== '') {
      initialFolderPath.value = initialData.folderPath;
    } else {
      initialFolderPath.value = undefined;
    }
    // 从 initialData 读取设计图类型
    if (initialData.designType) {
      formData.value.diagramType = initialData.designType;
    } else {
      console.error('[CreateDesignForm] designType is required but not provided in initialData');
      ElMessage.error('无法确定设计图类型');
    }
    console.log('[CreateDesignForm] Initial data loaded', {
      vaultId: initialData.vaultId,
      folderPath: initialData.folderPath,
      initialFolderPath: initialFolderPath.value,
      designType: initialData.designType
    });
  }
  // 如果有初始 vaultId，加载文件
  if (initialVaultId.value) {
    loadFiles();
  }
});

// 移除 loadVaults 和 handleVaultChange，不再需要用户选择 vault

const loadFiles = async (query?: string) => {
  try {
    loadingFiles.value = true;
    const allResults: FileItem[] = [];
    
    // 只加载当前 vault 的文件（使用 document.list，支持查询）
    if (initialVaultId.value) {
      try {
        const result = await extensionService.call<FileItem[]>('document.list', {
          vaultId: initialVaultId.value,
          query: query,
        });
        if (result) {
          allResults.push(...result);
        }
      } catch (err: any) {
        console.error(`Failed to load files from vault`, err);
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

const handleDiagramNameInput = () => {
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
    const query = formData.value.diagramName.trim();
    if (query) {
      // 使用 VSCode API 实时过滤，传入查询条件
      loadFiles(query);
    } else {
      // 如果没有查询条件，加载所有文件
      loadFiles();
    }
  }, 300);
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

  try {
    creating.value = true;
    // 根据设计图类型确定扩展名
    const getExtension = (diagramType: string): string => {
      switch (diagramType) {
        case 'mermaid':
          return 'mmd';
        case 'puml':
          return 'puml';
        case 'archimate':
          return 'archimate';
        default:
          return 'mmd';
      }
    };
    
    const extension = getExtension(formData.value.diagramType);
    const diagramName = formData.value.diagramName.trim();
    
    // 构建文件路径：如果有初始文件夹路径，在文件夹下创建；否则在根目录创建
    let diagramPath: string;
    // 确保 initialFolderPath 是有效的非空字符串
    const folderPath = initialFolderPath.value && typeof initialFolderPath.value === 'string' && initialFolderPath.value.trim() !== ''
      ? initialFolderPath.value.trim()
      : undefined;
    
    if (folderPath) {
      // 在文件夹下创建：文件夹路径/文件名.扩展名
      diagramPath = `${folderPath}/${diagramName}.${extension}`;
    } else {
      // 在 vault 根目录创建：文件名.扩展名
      diagramPath = `${diagramName}.${extension}`;
    }
    
    console.log('[CreateDesignForm] Path building', {
      initialFolderPath: initialFolderPath.value,
      folderPath,
      diagramName,
      extension,
      finalPath: diagramPath
    });
    
    // 不需要在这里获取内容，后端会根据模板自动处理
    
    console.log('[CreateDesignForm] Calling artifact.create', {
      vaultId: initialVaultId.value,
      path: diagramPath,
      title: diagramName,
      viewType: 'design',
      format: extension,
      contentLength: content.length
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

    const result = await extensionService.call('artifact.create', {
      vaultId: initialVaultId.value,
      path: diagramPath,
      title: diagramName,
      viewType: 'design',
      format: extension,
      templateViewType: formData.value.diagramType === 'archimate' ? formData.value.archimateViewType : undefined,
      relatedArtifacts: relatedArtifacts.length > 0 ? relatedArtifacts : undefined,
      relatedCodePaths: relatedCodePaths.length > 0 ? relatedCodePaths : undefined,
    });

    console.log('[CreateDesignForm] Design diagram created successfully', result);
    ElMessage.success('设计图创建成功');
    emit('created', result);
    
    // 通知后端刷新和展开
    if (window.acquireVsCodeApi) {
      const vscode = window.acquireVsCodeApi();
      // 获取 vault 名称用于刷新
      const vaultsResult = await extensionService.call<Vault[]>('vault.list', {});
      const vault = vaultsResult?.find(v => v.id === initialVaultId.value);
      const targetFolderPath = folderPath;
      vscode.postMessage({ 
        method: 'designCreated',
        params: {
          vaultName: vault?.name,
          folderPath: targetFolderPath,
          filePath: diagramPath,
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
    console.error('[CreateDesignForm] Failed to create design diagram', {
      error: err,
      message: err.message,
      stack: err.stack,
      vaultId: initialVaultId.value,
      diagramName: formData.value.diagramName
    });
    ElMessage.error(`创建设计图失败: ${err.message || '未知错误'}`);
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
.create-design-form {
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

.vault-option {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.vault-name {
  font-weight: 500;
  color: var(--vscode-foreground, #cccccc);
}

.vault-description {
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
  flex: 0 0 300px; /* 已选择面板固定高度，增加高度 */
  min-height: 300px;
}

.search-panel {
  flex: 0 1 auto; /* 检索结果面板占据剩余空间，但允许缩小 */
  min-height: 0;
  max-height: calc(100vh - 500px); /* 限制最大高度 */
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

