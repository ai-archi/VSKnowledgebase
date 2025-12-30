<template>
  <div class="create-folder-form">
    <!-- 头部：操作按钮和创建按钮 -->
    <div class="header-section">
      <!-- 暂时隐藏AI按钮 -->
      <!-- <div class="action-buttons-section">
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
      </div> -->
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
        <el-form-item label="文件夹名称" :required="true">
          <template #label>
            <span>文件夹名称</span>
          </template>
          <el-input
            v-model="formData.folderName"
            placeholder="输入文件夹名称或路径进行搜索（创建时仅支持单个文件夹名称）"
            clearable
            @input="handleFolderNameInput"
            :prefix-icon="Folder"
          />
          <div v-if="validationError" class="error-message">
            {{ validationError }}
          </div>
        </el-form-item>
        <el-form-item label="文件夹模板">
          <el-tree-select
            v-model="formData.templatePath"
            :data="templateTreeData"
            :props="treeProps"
            :placeholder="folderTemplates.length === 0 ? '暂无文件夹模板' : '选择文件夹模板或子文件夹（可选）'"
            filterable
            clearable
            check-strictly
            style="width: 100%"
            :disabled="!formData.vaultId"
            :render-after-expand="false"
            node-key="value"
            :default-checked-keys="[]"
          >
            <template #default="{ node, data }">
              <span class="tree-node-label">
                <el-icon v-if="data.type === 'directory'"><Folder /></el-icon>
                <el-icon v-else><Document /></el-icon>
                <span class="node-name">{{ data.label }}</span>
                <span v-if="data.description" class="node-description">{{ data.description }}</span>
              </span>
            </template>
          </el-tree-select>
          <div v-if="formData.vaultId && folderTemplates.length === 0" class="template-hint">
            <span style="font-size: 12px; color: var(--vscode-descriptionForeground, #999999);">
              所有 Vault 都没有可用的文件夹模板（structure 类型）
            </span>
          </div>
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
  ElTreeSelect,
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
  templatePath: string; // 格式: templateId|subFolderPath，例如: "template-id|domain" 或 "template-id|" (根)
}

interface TemplateTreeNode {
  label: string;
  value: string;
  type: 'directory' | 'file' | 'template';
  description?: string;
  disabled?: boolean; // 是否禁用（文件节点应该禁用）
  children?: TemplateTreeNode[];
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
  templatePath: '',
});

const initialFolderPath = ref<string | undefined>(undefined);
const vaults = ref<Vault[]>([]);
const allTemplates = ref<Template[]>([]);
const commands = ref<Array<{ id: string; name: string; description?: string }>>([]);
const selectedFiles = ref<FileItem[]>([]);
const allFiles = ref<FileItem[]>([]);
const loadingFiles = ref(false);
const creating = ref(false);
const validationError = ref<string | null>(null);
const searchDebounceTimer = ref<number | null>(null);

const folderTemplates = computed(() => {
  return allTemplates.value.filter(t => t.type === 'structure');
});

// 树形选择器配置
const treeProps = {
  children: 'children',
  label: 'label',
  value: 'value',
  disabled: 'disabled', // 支持禁用节点
};

// 模板树形数据
const templateTreeData = ref<TemplateTreeNode[]>([]);
const templateStructures = ref<Record<string, any>>({});

// 监听模板列表变化，构建树形数据
watch(
  () => [folderTemplates.value, formData.value.vaultId],
  async (newVal, oldVal) => {
    // 只有在模板列表或vaultId真正变化时才重新构建
    if (folderTemplates.value.length > 0) {
      await buildTemplateTree();
    } else {
      templateTreeData.value = [];
      templateStructures.value = {};
    }
  },
  { immediate: false }
);

// 监听选中的模板路径变化，解析templateId和subFolderPath
watch(
  () => formData.value.templatePath,
  (newPath) => {
    if (newPath) {
      const [templateId, subFolderPath] = newPath.split('|');
      formData.value.templateId = templateId || '';
    } else {
      formData.value.templateId = '';
    }
  }
);

