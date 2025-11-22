import { injectable, inject } from 'inversify';
import { TYPES } from '../../../infrastructure/di/types';
import {
  TemplateApplicationService,
  Template,
  TemplateLibrary,
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
   * 获取所有模板库
   */
  async getTemplateLibraries(vaultId?: string): Promise<Result<TemplateLibrary[], ArtifactError>> {
    try {
      const libraries: TemplateLibrary[] = [];

      if (vaultId) {
        const library = await this.loadTemplateLibraryFromVault(vaultId, vaultId);
        if (library.success && library.value) {
          libraries.push(library.value);
        }
      } else {
        // 从所有 Vault 加载
        const vaultsRoot = this.vaultAdapter.getVaultsRoot();
        if (fs.existsSync(vaultsRoot)) {
          const vaults = fs.readdirSync(vaultsRoot, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

          for (const vaultName of vaults) {
            const templatesDir = path.join(vaultsRoot, vaultName, 'templates');
            if (fs.existsSync(templatesDir)) {
              const libraryDirs = fs.readdirSync(templatesDir, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);

              for (const libraryName of libraryDirs) {
                const libraryResult = await this.loadTemplateLibraryFromVault(vaultName, libraryName);
                if (libraryResult.success && libraryResult.value) {
                  libraries.push(libraryResult.value);
                }
              }
            }
          }
        }
      }

      return { success: true, value: libraries };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to get template libraries: ${error.message}`,
          { vaultId },
          error
        ),
      };
    }
  }

  /**
   * 从 Vault 加载模板库
   */
  private async loadTemplateLibraryFromVault(
    vaultId: string,
    libraryName: string
  ): Promise<Result<TemplateLibrary | null, ArtifactError>> {
    try {
      const vaultPath = this.vaultAdapter.getVaultPath(vaultId);
      const libraryPath = path.join(vaultPath, 'templates', libraryName);

      if (!fs.existsSync(libraryPath)) {
        return { success: true, value: null };
      }

      const templates: Template[] = [];

      // 加载结构模板
      const structureDir = path.join(libraryPath, 'structure');
      if (fs.existsSync(structureDir)) {
        const files = fs.readdirSync(structureDir);
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
              libraryName,
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
      const contentDir = path.join(libraryPath, 'content');
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
              libraryName,
              content,
              variables: this.extractVariables(content),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }

      const library: TemplateLibrary = {
        name: libraryName,
        description: undefined, // TODO: 从 README.md 读取
        vaultId,
        templates,
      };

      return { success: true, value: library };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to load template library: ${error.message}`,
          { vaultId, libraryName },
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
   * 获取模板库
   */
  async getTemplateLibrary(libraryName: string, vaultId: string): Promise<Result<TemplateLibrary, ArtifactError>> {
    const result = await this.loadTemplateLibraryFromVault(vaultId, libraryName);
    if (result.success && result.value) {
      return { success: true, value: result.value };
    }
    return {
      success: false,
      error: new ArtifactError(ArtifactErrorCode.NOT_FOUND, `Template library not found: ${libraryName}`, { libraryName, vaultId }),
    };
  }

  /**
   * 获取模板
   */
  async getTemplate(templateId: string, libraryName: string, vaultId: string): Promise<Result<Template, ArtifactError>> {
    const libraryResult = await this.getTemplateLibrary(libraryName, vaultId);
    if (!libraryResult.success) {
      return libraryResult;
    }

    const template = libraryResult.value.templates.find(t => t.id === templateId);
    if (!template) {
      return {
        success: false,
        error: new ArtifactError(ArtifactErrorCode.NOT_FOUND, `Template not found: ${templateId}`, { templateId, libraryName, vaultId }),
      };
    }

    return { success: true, value: template };
  }

  /**
   * 创建模板
   */
  async createTemplate(
    vaultId: string,
    libraryName: string,
    template: Omit<Template, 'id' | 'createdAt' | 'updatedAt' | 'libraryName'>
  ): Promise<Result<Template, ArtifactError>> {
    try {
      const templateId = uuidv4();
      const now = new Date().toISOString();

      const fullTemplate: Template = {
        ...template,
        id: templateId,
        libraryName,
        createdAt: now,
        updatedAt: now,
      };

      const vaultPath = this.vaultAdapter.getVaultPath(vaultId);
      const libraryPath = path.join(vaultPath, 'templates', libraryName);

      // 确保模板库目录存在
      if (!fs.existsSync(libraryPath)) {
        fs.mkdirSync(libraryPath, { recursive: true });
      }

      // 根据模板类型保存到不同目录
      if (template.type === 'structure') {
        const structureDir = path.join(libraryPath, 'structure');
        if (!fs.existsSync(structureDir)) {
          fs.mkdirSync(structureDir, { recursive: true });
        }
        const templatePath = path.join(structureDir, `${templateId}.yml`);
        fs.writeFileSync(templatePath, yaml.dump(fullTemplate), 'utf-8');
      } else {
        const contentDir = path.join(libraryPath, 'content');
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
          libraryName,
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
          { vaultId, libraryName, template },
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
    libraryName: string,
    templateId: string,
    updates: Partial<Template>
  ): Promise<Result<Template, ArtifactError>> {
    const templateResult = await this.getTemplate(templateId, libraryName, vaultId);
    if (!templateResult.success) {
      return templateResult;
    }

    const updatedTemplate: Template = {
      ...templateResult.value,
      ...updates,
      id: templateId,
      libraryName,
      updatedAt: new Date().toISOString(),
    };

    // 重新保存模板
    const vaultPath = this.vaultAdapter.getVaultPath(vaultId);
    const libraryPath = path.join(vaultPath, 'templates', libraryName);

    if (updatedTemplate.type === 'structure') {
      const structureDir = path.join(libraryPath, 'structure');
      const templatePath = path.join(structureDir, `${templateId}.yml`);
      fs.writeFileSync(templatePath, yaml.dump(updatedTemplate), 'utf-8');
    } else {
      const contentDir = path.join(libraryPath, 'content');
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
        libraryName,
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
  async deleteTemplate(vaultId: string, libraryName: string, templateId: string): Promise<Result<void, ArtifactError>> {
    try {
      const templateResult = await this.getTemplate(templateId, libraryName, vaultId);
      if (!templateResult.success) {
        return templateResult;
      }

      const template = templateResult.value;
      const vaultPath = this.vaultAdapter.getVaultPath(vaultId);
      const libraryPath = path.join(vaultPath, 'templates', libraryName);

      if (template.type === 'structure') {
        const structureDir = path.join(libraryPath, 'structure');
        const templatePath = path.join(structureDir, `${templateId}.yml`);
        if (fs.existsSync(templatePath)) {
          fs.unlinkSync(templatePath);
        }
      } else {
        const contentDir = path.join(libraryPath, 'content');
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
          { vaultId, libraryName, templateId },
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

      // 查找模板（需要知道模板库名称）
      // 简化处理：遍历所有模板库查找
      const librariesResult = await this.getTemplateLibraries(opts.vaultId);
      if (!librariesResult.success) {
        return librariesResult;
      }

      let template: Template | undefined;
      for (const library of librariesResult.value) {
        template = library.templates.find(t => t.id === opts.templateId);
        if (template) {
          break;
        }
      }

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

