import { inject, injectable } from 'inversify';
import { TYPES } from '../../infrastructure/di/types';
import { ArtifactFileSystemApplicationService } from '../shared/application/ArtifactFileSystemApplicationService';
import { VaultApplicationService } from '../shared/application/VaultApplicationService';
import { Artifact } from '../shared/domain/artifact';
import { Vault } from '../shared/domain/vault';
import { Logger } from '../../core/logger/Logger';

/**
 * MCP 资源接口
 */
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPResources {
  /**
   * 列出所有资源
   */
  listResources(): Promise<MCPResource[]>;

  /**
   * 获取资源内容
   */
  getResource(uri: string): Promise<string | null>;
}

@injectable()
export class MCPResourcesImpl implements MCPResources {
  constructor(
    @inject(TYPES.ArtifactFileSystemApplicationService)
    private artifactService: ArtifactFileSystemApplicationService,
    @inject(TYPES.VaultApplicationService)
    private vaultService: VaultApplicationService,
    @inject(TYPES.Logger)
    private logger: Logger
  ) {}

  async listResources(): Promise<MCPResource[]> {
    try {
      const resources: MCPResource[] = [];

      // List all vaults
      const vaultsResult = await this.vaultService.listVaults();
      if (vaultsResult.success) {
        for (const vault of vaultsResult.value) {
          resources.push({
            uri: `archi://vault/${vault.name}`,
            name: vault.name,
            description: vault.description,
            mimeType: 'application/json',
          });
        }
      }

      // List all artifacts (limited to first 1000 for performance)
      const artifactsResult = await this.artifactService.listArtifacts(
        undefined,
        { limit: 1000 }
      );
      if (artifactsResult.success) {
        for (const artifact of artifactsResult.value) {
          resources.push({
            uri: `archi://artifact/${artifact.id}`,
            name: artifact.title,
            description: artifact.description,
            mimeType: this.getMimeType(artifact.format),
          });
        }
      }

      return resources;
    } catch (error: any) {
      this.logger.error('Error listing resources', error);
      return [];
    }
  }

  async getResource(uri: string): Promise<string | null> {
    try {
      if (uri.startsWith('archi://artifact/')) {
        const artifactId = uri.replace('archi://artifact/', '');
        // Search in all vaults
        const vaultsResult = await this.vaultService.listVaults();
        if (vaultsResult.success) {
          for (const vault of vaultsResult.value) {
            const result = await this.artifactService.getArtifact(vault.id, artifactId);
            if (result.success) {
              return JSON.stringify(result.value, null, 2);
            }
          }
        }
      } else if (uri.startsWith('archi://vault/')) {
        const vaultName = uri.replace('archi://vault/', '');
        const vaultsResult = await this.vaultService.listVaults();
        if (vaultsResult.success) {
          const vault = vaultsResult.value.find(v => v.name === vaultName);
          if (vault) {
            return JSON.stringify(vault, null, 2);
          }
        }
      }

      return null;
    } catch (error: any) {
      this.logger.error('Error getting resource', error);
      return null;
    }
  }

  private getMimeType(format: string): string {
    const mimeTypes: Record<string, string> = {
      md: 'text/markdown',
      yml: 'text/yaml',
      yaml: 'text/yaml',
      json: 'application/json',
      puml: 'text/plain',
      mmd: 'text/plain',
    };
    return mimeTypes[format] || 'text/plain';
  }
}

