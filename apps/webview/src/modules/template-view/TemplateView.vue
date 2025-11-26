<template>
  <div class="template-view">
    <div class="header">
      <h2>模板视图</h2>
      <button @click="refresh">刷新</button>
    </div>
    <div class="content">
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else class="templates">
        <div
          v-for="template in templates"
          :key="template.id"
          class="template-item"
          @click="createFromTemplate(template)"
        >
          <div class="template-icon">
            {{ template.type === 'structure' ? '📁' : '📄' }}
          </div>
          <div class="template-info">
            <h4>{{ template.name }}</h4>
            <p v-if="template.description" class="description">{{ template.description }}</p>
            <span class="type">{{ template.type === 'structure' ? '结构模板' : '内容模板' }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { extensionService } from '../../services/ExtensionService';

interface Template {
  id: string;
  name: string;
  description?: string;
  type: 'structure' | 'content';
}

const templates = ref<Template[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const loadTemplates = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await extensionService.call<Template[]>('template.list', {});
    templates.value = result || [];
  } catch (err: any) {
    error.value = err.message || '加载模板失败';
    console.error('Failed to load templates', err);
  } finally {
    loading.value = false;
  }
};

const createFromTemplate = async (template: Template) => {
  try {
    const title = prompt('输入新文档标题');
    if (!title) return;

    await extensionService.call('template.createFromTemplate', {
      templateId: template.id,
      title,
    });
    
    alert('文档创建成功！');
  } catch (err: any) {
    console.error('Failed to create from template', err);
    alert(`创建失败: ${err.message}`);
  }
};

const refresh = () => {
  loadTemplates();
};

onMounted(() => {
  loadTemplates();
});
</script>

<style scoped>
.template-view {
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

.header button {
  padding: 8px 16px;
  background: #007acc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.loading,
.error {
  text-align: center;
  padding: 40px;
  color: #666;
}

.templates {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.template-item {
  display: flex;
  gap: 12px;
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.template-item:hover {
  border-color: #007acc;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.template-icon {
  font-size: 24px;
}

.template-info {
  flex: 1;
}

.template-info h4 {
  margin: 0 0 4px 0;
  color: #333;
}

.template-info .description {
  margin: 4px 0;
  color: #666;
  font-size: 12px;
}

.template-info .type {
  display: inline-block;
  margin-top: 8px;
  padding: 2px 8px;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 12px;
  font-size: 11px;
}
</style>