// 构建模板树形数据
const buildTemplateTree = async () => {
  const treeData: TemplateTreeNode[] = [];
  
  for (const template of folderTemplates.value) {
    try {
      // 获取模板结构
      let structure = templateStructures.value[template.id];
      if (!structure) {
        // 从模板ID中提取vault信息
        // 模板ID格式可能是: "vault名称/archi-templates/structure/template.yml"
        let templateVaultId: string | undefined = undefined;
        if (template.id.includes('/')) {
          const parts = template.id.split('/');
          // 检查第一部分是否是vault名称（不是"archi-templates"）
          if (!template.id.startsWith('archi-templates/') && parts.length > 1) {
            const vaultName = parts[0];
            // 从vault列表中查找对应的vault
            const foundVault = vaults.value.find(v => v.name === vaultName);
            if (foundVault) {
              templateVaultId = foundVault.id;
            }
          }
        }
        
        // 如果没有找到vault，使用目标vault（向后兼容）
        if (!templateVaultId) {
          templateVaultId = formData.value.vaultId || undefined;
        }
        
        // 从后端获取模板结构
        const structureResult = await extensionService.call<any>('template.getContent', {
          templateId: template.id,
          vaultId: templateVaultId,
        });
        structure = structureResult;
        templateStructures.value[template.id] = structure;
        
        // 调试日志
        console.log(`[CreateFolderForm] Template structure for ${template.id}:`, {
          structure,
          isArray: Array.isArray(structure),
          type: typeof structure,
          hasStructure: structure && typeof structure === 'object' && 'structure' in structure
        });
      }
      
      // 处理结构数据：可能是数组，也可能是包含 structure 字段的对象
      let structureArray: any[] = [];
      if (Array.isArray(structure)) {
        structureArray = structure;
      } else if (structure && typeof structure === 'object' && structure.structure) {
        // 如果返回的是对象，尝试获取 structure 字段
        structureArray = Array.isArray(structure.structure) ? structure.structure : [];
      } else if (!structure || structure === '') {
        // 如果结构为空，创建一个简单的模板节点
        treeData.push({
          label: template.name,
          value: `${template.id}|`,
          type: 'template',
          description: template.description,
        });
        continue;
      }
      
      if (structureArray.length === 0) {
        // 如果结构数组为空，创建一个简单的模板节点
        console.warn(`[CreateFolderForm] Template ${template.id} has empty structure`);
        treeData.push({
          label: template.name,
          value: `${template.id}|`,
          type: 'template',
          description: template.description,
        });
        continue;
      }
      
      // 构建树形结构
      const buildTreeNodes = (items: any[], parentPath: string = ''): TemplateTreeNode[] => {
        const nodes: TemplateTreeNode[] = [];
        
        if (!items || !Array.isArray(items)) {
          console.warn('[CreateFolderForm] buildTreeNodes: items is not an array', items);
          return nodes;
        }
        
        for (const item of items) {
          if (!item || typeof item !== 'object') {
            console.warn('[CreateFolderForm] buildTreeNodes: invalid item', item);
            continue;
          }
          
          // 确保 type 字段存在且是字符串
          const itemType = item.type;
          if (!itemType) {
            console.warn('[CreateFolderForm] buildTreeNodes: item missing type field', item);
            continue;
          }
          
          if (itemType === 'directory') {
            // 目录节点：可选择
            const currentPath = parentPath ? `${parentPath}/${item.name}` : item.name;
            const nodeValue = `${template.id}|${currentPath}`;
            
            const node: TemplateTreeNode = {
              label: item.name || '未命名目录',
              value: nodeValue,
              type: 'directory',
              description: item.description,
              disabled: false, // 目录可以选择
            };
            
            // 递归处理子节点（包括文件和目录）
            if (item.children && Array.isArray(item.children) && item.children.length > 0) {
              node.children = buildTreeNodes(item.children, currentPath);
            }
            
            nodes.push(node);
          } else if (itemType === 'file') {
            // 文件节点：显示但不可选择（禁用）
            const fileNode: TemplateTreeNode = {
              label: item.name || '未命名文件',
              value: `__file__${item.name || ''}`, // 使用特殊前缀标识文件节点，但会被禁用
              type: 'file',
              description: item.description,
              disabled: true, // 文件节点禁用，不可选择
            };
            nodes.push(fileNode);
          } else {
            console.warn('[CreateFolderForm] buildTreeNodes: unknown item type', itemType, item);
          }
        }
        
        return nodes;
      };
      
      // 创建模板根节点
      const children = buildTreeNodes(structureArray);
      console.log(`[CreateFolderForm] Built tree for template ${template.id}:`, {
        templateName: template.name,
        structureArrayLength: structureArray.length,
        childrenCount: children.length,
        children: children
      });
      
      const templateNode: TemplateTreeNode = {
        label: template.name,
        value: `${template.id}|`,
        type: 'template',
        description: template.description,
        children: children,
      };
      
      treeData.push(templateNode);
    } catch (err: any) {
      console.error(`Failed to load structure for template ${template.id}:`, err);
      // 如果加载失败，至少显示模板名称
      treeData.push({
        label: template.name,
        value: `${template.id}|`,
        type: 'template',
        description: template.description,
      });
    }
  }
  
  templateTreeData.value = treeData;
};

