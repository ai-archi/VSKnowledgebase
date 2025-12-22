/**
 * Task 相关类型定义
 */
export interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: Date | string;
  artifactId: string;
  artifactPath: string;
  vaultId: string;
  workflowStep?: string;
  workflowData?: any;
  description?: string;
  category?: 'task' | 'issue' | 'story'; // 任务分类：任务/问题/故事
  createdAt?: Date | string;
}

