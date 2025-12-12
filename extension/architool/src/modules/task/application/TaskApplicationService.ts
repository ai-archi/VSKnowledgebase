import { Result } from '../../shared/domain/errors';
import { ArtifactError } from '../../shared/domain/errors';

export interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: Date;
  artifactId: string;
  artifactPath: string;
  vaultId: string;
  category?: 'task' | 'issue' | 'story'; // 任务分类：任务/问题/故事
}

export interface CreateTaskOptions {
  vaultId: string;
  artifactPath: string;
  title: string;
  status?: Task['status'];
  priority?: Task['priority'];
  dueDate?: Date;
  templateId?: string;
  category?: 'task' | 'issue' | 'story'; // 任务分类，默认为 'task'
}

export interface TaskTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  workflow: {
    steps: Array<{
      key: string;
      label: string;
      description?: string;
      order: number;
      fields?: Array<{
        key: string;
        type: string;
        label: string;
        readonly?: boolean;
        items?: any;
      }>;
    }>;
    initialStep: string;
  };
}

export interface TaskApplicationService {
  listTasks(vaultId?: string, status?: Task['status']): Promise<Result<Task[], ArtifactError>>;
  createTask(options: CreateTaskOptions): Promise<Result<Task, ArtifactError>>;
  updateTask(taskId: string, updates: Partial<Task>): Promise<Result<Task, ArtifactError>>;
  deleteTask(taskId: string): Promise<Result<void, ArtifactError>>;
  getTaskTemplates(vaultId?: string): Promise<Result<TaskTemplate[], ArtifactError>>;
  getTaskTemplate(templateId: string, vaultId?: string): Promise<Result<TaskTemplate, ArtifactError>>;
}
