import * as fs from 'fs';
import * as path from 'path';
import { Artifact } from '../../../domain/entity/artifact';
import { Result, ArtifactError, ArtifactErrorCode } from '../../../domain/errors';

export class ArtifactFileSystemAdapter {
  private architoolRoot: string;

  constructor(architoolRoot: string) {
    this.architoolRoot = architoolRoot;
  }

  /**
   * 获取统一的 archidocs 根目录路径
   */
  getArtifactRoot(): string {
    return this.architoolRoot;
  }

  /**
   * 获取 Vault 在 archidocs 下的存储路径
   * @param vaultIdOrName Vault ID（目录名）或名称，优先使用 ID
   */
  getVaultPath(vaultIdOrName: string): string {
    return path.join(this.architoolRoot, vaultIdOrName);
  }

  /**
   * 获取 Artifact 文件的完整路径
   * 新结构：文档文件可直接放在 vault 根目录，不再使用 artifacts 子目录
   */
  getArtifactPath(vaultName: string, artifactPath: string): string {
    // 如果 artifactPath 为空，返回 vault 根目录
    if (!artifactPath) {
      return this.getVaultPath(vaultName);
    }
    // 新结构：直接放在 vault 根目录下
    return path.join(this.getVaultPath(vaultName), artifactPath);
  }

  /**
   * 获取元数据文件路径
   * 新结构：元数据文件存放在 .metadata 目录
   */
  getMetadataPath(vaultName: string, metadataId: string): string {
    return path.join(
      this.getVaultPath(vaultName),
      '.metadata',
      `${metadataId}.metadata.yml`
    );
  }

  async readArtifact(vaultName: string, artifactPath: string): Promise<Result<string, ArtifactError>> {
    try {
      const fullPath = this.getArtifactPath(vaultName, artifactPath);
      
      if (!fs.existsSync(fullPath)) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.NOT_FOUND,
            `Artifact not found: ${artifactPath}`,
            { path: artifactPath, vaultName }
          ),
        };
      }

      const content = fs.readFileSync(fullPath, 'utf-8');
      return { success: true, value: content };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to read artifact: ${error.message}`,
          { path: artifactPath, vaultName },
          error
        ),
      };
    }
  }

  /**
   * 写入 Artifact 内容（原子操作）
   */
  async writeArtifact(
    vaultName: string,
    artifactPath: string,
    content: string
  ): Promise<Result<void, ArtifactError>> {
    try {
      const fullPath = this.getArtifactPath(vaultName, artifactPath);
      const dir = path.dirname(fullPath);

      // 确保目录存在
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // 原子写入：先写入临时文件，然后重命名
      const tempPath = `${fullPath}.tmp`;
      fs.writeFileSync(tempPath, content, 'utf-8');
      fs.renameSync(tempPath, fullPath);

      return { success: true, value: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to write artifact: ${error.message}`,
          { path: artifactPath, vaultName },
          error
        ),
      };
    }
  }

  async deleteArtifact(vaultName: string, artifactPath: string): Promise<Result<void, ArtifactError>> {
    try {
      const fullPath = this.getArtifactPath(vaultName, artifactPath);
      
      if (!fs.existsSync(fullPath)) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.NOT_FOUND,
            `Artifact not found: ${artifactPath}`,
            { path: artifactPath, vaultName }
          ),
        };
      }

      // 检查是文件还是文件夹
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        // 如果是文件夹，递归删除
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        // 如果是文件，直接删除
        fs.unlinkSync(fullPath);
      }

      return { success: true, value: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(ArtifactErrorCode.OPERATION_FAILED, `Failed to delete artifact: ${error.message}`, {}, error),
      };
    }
  }
}
