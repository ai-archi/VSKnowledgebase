import { inject, injectable } from 'inversify';
import { TYPES } from '../../../infrastructure/di/types';
import { DocumentApplicationService } from './DocumentApplicationService';
import { ArtifactApplicationService } from '../../shared/application/ArtifactApplicationService';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { VaultReference } from '../../shared/domain/value_object/VaultReference';
import { Artifact } from '../../shared/domain/entity/artifact';
import { ArtifactError, ArtifactErrorCode, Result } from '../../shared/domain/errors';
import { Logger } from '../../../core/logger/Logger';

@injectable()
export class DocumentApplicationServiceImpl implements DocumentApplicationService {
  constructor(
    @inject(TYPES.ArtifactApplicationService)
    private artifactService: ArtifactApplicationService,
    @inject(TYPES.VaultApplicationService)
    private vaultService: VaultApplicationService,
    @inject(TYPES.Logger)
    private logger: Logger
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
    templateId?: string
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

    // 使用 ArtifactApplicationService 创建文件夹
    const fullPath = folderPath ? `${folderPath}/${folderName}` : folderName;
    const result = await this.artifactService.createDirectory({
      id: vaultResult.value.id,
      name: vaultResult.value.name,
    }, fullPath);

    if (result.success) {
      return { success: true, value: fullPath };
    }

    return {
      success: false,
      error: result.error || new ArtifactError(ArtifactErrorCode.OPERATION_FAILED, 'Failed to create folder'),
    };
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
    return this.artifactService.deleteArtifact(vaultId, path);
  }
}
