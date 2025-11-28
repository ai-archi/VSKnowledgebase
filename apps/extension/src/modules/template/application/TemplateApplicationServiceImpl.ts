import { injectable, inject } from 'inversify';
import { TYPES } from '../../../infrastructure/di/types';
import {
  TemplateApplicationService,
  Template,
  CreateFromTemplateOpts,
} from './TemplateApplicationService';
import { ArtifactFileSystemApplicationService } from '../../shared/application/ArtifactFileSystemApplicationService';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { ArtifactTreeApplicationService } from '../../shared/application/ArtifactTreeApplicationService';
import { Artifact } from '../../shared/domain/entity/artifact';
import { Result, ArtifactError, ArtifactErrorCode } from '../../shared/domain/errors';
import { VaultFileSystemAdapter } from '../../shared/infrastructure/storage/file/VaultFileSystemAdapter';
import { Logger } from '../../../core/logger/Logger';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as yaml from 'js-yaml';

@injectable()
export class TemplateApplicationServiceImpl implements TemplateApplicationService {
  constructor(
    @inject(TYPES.ArtifactFileSystemApplicationService)
    private artifactService: ArtifactFileSystemApplicationService,
    @inject(TYPES.ArtifactTreeApplicationService)
    private treeService: ArtifactTreeApplicationService,
    @inject(TYPES.VaultApplicationService)
    private vaultService: VaultApplicationService,
    @inject(TYPES.VaultFileSystemAdapter)
    private vaultAdapter: VaultFileSystemAdapter,
    @inject(TYPES.Logger)
    private logger: Logger
  ) {}

