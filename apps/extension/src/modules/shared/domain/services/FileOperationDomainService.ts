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
   * 生成默认 Markdown 文档内容
   * @param fileName 文件名（不含扩展名）
   * @returns Markdown 内容
   */
  generateDefaultMarkdownContent(fileName: string): string;

  /**
   * 生成默认 Mermaid 设计图内容
   * @param fileName 文件名（不含扩展名）
   * @returns Mermaid 内容（纯代码，不包含 markdown 格式）
   */
  generateDefaultMermaidContent(fileName: string): string;

  /**
   * 生成默认 PlantUML 设计图内容
   * @param fileName 文件名（不含扩展名）
   * @returns PlantUML 内容
   */
  generateDefaultPlantUMLContent(fileName: string): string;

  /**
   * 生成默认 Archimate 设计图内容
   * @param fileName 文件名（不含扩展名）
   * @returns Archimate XML 内容
   */
  generateDefaultArchimateContent(fileName: string): string;

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
  /**
   * 获取扩展路径（用于加载内置模板）
   */
  private getExtensionPath(): string | null {
    try {
      // 从 __dirname 推断扩展路径
      const currentDir = __dirname;
      
      // 查找包含 'dist/extension' 或 'src' 的路径
      if (currentDir.includes('dist/extension')) {
        // 打包后：文件在 dist/extension/modules/... 下
        // 扩展根目录应该是包含 dist/extension 的目录
        const distIndex = currentDir.indexOf('dist/extension');
        const extensionRoot = currentDir.substring(0, distIndex + 'dist/extension'.length);
        return extensionRoot;
      } else if (currentDir.includes('src')) {
        // 开发环境：文件在 src/modules/... 下
        // 扩展根目录应该是包含 src 的目录
        const srcIndex = currentDir.indexOf('src');
        return currentDir.substring(0, srcIndex);
      }
      return null;
    } catch {
      return null;
    }
  }

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
    // Archimate 格式支持已移除
    // if (ext === 'archimate' || lowerPath.includes('archimate')) {
    //   return { viewType: 'design', format: 'archimate' };
    // }
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
      return this.generateDefaultMarkdownContent(fileName);
    }

    // 尝试从内置模板文件读取
    const templateContent = this.loadBuiltinTemplate(fileType, fileName);
    if (templateContent) {
      return templateContent;
    }

    // 根据文件类型调用相应的专门方法
    switch (fileType.toLowerCase()) {
      case 'mermaid':
      case 'mmd':
        return this.generateDefaultMermaidContent(fileName);
      case 'puml':
        return this.generateDefaultPlantUMLContent(fileName);
      // Archimate 格式支持已移除
      // case 'archimate':
      //   return this.generateDefaultArchimateContent(fileName);
      default:
        return this.generateDefaultMarkdownContent(fileName);
    }
  }

  generateDefaultMarkdownContent(fileName: string): string {
    // Markdown 文档使用简单的硬编码内容
    return `# ${fileName}\n\n`;
  }

  generateDefaultMermaidContent(fileName: string): string {
    // 尝试从内置模板文件加载
    const templateContent = this.loadBuiltinTemplate('mmd', fileName);
    if (templateContent) {
      return templateContent;
    }
    // 如果无法加载，使用硬编码的默认内容
    return `graph TD\n    A[Start] --> B[End]\n`;
  }

  generateDefaultPlantUMLContent(fileName: string): string {
    // 尝试从内置模板文件加载
    const templateContent = this.loadBuiltinTemplate('puml', fileName);
    if (templateContent) {
      return templateContent;
    }
    // 如果无法加载，使用硬编码的默认内容
    return `@startuml\n!theme plain\n\ntitle ${fileName}\n\n[Component1] --> [Component2]\n\n@enduml\n`;
  }

  generateDefaultArchimateContent(fileName: string): string {
    // 尝试从内置模板文件加载
    const templateContent = this.loadBuiltinTemplate('archimate', fileName);
    if (templateContent) {
      return templateContent;
    }
    // 如果无法加载，使用硬编码的默认内容（使用 OpenGroup 官方标准格式：默认命名空间）
    const sanitizedFileName = fileName.toLowerCase().replace(/\s+/g, '-');
    return `<?xml version="1.0" encoding="UTF-8"?>
<model xmlns="http://www.opengroup.org/xsd/archimate/3.0/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengroup.org/xsd/archimate/3.0/ http://www.opengroup.org/xsd/archimate/3.1/archimate3_Diagram.xsd" identifier="id-${sanitizedFileName}-model">
  <name>${fileName}</name>
  <documentation>${fileName} 架构图</documentation>
  <elements>
  </elements>
  <views>
    <diagrams>
      <view identifier="id-main-diagram" xsi:type="Diagram">
        <name>${fileName}</name>
        <documentation>${fileName} 架构图</documentation>
      </view>
    </diagrams>
  </views>
  <relationships>
  </relationships>
</model>`;
  }

  /**
   * 从内置模板文件加载内容
   * @param fileType 文件类型
   * @param fileName 文件名（用于替换占位符）
   * @returns 模板内容，如果找不到则返回 null
   */
  private loadBuiltinTemplate(fileType: string, fileName: string): string | null {
    const extensionPath = this.getExtensionPath();
    if (!extensionPath) {
      return null;
    }

    try {
      // 确定模板文件名
      let templateFileName: string;
      switch (fileType.toLowerCase()) {
        case 'mermaid':
        case 'mmd':
          templateFileName = 'empty.mmd';
          break;
        case 'puml':
          templateFileName = 'empty.puml';
          break;
        case 'archimate':
          templateFileName = 'empty.archimate';
          break;
        default:
          return null;
      }

      // 尝试从多个可能的位置加载模板
      const possiblePaths = [
        // 开发环境：从源码目录加载
        path.join(extensionPath, 'src', 'resources', 'templates', templateFileName),
        // 打包后：从 dist/extension/resources 目录加载（资源文件会被复制到这里）
        path.join(extensionPath, 'resources', 'templates', templateFileName),
        // 如果 extensionPath 是 dist/extension，resources 在同级目录
        path.join(extensionPath, '..', 'resources', 'templates', templateFileName),
        // 备用路径：从扩展根目录的 resources 加载
        path.join(path.dirname(extensionPath), 'resources', 'templates', templateFileName),
      ];

      for (const templatePath of possiblePaths) {
        if (fs.existsSync(templatePath)) {
          let content = fs.readFileSync(templatePath, 'utf-8');
          // 替换模板中的占位符
          const sanitizedFileName = fileName.toLowerCase().replace(/\s+/g, '-');
          content = content.replace(/\{\{fileName\}\}/g, fileName);
          content = content.replace(/\{\{sanitizedFileName\}\}/g, sanitizedFileName);
          return content;
        }
      }

      return null;
    } catch (error: any) {
      // 如果加载失败，返回 null，将使用硬编码的默认内容
      return null;
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

