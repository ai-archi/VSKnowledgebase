import { Vault } from '../entity/vault';
import { Artifact } from '../entity/artifact';
import { Template } from '@huggingface/jinja';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { ARCHITOOL_PATHS } from '../../../../core/constants/Paths';

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
   * 生成默认 ArchiMate 设计图内容
   * @param fileName 文件名（不含扩展名）
   * @returns ArchiMate PlantUML 内容
   */
  generateDefaultArchimateContent(fileName: string): string;

  /**
   * 渲染模板（通用模板逻辑）
   * 所有AI命令、基于模板生成文件等都通过这个方法实现
   * @param artifact Artifact对象，包含模板内容（通常在content字段中）以及模板渲染所需的关联信息（templateFile, selectedFiles）
   * @returns 渲染后的内容
   */
  renderTemplate(artifact: Artifact): string;
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
      case 'archimate':
        return this.generateDefaultArchimateContent(fileName);
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
   * 生成默认 ArchiMate 设计图内容
   * @param fileName 文件名（不含扩展名）
   * @returns ArchiMate PlantUML 内容
   */
  generateDefaultArchimateContent(fileName: string): string {
    // 尝试从内置模板文件加载
    const templateContent = this.loadBuiltinTemplate('archimate', fileName);
    if (templateContent) {
      return templateContent;
    }
    // 如果无法加载，使用硬编码的默认 ArchiMate 内容
    return `@startuml
' 使用本地 ArchiMate 宏库
!global $ARCH_LOCAL = %true()
!include archimate/Archimate.puml

title ${fileName}

' 业务层元素示例
Business_Actor(actor1, "业务参与者")
Business_Process(process1, "业务流程")
Business_Service(service1, "业务服务")

' 应用层元素示例
Application_Component(app1, "应用组件")
Application_Service(appService1, "应用服务")

' 技术层元素示例
Technology_Node(tech1, "技术节点")

' 定义关系
Rel_Serving(actor1, process1, "使用")
Rel_Serving(process1, service1, "提供")
Rel_Serving(service1, app1, "通过")
Rel_Serving(app1, appService1, "调用")
Rel_Serving(appService1, tech1, "部署在")

@enduml
`;
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
          templateFileName = 'archimate-demo.puml';
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
        // demo-vaults 模板目录（开发环境）
        path.join(extensionPath, '..', '..', 'packages', 'demo-vaults', 'demo-vault-assistant', 'archi-templates', 'content', 'plantuml', templateFileName),
        // demo-vaults 模板目录（打包后）
        path.join(extensionPath, 'demo-vaults', 'demo-vault-assistant', 'archi-templates', 'content', 'plantuml', templateFileName),
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
  renderTemplate(artifact: Artifact): string {
    // 从 Artifact 获取模板内容
    const templateString = artifact.content;
    
    if (!templateString) {
      return '';
    }

    try {
      // 使用 Jinja2 模板引擎
      const template = new Template(templateString);
      
      // 构建变量映射（支持嵌套对象结构）
      const variables = this.buildVariableMap(artifact);
      
      // 调试日志：检查 formDataItems 是否正确传递
      if (variables.formDataItems) {
        console.log('FormDataItems in variables:', JSON.stringify(variables.formDataItems, null, 2));
      } else {
        console.warn('FormDataItems not found in variables. Available keys:', Object.keys(variables));
      }
      
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
   * 所有变量统一为对象风格：
   * 1. vault.xxx - Vault 信息
   * 2. artifact.xxx - 要创建的文件/Artifact 信息
   * 3. templateFile - 模板文件对象（增强版，包含 fullRelativePath, absolutePath 等）
   * 4. selectedFiles - 选中的文件数组（增强版，包含 fullRelativePath, absolutePath 等）
   */
  private buildVariableMap(artifact: Artifact): Record<string, any> {
    const variables: Record<string, any> = {};

    // 获取工作区根目录（用于构建绝对路径）
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const workspaceRoot = workspaceFolder?.uri.fsPath || '';

    // 基础值（从 artifact 获取）
    const vaultId = artifact.vault.id || '';
    const vaultName = artifact.vault.name || '';
    const fileName = artifact.name || '';

    // 确定实际使用的 vault 目录名
    // 如果 vaultId 对应的目录不存在，尝试使用 vaultName（目录名可能与 name 一致）
    let actualVaultDir = vaultId;
    if (workspaceRoot) {
      const vaultPathById = path.join(workspaceRoot, ARCHITOOL_PATHS.WORKSPACE_ROOT_DIR, vaultId);
      if (!fs.existsSync(vaultPathById) && vaultName) {
        // 如果 vaultId 对应的目录不存在，尝试使用 vaultName
        const vaultPathByName = path.join(workspaceRoot, ARCHITOOL_PATHS.WORKSPACE_ROOT_DIR, vaultName);
        if (fs.existsSync(vaultPathByName)) {
          actualVaultDir = vaultName;
        }
      }
    }

    // ========== vault.xxx - Vault 信息 ==========
    variables['vault'] = {
      id: vaultId,
      name: vaultName
    };

    // ========== artifact.xxx - 要创建的文件/Artifact 信息 ==========
    const targetFilePath = artifact.path || fileName;
    const targetFullRelativePath = `${ARCHITOOL_PATHS.WORKSPACE_ROOT_DIR}/${actualVaultDir}/${targetFilePath}`;
    const targetAbsolutePath = workspaceRoot 
      ? path.join(workspaceRoot, ARCHITOOL_PATHS.WORKSPACE_ROOT_DIR, actualVaultDir, targetFilePath)
      : targetFilePath;

    // 从 custom 中提取 folderPath 和 diagramType（如果存在）
    const folderPath = artifact.custom?.folderPath;
    const diagramType = artifact.custom?.diagramType;

    variables['artifact'] = {
      // Artifact 原有信息
      id: artifact.id,
      name: fileName || artifact.name,
      title: artifact.title || fileName,
      path: targetFilePath,
      format: artifact.format,
      viewType: artifact.viewType,
      category: artifact.category,
      // 文件路径信息
      fullRelativePath: targetFullRelativePath,
      absolutePath: targetAbsolutePath,
      // 创建时的临时信息（从 custom 中提取）
      folderPath: folderPath,
      diagramType: diagramType,
      vault: {
        id: vaultId,
        name: vaultName
      }
    };

    // ========== templateFile - 模板文件对象（简化版，只保留必要字段）==========
    // 从 artifact.templateFile 获取，添加增强信息（fullRelativePath, absolutePath）
    if (artifact.templateFile && artifact.templateFile.path && artifact.templateFile.name) {
      const f = artifact.templateFile;
      const fullRelativePath = f.vault 
        ? `${ARCHITOOL_PATHS.WORKSPACE_ROOT_DIR}/${f.vault.id}/${f.path}`
        : f.path;
      const absolutePath = f.vault && workspaceRoot
        ? path.join(workspaceRoot, ARCHITOOL_PATHS.WORKSPACE_ROOT_DIR, f.vault.id, f.path)
        : f.path;

      variables['templateFile'] = {
        name: f.name,
        path: f.path,
        fullRelativePath: fullRelativePath,
        absolutePath: absolutePath,
        vault: f.vault ? {
          id: f.vault.id,
          name: f.vault.name
        } : null
      };
    } else {
      variables['templateFile'] = null;
    }

    // ========== selectedFiles - 选中的文件数组（简化版，只保留必要字段）==========
    // 从 artifact.selectedFiles 获取，添加增强信息（fullRelativePath, absolutePath）
    let enhancedSelectedFiles: Array<any> = [];
    if (artifact.selectedFiles && artifact.selectedFiles.length > 0) {
      enhancedSelectedFiles = artifact.selectedFiles
        .filter(f => f.path && f.name) // 只保留有 path 和 name 的文件
        .map(f => {
          const fullRelativePath = f.vault 
            ? `${ARCHITOOL_PATHS.WORKSPACE_ROOT_DIR}/${f.vault.id}/${f.path}`
            : f.path;
          const absolutePath = f.vault && workspaceRoot
            ? path.join(workspaceRoot, ARCHITOOL_PATHS.WORKSPACE_ROOT_DIR, f.vault.id, f.path)
            : f.path;

          return {
            name: f.name,
            path: f.path,
            fullRelativePath: fullRelativePath,
            absolutePath: absolutePath
          };
        });
    }
    
    // 直接使用 selectedFiles（增强后）
    variables['selectedFiles'] = enhancedSelectedFiles;

    // ========== 将 custom 中的变量提升到顶层 ==========
    // 这样模板可以直接使用 task.name, formData, solutionPath 等变量
    if (artifact.custom) {
      for (const [key, value] of Object.entries(artifact.custom)) {
        // 确保数组和对象正确传递
        if (Array.isArray(value)) {
          variables[key] = value;
        } else if (typeof value === 'object' && value !== null) {
          variables[key] = value;
        } else {
          variables[key] = value !== undefined && value !== null ? value : '';
        }
      }
    }

    // 调试日志：检查关键变量
    if (variables.formDataItems) {
      console.log('[FileOperationDomainService] formDataItems in variables:', {
        type: typeof variables.formDataItems,
        isArray: Array.isArray(variables.formDataItems),
        length: Array.isArray(variables.formDataItems) ? variables.formDataItems.length : 'N/A',
        value: JSON.stringify(variables.formDataItems, null, 2)
      });
    } else {
      console.warn('[FileOperationDomainService] formDataItems not found in variables. Custom keys:', artifact.custom ? Object.keys(artifact.custom) : 'no custom');
    }

    return variables;
  }
}

