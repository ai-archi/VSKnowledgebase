import { inject, injectable } from 'inversify';
import { TYPES } from '../../../infrastructure/di/types';
import { TaskApplicationService, Task, CreateTaskOptions } from './TaskApplicationService';
import { ArtifactApplicationService } from '../../shared/application/ArtifactApplicationService';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { MetadataRepository } from '../../shared/infrastructure/MetadataRepository';
// Remove duplicate Result import - use the one from errors
import { ArtifactError, ArtifactErrorCode, Result } from '../../shared/domain/errors';
import { Logger } from '../../../core/logger/Logger';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as yaml from 'js-yaml';

@injectable()
export class TaskApplicationServiceImpl implements TaskApplicationService {
  constructor(
    @inject(TYPES.ArtifactApplicationService)
    private artifactService: ArtifactApplicationService,
    @inject(TYPES.VaultApplicationService)
    private vaultService: VaultApplicationService,
    @inject(TYPES.MetadataRepository)
    private metadataRepository: MetadataRepository,
    @inject(TYPES.Logger)
    private logger: Logger
  ) {}

  async listTasks(vaultId?: string, status?: Task['status']): Promise<Result<Task[], ArtifactError>> {
    try {
      // 使用 Artifact 能力扫描所有 vault 的任务文件
      // 通过 listArtifacts 获取所有 artifact，然后过滤出 archi-tasks/ 路径下的文件
      const artifactsResult = await this.artifactService.listArtifacts(vaultId, {
        query: 'archi-tasks',
      });
      
      if (!artifactsResult.success) {
        return {
          success: false,
          error: artifactsResult.error,
        };
      }

      // 过滤出 archi-tasks/ 目录下的 artifact
      const taskArtifacts = artifactsResult.value.filter(a => 
        a.path.startsWith('archi-tasks/')
      );

      const tasks: Task[] = [];

      // 从 artifact 中解析任务信息
      for (const artifact of taskArtifacts) {
        // 读取文件内容，解析任务信息
        const readResult = await this.artifactService.readFile(
          artifact.vault,
          artifact.path
        );
        
        if (readResult.success) {
          const task = this.parseTaskFromContent(artifact.path, readResult.value, artifact.vault.id);
          if (task) {
            // 如果指定了状态过滤，进行过滤
            if (!status || task.status === status) {
              tasks.push(task);
            }
          }
        }
      }

      return {
        success: true,
        value: tasks,
      };
    } catch (error: any) {
      this.logger.error('Failed to list tasks', error);
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          error.message || 'Failed to list tasks'
        ),
      };
    }
  }

  async createTask(options: CreateTaskOptions): Promise<Result<Task, ArtifactError>> {
    try {
      // 获取 vault 信息
      const vaultResult = await this.vaultService.getVault(options.vaultId);
      if (!vaultResult.success || !vaultResult.value) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.NOT_FOUND,
            `Vault not found: ${options.vaultId}`,
            { vaultId: options.vaultId }
          ),
        };
      }

      const vault = vaultResult.value;
      
      // 确保路径以 archi-tasks/ 开头，使用 YAML 格式
      let artifactPath = options.artifactPath;
      if (!artifactPath.startsWith('archi-tasks/')) {
        const fileName = path.basename(artifactPath) || `${options.title || '新任务'}.yml`;
        // 如果原路径是 .md，改为 .yml
        if (fileName.endsWith('.md')) {
          artifactPath = `archi-tasks/${fileName.replace(/\.md$/, '.yml')}`;
        } else if (!fileName.endsWith('.yml') && !fileName.endsWith('.yaml')) {
          artifactPath = `archi-tasks/${fileName}.yml`;
        } else {
          artifactPath = `archi-tasks/${fileName}`;
        }
      } else if (artifactPath.endsWith('.md')) {
        // 如果路径是 .md，改为 .yml
        artifactPath = artifactPath.replace(/\.md$/, '.yml');
      }

      // 构建任务内容（YAML 格式，包含流程定义）
      const taskId = uuidv4();
      const now = new Date().toISOString();
      const taskData = {
        id: taskId,
        title: options.title,
        status: options.status || 'pending',
        priority: options.priority,
        dueDate: options.dueDate ? new Date(options.dueDate).toISOString() : undefined,
        createdAt: now,
        updatedAt: now,
        // 流程定义
        workflow: {
          step: 'draft-proposal',
          data: {},
        },
        // 描述
        description: '',
      };

      const content = yaml.dump(taskData, { indent: 2, lineWidth: -1 });

      // 创建文件
      const writeResult = await this.artifactService.writeFile(
        { id: vault.id, name: vault.name },
        artifactPath,
        content
      );

      if (!writeResult.success) {
        return {
          success: false,
          error: writeResult.error,
        };
      }

      // 创建 Task 对象
      const task: Task = {
        id: taskId,
        title: options.title,
        status: options.status || 'pending',
        priority: options.priority,
        dueDate: options.dueDate,
        artifactId: taskId,
        artifactPath: artifactPath,
        vaultId: options.vaultId,
      };

      this.logger.info('Task created', { taskId, artifactPath, vaultId: options.vaultId });
      return {
        success: true,
        value: task,
      };
    } catch (error: any) {
      this.logger.error('Failed to create task', error);
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          error.message || 'Failed to create task'
        ),
      };
    }
  }

  /**
   * 从文件内容解析任务信息
   * 支持 YAML 格式和 Markdown + Front Matter 格式（向后兼容）
   */
  private parseTaskFromContent(filePath: string, content: string, vaultId: string): Task | null {
    try {
      const ext = path.extname(filePath).toLowerCase();
      
      // YAML 格式（.yml 或 .yaml）
      if (ext === '.yml' || ext === '.yaml') {
        const taskData = yaml.load(content) as any;
        
        if (taskData && taskData.id) {
          return {
            id: taskData.id,
            title: taskData.title || path.basename(filePath, path.extname(filePath)),
            status: taskData.status || 'pending',
            priority: taskData.priority,
            dueDate: taskData.dueDate ? new Date(taskData.dueDate) : undefined,
            artifactId: taskData.id,
            artifactPath: filePath,
            vaultId: vaultId,
          };
        }
      }
      
      // Markdown + Front Matter 格式（向后兼容）
      const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
      const match = content.match(frontMatterRegex);

      if (match) {
        const frontMatterText = match[1];
        const frontMatter = yaml.load(frontMatterText) as any;
        
        if (frontMatter && frontMatter.id) {
          return {
            id: frontMatter.id,
            title: frontMatter.title || path.basename(filePath, path.extname(filePath)),
            status: frontMatter.status || 'pending',
            priority: frontMatter.priority,
            dueDate: frontMatter.dueDate ? new Date(frontMatter.dueDate) : undefined,
            artifactId: frontMatter.id,
            artifactPath: filePath,
            vaultId: vaultId,
          };
        }
      }

      // 如果无法解析，从文件名推断
      const fileName = path.basename(filePath, path.extname(filePath));
      return {
        id: uuidv4(), // 临时 ID
        title: fileName,
        status: 'pending',
        artifactId: '',
        artifactPath: filePath,
        vaultId: vaultId,
      };
    } catch (error: any) {
      this.logger.warn(`Failed to parse task from content: ${filePath}`, error);
      return null;
    }
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Result<Task, ArtifactError>> {
    try {
      // This is a simplified implementation
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          'Update task not yet implemented'
        ),
      };
    } catch (error: any) {
      this.logger.error('Failed to update task', error);
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          error.message || 'Failed to update task'
        ),
      };
    }
  }

  async deleteTask(taskId: string): Promise<Result<void, ArtifactError>> {
    try {
      // This is a simplified implementation
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          'Delete task not yet implemented'
        ),
      };
    } catch (error: any) {
      this.logger.error('Failed to delete task', error);
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          error.message || 'Failed to delete task'
        ),
      };
    }
  }
}

