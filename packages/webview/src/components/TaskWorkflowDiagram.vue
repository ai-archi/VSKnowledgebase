<template>
  <div class="workflow-diagram" ref="containerRef">
    <div v-if="!initialized" class="loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>初始化流程图...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { Loading } from '@element-plus/icons-vue';
import type { Task } from '@/types';

interface Props {
  task: Task;
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

// 根据任务实例的步骤动态生成工作流步骤
const workflowSteps = computed(() => {
  const task = props.task as any;
  
  if (!task?.steps || !Array.isArray(task.steps) || task.steps.length === 0) {
    return [];
  }
  
  return task.steps.map((step: any, index: number) => ({
    key: step.id,
    label: step.form?.title || step.id,
    x: index * 110 + 10, // 横向布局，每个节点间隔110px
    y: 20,
    step: step, // 保存完整的步骤对象
  }));
});

async function initJointJS() {
  console.log('[TaskWorkflowDiagram] initJointJS called', {
    hasContainer: !!containerRef.value,
    taskId: props.task?.id
  });
  
  if (!containerRef.value) {
    console.warn('[TaskWorkflowDiagram] Container ref is null, cannot initialize');
    return;
  }

  try {
    console.log('[TaskWorkflowDiagram] Importing JointJS');
    // 动态导入 JointJS
    const joint = await import('jointjs');
    console.log('[TaskWorkflowDiagram] JointJS imported successfully');

    // 创建图形
    jointGraph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });

    // 计算画布宽度（根据步骤数量动态调整）
    const steps = workflowSteps.value;
    const canvasWidth = Math.max(500, steps.length * 110 + 20);
    
    // 创建画布（横向布局，紧凑型）
    jointPaper = new joint.dia.Paper({
      el: containerRef.value,
      model: jointGraph,
      width: canvasWidth,
      height: 70,
      gridSize: 10,
      drawGrid: false,
      // 禁用拖动，但保留点击事件
      interactive: {
        elementMove: false, // 禁用元素拖动
        linkMove: false, // 禁用连接线拖动
        arrowheadMove: false, // 禁用箭头拖动
        vertexMove: false, // 禁用顶点拖动
        vertexAdd: false, // 禁用添加顶点
        vertexRemove: false, // 禁用删除顶点
        useLinkTools: false, // 禁用连接工具
      },
      background: {
        color: 'var(--vscode-panel-background, #1e1e1e)',
      },
      cellViewNamespace: joint.shapes,
    });

    // 创建流程节点
    console.log('[TaskWorkflowDiagram] Creating initial workflow nodes');
    await createWorkflowNodes();

    initialized.value = true;
    console.log('[TaskWorkflowDiagram] Initialization completed', {
      taskId: props.task?.id,
      stepsCount: workflowSteps.value.length
    });

    // 绑定节点点击事件
    jointPaper.on('element:pointerclick', (elementView: any) => {
      const stepKey = elementView.model.get('stepKey');
      const isClickable = elementView.model.get('isClickable');
      const stepStatus = elementView.model.get('stepStatus');
      
      // 只允许点击已完成和进行中的步骤
      if (!stepKey || !isClickable) {
        return;
      }
      
      const task = props.task as any;
      // 从任务实例中获取步骤数据
      if (task.steps && Array.isArray(task.steps)) {
        const step = task.steps.find((s: any) => s.id === stepKey);
        const stepData = step || {};
        emit('step-click', stepKey, stepData);
      } else {
        // 兼容旧格式
        const stepData = props.workflowData?.[stepKey] || {};
        emit('step-click', stepKey, stepData);
      }
    });

    // 设置鼠标悬停样式
    jointPaper.on('element:pointerenter', (elementView: any) => {
      const isClickable = elementView.model.get('isClickable');
      if (isClickable) {
        // 可点击的节点显示手型光标
        jointPaper.el.style.cursor = 'pointer';
      } else {
        // 不可点击的节点显示禁用光标
        jointPaper.el.style.cursor = 'not-allowed';
      }
    });

    jointPaper.on('element:pointerleave', () => {
      jointPaper.el.style.cursor = 'default';
    });

    initialized.value = true;
  } catch (error) {
    console.error('Failed to initialize JointJS:', error);
    // 如果 JointJS 未安装，显示降级界面
    showFallbackUI();
  }
}

