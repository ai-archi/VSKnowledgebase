<template>
  <div class="document-view">
    <div class="header">
      <h2>文档视图</h2>
      <div class="header-actions">
        <el-button type="primary" :icon="Plus" @click="showCreateDialog">创建文件</el-button>
        <el-button :icon="Refresh" @click="refresh">刷新</el-button>
      </div>
    </div>
    <div class="content">
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else class="document-list">
        <div
          v-for="document in documents"
          :key="document.id"
          class="document-item"
          @click="openDocument(document)"
        >
          <h3>{{ document.title }}</h3>
          <p class="path">{{ document.path }}</p>
          <div class="tags" v-if="document.tags && document.tags.length > 0">
            <span v-for="tag in document.tags" :key="tag" class="tag">{{ tag }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElButton } from 'element-plus';
import { Plus, Refresh } from '@element-plus/icons-vue';
import { extensionService } from '../../services/ExtensionService';

interface Document {
  id: string;
  title: string;
  path: string;
  description?: string;
  tags?: string[];
  vault: {
    id: string;
    name: string;
  };
}

const documents = ref<Document[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const loadDocuments = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await extensionService.call<Document[]>('document.list', {});
    documents.value = result || [];
  } catch (err: any) {
    error.value = err.message || '加载文档失败';
    console.error('Failed to load documents', err);
  } finally {
    loading.value = false;
  }
};

const refresh = () => {
  loadDocuments();
};

const openDocument = async (document: Document) => {
  try {
    await extensionService.call('document.open', {
      vaultId: document.vault.id,
      path: document.path,
    });
  } catch (err: any) {
    console.error('Failed to open document', err);
  }
};

const showCreateDialog = async () => {
  // 通过后端命令打开创建文件对话框
  try {
    await extensionService.call('document.addFile', {});
    // 刷新文档列表
    loadDocuments();
  } catch (err: any) {
    console.error('Failed to open create file dialog', err);
  }
};

onMounted(() => {
  loadDocuments();
});
</script>

<style scoped>
.document-view {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h2 {
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.loading,
.error {
  text-align: center;
  padding: 40px;
  color: #666;
}

.error {
  color: #d32f2f;
}

.document-list {
  display: grid;
  gap: 16px;
}

.document-item {
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.document-item:hover {
  border-color: #007acc;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.document-item h3 {
  margin: 0 0 8px 0;
  color: #333;
}

.document-item .path {
  margin: 4px 0;
  color: #666;
  font-size: 12px;
}

.tags {
  margin-top: 8px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag {
  padding: 2px 8px;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 12px;
  font-size: 12px;
}
</style>

