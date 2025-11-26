import { injectable, inject } from 'inversify';
import { TYPES } from '../../../infrastructure/di/types';
import {
  TemplateApplicationService,
  Template,
  CreateFromTemplateOpts,
} from './TemplateApplicationService';
import { ArtifactFileSystemApplicationService } from '../../shared/application/ArtifactFileSystemApplicationService';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { Artifact } from '../../../domain/shared/artifact/Artifact';
import { Result, ArtifactError, ArtifactErrorCode } from '../../../domain/shared/artifact/errors';
import { VaultFileSystemAdapter } from '../../../infrastructure/storage/file/VaultFileSystemAdapter';
import { Logger } from '../../../core/logger/Logger';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

@injectable()
export class TemplateApplicationServiceImpl implements TemplateApplicationService {
  constructor(
    @inject(TYPES.ArtifactFileSystemApplicationService)
    private artifactService: ArtifactFileSystemApplicationService,
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
        const vaultsRoot = this.vaultAdapter.getVaultsRoot();
        if (fs.existsSync(vaultsRoot)) {
          const vaults = fs.readdirSync(vaultsRoot, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

          for (const vaultName of vaults) {
            // 通过 vaultName 获取 vaultId
            const vaultsResult = await this.vaultService.listVaults();
            if (vaultsResult.success) {
              const vault = vaultsResult.value.find(v => v.name === vaultName);
              if (vault) {
                const vaultTemplates = await this.loadTemplatesFromVault(vault.id);
                if (vaultTemplates.success) {
                  templates.push(...vaultTemplates.value);
                }
              }
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
      // 通过 vaultId 获取 vault，然后使用 vault.name
      const vaultResult = await this.vaultService.getVault(vaultId);
      if (!vaultResult.success || !vaultResult.value) {
        this.logger.warn(`Vault not found for vaultId: ${vaultId}`);
        return { success: true, value: [] };
      }
      const vaultName = vaultResult.value.name;
      const vaultPath = this.vaultAdapter.getVaultPath(vaultName);
      const templatesDir = path.join(vaultPath, 'templates');
      
      this.logger.info(`Loading templates directly for vaultId: ${vaultId}, vaultName: ${vaultName}, path: ${templatesDir}`);

      if (!fs.existsSync(templatesDir)) {
        this.logger.warn(`Templates directory not found: ${templatesDir}`);
        return { success: true, value: [] };
      }

      const templates: Template[] = [];

      // 加载结构模板
      const structureDir = path.join(templatesDir, 'structure');
      this.logger.info(`Checking structure directory: ${structureDir}, exists: ${fs.existsSync(structureDir)}`);
      if (fs.existsSync(structureDir)) {
        const files = fs.readdirSync(structureDir);
        this.logger.info(`Found ${files.length} files in structure directory: ${files.join(', ')}`);
        for (const file of files) {
          if (file.endsWith('.yml') || file.endsWith('.yaml')) {
            const filePath = path.join(structureDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const templateData = yaml.load(content) as any;
            templates.push({
              id: templateData.id || uuidv4(),
              name: templateData.name || path.basename(file, path.extname(file)),
              description: templateData.description,
              type: 'structure',
              category: templateData.category,
              viewType: templateData.viewType,
              structure: templateData.structure,
              variables: templateData.variables || [],
              createdAt: templateData.createdAt || new Date().toISOString(),
              updatedAt: templateData.updatedAt || new Date().toISOString(),
            });
          }
        }
      }

      // 加载内容模板
      const contentDir = path.join(templatesDir, 'content');
      if (fs.existsSync(contentDir)) {
        const files = fs.readdirSync(contentDir);
        for (const file of files) {
          if (file.endsWith('.md') || file.endsWith('.yml') || file.endsWith('.yaml')) {
            const filePath = path.join(contentDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const templateId = uuidv4();
            templates.push({
              id: templateId,
              name: path.basename(file, path.extname(file)),
              description: undefined,
              type: 'content',
              content,
              variables: this.extractVariables(content),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
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

      // 通过 vaultId 获取 vault，然后使用 vault.name
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
      const vaultName = vaultResult.value.name;
      const vaultPath = this.vaultAdapter.getVaultPath(vaultName);
      const templatesDir = path.join(vaultPath, 'templates');

      // 确保模板目录存在
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }

      // 根据模板类型保存到不同目录
      if (template.type === 'structure') {
        const structureDir = path.join(templatesDir, 'structure');
        if (!fs.existsSync(structureDir)) {
          fs.mkdirSync(structureDir, { recursive: true });
        }
        const templatePath = path.join(structureDir, `${templateId}.yml`);
        fs.writeFileSync(templatePath, yaml.dump(fullTemplate), 'utf-8');
      } else {
        const contentDir = path.join(templatesDir, 'content');
        if (!fs.existsSync(contentDir)) {
          fs.mkdirSync(contentDir, { recursive: true });
        }
        const extension = template.viewType === 'design' ? '.md' : '.md';
        const templatePath = path.join(contentDir, `${templateId}${extension}`);
        fs.writeFileSync(templatePath, template.content || '', 'utf-8');
        // 同时保存元数据
        const metaPath = path.join(contentDir, `${templateId}.meta.yml`);
        fs.writeFileSync(metaPath, yaml.dump({
          id: templateId,
          name: template.name,
          description: template.description,
          type: template.type,
          category: template.category,
          viewType: template.viewType,
          variables: template.variables,
          createdAt: now,
          updatedAt: now,
        }), 'utf-8');
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
    // 通过 vaultId 获取 vault，然后使用 vault.name
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
    const vaultName = vaultResult.value.name;
    const vaultPath = this.vaultAdapter.getVaultPath(vaultName);
    const templatesDir = path.join(vaultPath, 'templates');

    if (updatedTemplate.type === 'structure') {
      const structureDir = path.join(templatesDir, 'structure');
      const templatePath = path.join(structureDir, `${templateId}.yml`);
      fs.writeFileSync(templatePath, yaml.dump(updatedTemplate), 'utf-8');
    } else {
      const contentDir = path.join(templatesDir, 'content');
      const extension = updatedTemplate.viewType === 'design' ? '.md' : '.md';
      const templatePath = path.join(contentDir, `${templateId}${extension}`);
      if (updates.content !== undefined) {
        fs.writeFileSync(templatePath, updates.content, 'utf-8');
      }
      // 更新元数据
      const metaPath = path.join(contentDir, `${templateId}.meta.yml`);
      fs.writeFileSync(metaPath, yaml.dump({
        id: updatedTemplate.id,
        name: updatedTemplate.name,
        description: updatedTemplate.description,
        type: updatedTemplate.type,
        category: updatedTemplate.category,
        viewType: updatedTemplate.viewType,
        variables: updatedTemplate.variables,
        createdAt: updatedTemplate.createdAt,
        updatedAt: updatedTemplate.updatedAt,
      }), 'utf-8');
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
      // 通过 vaultId 获取 vault，然后使用 vault.name
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
      const vaultName = vaultResult.value.name;
      const vaultPath = this.vaultAdapter.getVaultPath(vaultName);
      const templatesDir = path.join(vaultPath, 'templates');

      if (template.type === 'structure') {
        const structureDir = path.join(templatesDir, 'structure');
        const templatePath = path.join(structureDir, `${templateId}.yml`);
        if (fs.existsSync(templatePath)) {
          fs.unlinkSync(templatePath);
        }
      } else {
        const contentDir = path.join(templatesDir, 'content');
        const extension = template.viewType === 'design' ? '.md' : '.md';
        const templatePath = path.join(contentDir, `${templateId}${extension}`);
        const metaPath = path.join(contentDir, `${templateId}.meta.yml`);
        if (fs.existsSync(templatePath)) {
          fs.unlinkSync(templatePath);
        }
        if (fs.existsSync(metaPath)) {
          fs.unlinkSync(metaPath);
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

