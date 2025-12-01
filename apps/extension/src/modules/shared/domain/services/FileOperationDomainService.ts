import { Vault } from '../entity/vault';
import { PathUtils } from '../../infrastructure/utils/PathUtils';
import { ArtifactViewType } from '../types';
import * as fs from 'fs';
import * as path from 'path';

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

  /**
   * 获取设计图模板内容
   * @param viewType 视图类型
   * @param format 文件格式
   * @param templateViewType 模板视图类型（如 'application-collaboration-view'）
   * @param fileName 文件名（用于替换模板中的占位符）
   * @param architoolRoot .architool 根目录路径
   * @returns 模板内容，如果找不到则返回 null
   */
  getDesignTemplateContent(
    viewType: ArtifactViewType,
    format: string | undefined,
    templateViewType: string | undefined,
    fileName: string,
    architoolRoot: string
  ): string | null;
}

/**
 * 文件操作领域服务实现
 */
export class FileOperationDomainServiceImpl implements FileOperationDomainService {
  // 设计图模板文件映射
  private readonly designTemplateMap: Map<string, string> = new Map([
    // Archimate 视图类型 -> 模板文件路径（相对于 templates/content/archimate/）
    ['application-collaboration-view', 'application-collaboration-view.archimate'],
    ['application-sequence-view', 'application-sequence-view.archimate'],
    ['application-component-view', 'application-component-view.archimate'],
    ['application-service-view', 'application-service-view.archimate'],
    ['application-function-view', 'application-function-view.archimate'],
    ['application-interface-view', 'application-interface-view.archimate'],
    ['application-data-object-view', 'application-data-object-view.archimate'],
    ['business-process-view', 'business-process-view.archimate'],
    ['business-function-view', 'business-function-view.archimate'],
    ['business-service-view', 'business-service-view.archimate'],
    ['business-collaboration-view', 'business-collaboration-view.archimate'],
    ['business-interaction-view', 'business-interaction-view.archimate'],
    ['business-role-view', 'business-role-view.archimate'],
    ['business-event-view', 'business-event-view.archimate'],
    ['business-object-view', 'business-object-view.archimate'],
    ['technology-component-view', 'technology-component-view.archimate'],
    ['technology-node-view', 'technology-node-view.archimate'],
    ['technology-deployment-view', 'technology-deployment-view.archimate'],
    ['technology-service-view', 'technology-service-view.archimate'],
    ['technology-interface-view', 'technology-interface-view.archimate'],
    ['technology-collaboration-view', 'technology-collaboration-view.archimate'],
    ['cross-layered-view', 'cross-layered-view.archimate'],
    ['cross-composite-view', 'cross-composite-view.archimate'],
    ['cross-interaction-view', 'cross-interaction-view.archimate'],
    ['cross-relationship-view', 'cross-relationship-view.archimate'],
  ]);
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
        return `<?xml version="1.0" encoding="UTF-8"?>
<archimate:model xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:archimate="http://www.opengroup.org/xsd/archimate/3.0/" id="id-${fileName.toLowerCase().replace(/\s+/g, '-')}-model" xsi:schemaLocation="http://www.opengroup.org/xsd/archimate/3.0/ http://www.opengroup.org/xsd/archimate/3.1/archimate3_Diagram.xsd">
  <archimate:name>${fileName}</archimate:name>
  <archimate:documentation>${fileName} 架构图</archimate:documentation>
  <archimate:elements>
  </archimate:elements>
  <archimate:views>
    <archimate:diagrams>
      <archimate:view id="id-main-diagram">
        <archimate:name>${fileName}</archimate:name>
        <archimate:documentation>${fileName} 架构图</archimate:documentation>
      </archimate:view>
    </archimate:diagrams>
  </archimate:views>
  <archimate:relationships>
  </archimate:relationships>
</archimate:model>`;
      default:
        return `# ${fileName}\n\n`;
    }
  }

  getDesignTemplateContent(
    viewType: ArtifactViewType,
    format: string | undefined,
    templateViewType: string | undefined,
    fileName: string,
    architoolRoot: string
  ): string | null {
    try {
      // 如果是设计图类型且有模板视图类型，尝试加载模板
      if (viewType === 'design' && format === 'archimate' && templateViewType) {
        const templateFileName = this.designTemplateMap.get(templateViewType);
        if (templateFileName) {
          // 尝试从多个可能的位置加载模板
          const possiblePaths = [
            // 从 .architool/demo-vault/templates/content/archimate/ 加载
            path.join(architoolRoot, 'demo-vault', 'templates', 'content', 'archimate', templateFileName),
            // 从项目根目录的 demo-vault 加载（开发环境）
            path.join(__dirname, '../../../../../../demo-vault/templates/content/archimate', templateFileName),
          ];

          for (const templatePath of possiblePaths) {
            if (fs.existsSync(templatePath)) {
              let content = fs.readFileSync(templatePath, 'utf-8');
              // 替换模板中的占位符
              content = content.replace(/ERP系统/g, fileName);
              content = content.replace(/id-\w+-model/g, `id-${fileName.toLowerCase().replace(/\s+/g, '-')}-model`);
              return content;
            }
          }
        }
      }
      return null;
    } catch (error: any) {
      // 如果加载失败，返回 null
      return null;
    }
  }
}

