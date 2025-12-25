import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { FolderMetadata } from '../../../domain/FolderMetadata';
import { Result, ArtifactError, ArtifactErrorCode } from '../../../domain/errors';

export class YamlFolderMetadataRepository {
  private vaultPath: string;

  constructor(vaultPath: string) {
    this.vaultPath = vaultPath;
  }

  private getMetadataFilePath(metadataId: string): string {
    // 与文件元数据使用相同的路径和命名规则
    return path.join(this.vaultPath, '.metadata', `${metadataId}.metadata.yml`);
  }

  async writeMetadata(metadata: FolderMetadata): Promise<Result<void, ArtifactError>> {
    try {
      const filePath = this.getMetadataFilePath(metadata.id);
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // 使用 yaml.dump 选项确保所有字段都被序列化
      const content = yaml.dump(metadata, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        skipInvalid: false,
        sortKeys: false,
      });
      const tempPath = `${filePath}.tmp`;
      fs.writeFileSync(tempPath, content, 'utf-8');
      fs.renameSync(tempPath, filePath);

      return { success: true, value: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(ArtifactErrorCode.OPERATION_FAILED, `Failed to write folder metadata: ${error.message}`, {}, error),
      };
    }
  }

  async readMetadata(metadataId: string): Promise<Result<FolderMetadata, ArtifactError>> {
    try {
      const filePath = this.getMetadataFilePath(metadataId);
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: new ArtifactError(ArtifactErrorCode.NOT_FOUND, `Folder metadata not found: ${metadataId}`),
        };
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const metadata = yaml.load(content) as FolderMetadata;
      return { success: true, value: metadata };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(ArtifactErrorCode.OPERATION_FAILED, `Failed to read folder metadata: ${error.message}`, {}, error),
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
        error: new ArtifactError(ArtifactErrorCode.OPERATION_FAILED, `Failed to delete folder metadata: ${error.message}`, {}, error),
      };
    }
  }

  /**
   * 通过 folderPath 查找元数据文件
   * 因为元数据文件使用 UUID 作为文件名，需要通过 folderPath 来查找
   */
  async findByFolderPath(folderPath: string): Promise<Result<FolderMetadata, ArtifactError>> {
    try {
      const metadataDir = path.join(this.vaultPath, '.metadata');
      if (!fs.existsSync(metadataDir)) {
        return {
          success: false,
          error: new ArtifactError(ArtifactErrorCode.NOT_FOUND, `Metadata directory not found`),
        };
      }

      const files = fs.readdirSync(metadataDir);
      const metadataFiles = files.filter((file: string) => file.endsWith('.metadata.yml'));

      for (const file of metadataFiles) {
        const filePath = path.join(metadataDir, file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const metadata = yaml.load(content) as FolderMetadata;
          
          // 检查是否是文件夹元数据（通过检查是否有 folderPath 字段）
          if (metadata && metadata.folderPath === folderPath) {
            return { success: true, value: metadata };
          }
        } catch (error: any) {
          // 如果读取某个文件失败，继续处理下一个文件
          continue;
        }
      }

      return {
        success: false,
        error: new ArtifactError(ArtifactErrorCode.NOT_FOUND, `Folder metadata not found for path: ${folderPath}`),
      };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(ArtifactErrorCode.OPERATION_FAILED, `Failed to find folder metadata by path: ${error.message}`, {}, error),
      };
    }
  }
}

