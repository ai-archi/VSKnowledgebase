import { inject, injectable } from 'inversify';
import { TYPES } from '../../../infrastructure/di/types';
import { DocumentApplicationService } from './DocumentApplicationService';
import { ArtifactApplicationService } from '../../shared/application/ArtifactApplicationService';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { MetadataRepository } from '../../shared/infrastructure/MetadataRepository';
import { VaultReference } from '../../shared/domain/value_object/VaultReference';
import { Artifact } from '../../shared/domain/entity/artifact';
import { ArtifactError, ArtifactErrorCode, Result } from '../../shared/domain/errors';
import { Logger } from '../../../core/logger/Logger';
import { TemplateStructureDomainServiceImpl, TemplateStructureItem } from '../../shared/domain/services/TemplateStructureDomainService';
import { ArtifactTemplate } from '../../shared/domain/entity/ArtifactTemplate';
import { FolderMetadata } from '../../shared/domain/FolderMetadata';
import { YamlFolderMetadataRepository } from '../../shared/infrastructure/storage/yaml/YamlFolderMetadataRepository';
import { ConfigManager } from '../../../core/config/ConfigManager';
import { v4 as uuidv4 } from 'uuid';
import * as yaml from 'js-yaml';
import * as vscode from 'vscode';
import * as path from 'path';

@injectable()
export class DocumentApplicationServiceImpl implements DocumentApplicationService {
  constructor(
    @inject(TYPES.ArtifactApplicationService)
    private artifactService: ArtifactApplicationService,
    @inject(TYPES.VaultApplicationService)
    private vaultService: VaultApplicationService,
    @inject(TYPES.MetadataRepository)
    private metadataRepo: MetadataRepository,
    @inject(TYPES.Logger)
    private logger: Logger,
    @inject(TYPES.ConfigManager)
    private configManager: ConfigManager
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
    }

