import * as fs from 'fs';
import * as path from 'path';
import { Artifact } from '../../../domain/shared/artifact/Artifact';
import { Result, ArtifactError, ArtifactErrorCode } from '../../../domain/shared/artifact/errors';

export class ArtifactFileSystemAdapter {
  private architoolRoot: string;

  constructor(architoolRoot: string) {
    this.architoolRoot = architoolRoot;
  }

  getArtifactPath(vaultName: string, artifactPath: string): string {
    return path.join(this.architoolRoot, vaultName, 'artifacts', artifactPath);
  }

  getMetadataPath(vaultName: string, metadataId: string): string {
    return path.join(this.architoolRoot, vaultName, 'metadata', `${metadataId}.yml`);
  }

  async readArtifact(vaultName: string, artifactPath: string): Promise<Result<string, ArtifactError>> {
    try {
      const filePath = this.getArtifactPath(vaultName, artifactPath);
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: new ArtifactError(ArtifactErrorCode.NOT_FOUND, `Artifact not found: ${artifactPath}`),
        };
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      return { success: true, value: content };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(ArtifactErrorCode.OPERATION_FAILED, `Failed to read artifact: ${error.message}`, {}, error),
      };
    }
  }

  async writeArtifact(artifact: Artifact, content: string): Promise<Result<void, ArtifactError>> {
    try {
      const filePath = this.getArtifactPath(artifact.vault.name, artifact.path);
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, content, 'utf-8');
      return { success: true, value: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(ArtifactErrorCode.OPERATION_FAILED, `Failed to write artifact: ${error.message}`, {}, error),
      };
    }
  }

  async deleteArtifact(vaultName: string, artifactPath: string): Promise<Result<void, ArtifactError>> {
    try {
      const filePath = this.getArtifactPath(vaultName, artifactPath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
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


