import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { ArtifactMetadata, Result, ArtifactError, ArtifactErrorCode } from '@architool/domain-shared-artifact';

/**
 * YAML 元数据存储库
 * 提供 YAML 文件级别的元数据操作
 */
export class YamlMetadataRepository {
  private vaultPath: string;

  constructor(vaultPath: string) {
    this.vaultPath = vaultPath;
  }

  /**
   * 获取元数据文件路径
   */
  private getMetadataPath(metadataId: string): string {
    return path.join(this.vaultPath, 'metadata', `${metadataId}.metadata.yml`);
  }

  /**
   * 读取元数据（从 YAML 文件）
   */
  async readMetadata(metadataId: string): Promise<Result<ArtifactMetadata, ArtifactError>> {
    try {
      const metadataPath = this.getMetadataPath(metadataId);

      if (!fs.existsSync(metadataPath)) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.NOT_FOUND,
            `Metadata not found: ${metadataId}`,
            { metadataId }
          ),
        };
      }

      const content = fs.readFileSync(metadataPath, 'utf-8');
      const metadata = yaml.load(content) as ArtifactMetadata;

      return { success: true, value: metadata };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to read metadata: ${error.message}`,
          { metadataId },
          error
        ),
      };
    }
  }

  /**
   * 写入元数据（到 YAML 文件）
   */
  async writeMetadata(metadata: ArtifactMetadata): Promise<Result<void, ArtifactError>> {
    try {
      const metadataDir = path.join(this.vaultPath, 'metadata');
      
      if (!fs.existsSync(metadataDir)) {
        fs.mkdirSync(metadataDir, { recursive: true });
      }

      const metadataPath = this.getMetadataPath(metadata.id);
      const content = yaml.dump(metadata);

      // 原子写入
      const tempPath = `${metadataPath}.tmp`;
      fs.writeFileSync(tempPath, content, 'utf-8');
      fs.renameSync(tempPath, metadataPath);

      return { success: true, value: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to write metadata: ${error.message}`,
          { metadataId: metadata.id },
          error
        ),
      };
    }
  }

  /**
   * 删除元数据（删除 YAML 文件）
   */
  async deleteMetadata(metadataId: string): Promise<Result<void, ArtifactError>> {
    try {
      const metadataPath = this.getMetadataPath(metadataId);

      if (fs.existsSync(metadataPath)) {
        fs.unlinkSync(metadataPath);
      }

      return { success: true, value: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to delete metadata: ${error.message}`,
          { metadataId },
          error
        ),
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
      .filter(file => file.endsWith('.metadata.yml'))
      .map(file => path.join(metadataDir, file));
  }
}