async function createWorkflowNodes() {
  console.log('[TaskWorkflowDiagram] createWorkflowNodes called', {
    hasJointGraph: !!jointGraph,
    hasJointPaper: !!jointPaper,
    stepsCount: workflowSteps.value.length
  });
  
  if (!jointGraph || !jointPaper) {
    console.warn('[TaskWorkflowDiagram] JointJS not initialized, skipping node creation');
    return;
  }
  
  if (!containerRef.value) {
    console.warn('[TaskWorkflowDiagram] Container ref is null, cannot create nodes');
    return;
  }

  const joint = await import('jointjs');
  const steps = workflowSteps.value;
  const task = props.task as any;
  
  // 获取当前步骤ID
  const currentStepId = task.currentStep || task.workflowStep || (steps.length > 0 ? steps[0].key : '');
  const currentStepIndex = steps.findIndex(s => s.key === currentStepId);
  
  // 创建节点映射（用于连接线）
  const nodeMap = new Map<string, any>();

  // 创建所有节点
  steps.forEach((step, index) => {
    const status = getStepStatus(step, index, currentStepIndex);
    const colorInfo = getStatusColor(status);
    const isClickable = status === 'completed' || status === 'in-progress';

    const node = new joint.shapes.standard.Rectangle({
      position: { x: step.x, y: step.y },
      size: { width: 90, height: 28 },
      attrs: {
        body: {
          fill: colorInfo.fill,
          stroke: colorInfo.stroke,
          strokeWidth: colorInfo.strokeWidth,
          rx: 4,
          ry: 4,
          opacity: isClickable ? 1 : 0.5, // 待执行步骤降低透明度
        },
        label: {
          text: step.label,
          fill: colorInfo.textColor,
          fontSize: 11,
          fontWeight: status === 'in-progress' ? 'bold' : 'normal',
          opacity: 1, // 文字保持完全不透明，确保可见（不受节点透明度影响）
        },
      },
      stepKey: step.key,
      stepStatus: status, // 保存步骤状态
      isClickable: isClickable, // 标记是否可点击
    });

    jointGraph.addCell(node);
    nodeMap.set(step.key, node);
  });

  // 根据 depends_on 关系创建连接线
  steps.forEach((step, index) => {
    const stepDef = step.step; // 步骤定义对象
    if (!stepDef) return;
    
    const node = nodeMap.get(step.key);
    if (!node) return;

    // 获取依赖的步骤
    const dependsOn = stepDef.depends_on;
    if (dependsOn) {
      const depIds = Array.isArray(dependsOn) ? dependsOn : [dependsOn];
      depIds.forEach((depId: string) => {
        const depNode = nodeMap.get(depId);
        if (depNode) {
          const link = new joint.shapes.standard.Link({
            source: { id: depNode.id },
            target: { id: node.id },
            attrs: {
              line: {
                stroke: '#4ec9b0',
                strokeWidth: 1.5,
                targetMarker: {
                  type: 'path',
                  d: 'M 8 -4 0 0 8 4 z',
                },
              },
            },
          });
          jointGraph.addCell(link);
        }
      });
    } else if (index > 0) {
      // 如果没有依赖关系，按顺序连接（向后兼容）
      const prevStep = steps[index - 1];
      const prevNode = nodeMap.get(prevStep.key);
      if (prevNode) {
        const link = new joint.shapes.standard.Link({
          source: { id: prevNode.id },
          target: { id: node.id },
          attrs: {
            line: {
              stroke: '#4ec9b0',
              strokeWidth: 1.5,
              targetMarker: {
                type: 'path',
                d: 'M 8 -4 0 0 8 4 z',
              },
            },
          },
        });
        jointGraph.addCell(link);
      }
    }
  });
}

function getStepStatus(step: any, index: number, currentIndex: number): string {
  const task = props.task as any;
  const stepDef = step.step; // 步骤定义对象
  
  // 如果步骤定义中有 status 字段，使用它
  if (stepDef && stepDef.status) {
    return stepDef.status;
  }
  
  // 否则根据索引判断
  if (index < currentIndex) return 'completed';
  if (index === currentIndex) return 'in-progress';
  return 'pending';
}

