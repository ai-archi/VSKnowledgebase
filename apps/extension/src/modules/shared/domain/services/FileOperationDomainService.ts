import { Vault } from '../entity/vault';
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
   * 生成默认文件内容
   * @param fileName 文件名（不含扩展名）
   * @param fileType 文件类型（如 'mermaid', 'puml'）
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
      
      // 查找包含 'dist' 或 'src' 的路径
      if (currentDir.includes('dist') && !currentDir.includes('dist/extension')) {
        // 打包后：文件在 dist/modules/... 下
        // 扩展根目录应该是包含 dist 的目录
        const distIndex = currentDir.indexOf('dist');
        const extensionRoot = currentDir.substring(0, distIndex + 'dist'.length);
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

  validateVaultForOperation(
    vault: Vault,
    operation: 'create' | 'delete' | 'update'
  ): string | null {
    // 新结构：所有 vault 在本地都是可写的
    // Git vault 的同步由用户通过 Git 命令控制
    return null;
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
        default:
          return null;
      }

      // 尝试从多个可能的位置加载模板
      const possiblePaths = [
        // 开发环境：从源码目录加载
        path.join(extensionPath, 'src', 'resources', 'templates', templateFileName),
        // 打包后：从 dist/resources 目录加载（资源文件会被复制到这里）
        path.join(extensionPath, 'resources', 'templates', templateFileName),
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
}

