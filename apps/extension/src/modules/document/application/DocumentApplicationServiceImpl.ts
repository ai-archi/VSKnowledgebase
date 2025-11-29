import { inject, injectable } from 'inversify';
import { TYPES } from '../../../infrastructure/di/types';
import { DocumentApplicationService } from './DocumentApplicationService';
import { ArtifactApplicationService } from '../../shared/application/ArtifactApplicationService';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { TemplateApplicationService } from '../../template/application/TemplateApplicationService';
import { VaultReference } from '../../shared/domain/value_object/VaultReference';
// Remove duplicate Result import - use the one from errors
import { Artifact } from '../../shared/domain/entity/artifact';
import { ArtifactError, ArtifactErrorCode, Result } from '../../shared/domain/errors';
import { Logger } from '../../../core/logger/Logger';
import { EventBus } from '../../../core/eventbus/EventBus';
import { TemplateStructureDomainServiceImpl } from '../../shared/domain/services/TemplateStructureDomainService';
import { ArtifactTemplate } from '../../shared/domain/entity/ArtifactTemplate';
import * as yaml from 'js-yaml';

@injectable()
export class DocumentApplicationServiceImpl implements DocumentApplicationService {
  constructor(
    @inject(TYPES.ArtifactApplicationService)
    private artifactService: ArtifactApplicationService,
    @inject(TYPES.VaultApplicationService)
    private vaultService: VaultApplicationService,
    @inject(TYPES.TemplateApplicationService)
    private templateService: TemplateApplicationService,
    @inject(TYPES.Logger)
    private logger: Logger,
    @inject(TYPES.EventBus)
    private eventBus: EventBus
  ) {}

  async listDocuments(vaultId: string): Promise<Result<Artifact[], ArtifactError>> {
    return this.artifactService.listArtifacts(vaultId);
  }

  async getDocument(vaultId: string, path: string): Promise<Result<Artifact, ArtifactError>> {
    return this.artifactService.getArtifact(vaultId, path);
  }

  async createDocument(
    vaultId: string,
    artifactPath: string,
    title: string,
    content: string
  ): Promise<Result<Artifact, ArtifactError>> {
    this.logger.info('[DocumentApplicationService] createDocument called', {
      vaultId,
      artifactPath,
      title,
      contentLength: content.length
    });

    const vaultResult = await this.vaultService.getVault(vaultId);
    if (!vaultResult.success) {
      this.logger.error('[DocumentApplicationService] Vault not found', { vaultId });
      return {
        success: false,
        error: new ArtifactError(ArtifactErrorCode.NOT_FOUND, `Vault not found: ${vaultId}`),
      };
    }

    this.logger.info('[DocumentApplicationService] Creating artifact', {
      vaultName: vaultResult.value.name,
      artifactPath
    });

    const result = await this.artifactService.createArtifact({
      vault: {
        id: vaultResult.value.id,
        name: vaultResult.value.name,
      },
      path: artifactPath,
      title,
      content,
      viewType: 'document',
    });

    if (result.success) {
      this.logger.info('[DocumentApplicationService] Artifact created successfully', {
        id: result.value.id,
        path: result.value.path
      });
      // 如果创建成功，发送事件通知视图刷新
      const folderPath = artifactPath.substring(0, artifactPath.lastIndexOf('/')) || '';
      this.eventBus.emit('document:created', {
        artifact: result.value,
        vaultName: vaultResult.value.name,
        folderPath,
      });
      this.logger.info('[DocumentApplicationService] document:created event emitted', {
        vaultName: vaultResult.value.name,
        folderPath
      });
    } else {
      this.logger.error('[DocumentApplicationService] Failed to create artifact', {
        error: result.error.message,
        errorCode: result.error.code,
        artifactPath
      });
    }

    return result;
  }