function getStatusColor(status: string): { fill: string; stroke: string; strokeWidth: number; textColor: string } {
  switch (status) {
    case 'completed':
      // 已完成：绿色系
      return {
        fill: '#4ec9b0',
        stroke: '#4ec9b0',
        strokeWidth: 1.5,
        textColor: '#ffffff',
      };
    case 'in-progress':
      // 进行中：蓝色系，加粗边框突出显示
      return {
        fill: '#0e639c',
        stroke: '#4fc3f7',
        strokeWidth: 2.5,
        textColor: '#ffffff',
      };
    case 'pending':
    default:
      // 待执行：灰色系，确保文字可见
      return {
        fill: '#3c3c3c',
        stroke: '#5c5c5c',
        strokeWidth: 1,
        textColor: '#cccccc', // 使用更亮的文字颜色，确保在灰色背景上可见
      };
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

// 监听任务变化，重新渲染流程图
// 直接监听任务 ID，确保任务切换时能正确触发
watch(() => props.task?.id, async (newTaskId, oldTaskId) => {
  console.log('[TaskWorkflowDiagram] Task ID changed:', { 
    oldTaskId, 
    newTaskId, 
    initialized: initialized.value,
    hasJointGraph: !!jointGraph,
    hasJointPaper: !!jointPaper,
    containerExists: !!containerRef.value
  });
  
  // 等待初始化完成
  if (!initialized.value || !jointGraph || !jointPaper) {
    console.warn('[TaskWorkflowDiagram] Skipping update - not initialized or missing dependencies', {
      initialized: initialized.value,
      hasJointGraph: !!jointGraph,
      hasJointPaper: !!jointPaper,
      hasClear: jointGraph ? typeof jointGraph.clear === 'function' : false
    });
    return;
  }
  
  // 检查容器是否存在
  if (!containerRef.value) {
    console.warn('[TaskWorkflowDiagram] Container ref is null, cannot update');
    return;
  }
  
  // 如果任务被清空，清空流程图
  if (!newTaskId) {
    console.log('[TaskWorkflowDiagram] Clearing diagram - task is null');
    try {
      jointGraph.clear();
    } catch (error) {
      console.error('[TaskWorkflowDiagram] Failed to clear graph:', error);
    }
    return;
  }
  
  // 当任务 ID 变化时（切换任务），重新渲染
  if (newTaskId !== oldTaskId) {
    console.log('[TaskWorkflowDiagram] Task switched, updating diagram', {
      from: oldTaskId,
      to: newTaskId,
      stepsCount: workflowSteps.value.length
    });
    
    // 等待下一个 tick，确保 Vue 响应式系统已更新所有数据
    await nextTick();
    
    // 再次检查容器和对象是否仍然有效
    if (!containerRef.value) {
      console.warn('[TaskWorkflowDiagram] Container ref became null after nextTick');
      return;
    }
    
    if (!jointGraph || !jointPaper) {
      console.warn('[TaskWorkflowDiagram] JointJS objects became null after nextTick');
      return;
    }
    
    try {
      // 再次检查，确保 jointGraph 仍然有效
      if (jointGraph && typeof jointGraph.clear === 'function') {
        console.log('[TaskWorkflowDiagram] Clearing graph and recreating nodes');
        jointGraph.clear();
        
        // 更新画布宽度（根据步骤数量动态调整）
        const steps = workflowSteps.value;
        const canvasWidth = Math.max(500, steps.length * 110 + 20);
        console.log('[TaskWorkflowDiagram] Setting canvas dimensions', { canvasWidth, stepsCount: steps.length });
        jointPaper.setDimensions(canvasWidth, 70);
        
        await createWorkflowNodes();
        console.log('[TaskWorkflowDiagram] Diagram updated successfully');
      } else {
        console.warn('[TaskWorkflowDiagram] jointGraph.clear is not a function', {
          hasJointGraph: !!jointGraph,
          clearType: jointGraph ? typeof jointGraph.clear : 'N/A'
        });
      }
    } catch (error) {
      console.error('[TaskWorkflowDiagram] Failed to update workflow diagram:', error);
      console.error('[TaskWorkflowDiagram] Error details:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        containerExists: !!containerRef.value,
        jointGraphExists: !!jointGraph,
        jointPaperExists: !!jointPaper
      });
    }
  } else {
    console.log('[TaskWorkflowDiagram] Task ID unchanged, skipping update');
  }
}, { immediate: false });

// 监听任务步骤变化（同一任务内的步骤状态更新）
watch(() => {
  const task = props.task as any;
  if (!task?.id) return null;
  
  // 返回步骤状态数组，用于深度监听
  if (task.steps && Array.isArray(task.steps)) {
    return task.steps.map((s: any) => ({
      id: s.id,
      status: s.status,
    }));
  }
  return null;
}, async () => {
  // 当步骤状态变化时，重新渲染节点（更新颜色和状态）
  if (initialized.value && jointGraph && jointPaper && typeof jointGraph.clear === 'function') {
    console.log('[TaskWorkflowDiagram] Steps status changed, updating nodes');
    // 等待下一个 tick，确保数据已更新
    await nextTick();
    
    try {
      // 再次检查，确保 jointGraph 仍然有效
      if (jointGraph && typeof jointGraph.clear === 'function') {
        jointGraph.clear();
        
        // 更新画布宽度（根据步骤数量动态调整）
        const steps = workflowSteps.value;
        const canvasWidth = Math.max(500, steps.length * 110 + 20);
        jointPaper.setDimensions(canvasWidth, 70);
        
        await createWorkflowNodes();
        console.log('[TaskWorkflowDiagram] Nodes updated successfully');
      }
    } catch (error) {
      console.error('[TaskWorkflowDiagram] Failed to update workflow nodes:', error);
    }
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
  height: 70px;
  background: var(--vscode-panel-background, #1e1e1e);
  overflow-x: auto;
  overflow-y: hidden;
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