const selectedVault = computed(() => {
  return vaults.value.find(v => v.id === formData.value.vaultId);
});

// 文件过滤现在由后端 API 实时处理，这里直接返回结果
const filteredFiles = computed(() => {
    return allFiles.value;
});

const canCreate = computed(() => {
  // 基本条件检查：非空且有 vaultId
  // 验证错误在创建时检查，不在输入时检查（允许输入路径进行搜索）
  return (
    formData.value.folderName.trim() !== '' &&
    formData.value.vaultId !== ''
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
        extensionService.postEvent('close');
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
        extensionService.postEvent('close');
    }, 2000);
    return;
  }
  loadVaults();
  loadCommands();
  // 加载所有模板（不传 vaultId，从所有 vault 加载）
  loadTemplates(undefined);
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

const loadTemplates = async (vaultId?: string) => {
  try {
    const templates = await extensionService.call<any[]>('template.list', vaultId ? { vaultId } : {});
    allTemplates.value = templates || [];
    // 模板加载完成后，构建树形数据
    if (folderTemplates.value.length > 0) {
      await buildTemplateTree();
    }
  } catch (err: any) {
    console.error('Failed to load templates', err);
    ElMessage.error('加载模板失败: ' + (err.message || '未知错误'));
    allTemplates.value = [];
    templateTreeData.value = [];
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
          console.log('[CreateFolderForm] Calling document.list for vault:', vault.id, 'query:', query);
          const result = await extensionService.call<FileItem[]>('document.list', {
            vaultId: vault.id,
            query: query,
          });
          console.log('[CreateFolderForm] document.list result:', result?.length || 0, 'items');
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

const handleFolderNameInput = () => {
  // 清除之前的验证错误（允许输入路径进行过滤）
  validationError.value = null;
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
    const query = formData.value.folderName.trim();
    if (query) {
      // 使用 VSCode API 实时过滤，传入查询条件
      loadFiles(query);
    } else {
      // 如果没有查询条件，加载所有文件
      loadFiles();
    }
  }, 300);
};

