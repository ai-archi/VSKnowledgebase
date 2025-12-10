import { Vault } from '../entity/vault';
import { Artifact } from '../entity/artifact';
import { CommandExecutionContext } from '../value_object/CommandExecutionContext';
import { Template } from '@huggingface/jinja';
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

  /**
   * 渲染模板（通用模板逻辑）
   * 所有AI命令、基于模板生成文件等都通过这个方法实现
   * @param artifact Artifact对象，包含模板内容（通常在body字段中）
   * @param context 执行上下文
   * @returns 渲染后的内容
   */
  renderTemplate(artifact: Artifact, context: CommandExecutionContext): string;
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

  /**
   * 渲染模板（通用模板逻辑）
   * 所有AI命令、基于模板生成文件等都通过这个方法实现
   */
  renderTemplate(artifact: Artifact, context: CommandExecutionContext): string {
    // 从 Artifact 获取模板内容（优先使用 body，如果没有则尝试从其他字段获取）
    const templateString = artifact.body || (artifact as any).template || (artifact as any).commandContent;
    
    if (!templateString) {
      return '';
    }

    try {
      // 使用 Jinja2 模板引擎
      const template = new Template(templateString);
      
      // 构建变量映射（支持嵌套对象结构）
      const variables = this.buildVariableMap(context, artifact);
      
      // 渲染模板
      const rendered = template.render(variables);
      
      return rendered.trim();
    } catch (error: any) {
      // 如果 Jinja2 渲染失败，返回原始模板（向后兼容）
      console.error('Jinja2 template rendering failed:', error);
      return templateString.trim();
    }
  }

  /**
   * 构建变量映射（支持嵌套对象结构，用于 Jinja2 模板引擎）
   */
  private buildVariableMap(context: CommandExecutionContext, artifact: Artifact): Record<string, any> {
    const variables: Record<string, any> = {};

    // 基础变量
    variables['fileName'] = context.fileName || artifact.name || '';
    variables['folderPath'] = context.folderPath || '';
    variables['vaultName'] = context.vaultName || artifact.vault.name || '';
    variables['vaultId'] = context.vaultId || artifact.vault.id || '';
    variables['diagramType'] = context.diagramType || '';

    // Artifact 相关变量
    variables['artifact'] = {
      id: artifact.id,
      name: artifact.name,
      title: artifact.title,
      path: artifact.path,
      format: artifact.format,
      viewType: artifact.viewType,
      category: artifact.category,
    };

    // 选中的文件列表 - 提供多种格式以支持不同的模板需求
    if (context.selectedFiles && context.selectedFiles.length > 0) {
      // 字符串格式（向后兼容）
      const fileNames = context.selectedFiles.map(f => f.title || f.name).join('、');
      const filePaths = context.selectedFiles.map(f => {
        const vaultPrefix = f.vault ? `${f.vault.name}(vault): ` : '';
        return `${vaultPrefix}${f.path}`;
      }).join('\n');
      
      variables['selectedFiles'] = fileNames;
      variables['selectedFilePaths'] = filePaths;
      variables['selectedFilesCount'] = context.selectedFiles.length.toString();
      
      // 数组格式（支持 {% for file in selectedFilesList %}）
      variables['selectedFilesList'] = context.selectedFiles.map(f => ({
        id: f.id || '',
        path: f.path,
        name: f.name,
        title: f.title || f.name,
        vault: f.vault ? {
          id: f.vault.id,
          name: f.vault.name
        } : null
      }));
      
      // 第一个文件对象（支持 {{ file.title or file.name }}）
      if (context.selectedFiles.length > 0) {
        const firstFile = context.selectedFiles[0];
        variables['file'] = {
          id: firstFile.id || '',
          path: firstFile.path,
          name: firstFile.name,
          title: firstFile.title || firstFile.name,
          vault: firstFile.vault ? {
            id: firstFile.vault.id,
            name: firstFile.vault.name
          } : null
        };
      }
    } else {
      variables['selectedFiles'] = '';
      variables['selectedFilePaths'] = '';
      variables['selectedFilesCount'] = '0';
      variables['selectedFilesList'] = [];
      variables['file'] = null;
    }

    // 其他自定义变量
    for (const [key, value] of Object.entries(context)) {
      if (!['vaultId', 'vaultName', 'fileName', 'folderPath', 'diagramType', 'selectedFiles'].includes(key)) {
        // 保持原始类型，让 Jinja2 处理
        variables[key] = value !== undefined && value !== null ? value : '';
      }
    }

    return variables;
  }
}

