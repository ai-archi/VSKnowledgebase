import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { ArtifactMetadata } from '../../../domain/ArtifactMetadata';
import { Result, ArtifactError, ArtifactErrorCode } from '../../../domain/errors';

export class YamlMetadataRepository {
  private vaultPath: string;

  constructor(vaultPath: string) {
    this.vaultPath = vaultPath;
  }

  private getMetadataFilePath(metadataId: string): string {
    return path.join(this.vaultPath, 'metadata', `${metadataId}.metadata.yml`);
  }

  async writeMetadata(metadata: ArtifactMetadata): Promise<Result<void, ArtifactError>> {
    try {
      const filePath = this.getMetadataFilePath(metadata.id);
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const content = yaml.dump(metadata);
      const tempPath = `${filePath}.tmp`;
      fs.writeFileSync(tempPath, content, 'utf-8');
      fs.renameSync(tempPath, filePath);

      return { success: true, value: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(ArtifactErrorCode.OPERATION_FAILED, `Failed to write metadata: ${error.message}`, {}, error),
      };
    }
  }

  async readMetadata(metadataId: string): Promise<Result<ArtifactMetadata, ArtifactError>> {
    try {
      const filePath = this.getMetadataFilePath(metadataId);
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: new ArtifactError(ArtifactErrorCode.NOT_FOUND, `Metadata not found: ${metadataId}`),
        };
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const metadata = yaml.load(content) as ArtifactMetadata;
      return { success: true, value: metadata };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(ArtifactErrorCode.OPERATION_FAILED, `Failed to read metadata: ${error.message}`, {}, error),
      };
    }
  }

  async deleteMetadata(metadataId: string): Promise<Result<void, ArtifactError>> {
    try {
      const filePath = this.getMetadataFilePath(metadataId);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return { success: true, value: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(ArtifactErrorCode.OPERATION_FAILED, `Failed to delete metadata: ${error.message}`, {}, error),
      };
    }
  }

  /**
   * 列出所有元数据文件路径
   */
  async listMetadataFiles(): Promise<string[]> {
    const metadataDir = path.join(this.vaultPath, 'metadata');
    
    if (!fs.existsSync(metadataDir)) {
      return [];
    }

    const files = fs.readdirSync(metadataDir);
    return files
      .filter((file: string) => file.endsWith('.metadata.yml'))
      .map((file: string) => path.join(metadataDir, file));
  }
}
