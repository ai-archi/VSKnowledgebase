import { Result } from '../../../core/types/Result';
import { Artifact } from '../../shared/domain/entity/artifact';
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
}

export interface CreateTaskOptions {
  vaultId: string;
  artifactPath: string;
  title: string;
  status?: Task['status'];
  priority?: Task['priority'];
  dueDate?: Date;
}

export interface TaskApplicationService {
  listTasks(vaultId?: string, status?: Task['status']): Promise<Result<Task[], ArtifactError>>;
  createTask(options: CreateTaskOptions): Promise<Result<Task, ArtifactError>>;
  updateTask(taskId: string, updates: Partial<Task>): Promise<Result<Task, ArtifactError>>;
  deleteTask(taskId: string): Promise<Result<void, ArtifactError>>;
}

