<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="800px"
    @close="handleClose"
  >
    <div class="file-folder-picker">
      <!-- 搜索框 -->
      <div class="search-container">
        <el-input
          v-model="searchQuery"
          placeholder="输入关键词搜索文件或文件夹（回车立即搜索）"
          clearable
          @keyup.enter="handleSearchEnter"
          @input="handleSearchInput"
          :prefix-icon="Search"
        />
      </div>

      <!-- 文件列表 -->
      <div class="file-list-container">
        <div v-if="loading" class="loading-state">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>加载中...</span>
        </div>
        <el-empty
          v-else-if="filteredItems.length === 0"
          description="没有找到匹配的结果"
          :image-size="80"
        />
        <div v-else class="file-list">
          <div
            v-for="item in filteredItems"
            :key="item.id || item.path"
            class="file-item"
            :class="{ 'is-selected': isItemSelected(item) }"
            @click="toggleItem(item)"
          >
            <el-icon class="file-icon">
              <Folder v-if="item.type === 'folder'" />
              <Document v-else-if="item.type === 'document'" />
              <Picture v-else-if="item.type === 'design'" />
              <Document v-else />
            </el-icon>
            <div class="file-info">
              <div class="file-path">
                <span v-if="item.vault" class="vault-name">{{ item.vault.name }}(vault): </span>{{ item.path }}
              </div>
            </div>
            <el-icon v-if="isItemSelected(item)" class="check-icon"><Check /></el-icon>
          </div>
        </div>
      </div>

      <!-- 已选择项 -->
      <div v-if="selectedItems.length > 0" class="selected-section">
        <div class="selected-header">
          <span>已选择 ({{ selectedItems.length }})</span>
          <el-button
            type="danger"
            size="small"
            link
            @click="clearSelected"
          >
            清空
          </el-button>
        </div>
        <div class="selected-items">
          <el-tag
            v-for="item in selectedItems"
            :key="item.id || item.path"
            closable
            @close="removeItem(item)"
            style="margin-right: 8px; margin-bottom: 8px"
          >
            <el-icon style="margin-right: 4px">
              <Folder v-if="item.type === 'folder'" />
              <Document v-else />
            </el-icon>
            {{ item.path }}
          </el-tag>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleConfirm">确定</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ElDialog, ElInput, ElButton, ElIcon, ElEmpty, ElTag } from 'element-plus';
import { Search, Loading, Folder, Document, Picture, Check } from '@element-plus/icons-vue';
import { extensionService } from '@/services/ExtensionService';

interface FileItem {
  id?: string;
  path: string;
  name: string;
  type?: 'document' | 'design' | 'folder' | 'file';
  vault?: {
    id: string;
    name: string;
  };
}

interface Vault {
  id: string;
  name: string;
  description?: string;
}

interface Props {
  modelValue: boolean;
  allowFile?: boolean;
  allowFolder?: boolean;
  multiple?: boolean;
  title?: string;
}

