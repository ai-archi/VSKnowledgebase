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
    templateId?: string,
    content?: string
  ): Promise<Result<Artifact, ArtifactError>> {
    this.logger.info('[DocumentApplicationService] createDocument called', {
      vaultId,
      artifactPath,
      title,
      templateId,
      hasContent: !!content
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
      artifactPath,
      templateId,
      hasContent: !!content
    });

    // 直接传递 templateId 给 ArtifactApplicationService，让它处理模板渲染
    const result = await this.artifactService.createArtifact({
      vault: {
        id: vaultResult.value.id,
        name: vaultResult.value.name,
      },
      path: artifactPath,
      title,
      templateId: templateId, // 传递模板ID，ArtifactApplicationService 会处理渲染
      content: content, // 如果提供了内容，也会使用
      viewType: 'document',
    });

    if (result.success) {
      this.logger.info('[DocumentApplicationService] Artifact created successfully', {
        id: result.value.id,
        path: result.value.path,
        contentLocation: result.value.contentLocation,
        vaultName: vaultResult.value.name
      });
      if (!result.value.contentLocation) {
        this.logger.error('[DocumentApplicationService] contentLocation is missing in created artifact!', {
          artifact: result.value
        });
      }
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

    // 构建目标文件夹路径（新结构：直接放在 vault 根目录，不再使用 artifacts 子目录）
    const targetFolderPath = folderPath === '' 
      ? folderName
      : `${folderPath}/${folderName}`;

    // 创建文件夹
    const createResult = await this.artifactService.createDirectory(vault, targetFolderPath);
    if (!createResult.success) {
      return createResult;
    }

    // 如果有模板 ID，读取模板文件并根据模板创建目录结构
    if (templateId) {
      // 准备变量映射（支持 folderName 变量）
      const variables = {
        folderName: folderName,
      };

      // 从模板ID中提取 vault 名称和文件路径
      // 模板ID格式可能是：
      // 1. microservice-template (只有模板名称，从当前 vault 查找)
      // 2. Demo Vault - AI Enhancement/archi-templates/structure/microservice-template.yml (完整路径，包含 vault 名称)
      // 3. archi-templates/structure/microservice-template.yml (相对路径，从当前 vault 查找)
      let templateVault: VaultReference = vault; // 默认使用目标 vault
      let templateFilePath: string;
      
      if (templateId.includes('/')) {
        const parts = templateId.split('/');
        // 检查第一部分是否是 vault 名称（不是 "archi-templates"）
        if (!templateId.startsWith('archi-templates/') && parts.length > 1) {
          // 第一部分可能是 vault 名称，尝试查找该 vault
          const vaultName = parts[0];
          const vaultsResult = await this.vaultService.listVaults();
          if (vaultsResult.success) {
            const templateVaultFound = vaultsResult.value.find(v => v.name === vaultName);
            if (templateVaultFound) {
              templateVault = { id: templateVaultFound.id, name: templateVaultFound.name };
              // 去掉 vault 名称前缀，获取相对路径
              templateFilePath = parts.slice(1).join('/');
              this.logger.info('Template found in different vault', {
                templateVaultId: templateVault.id,
                templateVaultName: templateVault.name,
                templateFilePath,
                targetVaultId: vault.id
              });
            } else {
              // 如果找不到 vault，假设第一部分不是 vault 名称，使用当前 vault
              templateFilePath = templateId;
              this.logger.warn('Vault not found in templateId, using target vault', {
                vaultName,
                templateId,
                targetVaultId: vault.id
              });
            }
          } else {
            // 如果获取 vault 列表失败，使用当前 vault
            templateFilePath = templateId;
          }
        } else if (templateId.startsWith('archi-templates/')) {
          // 已经是相对路径格式：archi-templates/structure/microservice-template.yml
          templateFilePath = templateId;
        } else {
          // 其他格式，尝试构建路径
          const fileName = parts[parts.length - 1];
          if (fileName.includes('.')) {
            templateFilePath = `archi-templates/structure/${fileName}`;
          } else {
            templateFilePath = `archi-templates/structure/${fileName}.yml`;
          }
        }
      } else {
        // 如果只是模板名称，构建完整路径
        templateFilePath = `archi-templates/structure/${templateId}.yml`;
      }

      this.logger.info('Reading template file', {
        templateId,
        templateVaultId: templateVault.id,
        templateVaultName: templateVault.name,
        templateFilePath,
        targetVaultId: vault.id
      });

      // 从模板所在的 vault 读取模板文件内容（YAML 格式）
      const templateContentResult = await this.artifactService.readFile(templateVault, templateFilePath);
      
      if (templateContentResult.success) {
        this.logger.info('Template file read successfully, rendering and parsing', {
          templateId,
          templateFilePath,
          contentLength: templateContentResult.value.length
        });

        // 使用 jinja2 模板语言替换变量（处理 YAML 中的 {{variable}}）
        const templateStructureService = new TemplateStructureDomainServiceImpl();
        const renderedYaml = templateStructureService.renderTemplate(templateContentResult.value, variables);
        
        this.logger.debug('Template rendered with variables', {
          templateId,
          variables,
          renderedLength: renderedYaml.length
        });
        
        // 解析 YAML 为对象
        try {
          const yamlData = yaml.load(renderedYaml) as any;
          const structureArray = yamlData?.structure || (Array.isArray(yamlData) ? yamlData : null);
          
          if (structureArray && Array.isArray(structureArray)) {
            this.logger.info('Template structure parsed successfully', {
              templateId,
              structureItemCount: structureArray.length,
              firstItem: structureArray[0] ? {
                type: structureArray[0].type,
                name: structureArray[0].name,
                hasChildren: !!(structureArray[0].children && structureArray[0].children.length > 0)
              } : null
            });

            // 直接使用解析后的 YAML 数据创建 ArtifactTemplate 对象
            // 变量已经在 YAML 渲染时替换过了
            const artifactTemplate = new ArtifactTemplate(
              structureArray as any,
              variables,
              templateContentResult.value
            );
            
            if (artifactTemplate.isValid()) {
              this.logger.info('ArtifactTemplate is valid, creating folder structure', {
                templateId,
                targetVaultId: vault.id,
                targetFolderPath: targetFolderPath,
                structureItemCount: artifactTemplate.structure.length
              });

              // 使用 ArtifactTemplate 创建文件夹结构
              // targetFolderPath 是相对于 vault 根目录的路径（不包含 artifacts/ 前缀）
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
                  templateFilePath,
                  targetFolderPath,
                  error: structureResult.error
                });
              } else {
                this.logger.info('Folder structure created successfully from template', {
                  vaultId: vault.id,
                  folderName,
                  templateId,
                  targetFolderPath
                });
              }
            } else {
              this.logger.error('Failed to parse template structure - ArtifactTemplate is invalid', {
                vaultId: vault.id,
                folderName,
                templateId,
                templateFilePath,
                structureArray
              });
            }
          } else {
            this.logger.error('Template structure is not an array', {
              vaultId: vault.id,
              folderName,
              templateId,
              templateFilePath,
              yamlData
            });
          }
        } catch (yamlError: any) {
          this.logger.error(`Failed to parse rendered YAML: ${yamlError.message}`, {
            vaultId: vault.id,
            folderName,
            templateId,
            templateFilePath,
            error: yamlError,
            stack: yamlError.stack
          });
        }
      } else {
        this.logger.error(`Failed to read template file: ${templateFilePath}`, {
          vaultId: vault.id,
          templateVaultId: templateVault.id,
          templateVaultName: templateVault.name,
          templateId,
          templateFilePath,
          error: templateContentResult.error
        });
      }
    }

    // 返回创建的文件夹路径（相对于 vault 根目录）
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

