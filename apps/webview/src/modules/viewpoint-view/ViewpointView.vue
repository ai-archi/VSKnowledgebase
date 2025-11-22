<template>
  <div class="viewpoint-view">
    <div class="header">
      <h2>视点视图</h2>
      <button @click="refresh">刷新</button>
    </div>
    <div class="content">
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else class="viewpoint-list">
        <div
          v-for="viewpoint in viewpoints"
          :key="viewpoint.id"
          class="viewpoint-item"
          @click="expandViewpoint(viewpoint)"
        >
          <div class="viewpoint-header">
            <h3>{{ viewpoint.name }}</h3>
            <span class="count">({{ viewpoint.artifactCount || 0 }})</span>
          </div>
          <p v-if="viewpoint.description" class="description">{{ viewpoint.description }}</p>
          <div v-if="expandedViewpoint === viewpoint.id" class="artifacts">
            <div
              v-for="artifact in viewpointArtifacts[viewpoint.id] || []"
              :key="artifact.id"
              class="artifact-item"
              @click.stop="openArtifact(artifact)"
            >
              {{ artifact.title }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { extensionService } from '../../services/ExtensionService';

interface Viewpoint {
  id: string;
  name: string;
  description?: string;
  isPredefined: boolean;
  artifactCount?: number;
}

interface Artifact {
  id: string;
  title: string;
  path: string;
}

const viewpoints = ref<Viewpoint[]>([]);
const viewpointArtifacts = ref<Record<string, Artifact[]>>({});
const expandedViewpoint = ref<string | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const loadViewpoints = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await extensionService.call<Viewpoint[]>('viewpoint.list', {});
    viewpoints.value = result || [];
  } catch (err: any) {
    error.value = err.message || '加载视点失败';
    console.error('Failed to load viewpoints', err);
  } finally {
    loading.value = false;
  }
};

const expandViewpoint = async (viewpoint: Viewpoint) => {
  if (expandedViewpoint.value === viewpoint.id) {
    expandedViewpoint.value = null;
    return;
  }

  expandedViewpoint.value = viewpoint.id;
  
  if (!viewpointArtifacts.value[viewpoint.id]) {
    try {
      const artifacts = await extensionService.call<Artifact[]>('viewpoint.getArtifacts', {
        viewpointId: viewpoint.id,
      });
      viewpointArtifacts.value[viewpoint.id] = artifacts || [];
    } catch (err: any) {
      console.error('Failed to load viewpoint artifacts', err);
      viewpointArtifacts.value[viewpoint.id] = [];
    }
  }
};

const openArtifact = async (artifact: Artifact) => {
  try {
    await extensionService.call('artifact.open', {
      artifactId: artifact.id,
    });
  } catch (err: any) {
    console.error('Failed to open artifact', err);
  }
};

const refresh = () => {
  loadViewpoints();
};

onMounted(() => {
  loadViewpoints();
});
</script>

<style scoped>
.viewpoint-view {
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

.viewpoint-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.viewpoint-item {
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.viewpoint-item:hover {
  border-color: #007acc;
}

.viewpoint-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.viewpoint-header h3 {
  margin: 0;
  color: #333;
}

.count {
  color: #666;
  font-size: 14px;
}

.description {
  margin: 8px 0 0 0;
  color: #666;
  font-size: 14px;
}

.artifacts {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e0e0e0;
}

.artifact-item {
  padding: 8px;
  margin: 4px 0;
  background: #f5f5f5;
  border-radius: 4px;
  cursor: pointer;
}

.artifact-item:hover {
  background: #e0e0e0;
}
</style>