    return result;
  }

  async createFolder(
    vaultId: string,
    folderPath: string,
    folderName: string,
    templateId?: string,
    subFolderPath?: string
  ): Promise<Result<string, ArtifactError>> {
    this.logger.info('[DocumentApplicationService] createFolder called', {
      vaultId,
      folderPath,
      folderName,
      templateId
    });

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
      // 模板ID必须是完整路径，格式可能是：
      // 1. archi-templates/structure/microservice-template.yml (相对路径，从当前 vault 根目录开始)
      // 2. vault-name/archi-templates/structure/microservice-template.yml (完整路径，包含 vault 名称，用于跨 vault 引用)
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
          // 其他格式，直接使用（可能是相对路径）
          templateFilePath = templateId;
        }
      } else {
        // 如果模板ID不包含路径分隔符，说明格式不正确
        // 模板ID必须是完整路径，从 vault 根目录开始，例如：vault-assistant/archi-templates/structure/microservice-template.yml
        this.logger.error('Template ID must be a full path', {
          templateId,
          targetVaultId: vault.id
        });
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.INVALID_INPUT,
            `Template ID must be a full path from vault root (e.g., vault-assistant/archi-templates/structure/microservice-template.yml), got: ${templateId}`,
            { templateId, vaultId: vault.id }
          ),
        };
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
              allItems: structureArray.map((item: any) => ({
                type: item.type,
                name: item.name,
                hasChildren: !!(item.children && item.children.length > 0)
              })),
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
                subFolderPath: subFolderPath,
                structureItemCount: artifactTemplate.structure.length
              });

              // 如果指定了子文件夹路径，只创建该子文件夹的内容（children），不包含子文件夹本身
              let structureToCreate = artifactTemplate.structure;
              if (subFolderPath) {
                const subFolderItem = this.findSubFolderInStructure(artifactTemplate.structure, subFolderPath);
                if (subFolderItem) {
                  // 只创建子文件夹的内容，不创建子文件夹本身
                  structureToCreate = subFolderItem.children || [];
                  this.logger.info('Found subfolder in template structure, creating only its children', {
                    subFolderPath,
                    subFolderName: subFolderItem.name,
                    childrenCount: structureToCreate.length,
                    hasChildren: !!(subFolderItem.children && subFolderItem.children.length > 0)
                  });
                } else {
                  this.logger.warn('Subfolder not found in template structure, creating full structure', {
                    subFolderPath,
                    templateId
                  });
                }
              }

              // 使用 ArtifactTemplate 创建文件夹结构
              // targetFolderPath 是相对于 vault 根目录的路径（不包含 artifacts/ 前缀）
              const structureResult = await this.artifactService.createFolderStructureFromTemplate(
                vault,
                targetFolderPath,
                new ArtifactTemplate(structureToCreate, artifactTemplate.variables, artifactTemplate.rawTemplate)
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

                // 递归为所有文件夹创建元数据
                await this.createMetadataForAllFolders(
                  vault.id,
                  vault.name,
                  targetFolderPath,
                  structureToCreate,
                  {
                    templateId: templateId,
                    templatePath: templateFilePath,
                    templateVaultId: templateVault.id,
                    templateVaultName: templateVault.name,
                    variables: variables
                  }
                );
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

    this.logger.info('[DocumentApplicationService] Folder created successfully', {
      vaultName: vaultResult.value.name,
      relativePath
    });

    // 触发文档视图刷新，以便新创建的文件夹能够显示出来
    // 使用 setTimeout 确保刷新在下一个事件循环中执行，避免阻塞当前操作
    setTimeout(() => {
      vscode.commands.executeCommand('archi.document.refresh').then(
        () => {
          // 刷新成功
        },
        (err: any) => {
          this.logger.warn('[DocumentApplicationService] Failed to refresh document view', { error: err });
        }
      );
    }, 100);

    return { success: true, value: relativePath };
  }

  async updateDocument(
    vaultId: string,
    path: string,
    content: string
  ): Promise<Result<Artifact, ArtifactError>> {
    // Get artifact first to get its ID
    const artifactResult = await this.artifactService.getArtifact(vaultId, path);
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
    return this.artifactService.getArtifact(vaultId, path);
  }

  async deleteDocument(vaultId: string, path: string): Promise<Result<void, ArtifactError>> {
    // 先检查是文件还是文件夹
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

    // 先检查文件是否存在
    const existsResult = await this.artifactService.exists(vault, path);
    if (!existsResult.success) {
      // 如果检查失败，可能是占位文件，尝试从 expectedFiles 中移除
      const removeResult = await this.removeExpectedFile(vaultId, path);
      if (removeResult.success) {
        return { success: true, value: undefined };
      }
      return {
        success: false,
        error: existsResult.error,
      };
    }

    // 如果文件不存在，可能是占位文件，尝试从 expectedFiles 中移除
    if (!existsResult.value) {
      const removeResult = await this.removeExpectedFile(vaultId, path);
      if (removeResult.success) {
        return { success: true, value: undefined };
      }
      // 如果移除失败，返回文件不存在的错误
      return {
        success: false,
        error: new ArtifactError(ArtifactErrorCode.NOT_FOUND, `File not found: ${path}`),
      };
    }

    // 检查是文件还是文件夹
    const isDirResult = await this.artifactService.isDirectory(vault, path);
    if (!isDirResult.success) {
      return {
        success: false,
        error: isDirResult.error,
      };
    }

    const isDirectory = isDirResult.value;

    // 如果是文件夹，在删除之前先获取子文件夹列表（用于后续删除 metadata）
    let subFolders: string[] = [];
    if (isDirectory) {
      subFolders = await this.getSubFoldersForMetadataDeletion(vaultId, path, vault);
    }

    // 删除文件或文件夹
    const deleteResult = await this.artifactService.deleteArtifact(vaultId, path);
    if (!deleteResult.success) {
      return deleteResult;
    }

    // 删除成功后，处理 metadata
    if (isDirectory) {
      // 如果是文件夹，删除文件夹的 metadata 和所有子文件夹的 metadata
      // 先递归删除子文件夹的 metadata
      for (const subFolderPath of subFolders) {
        await this.deleteFolderMetadataRecursive(vaultId, subFolderPath);
      }
      // 最后删除当前文件夹的 metadata
      await this.deleteFolderMetadata(vaultId, path);
    }
    // 如果是文件，不需要更新父文件夹的 metadata
    // expectedFiles 始终保持模板定义的所有文件列表，不管文件是否已创建

    return { success: true, value: undefined };
  }

  /**
   * 获取文件夹的所有子文件夹路径（用于删除 metadata）
   */
  private async getSubFoldersForMetadataDeletion(
    vaultId: string,
    folderPath: string,
    vault: VaultReference
  ): Promise<string[]> {
    const subFolders: string[] = [];

    try {
      // 从 metadata 中获取预期子文件夹
      const metadata = await this.readFolderMetadata(vaultId, folderPath);
      if (metadata?.expectedFolders) {
        for (const expectedFolder of metadata.expectedFolders) {
          const subFolderPath = folderPath === ''
            ? expectedFolder.path
            : `${folderPath}/${expectedFolder.path}`;
          subFolders.push(subFolderPath);
          
          // 递归获取子文件夹的子文件夹
          const nestedSubFolders = await this.getSubFoldersForMetadataDeletion(
            vaultId,
            subFolderPath,
            vault
          );
          subFolders.push(...nestedSubFolders);
        }
      }

      // 也从文件系统中列出实际存在的子文件夹（以防 metadata 不完整）
      const listResult = await this.artifactService.listDirectory(vault, folderPath, {
        includeHidden: false,
      });
      
      if (listResult.success) {
        for (const node of listResult.value) {
          if (node.isDirectory) {
            // node.path 是相对于 vault 根目录的完整路径
            const subFolderPath = node.path;
            if (!subFolders.includes(subFolderPath)) {
              subFolders.push(subFolderPath);
              
              // 递归获取子文件夹的子文件夹
              const nestedSubFolders = await this.getSubFoldersForMetadataDeletion(
                vaultId,
                subFolderPath,
                vault
              );
              for (const nested of nestedSubFolders) {
                if (!subFolders.includes(nested)) {
                  subFolders.push(nested);
                }
              }
            }
          }
        }
      }
    } catch (error: any) {
      this.logger.error('Failed to get sub folders for metadata deletion', {
        vaultId,
        folderPath,
        error: error.message
      });
    }

    return subFolders;
  }

  /**
   * 删除单个文件夹的 metadata
   * 包括两种类型的 metadata：
   * 1. FolderMetadata（模板信息，通过 YamlFolderMetadataRepository 管理）
   * 2. ArtifactMetadata（关联关系，通过 MetadataRepository 管理，格式为 folder:vaultId:folderPath）
   */
  private async deleteFolderMetadata(vaultId: string, folderPath: string): Promise<void> {
    try {
      // 1. 删除 FolderMetadata（模板信息）
      const architoolRoot = this.configManager.getArchitoolRoot();
      const vaultPath = path.join(architoolRoot, vaultId);
      const yamlRepo = new YamlFolderMetadataRepository(vaultPath);
      const findResult = await yamlRepo.findByFolderPath(folderPath);
      if (findResult.success && findResult.value) {
        const deleteResult = await yamlRepo.deleteMetadata(findResult.value.id);
        if (deleteResult.success) {
          this.logger.info('[DocumentApplicationService] FolderMetadata deleted successfully', {
            vaultId,
            folderPath,
            metadataId: findResult.value.id
          });
        } else {
          this.logger.warn('[DocumentApplicationService] Failed to delete FolderMetadata', {
            vaultId,
            folderPath,
            metadataId: findResult.value.id,
            error: deleteResult.error?.message
          });
        }
      } else {
        this.logger.debug('[DocumentApplicationService] FolderMetadata not found for deletion', {
          vaultId,
          folderPath
        });
      }

      // 2. 删除 ArtifactMetadata（关联关系，使用 folder:vaultId:folderPath 格式）
      const folderArtifactId = `folder:${vaultId}:${folderPath}`;
      this.logger.info('[DocumentApplicationService] Trying to delete ArtifactMetadata for folder', {
        vaultId,
        folderPath,
        folderArtifactId
      });
      
      const metadataByFolderFormatResult = await this.metadataRepo.findByArtifactId(folderArtifactId);
      if (metadataByFolderFormatResult.success && metadataByFolderFormatResult.value) {
        const metadata = metadataByFolderFormatResult.value;
        this.logger.info('[DocumentApplicationService] Found ArtifactMetadata for folder, deleting', {
          metadataId: metadata.id,
          folderArtifactId
        });
        const deleteMetadataResult = await this.metadataRepo.delete(metadata.id);
        if (!deleteMetadataResult.success) {
          this.logger.warn('[DocumentApplicationService] Failed to delete ArtifactMetadata for folder', {
            metadataId: metadata.id,
            folderArtifactId,
            error: deleteMetadataResult.error?.message
          });
        } else {
          this.logger.info('[DocumentApplicationService] ArtifactMetadata deleted successfully for folder', {
            metadataId: metadata.id,
            folderArtifactId
          });
        }
      } else {
        this.logger.debug('[DocumentApplicationService] ArtifactMetadata not found for folder', {
          vaultId,
          folderPath,
          folderArtifactId
        });
      }
    } catch (error: any) {
      this.logger.error('[DocumentApplicationService] Failed to delete folder metadata', {
        vaultId,
        folderPath,
        error: error.message
      });
    }
  }

  /**
   * 递归删除文件夹及其所有子文件夹的 metadata
   * 注意：此方法假设文件夹已经被删除，只删除 metadata 文件
   */
  private async deleteFolderMetadataRecursive(vaultId: string, folderPath: string): Promise<void> {
    try {
      // 先尝试读取 metadata 获取子文件夹列表
      const metadata = await this.readFolderMetadata(vaultId, folderPath);
      const subFolders: string[] = [];

      if (metadata?.expectedFolders) {
        // 从 metadata 中获取预期子文件夹
        for (const expectedFolder of metadata.expectedFolders) {
          const subFolderPath = folderPath === ''
            ? expectedFolder.path
            : `${folderPath}/${expectedFolder.path}`;
          subFolders.push(subFolderPath);
        }
      }

      // 递归删除所有子文件夹的 metadata（在删除当前文件夹之前）
      for (const subFolderPath of subFolders) {
        await this.deleteFolderMetadataRecursive(vaultId, subFolderPath);
      }

      // 最后删除当前文件夹的 metadata
      await this.deleteFolderMetadata(vaultId, folderPath);
    } catch (error: any) {
      this.logger.error('Failed to delete folder metadata recursively', {
        vaultId,
        folderPath,
        error: error.message
      });
    }
  }

  /**
   * 递归为所有文件夹创建元数据
   */
  private async createMetadataForAllFolders(
    vaultId: string,
    vaultName: string,
    baseFolderPath: string,
    structureItems: Array<{ type: string; name: string; description?: string; template?: string; children?: any[] }>,
    templateInfo: {
      templateId: string;
      templatePath: string;
      templateVaultId: string;
      templateVaultName: string;
      variables: Record<string, string>;
    }
  ): Promise<void> {
    // 为当前文件夹创建元数据
    // metadataId 生成规则：使用 UUID（如：94d488d4-47db-4697-b9df-dd764ee391e3）
    const metadataId = uuidv4();
    const expectedFiles = this.extractExpectedFiles(structureItems);
    const expectedFolders = this.extractExpectedFolders(structureItems);

    const folderMetadata: FolderMetadata = {
      id: metadataId, // 使用 metadataId 作为元数据文件名称（.metadata/{metadataId}.metadata.yml）
      folderPath: baseFolderPath,
      vaultId: vaultId,
      vaultName: vaultName,
      templateInfo: {
        templateId: templateInfo.templateId,
        templatePath: templateInfo.templatePath,
        templateVaultId: templateInfo.templateVaultId,
        templateVaultName: templateInfo.templateVaultName,
        createdAt: new Date().toISOString(),
        variables: templateInfo.variables
      },
      // 存储当前文件夹对应的模板结构（只包含直接子项）
      templateStructure: {
        type: 'directory' as const,
        name: path.basename(baseFolderPath),
        children: structureItems.map(item => ({
          type: item.type as 'directory' | 'file',
          name: item.name,
          description: item.description,
          template: item.template,
          // 注意：这里只存储直接子项，不递归存储所有子项
          children: item.children as any
        }))
      },
      expectedFiles: expectedFiles.length > 0 ? expectedFiles : undefined,
      expectedFolders: expectedFolders.length > 0 ? expectedFolders : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 保存当前文件夹的元数据
    await this.saveFolderMetadata(vaultId, folderMetadata);

    // 递归处理子文件夹
    for (const item of structureItems) {
      if (item.type === 'directory' && item.children) {
        const subFolderPath = baseFolderPath === ''
          ? item.name
          : `${baseFolderPath}/${item.name}`;
        
        // 递归为子文件夹创建元数据
        await this.createMetadataForAllFolders(
          vaultId,
          vaultName,
          subFolderPath,
          item.children,
          templateInfo
        );
      }
    }
  }

  /**
   * 在模板结构中查找指定的子文件夹
   * @param structure 模板结构数组
   * @param subFolderPath 子文件夹路径，例如 "domain" 或 "domain/subdomain"
   * @returns 找到的子文件夹项，如果未找到则返回 null
   */
  private findSubFolderInStructure(
    structure: Array<{ type: string; name: string; description?: string; template?: string; children?: any[] }>,
    subFolderPath: string
  ): TemplateStructureItem | null {
    if (!subFolderPath || subFolderPath.trim() === '') {
      return null;
    }

    const pathParts = subFolderPath.split('/').filter(p => p.trim() !== '');
    if (pathParts.length === 0) {
      return null;
    }

    // 递归查找
    const findInItems = (
      items: Array<{ type: string; name: string; description?: string; template?: string; children?: any[] }>,
      remainingPath: string[]
    ): TemplateStructureItem | null => {
      if (remainingPath.length === 0) {
        return null;
      }

      const targetName = remainingPath[0];
      const foundItem = items.find(item => item.type === 'directory' && item.name === targetName);

      if (!foundItem) {
        return null;
      }

      // 如果这是最后一个路径部分，返回找到的项（确保类型正确）
      if (remainingPath.length === 1) {
        // 类型断言，因为我们已经验证了 type === 'directory'
        return {
          type: 'directory' as const,
          name: foundItem.name,
          description: foundItem.description,
          children: foundItem.children as TemplateStructureItem[] | undefined,
        };
      }

      // 继续在子项中查找
      if (foundItem.children && Array.isArray(foundItem.children)) {
        return findInItems(foundItem.children, remainingPath.slice(1));
      }

      return null;
    };

    return findInItems(structure, pathParts);
  }

  /**
   * 从模板结构中提取预期文件列表（只提取直接子文件，不包括子文件夹中的文件）
   */
  private extractExpectedFiles(structure: Array<{ type: string; name: string; description?: string; template?: string; children?: any[] }>): Array<{
    path: string;
    name: string;
    extension?: string;
    description?: string;
    template?: string;
  }> {
    const expectedFiles: Array<{
      path: string;
      name: string;
      extension?: string;
      description?: string;
      template?: string;
    }> = [];

    for (const item of structure) {
      if (item.type === 'file') {
        // 提取文件名和扩展名
        const fileName = item.name;
        const extMatch = fileName.match(/\.([^.]+)$/);
        const extension = extMatch ? extMatch[1] : undefined;
        const nameWithoutExt = extension ? fileName.substring(0, fileName.length - extension.length - 1) : fileName;

        expectedFiles.push({
          path: fileName, // 相对于文件夹的路径
          name: nameWithoutExt,
          extension: extension,
          description: item.description,
          template: item.template
        });
      }
    }

    return expectedFiles;
  }

  /**
   * 从模板结构中提取预期子文件夹列表（只提取直接子文件夹）
   */
  private extractExpectedFolders(structure: Array<{ type: string; name: string; description?: string; children?: any[] }>): Array<{
    path: string;
    name: string;
    description?: string;
    structure?: any;
  }> {
    const expectedFolders: Array<{
      path: string;
      name: string;
      description?: string;
      structure?: any;
    }> = [];

    for (const item of structure) {
      if (item.type === 'directory') {
        expectedFolders.push({
          path: item.name, // 相对于当前文件夹的路径
          name: item.name,
          description: item.description,
          structure: item.children ? {
            type: 'directory',
            name: item.name,
            children: item.children
          } : undefined
        });
      }
    }

    return expectedFolders;
  }

  /**
   * 保存文件夹元数据
   */
  /**
   * 保存文件夹元数据
   * 元数据文件使用 metadata.id 作为文件名：.metadata/{metadata.id}.metadata.yml
   */
  private async saveFolderMetadata(vaultId: string, metadata: FolderMetadata): Promise<void> {
    try {
      const architoolRoot = this.configManager.getArchitoolRoot();
      const vaultPath = path.join(architoolRoot, vaultId);
      const yamlRepo = new YamlFolderMetadataRepository(vaultPath);
      // 使用 metadata.id 作为 metadataId 保存元数据文件
      const result = await yamlRepo.writeMetadata(metadata);
      if (!result.success) {
        this.logger.error('Failed to save folder metadata', {
          vaultId,
          folderPath: metadata.folderPath,
          error: result.error
        });
      } else {
        this.logger.info('Folder metadata saved successfully', {
          vaultId,
          folderPath: metadata.folderPath,
          metadataId: metadata.id
        });
      }
    } catch (error: any) {
      this.logger.error('Failed to save folder metadata', {
        vaultId,
        folderPath: metadata.folderPath,
        error: error.message
      });
    }
  }

  /**
   * 读取文件夹元数据（实现接口方法）
   * 通过 folderPath 查找元数据文件（因为使用 UUID 作为文件名）
   */
  async readFolderMetadata(vaultId: string, folderPath: string): Promise<FolderMetadata | null> {
    try {
      // 如果 folderPath 为空，无法读取元数据（根目录没有元数据）
      if (!folderPath || folderPath === '') {
        return null;
      }

      const architoolRoot = this.configManager.getArchitoolRoot();
      const vaultPath = path.join(architoolRoot, vaultId);
      const yamlRepo = new YamlFolderMetadataRepository(vaultPath);
      // 通过 folderPath 查找元数据文件（因为使用 UUID 作为文件名）
      const result = await yamlRepo.findByFolderPath(folderPath);
      
      if (result.success && result.value) {
        this.logger.debug('Folder metadata read successfully', {
          vaultId,
          folderPath,
          metadataId: result.value.id,
          expectedFilesCount: result.value.expectedFiles?.length || 0
        });
        return result.value;
      } else {
        // result.success 为 false 时，result 有 error 属性
        const errorMessage = result.success === false ? result.error?.message : undefined;
        this.logger.debug('Folder metadata not found', {
          vaultId,
          folderPath,
          error: errorMessage
        });
      }
      return null;
    } catch (error: any) {
      this.logger.error('Failed to read folder metadata', {
        vaultId,
        folderPath,
        error: error.message
      });
      return null;
    }
  }

  /**
   * 从父文件夹的 expectedFiles 中移除指定的占位文件
   * 当用户删除占位文件时调用此方法
   */
  async removeExpectedFile(vaultId: string, filePath: string): Promise<Result<void, ArtifactError>> {
    try {
      // 规范化路径：确保使用 / 作为分隔符（vault 路径格式）
      const normalizedFilePath = filePath.replace(/\\/g, '/');
      
      // 从文件路径中提取父文件夹路径和文件名
      // 使用字符串操作而不是 path.dirname，因为 vault 路径使用 / 分隔符
      const lastSlashIndex = normalizedFilePath.lastIndexOf('/');
      const parentFolderPath = lastSlashIndex === -1 ? '' : normalizedFilePath.substring(0, lastSlashIndex);
      const fileName = lastSlashIndex === -1 ? normalizedFilePath : normalizedFilePath.substring(lastSlashIndex + 1);

      // 如果父文件夹路径是 ''，说明文件在 vault 根目录
      const normalizedParentPath = parentFolderPath;

      // 读取父文件夹的元数据
      const folderMetadata = await this.readFolderMetadata(vaultId, normalizedParentPath);
      if (!folderMetadata) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.NOT_FOUND,
            `Parent folder metadata not found for path: ${normalizedParentPath}`
          ),
        };
      }

      // 从 expectedFiles 中移除匹配的文件
      if (folderMetadata.expectedFiles && folderMetadata.expectedFiles.length > 0) {
        const originalLength = folderMetadata.expectedFiles.length;
        
        // 计算相对于父文件夹的路径
        // filePath 是完整路径（相对于 vault 根目录），例如：folder1/subfolder/file.md
        // expectedFile.path 是相对于父文件夹的路径，例如：file.md
        let relativePath: string;
        if (normalizedParentPath === '') {
          relativePath = fileName;
        } else {
          // 使用 path.relative 或手动移除前缀
          // 确保使用正确的路径分隔符
          const prefix = normalizedParentPath.endsWith('/') 
            ? normalizedParentPath 
            : normalizedParentPath + '/';
          relativePath = filePath.startsWith(prefix)
            ? filePath.substring(prefix.length)
            : fileName; // 如果前缀不匹配，使用文件名作为备用
        }
        
        folderMetadata.expectedFiles = folderMetadata.expectedFiles.filter(expectedFile => {
          // 构建 expectedFile 的完整路径（相对于父文件夹）
          const expectedFilePath = expectedFile.path;
          const expectedFileName = expectedFile.extension
            ? `${expectedFile.name}.${expectedFile.extension}`
            : expectedFile.name;
          
          // 匹配条件：expectedFile.path 应该等于 relativePath
          // 或者 expectedFileName 应该等于 fileName（作为备用匹配）
          const pathMatches = expectedFilePath === relativePath;
          const nameMatches = expectedFileName === fileName;
          
          // 如果匹配，则过滤掉（返回 false），否则保留（返回 true）
          return !(pathMatches || nameMatches);
        });

        // 如果成功移除了文件，更新元数据
        if (folderMetadata.expectedFiles.length < originalLength) {
          folderMetadata.updatedAt = new Date().toISOString();
          await this.saveFolderMetadata(vaultId, folderMetadata);
          
          this.logger.info('Expected file removed from metadata', {
            vaultId,
            parentFolderPath: normalizedParentPath,
            filePath,
            remainingExpectedFiles: folderMetadata.expectedFiles.length
          });
        } else {
          this.logger.warn('Expected file not found in metadata', {
            vaultId,
            parentFolderPath: normalizedParentPath,
            filePath
          });
        }
      }

      return { success: true, value: undefined };
    } catch (error: any) {
      this.logger.error('Failed to remove expected file from metadata', {
        vaultId,
        filePath,
        error: error.message
      });
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to remove expected file: ${error.message}`,
          { vaultId, filePath },
          error
        ),
      };
    }
  }

}
