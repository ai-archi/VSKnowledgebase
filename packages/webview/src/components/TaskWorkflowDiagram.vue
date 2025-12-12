<template>
  <div class="workflow-diagram" ref="containerRef">
    <div v-if="!initialized" class="loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>初始化流程图...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { Loading } from '@element-plus/icons-vue';
import type { Task } from '../types';

interface Props {
  task: Task;
  workflowData?: any;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'step-click': [stepType: string, stepData: any];
  'step-update': [stepType: string, data: any];
}>();

const containerRef = ref<HTMLElement | null>(null);
const initialized = ref(false);
let jointGraph: any = null;
let jointPaper: any = null;

const workflowSteps = [
  { key: 'draft-proposal', label: '起草提案', x: 100, y: 50 },
  { key: 'review-alignment', label: '审查对齐', x: 100, y: 150 },
  { key: 'implementation', label: '实现任务', x: 100, y: 250 },
  { key: 'archive-update', label: '归档更新', x: 100, y: 350 },
];

async function initJointJS() {
  if (!containerRef.value) return;

  try {
    // 动态导入 JointJS
    const joint = await import('jointjs');

    // 创建图形
    jointGraph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });

    // 创建画布
    jointPaper = new joint.dia.Paper({
      el: containerRef.value,
      model: jointGraph,
      width: 300,
      height: 500,
      gridSize: 10,
      drawGrid: true,
      background: {
        color: 'var(--vscode-panel-background, #1e1e1e)',
      },
      cellViewNamespace: joint.shapes,
    });

    // 创建流程节点
    await createWorkflowNodes();

    // 绑定节点点击事件
    jointPaper.on('element:pointerclick', (elementView: any) => {
      const stepKey = elementView.model.get('stepKey');
      if (stepKey) {
        const stepData = props.workflowData[stepKey] || {};
        emit('step-click', stepKey, stepData);
      }
    });

    initialized.value = true;
  } catch (error) {
    console.error('Failed to initialize JointJS:', error);
    // 如果 JointJS 未安装，显示降级界面
    showFallbackUI();
  }
}

async function createWorkflowNodes() {
  if (!jointGraph) return;

  const joint = await import('jointjs');
  const currentStep = props.task.workflowStep || 'draft-proposal';
  const stepIndex = workflowSteps.findIndex(s => s.key === currentStep);

  workflowSteps.forEach((step, index) => {
    const status = getStepStatus(index, stepIndex);
    const color = getStatusColor(status);

    const node = new joint.shapes.standard.Rectangle({
      position: { x: step.x, y: step.y },
      size: { width: 120, height: 40 },
      attrs: {
        body: {
          fill: color,
          stroke: '#4ec9b0',
          strokeWidth: 2,
        },
        label: {
          text: step.label,
          fill: '#ffffff',
          fontSize: 12,
          fontWeight: 'bold',
        },
      },
      stepKey: step.key,
    });

    jointGraph.addCell(node);

    // 添加连接线（除了最后一个节点）
    if (index < workflowSteps.length - 1) {
      const nextStep = workflowSteps[index + 1];
      const link = new joint.shapes.standard.Link({
        source: { id: node.id },
        target: { x: nextStep.x + 60, y: nextStep.y },
        vertices: [{ x: step.x + 60, y: step.y + 40 }],
        attrs: {
          line: {
            stroke: '#4ec9b0',
            strokeWidth: 2,
            targetMarker: {
              type: 'path',
              d: 'M 10 -5 0 0 10 5 z',
            },
          },
        },
      });
      jointGraph.addCell(link);
    }
  });
}

function getStepStatus(index: number, currentIndex: number): string {
  if (index < currentIndex) return 'completed';
  if (index === currentIndex) return 'in-progress';
  return 'pending';
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return '#4ec9b0';
    case 'in-progress':
      return '#0e639c';
    default:
      return '#3c3c3c';
  }
}

function showFallbackUI() {
  if (!containerRef.value) return;
  
  containerRef.value.innerHTML = `
    <div style="padding: 40px; text-align: center; color: var(--vscode-descriptionForeground, #999999);">
      <p>JointJS 未安装</p>
      <p style="font-size: 12px; margin-top: 8px;">请运行: pnpm add jointjs</p>
    </div>
  `;
  initialized.value = true;
}

watch(() => props.task, async () => {
  if (jointGraph && initialized.value) {
    jointGraph.clearCells();
    await createWorkflowNodes();
  }
}, { deep: true });

onMounted(() => {
  initJointJS();
});

onUnmounted(() => {
  if (jointPaper) {
    jointPaper.remove();
  }
  if (jointGraph) {
    jointGraph.clear();
  }
});
</script>

<style scoped>
.workflow-diagram {
  width: 100%;
  height: 100%;
  background: var(--vscode-panel-background, #1e1e1e);
  overflow: auto;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 100%;
  color: var(--vscode-descriptionForeground, #999999);
}
</style>