  /**
   * 获取所有模板
   */
  async getTemplates(vaultId?: string): Promise<Result<Template[], ArtifactError>> {
    try {
      const templates: Template[] = [];

      if (vaultId) {
        // 加载指定 vault 的模板
        const vaultTemplates = await this.loadTemplatesFromVault(vaultId);
        if (vaultTemplates.success) {
          templates.push(...vaultTemplates.value);
        }
      } else {
        // 从所有 Vault 加载
        const vaultsResult = await this.vaultService.listVaults();
        if (vaultsResult.success) {
          for (const vault of vaultsResult.value) {
            const vaultTemplates = await this.loadTemplatesFromVault(vault.id);
            if (vaultTemplates.success) {
              templates.push(...vaultTemplates.value);
            }
          }
        }
      }

      return { success: true, value: templates };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to get templates: ${error.message}`,
          { vaultId },
          error
        ),
      };
    }
  }

  /**
   * 从 Vault 加载模板
   * 支持结构：vault/templates/structure/ 和 vault/templates/content/
   */
  private async loadTemplatesFromVault(
    vaultId: string
  ): Promise<Result<Template[], ArtifactError>> {
    try {
      // 通过 vaultId 获取 vault
      const vaultResult = await this.vaultService.getVault(vaultId);
      if (!vaultResult.success || !vaultResult.value) {
        this.logger.warn(`Vault not found for vaultId: ${vaultId}`);
        return { success: true, value: [] };
      }
      const vault = vaultResult.value;
      const vaultRef = { id: vault.id, name: vault.name };
      
      this.logger.info(`Loading templates for vaultId: ${vaultId}, vaultName: ${vault.name}`);

      // 检查 templates 目录是否存在
      const templatesDirExists = await this.treeService.exists(vaultRef, 'templates');
      if (!templatesDirExists.success || !templatesDirExists.value) {
        this.logger.warn(`Templates directory not found for vault: ${vault.name}`);
        return { success: true, value: [] };
      }

      const templates: Template[] = [];

      // 递归扫描 templates 目录下的所有文件
      const templatesDirResult = await this.treeService.listDirectory(
        vaultRef,
        'templates',
        { recursive: true, includeHidden: false }
      );

      if (!templatesDirResult.success) {
        this.logger.warn(`Failed to list templates directory for vault: ${vault.name}`);
        return { success: true, value: [] };
      }

      this.logger.info(`Found ${templatesDirResult.value.length} items in templates directory`);

      // 处理所有文件
      for (const fileNode of templatesDirResult.value) {
        if (!fileNode.isFile) {
          continue;
        }

        // 跳过元数据文件
        if (fileNode.name.endsWith('.meta.yml') || fileNode.name.endsWith('.meta.yaml')) {
          continue;
        }

        const contentResult = await this.treeService.readFile(vaultRef, fileNode.path);
        if (!contentResult.success) {
          this.logger.warn(`Failed to read template file: ${fileNode.path}`);
          continue;
        }

        const content = contentResult.value;
        const ext = fileNode.extension?.toLowerCase();

        // 判断模板类型
        // 1. YAML/YML 文件：尝试解析，如果包含 structure 字段则为结构模板，否则为内容模板
        if (ext === 'yml' || ext === 'yaml') {
          try {
            const templateData = yaml.load(content) as any;
            
            // 如果包含 structure 字段，则为结构模板
            if (templateData && typeof templateData === 'object' && templateData.structure) {
              templates.push({
                id: templateData.id || uuidv4(),
                name: templateData.name || path.basename(fileNode.name, path.extname(fileNode.name)),
                description: templateData.description,
                type: 'structure',
                category: templateData.category,
                viewType: templateData.viewType,
                structure: templateData.structure,
                variables: templateData.variables || [],
                createdAt: templateData.createdAt || new Date().toISOString(),
                updatedAt: templateData.updatedAt || new Date().toISOString(),
              });
            } else {
              // 否则作为内容模板
              templates.push({
                id: templateData?.id || uuidv4(),
                name: templateData?.name || path.basename(fileNode.name, path.extname(fileNode.name)),
                description: templateData?.description,
                type: 'content',
                category: templateData?.category,
                viewType: templateData?.viewType,
                content: content,
                variables: this.extractVariables(content),
                createdAt: templateData?.createdAt || new Date().toISOString(),
                updatedAt: templateData?.updatedAt || new Date().toISOString(),
              });
            }
          } catch (yamlError: any) {
            // YAML 解析失败，作为普通内容模板
            this.logger.warn(`Failed to parse YAML template: ${fileNode.path}, treating as content template`, yamlError);
            templates.push({
              id: uuidv4(),
              name: path.basename(fileNode.name, path.extname(fileNode.name)),
              description: undefined,
              type: 'content',
              content: content,
              variables: this.extractVariables(content),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        } else if (ext === 'md') {
          // Markdown 文件：作为内容模板
          templates.push({
            id: uuidv4(),
            name: path.basename(fileNode.name, path.extname(fileNode.name)),
            description: undefined,
            type: 'content',
            content: content,
            variables: this.extractVariables(content),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        } else {
          // 其他文件类型：作为内容模板
          this.logger.info(`Loading file with unknown extension as content template: ${fileNode.path}`);
          templates.push({
            id: uuidv4(),
            name: path.basename(fileNode.name, path.extname(fileNode.name)),
            description: undefined,
            type: 'content',
            content: content,
            variables: this.extractVariables(content),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }

      this.logger.info(`Loaded ${templates.length} templates, structure templates: ${templates.filter(t => t.type === 'structure').length}`);
      return { success: true, value: templates };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to load templates from vault: ${error.message}`,
          { vaultId },
          error
        ),
      };
    }
  }

  /**
   * 提取模板变量（{{variable}} 格式）
   */
  private extractVariables(content: string): string[] {
    const variableRegex = /\{\{(\w+)\}\}/g;
    const variables = new Set<string>();
    let match;

    while ((match = variableRegex.exec(content)) !== null) {
      variables.add(match[1]);
    }

    return Array.from(variables);
  }

  /**
   * 获取模板
   */
  async getTemplate(templateId: string, vaultId: string): Promise<Result<Template, ArtifactError>> {
    const templatesResult = await this.getTemplates(vaultId);
    if (!templatesResult.success) {
      return templatesResult;
    }

    const template = templatesResult.value.find(t => t.id === templateId);
    if (!template) {
      return {
        success: false,
        error: new ArtifactError(ArtifactErrorCode.NOT_FOUND, `Template not found: ${templateId}`, { templateId, vaultId }),
      };
    }

    return { success: true, value: template };
  }

  /**
   * 创建模板
   */
  async createTemplate(
    vaultId: string,
    template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Result<Template, ArtifactError>> {
    try {
      const templateId = uuidv4();
      const now = new Date().toISOString();

      const fullTemplate: Template = {
        ...template,
        id: templateId,
        createdAt: now,
        updatedAt: now,
      };

      // 通过 vaultId 获取 vault
      const vaultResult = await this.vaultService.getVault(vaultId);
      if (!vaultResult.success || !vaultResult.value) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.NOT_FOUND,
            `Vault not found: ${vaultId}`,
            { vaultId }
          ),
        };
      }
      const vault = vaultResult.value;
      const vaultRef = { id: vault.id, name: vault.name };

      // 确保模板目录存在
      await this.treeService.createDirectory(vaultRef, 'templates');

      // 根据模板类型保存到不同目录
      if (template.type === 'structure') {
        await this.treeService.createDirectory(vaultRef, 'templates/structure');
        const templatePath = `templates/structure/${templateId}.yml`;
        const writeResult = await this.treeService.writeFile(
          vaultRef,
          templatePath,
          yaml.dump(fullTemplate)
        );
        if (!writeResult.success) {
          return writeResult;
        }
      } else {
        await this.treeService.createDirectory(vaultRef, 'templates/content');
        const extension = template.viewType === 'design' ? '.md' : '.md';
        const templatePath = `templates/content/${templateId}${extension}`;
        const writeResult = await this.treeService.writeFile(
          vaultRef,
          templatePath,
          template.content || ''
        );
        if (!writeResult.success) {
          return writeResult;
        }
        // 同时保存元数据
        const metaPath = `templates/content/${templateId}.meta.yml`;
        const metaWriteResult = await this.treeService.writeFile(
          vaultRef,
          metaPath,
          yaml.dump({
            id: templateId,
            name: template.name,
            description: template.description,
            type: template.type,
            category: template.category,
            viewType: template.viewType,
            variables: template.variables,
            createdAt: now,
            updatedAt: now,
          })
        );
        if (!metaWriteResult.success) {
          return metaWriteResult;
        }
      }

      return { success: true, value: fullTemplate };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to create template: ${error.message}`,
          { vaultId, template },
          error
        ),
      };
    }
  }

  /**
   * 更新模板
   */
  async updateTemplate(
    vaultId: string,
    templateId: string,
    updates: Partial<Template>
  ): Promise<Result<Template, ArtifactError>> {
    const templateResult = await this.getTemplate(templateId, vaultId);
    if (!templateResult.success) {
      return templateResult;
    }

    const updatedTemplate: Template = {
      ...templateResult.value,
      ...updates,
      id: templateId,
      updatedAt: new Date().toISOString(),
    };

    // 重新保存模板
    const vaultResult = await this.vaultService.getVault(vaultId);
    if (!vaultResult.success || !vaultResult.value) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.NOT_FOUND,
          `Vault not found: ${vaultId}`,
          { vaultId }
        ),
      };
    }
    const vault = vaultResult.value;
    const vaultRef = { id: vault.id, name: vault.name };

    if (updatedTemplate.type === 'structure') {
      const templatePath = `templates/structure/${templateId}.yml`;
      const writeResult = await this.treeService.writeFile(
        vaultRef,
        templatePath,
        yaml.dump(updatedTemplate)
      );
      if (!writeResult.success) {
        return writeResult;
      }
    } else {
      const extension = updatedTemplate.viewType === 'design' ? '.md' : '.md';
      const templatePath = `templates/content/${templateId}${extension}`;
      if (updates.content !== undefined) {
        const writeResult = await this.treeService.writeFile(
          vaultRef,
          templatePath,
          updates.content
        );
        if (!writeResult.success) {
          return writeResult;
        }
      }
      // 更新元数据
      const metaPath = `templates/content/${templateId}.meta.yml`;
      const metaWriteResult = await this.treeService.writeFile(
        vaultRef,
        metaPath,
        yaml.dump({
          id: updatedTemplate.id,
          name: updatedTemplate.name,
          description: updatedTemplate.description,
          type: updatedTemplate.type,
          category: updatedTemplate.category,
          viewType: updatedTemplate.viewType,
          variables: updatedTemplate.variables,
          createdAt: updatedTemplate.createdAt,
          updatedAt: updatedTemplate.updatedAt,
        })
      );
      if (!metaWriteResult.success) {
        return metaWriteResult;
      }
    }

    return { success: true, value: updatedTemplate };
  }

  /**
   * 删除模板
   */
  async deleteTemplate(vaultId: string, templateId: string): Promise<Result<void, ArtifactError>> {
    try {
      const templateResult = await this.getTemplate(templateId, vaultId);
      if (!templateResult.success) {
        return templateResult;
      }

      const template = templateResult.value;
      const vaultResult = await this.vaultService.getVault(vaultId);
      if (!vaultResult.success || !vaultResult.value) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.NOT_FOUND,
            `Vault not found: ${vaultId}`,
            { vaultId }
          ),
        };
      }
      const vault = vaultResult.value;
      const vaultRef = { id: vault.id, name: vault.name };

      if (template.type === 'structure') {
        const templatePath = `templates/structure/${templateId}.yml`;
        const deleteResult = await this.treeService.delete(vaultRef, templatePath);
        if (!deleteResult.success) {
          return deleteResult;
        }
      } else {
        const extension = template.viewType === 'design' ? '.md' : '.md';
        const templatePath = `templates/content/${templateId}${extension}`;
        const metaPath = `templates/content/${templateId}.meta.yml`;
        const deleteTemplateResult = await this.treeService.delete(vaultRef, templatePath);
        if (!deleteTemplateResult.success && deleteTemplateResult.error?.code !== ArtifactErrorCode.NOT_FOUND) {
          return deleteTemplateResult;
        }
        const deleteMetaResult = await this.treeService.delete(vaultRef, metaPath);
        if (!deleteMetaResult.success && deleteMetaResult.error?.code !== ArtifactErrorCode.NOT_FOUND) {
          return deleteMetaResult;
        }
      }

      return { success: true, value: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to delete template: ${error.message}`,
          { vaultId, templateId },
          error
        ),
      };
    }
  }

  /**
   * 从模板创建 Artifact
   */
  async createArtifactFromTemplate(opts: CreateFromTemplateOpts): Promise<Result<Artifact, ArtifactError>> {
    try {
      // 获取 Vault 信息
      const vaultResult = await this.vaultService.getVault(opts.vaultId);
      if (!vaultResult.success) {
        return {
          success: false,
          error: new ArtifactError(ArtifactErrorCode.NOT_FOUND, `Vault not found: ${opts.vaultId}`, { vaultId: opts.vaultId }),
        };
      }

      const vault = vaultResult.value;
      if (vault.readOnly) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.OPERATION_FAILED,
            `Cannot create artifact in read-only vault: ${vault.name}`,
            { vaultId: opts.vaultId }
          ),
        };
      }

      // 查找模板
      const templatesResult = await this.getTemplates(opts.vaultId);
      if (!templatesResult.success) {
        return templatesResult;
      }

      const template = templatesResult.value.find(t => t.id === opts.templateId);

      if (!template) {
        return {
          success: false,
          error: new ArtifactError(ArtifactErrorCode.NOT_FOUND, `Template not found: ${opts.templateId}`, { templateId: opts.templateId }),
        };
      }

      // 处理模板内容
      let content = '';
      if (template.type === 'content' && template.content) {
        content = this.processTemplate(template, opts.variables || {});
      } else {
        // 结构模板：生成默认内容
        content = `# ${opts.title}\n\n`;
      }

      // 生成路径
      let artifactPath = opts.path;
      if (!artifactPath) {
        const sanitizedTitle = opts.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        const category = template.category || 'documents';
        artifactPath = `${category}/${sanitizedTitle}.md`;
      }

      // 创建 Artifact
      const createResult = await this.artifactService.createArtifact({
        vault: { id: vault.id, name: vault.name },
        path: artifactPath,
        title: opts.title,
        content,
        viewType: template.viewType || 'document',
        format: 'md',
        category: template.category,
        tags: [],
      });

      return createResult;
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to create artifact from template: ${error.message}`,
          { opts },
          error
        ),
      };
    }
  }

  /**
   * 处理模板内容（替换变量）
   */
  processTemplate(template: Template, variables: Record<string, string>): string {
    if (!template.content) {
      return '';
    }

    let processed = template.content;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      processed = processed.replace(regex, value);
    }

    // 替换未提供的变量为空字符串
    if (template.variables) {
      for (const variable of template.variables) {
        if (!(variable in variables)) {
          const regex = new RegExp(`\\{\\{${variable}\\}\\}`, 'g');
          processed = processed.replace(regex, '');
        }
      }
    }

    return processed;
  }
}

