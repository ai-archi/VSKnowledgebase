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
import * as fs from 'fs';
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

      // 如果有模板ID，加载模板并初始化工作流
      let workflowStep = 'draft-proposal';
      let workflowData: Record<string, any> = {};
      let templateId: string | undefined;

      if (options.templateId) {
        const templateResult = await this.getTaskTemplate(options.templateId, options.vaultId);
        if (templateResult.success && templateResult.value) {
          const template = templateResult.value;
          templateId = template.id;
          workflowStep = template.workflow.initialStep;
          // 为每个步骤初始化空数据
          for (const step of template.workflow.steps) {
            workflowData[step.key] = {};
          }
        }
      } else {
        // 默认工作流
        workflowData = {
          'draft-proposal': {},
          'review-alignment': {},
          'implementation': {},
          'archive-update': {},
        };
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
        category: options.category || 'task', // 默认分类为 'task'
        createdAt: now,
        updatedAt: now,
        // 流程定义
        workflow: {
          step: workflowStep,
          data: workflowData,
          templateId: templateId,
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
        category: options.category || 'task',
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
            category: taskData.category || 'task', // 默认分类为 'task'
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
            category: frontMatter.category || 'task', // 默认分类为 'task'
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
        category: 'task', // 默认分类为 'task'
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

  async getTaskTemplates(vaultId?: string): Promise<Result<import('./TaskApplicationService').TaskTemplate[], ArtifactError>> {
    try {
      this.logger.info(`[TaskApplicationService] getTaskTemplates called with vaultId: ${vaultId || 'undefined (all vaults)'}`);
      
      const templates: import('./TaskApplicationService').TaskTemplate[] = [];
      
      // 获取所有 vault 或指定 vault
      let vaultsToScan: Array<{ id: string; name: string }> = [];
      if (vaultId) {
        this.logger.info(`[TaskApplicationService] Getting specific vault: ${vaultId}`);
        const vaultResult = await this.vaultService.getVault(vaultId);
        if (vaultResult.success && vaultResult.value) {
          vaultsToScan = [{ id: vaultResult.value.id, name: vaultResult.value.name }];
          this.logger.info(`[TaskApplicationService] Found vault: id=${vaultResult.value.id}, name=${vaultResult.value.name}`);
        } else {
          this.logger.warn(`[TaskApplicationService] Vault not found: ${vaultId}`);
        }
      } else {
        this.logger.info(`[TaskApplicationService] Getting all vaults`);
        const vaultsResult = await this.vaultService.listVaults();
        if (vaultsResult.success) {
          vaultsToScan = vaultsResult.value.map(v => ({ id: v.id, name: v.name }));
          this.logger.info(`[TaskApplicationService] Found ${vaultsToScan.length} vault(s): ${vaultsToScan.map(v => `${v.name}(${v.id})`).join(', ')}`);
        } else {
          this.logger.error(`[TaskApplicationService] Failed to list vaults:`, vaultsResult.error);
        }
      }

      this.logger.info(`[TaskApplicationService] Scanning ${vaultsToScan.length} vault(s) for task templates`);

      // 扫描每个 vault 的 archi-templates/task 目录
      for (const vault of vaultsToScan) {
        const vaultRef = { id: vault.id, name: vault.name };
        const taskTemplatesDir = 'archi-templates/task';
        
        this.logger.info(`[TaskApplicationService] Checking task templates in vault: id=${vault.id}, name=${vault.name}, relativePath=${taskTemplatesDir}`);
        
        // 先尝试列出 vault 根目录，看看实际有哪些目录
        const rootListResult = await this.artifactService.listDirectory(vaultRef, '', {
          recursive: false,
          includeHidden: false,
        });
        if (rootListResult.success) {
          const rootDirs = rootListResult.value.filter(n => n.isDirectory).map(n => `${n.name}(${n.path})`);
          this.logger.info(`[TaskApplicationService] Vault root directories: ${rootDirs.join(', ')}`);
          
          // 检查是否有 archi-templates 目录
          const hasArchiTemplates = rootListResult.value.some(n => n.isDirectory && n.name === 'archi-templates');
          this.logger.info(`[TaskApplicationService] Has archi-templates directory: ${hasArchiTemplates}`);
          
          if (hasArchiTemplates) {
            // 列出 archi-templates 目录下的内容
            const archiTemplatesListResult = await this.artifactService.listDirectory(vaultRef, 'archi-templates', {
              recursive: false,
              includeHidden: false,
            });
            if (archiTemplatesListResult.success) {
              const archiSubDirs = archiTemplatesListResult.value.filter(n => n.isDirectory).map(n => n.name);
              this.logger.info(`[TaskApplicationService] archi-templates subdirectories: ${archiSubDirs.join(', ')}`);
              const hasTaskDir = archiSubDirs.includes('task');
              this.logger.info(`[TaskApplicationService] Has task subdirectory: ${hasTaskDir}`);
            }
          }
        } else {
          this.logger.warn(`[TaskApplicationService] Failed to list vault root directory: ${rootListResult.error?.message}`);
        }
        
        // 检查目录是否存在
        const dirExists = await this.artifactService.exists(vaultRef, taskTemplatesDir);
        const exists = dirExists.success ? dirExists.value : false;
        this.logger.info(`[TaskApplicationService] Directory exists check result: success=${dirExists.success}, exists=${exists}, path=${taskTemplatesDir}`);
        
        if (!dirExists.success) {
          this.logger.error(`[TaskApplicationService] Failed to check directory existence: ${dirExists.error?.message}`);
        }
        
        // 如果目录不存在，继续下一个 vault
        if (!dirExists.success || !exists) {
          this.logger.warn(`[TaskApplicationService] Task templates directory not found in vault: ${vault.name} (id: ${vault.id}), path: ${taskTemplatesDir}`);
          
          // 尝试直接检查文件系统（用于调试）
          try {
            // 通过读取一个文件来获取 architool root（临时方案）
            const testFilePath = path.join(taskTemplatesDir, 'default-task-template.yml');
            const testReadResult = await this.artifactService.readFile(vaultRef, testFilePath);
            if (testReadResult.success) {
              this.logger.info(`[TaskApplicationService] File exists but directory check failed! File path: ${testFilePath}`);
            } else {
              this.logger.warn(`[TaskApplicationService] Test file also not found: ${testFilePath}`);
            }
          } catch (error: any) {
            this.logger.debug(`[TaskApplicationService] Error in test file check: ${error.message}`);
          }
          
          continue;
        }

        // 列出目录下的所有 YAML 文件
        const listResult = await this.artifactService.listDirectory(vaultRef, taskTemplatesDir, {
          recursive: false,
          includeHidden: false,
          extensions: ['yml', 'yaml'],
        });

        if (listResult.success) {
          this.logger.info(`[TaskApplicationService] Found ${listResult.value.length} files in task templates directory`);
          
          if (listResult.value.length === 0) {
            this.logger.warn(`[TaskApplicationService] No YAML files found in ${taskTemplatesDir} for vault ${vault.name} (id: ${vault.id})`);
            
            // 尝试直接读取一个已知的文件来验证路径
            const testFilePaths = [
              'archi-templates/task/default-task-template.yml',
              'archi-templates/task/simple-task-template.yml',
              'archi-templates/task/detailed-task-template.yml',
            ];
            
            for (const testPath of testFilePaths) {
              const testReadResult = await this.artifactService.readFile(vaultRef, testPath);
              if (testReadResult.success) {
                this.logger.info(`[TaskApplicationService] Test file found via direct read: ${testPath}`);
                // 如果直接读取成功，说明文件存在，但 listDirectory 没有返回
                // 这可能是因为 listDirectory 的实现有问题
                break;
              }
            }
          }
          
          for (const node of listResult.value) {
            if (node.isFile) {
              // node.path 是相对于 vault 根目录的完整路径
              // 例如：'archi-templates/task/default-task-template.yml'
              this.logger.info(`[TaskApplicationService] Processing template file: name=${node.name}, path=${node.path}, fullPath=${node.fullPath}`);
              
              // 读取模板文件（node.path 已经是相对于 vault 根目录的完整路径）
              const readResult = await this.artifactService.readFile(vaultRef, node.path);
              if (readResult.success) {
                try {
                  const templateData = yaml.load(readResult.value) as any;
                  this.logger.info(`[TaskApplicationService] Parsed template data: id=${templateData?.id}, name=${templateData?.name}, hasWorkflow=${!!templateData?.workflow}`);
                  
                  if (templateData && templateData.id && templateData.workflow) {
                    templates.push({
                      id: templateData.id,
                      name: templateData.name || templateData.id,
                      description: templateData.description,
                      category: templateData.category || 'task',
                      workflow: templateData.workflow,
                    });
                    this.logger.info(`[TaskApplicationService] Successfully loaded task template: ${templateData.id} (${templateData.name})`);
                  } else {
                    this.logger.warn(`[TaskApplicationService] Task template file missing required fields: path=${node.path}, hasId=${!!templateData?.id}, hasWorkflow=${!!templateData?.workflow}`);
                    if (templateData) {
                      this.logger.warn(`[TaskApplicationService] Template data keys: ${Object.keys(templateData).join(', ')}`);
                    }
                  }
                } catch (parseError: any) {
                  this.logger.error(`[TaskApplicationService] Failed to parse task template: ${node.path}`, parseError);
                }
              } else {
                this.logger.error(`[TaskApplicationService] Failed to read task template file: path=${node.path}`, readResult.error);
              }
            } else {
              this.logger.debug(`[TaskApplicationService] Skipping non-file node: ${node.name} (isDirectory: ${node.isDirectory})`);
            }
          }
        } else {
          this.logger.error(`[TaskApplicationService] Failed to list task templates directory in vault: ${vault.name} (id: ${vault.id})`, listResult.error);
        }
      }

      this.logger.info(`[TaskApplicationService] Total task templates loaded: ${templates.length}`);
      
      return {
        success: true,
        value: templates,
      };
    } catch (error: any) {
      this.logger.error('Failed to get task templates', error);
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          error.message || 'Failed to get task templates'
        ),
      };
    }
  }

  async getTaskTemplate(templateId: string, vaultId?: string): Promise<Result<import('./TaskApplicationService').TaskTemplate, ArtifactError>> {
    try {
      // 先尝试从指定 vault 查找
      if (vaultId) {
        const vaultResult = await this.vaultService.getVault(vaultId);
        if (vaultResult.success && vaultResult.value) {
          const vaultRef = { id: vaultResult.value.id, name: vaultResult.value.name };
          const templatePath = `archi-templates/task/${templateId}.yml`;
          
          const readResult = await this.artifactService.readFile(vaultRef, templatePath);
          if (readResult.success) {
            try {
              const templateData = yaml.load(readResult.value) as any;
              if (templateData && templateData.id === templateId && templateData.workflow) {
                return {
                  success: true,
                  value: {
                    id: templateData.id,
                    name: templateData.name || templateData.id,
                    description: templateData.description,
                    category: templateData.category || 'task',
                    workflow: templateData.workflow,
                  },
                };
              }
            } catch (parseError: any) {
              this.logger.warn(`Failed to parse task template: ${templatePath}`, parseError);
            }
          }
        }
      }

      // 如果指定 vault 没找到，从所有 vault 查找
      const templatesResult = await this.getTaskTemplates();
      if (templatesResult.success) {
        const template = templatesResult.value.find(t => t.id === templateId);
        if (template) {
          return {
            success: true,
            value: template,
          };
        }
      }

      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.NOT_FOUND,
          `Task template not found: ${templateId}`
        ),
      };
    } catch (error: any) {
      this.logger.error('Failed to get task template', error);
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          error.message || 'Failed to get task template'
        ),
      };
    }
  }
}