  async createFolder(
    vaultId: string,
    folderPath: string,
    folderName: string,
    templateId?: string
  ): Promise<Result<string, ArtifactError>> {
    const vaultResult = await this.vaultService.getVault(vaultId);
    if (!vaultResult.success) {
      return {
        success: false,
        error: new ArtifactError(ArtifactErrorCode.NOT_FOUND, `Vault not found: ${vaultId}`),
      };
    }

    const vault: VaultReference = {
      id: vaultResult.value.id,
      name: vaultResult.value.name,
    };

    // 构建目标文件夹路径（相对于 artifacts 目录）
    const targetFolderPath = folderPath === '' 
      ? `artifacts/${folderName}`
      : `artifacts/${folderPath}/${folderName}`;

    // 创建文件夹
    const createResult = await this.artifactService.createDirectory(vault, targetFolderPath);
    if (!createResult.success) {
      return createResult;
    }

    // 如果有模板 ID，读取模板文件并根据模板创建目录结构
    if (templateId) {
      // 读取模板
      const templateResult = await this.templateService.getTemplate(templateId, vaultId);
      if (!templateResult.success || templateResult.value.type !== 'structure') {
        this.logger.warn(`Template not found or not a structure template: ${templateId}`);
      } else {
        const template = templateResult.value;
        
        // 准备变量映射（支持 folderName 变量）
        const variables = {
          folderName: folderName,
        };

        // 读取模板文件内容（YAML 格式）
        const templatePath = `templates/structure/${templateId}.yml`;
        const templateContentResult = await this.artifactService.readFile(vault, templatePath);
        
        if (templateContentResult.success) {
          // 使用 jinja2 模板语言替换变量（处理 YAML 中的 {{variable}}）
          const templateStructureService = new TemplateStructureDomainServiceImpl();
          const renderedYaml = templateStructureService.renderTemplate(templateContentResult.value, variables);
          
          // 解析 YAML 为对象
          try {
            const yamlData = yaml.load(renderedYaml) as any;
            const structureArray = yamlData?.structure || (Array.isArray(yamlData) ? yamlData : null);
            
            if (structureArray && Array.isArray(structureArray)) {
              // 直接使用解析后的 YAML 数据创建 ArtifactTemplate 对象
              // 变量已经在 YAML 渲染时替换过了
              const artifactTemplate = new ArtifactTemplate(
                structureArray as any,
                variables,
                templateContentResult.value
              );
              
              if (artifactTemplate.isValid()) {
                // 使用 ArtifactTemplate 创建文件夹结构
                const structureResult = await this.artifactService.createFolderStructureFromTemplate(
                  vault,
                  targetFolderPath,
                  artifactTemplate
                );
                
                if (!structureResult.success) {
                  this.logger.error(`Failed to create structure from template: ${structureResult.error?.message}`, {
                    vaultId: vault.id,
                    folderName,
                    templateId,
                    error: structureResult.error
                  });
                }
              } else {
                this.logger.error('Failed to parse template structure', {
                  vaultId: vault.id,
                  folderName,
                  templateId
                });
              }
            } else {
              this.logger.error('Template structure is not an array', {
                vaultId: vault.id,
                folderName,
                templateId
              });
            }
          } catch (yamlError: any) {
            this.logger.error(`Failed to parse rendered YAML: ${yamlError.message}`, {
              vaultId: vault.id,
              folderName,
              templateId,
              error: yamlError
            });
          }
        } else {
          this.logger.warn(`Failed to read template file: ${templatePath}`, {
            vaultId: vault.id,
            templateId,
            error: templateContentResult.error
          });
        }
      }
    }

    // 返回创建的文件夹路径（相对于 artifacts 目录）
    const relativePath = folderPath === '' 
      ? folderName
      : `${folderPath}/${folderName}`;

    // 如果创建成功，发送事件通知视图刷新
    if (createResult.success) {
      this.logger.info('[DocumentApplicationService] Folder created successfully', {
        vaultName: vaultResult.value.name,
        relativePath
      });
      this.eventBus.emit('folder:created', {
        vaultName: vaultResult.value.name,
        folderPath: relativePath,
        parentFolderPath: folderPath,
      });
      this.logger.info('[DocumentApplicationService] folder:created event emitted', {
        vaultName: vaultResult.value.name,
        folderPath: relativePath
      });
    }

    return { success: true, value: relativePath };
  }

  async updateDocument(
    vaultId: string,
    artifactPath: string,
    content: string
  ): Promise<Result<Artifact, ArtifactError>> {
    // Get artifact first to get its ID
    const artifactResult = await this.artifactService.getArtifact(vaultId, artifactPath);
    if (!artifactResult.success) {
      return artifactResult;
    }

    // Update content
    const updateResult = await this.artifactService.updateArtifactContent(
      vaultId,
      artifactResult.value.id,
      content
    );
    if (!updateResult.success) {
      return {
        success: false,
        error: updateResult.error,
      };
    }

    // Get updated artifact
    return this.artifactService.getArtifact(vaultId, artifactPath);
  }

  async deleteDocument(vaultId: string, path: string): Promise<Result<void, ArtifactError>> {
    return this.artifactService.deleteArtifact(vaultId, path);
  }
}