const validateFileName = (value: string): string | null => {
  if (!value || value.trim().length === 0) {
    return '文件夹名称不能为空';
  }
  // 文件夹名称不能包含路径分隔符和其他非法字符
  // 注意：允许在搜索时输入路径，但创建时文件夹名称必须是单个名称
  if (/[<>:"/\\|?*]/.test(value.trim())) {
    return '文件夹名称包含非法字符（不能包含路径分隔符 / 或 \\）';
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

    // 解析模板路径：templateId|subFolderPath
    let templateId: string | undefined = undefined;
    let subFolderPath: string | undefined = undefined;
    
    if (formData.value.templatePath) {
      // 检查是否是文件节点（不应该发生，因为文件节点被禁用）
      if (formData.value.templatePath.startsWith('__file__')) {
        ElMessage.warning('不能选择文件节点，请选择文件夹节点');
        return;
      }
      
      const [id, path] = formData.value.templatePath.split('|');
      templateId = id || undefined;
      // 如果path为空字符串或undefined，表示选择根模板，subFolderPath应该是undefined
      subFolderPath = path && path.trim() !== '' ? path : undefined;
    } else if (formData.value.templateId) {
      // 兼容旧格式
      templateId = formData.value.templateId;
    }
    
    // 传递模板 ID 和子文件夹路径
    const result = await extensionService.call('document.createFolder', {
      vaultId: formData.value.vaultId,
      folderPath: folderPath,
      folderName: formData.value.folderName.trim(),
      templateId: templateId,
      subFolderPath: subFolderPath, // 新增：子文件夹路径
      relatedArtifacts: relatedArtifacts.length > 0 ? relatedArtifacts : undefined,
      relatedCodePaths: relatedCodePaths.length > 0 ? relatedCodePaths : undefined,
    });

    ElMessage.success('文件夹创建成功');
    emit('created', result);
    
    // 通知后端刷新和展开
      const vault = vaults.value.find(v => v.id === formData.value.vaultId);
      // 使用创建结果中的路径，这是相对于 artifacts 目录的路径
      const createdFolderPath = result?.folderPath || result?.path || '';
      const parentFolderPath = initialFolderPath.value || '';
    extensionService.postEvent('folderCreated', {
          vaultName: vault?.name,
          folderPath: createdFolderPath,
          parentFolderPath: parentFolderPath,
      });
    
    // 延迟关闭，确保刷新完成
    setTimeout(() => {
      extensionService.postEvent('close');
    }, 100);
  } catch (err: any) {
    console.error('Failed to create folder', err);
    ElMessage.error(`创建文件夹失败: ${err.message || '未知错误'}`);
  } finally {
    creating.value = false;
  }
};

const loadCommands = async () => {
  try {
    // 不传递 vaultId，加载所有 vault 的命令
    const commandsList = await extensionService.call<any[]>('aiCommand.list', { targetType: 'folder' });
    commands.value = commandsList || [];
    console.log('[CreateFolderForm] Commands loaded:', commands.value.length, commands.value);
  } catch (err: any) {
    console.error('Failed to load commands', err);
    commands.value = [];
  }
};

const executeCommand = async (commandId: string) => {
  if (!canCreate.value) {
    ElMessage.warning('请先输入文件夹名称并选择 Vault');
    return;
  }

  if (!formData.value.vaultId) {
    ElMessage.warning('请先选择 Vault');
    return;
  }

  try {
    // 构建执行上下文（确保所有数据都是可序列化的）
    const context = {
      vaultId: formData.value.vaultId,
      vaultName: vaults.value.find(v => v.id === formData.value.vaultId)?.name || '',
      fileName: formData.value.folderName.trim(),
      folderPath: initialFolderPath.value || undefined,
      selectedFiles: selectedFiles.value.map(f => ({
        id: f.id || undefined,
        path: f.path || '',
        name: f.name || '',
        title: f.title || undefined,
        vault: f.vault ? {
          id: f.vault.id || '',
          name: f.vault.name || '',
        } : undefined,
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
  color: var(--vscode-foreground, #cccccc);
}

.vault-description,
.template-description {
  font-size: 12px;
  color: var(--vscode-descriptionForeground, #999999);
}

.tree-node-label {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.node-name {
  font-weight: 500;
  color: var(--vscode-foreground, #cccccc);
}

.node-description {
  font-size: 12px;
  color: var(--vscode-descriptionForeground, #999999);
  margin-left: 8px;
}

.template-hint {
  margin-top: 4px;
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
