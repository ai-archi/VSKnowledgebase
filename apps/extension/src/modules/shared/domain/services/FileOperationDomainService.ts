import { Vault } from '../entity/vault';
import { PathUtils } from '../../infrastructure/utils/PathUtils';
import { ArtifactViewType } from '../types';

/**
 * 文件操作领域服务接口
 * 处理文件操作相关的业务逻辑
 */
export interface FileOperationDomainService {
  /**
   * 验证 Vault 是否可操作
   * @param vault Vault 对象
   * @param operation 操作类型
   * @returns 错误信息，如果验证通过则返回 null
   */
  validateVaultForOperation(
    vault: Vault,
    operation: 'create' | 'delete' | 'update'
  ): string | null;

  /**
   * 根据路径确定文件类型
   * @param filePath 文件路径
   * @returns 文件类型信息（viewType 和 format）
   */
  determineFileType(filePath: string): {
    viewType: ArtifactViewType;
    format: string;
  };

  /**
   * 生成默认文件内容
   * @param fileName 文件名（不含扩展名）
   * @param fileType 文件类型（如 'mermaid', 'puml', 'archimate'）
   * @returns 默认内容
   */
  generateDefaultContent(fileName: string, fileType?: string): string;
}

/**
 * 文件操作领域服务实现
 */
export class FileOperationDomainServiceImpl implements FileOperationDomainService {
  validateVaultForOperation(
    vault: Vault,
    operation: 'create' | 'delete' | 'update'
  ): string | null {
    if (vault.readOnly) {
      return `Cannot ${operation} to read-only vault: ${vault.name}`;
    }
    return null;
  }

  determineFileType(filePath: string): {
    viewType: ArtifactViewType;
    format: string;
  } {
    const ext = PathUtils.getFileExtension(filePath);
    const lowerPath = filePath.toLowerCase();

    // 根据扩展名和路径判断文件类型
    if (ext === 'mmd' || lowerPath.includes('mermaid')) {
      return { viewType: 'design', format: 'mmd' };
    }
    if (ext === 'puml' || lowerPath.includes('plantuml')) {
      return { viewType: 'design', format: 'puml' };
    }
    if (ext === 'archimate' || lowerPath.includes('archimate')) {
      return { viewType: 'design', format: 'archimate' };
    }
    if (lowerPath.includes('diagram')) {
      return { viewType: 'design', format: ext || 'md' };
    }
    if (lowerPath.includes('design')) {
      return { viewType: 'design', format: ext || 'md' };
    }

    // 默认类型
    return { viewType: 'document', format: ext || 'md' };
  }

  generateDefaultContent(fileName: string, fileType?: string): string {
    if (!fileType) {
      return `# ${fileName}\n\n`;
    }

    switch (fileType.toLowerCase()) {
      case 'mermaid':
      case 'mmd':
        return `# ${fileName}\n\n\`\`\`mermaid\ngraph TD\n    A[Start] --> B[End]\n\`\`\`\n`;
      case 'puml':
        return `@startuml\n!theme plain\n\ntitle ${fileName}\n\n[Component1] --> [Component2]\n\n@enduml\n`;
      case 'archimate':
        return `# ${fileName}\n\nArchimate diagram content\n`;
      default:
        return `# ${fileName}\n\n`;
    }
  }
}