const props = withDefaults(defineProps<Props>(), {
  allowFile: true,
  allowFolder: true,
  multiple: true,
  title: '',
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'confirm': [items: FileItem[]];
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const dialogTitle = computed(() => {
  if (props.title) return props.title;
  if (props.allowFile && props.allowFolder) {
    return '选择文件或文件夹';
  } else if (props.allowFile) {
    return '选择文件';
  } else if (props.allowFolder) {
    return '选择文件夹';
  }
  return '选择';
});

const searchQuery = ref('');
const allItems = ref<FileItem[]>([]);
const selectedItems = ref<FileItem[]>([]);
const loading = ref(false);
const searchDebounceTimer = ref<number | null>(null);
const vaults = ref<Vault[]>([]);

const filteredItems = computed(() => {
  let items = allItems.value;
  
  // 根据允许的类型过滤
  // 如果只允许文件，过滤掉文件夹
  if (props.allowFile && !props.allowFolder) {
    items = items.filter(item => item.type !== 'folder');
  }
  // 如果只允许文件夹，只保留文件夹
  else if (props.allowFolder && !props.allowFile) {
    items = items.filter(item => item.type === 'folder');
  }
  // 如果两者都允许或都不允许（默认情况），不过滤
  
  // 根据搜索关键词过滤
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    items = items.filter(
      item =>
        item.name.toLowerCase().includes(query) ||
        item.path.toLowerCase().includes(query)
    );
  }
  
  return items;
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

const loadFiles = async (query?: string) => {
  try {
    loading.value = true;
    const allResults: FileItem[] = [];

    // 加载所有 vault 的文件
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

    allItems.value = allResults;
  } catch (err: any) {
    console.error('Failed to load files', err);
    allItems.value = [];
  } finally {
    loading.value = false;
  }
};

const handleSearchInput = () => {
  // 防抖搜索
  if (searchDebounceTimer.value !== null) {
    clearTimeout(searchDebounceTimer.value);
  }
  searchDebounceTimer.value = window.setTimeout(() => {
    const query = searchQuery.value.trim();
    loadFiles(query || undefined);
  }, 800);
};

const handleSearchEnter = () => {
  // 回车键立即触发搜索
  if (searchDebounceTimer.value !== null) {
    clearTimeout(searchDebounceTimer.value);
    searchDebounceTimer.value = null;
  }
  const query = searchQuery.value.trim();
  loadFiles(query || undefined);
};

const isItemSelected = (item: FileItem): boolean => {
  const itemKey = item.id || item.path;
  return selectedItems.value.some(i => (i.id || i.path) === itemKey);
};

const toggleItem = (item: FileItem) => {
  if (isItemSelected(item)) {
    removeItem(item);
  } else {
    if (props.multiple) {
      selectedItems.value.push(item);
    } else {
      selectedItems.value = [item];
    }
  }
};

const removeItem = (item: FileItem) => {
  const itemKey = item.id || item.path;
  selectedItems.value = selectedItems.value.filter(i => (i.id || i.path) !== itemKey);
};

const clearSelected = () => {
  selectedItems.value = [];
};

const handleConfirm = () => {
  emit('confirm', [...selectedItems.value]);
  visible.value = false;
};

const handleClose = () => {
  visible.value = false;
  // 清空选择（可选，根据需求决定是否保留）
  // selectedItems.value = [];
};

// 当弹窗打开时加载数据
watch(visible, (newVal) => {
  if (newVal) {
    loadVaults().then(() => {
      loadFiles();
    });
    selectedItems.value = [];
    searchQuery.value = '';
  }
});
</script>

<style scoped>
.file-folder-picker {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-container {
  width: 100%;
}

.file-list-container {
  min-height: 300px;
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid var(--vscode-panel-border, #3e3e3e);
  border-radius: 4px;
  padding: 8px;
  background: var(--vscode-editor-background, #1e1e1e);
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px;
  color: var(--vscode-descriptionForeground, #999999);
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border: 1px solid var(--vscode-panel-border, #3e3e3e);
  border-radius: 4px;
  cursor: pointer;
  background: var(--vscode-panel-background, #1e1e1e);
  transition: all 0.2s;
}

.file-item:hover {
  background: var(--vscode-list-hoverBackground, #2a2d2e);
  border-color: var(--vscode-panelTitle-activeBorder, #4ec9b0);
}

.file-item.is-selected {
  background: var(--vscode-list-activeSelectionBackground, #094771);
  border-color: var(--vscode-panelTitle-activeBorder, #4ec9b0);
}

.file-icon {
  font-size: 16px;
  color: var(--vscode-foreground, #cccccc);
  flex-shrink: 0;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-path {
  font-size: 13px;
  color: var(--vscode-foreground, #cccccc);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vault-name {
  color: var(--vscode-descriptionForeground, #999999);
  font-size: 12px;
}

.check-icon {
  font-size: 16px;
  color: var(--vscode-panelTitle-activeBorder, #4ec9b0);
  flex-shrink: 0;
}

.selected-section {
  padding: 12px;
  background: var(--vscode-textCodeBlock-background, #2d2d2d);
  border-radius: 4px;
}

.selected-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--vscode-foreground, #cccccc);
}

.selected-items {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>

