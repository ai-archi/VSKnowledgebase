import { inject, injectable } from 'inversify';
import { TYPES } from '../../../infrastructure/di/types';
import { LookupApplicationService, QuickCreateOptions } from './LookupApplicationService';
import { ArtifactFileSystemApplicationService } from '../../shared/application/ArtifactFileSystemApplicationService';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { Artifact } from '../../shared/domain/artifact';
import { ArtifactError, ArtifactErrorCode, Result } from '../../shared/domain/errors';
import { Logger } from '../../../core/logger/Logger';

@injectable()
export class LookupApplicationServiceImpl implements LookupApplicationService {
  constructor(
    @inject(TYPES.ArtifactFileSystemApplicationService)
    private artifactService: ArtifactFileSystemApplicationService,
    @inject(TYPES.VaultApplicationService)
    private vaultService: VaultApplicationService,
    @inject(TYPES.Logger)
    private logger: Logger
  ) {}

  async quickCreate(options: QuickCreateOptions): Promise<Result<Artifact, ArtifactError>> {
    try {
      // Get vault first
      const vaultResult = await this.vaultService.getVault(options.vaultId);
      if (!vaultResult.success) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.NOT_FOUND,
            `Vault not found: ${options.vaultId}`
          ),
        };
      }

      const vaultRef = {
        id: vaultResult.value.id,
        name: vaultResult.value.name,
      };

      const result = await this.artifactService.createArtifact({
        vault: vaultRef,
        path: `${options.viewType}/${options.title}.md`,
        title: options.title,
        content: options.content,
        viewType: options.viewType as any,
      });

      if (result.success) {
        return { success: true, value: result.value };
      }

      return result;
    } catch (error: any) {
      this.logger.error('Failed to quick create artifact', error);
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          error.message || 'Failed to create artifact'
        ),
      };
    }
  }

  async search(query: string, vaultId?: string): Promise<Result<Artifact[], ArtifactError>> {
    try {
      if (vaultId) {
        const result = await this.artifactService.listArtifacts(vaultId);
        if (result.success) {
          const filtered = result.value.filter(a =>
            a.title.toLowerCase().includes(query.toLowerCase()) ||
            a.path.toLowerCase().includes(query.toLowerCase())
          );
          return { success: true, value: filtered };
        }
        return result;
      }

      // Search across all vaults
      // This would require getting all vaults first
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          'Cross-vault search not yet implemented'
        ),
      };
    } catch (error: any) {
      this.logger.error('Failed to search artifacts', error);
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          error.message || 'Failed to search artifacts'
        ),
      };
    }
  }
}

