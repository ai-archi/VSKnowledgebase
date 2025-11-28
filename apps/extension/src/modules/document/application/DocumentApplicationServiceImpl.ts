import { inject, injectable } from 'inversify';
import { TYPES } from '../../../infrastructure/di/types';
import { DocumentApplicationService } from './DocumentApplicationService';
import { ArtifactFileSystemApplicationService } from '../../shared/application/ArtifactFileSystemApplicationService';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { ArtifactTreeApplicationService } from '../../shared/application/ArtifactTreeApplicationService';
import { VaultReference } from '../../shared/domain/value_object/VaultReference';
// Remove duplicate Result import - use the one from errors
import { Artifact } from '../../shared/domain/entity/artifact';
import { ArtifactError, ArtifactErrorCode, Result } from '../../shared/domain/errors';
import { Logger } from '../../../core/logger/Logger';
import { EventBus } from '../../../core/eventbus/EventBus';

@injectable()
export class DocumentApplicationServiceImpl implements DocumentApplicationService {
  constructor(
    @inject(TYPES.ArtifactFileSystemApplicationService)
    private artifactService: ArtifactFileSystemApplicationService,
    @inject(TYPES.VaultApplicationService)
    private vaultService: VaultApplicationService,
    @inject(TYPES.ArtifactTreeApplicationService)
    private treeService: ArtifactTreeApplicationService,
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
    template?: any
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
    const createResult = await this.treeService.createDirectory(vault, targetFolderPath);
    if (!createResult.success) {
      return createResult;
    }

    // 如果有模板，根据模板创建目录结构
    if (template) {
      const structureResult = await this.artifactService.createFolderStructureFromTemplate(
        vault,
        targetFolderPath,
        template
      );
      if (!structureResult.success) {
        this.logger.warn(`Failed to create structure from template: ${structureResult.error?.message}`);
        // 即使模板结构创建失败，也继续返回成功（至少主文件夹已创建）
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

