import { Template } from '@huggingface/jinja';
import { AICommand, VariableDefinition } from '../entity/AICommand';
import { CommandExecutionContext } from '../value_object/CommandExecutionContext';

/**
 * 指令模板领域服务接口
 * 负责模板变量的替换和渲染
 */
export interface CommandTemplateDomainService {
  /**
   * 渲染指令模板
   * @param command AI指令
   * @param context 执行上下文
   * @returns 渲染后的提示词
   */
  renderTemplate(command: AICommand, context: CommandExecutionContext): string;
}

/**
 * 指令模板领域服务实现
 */
export class CommandTemplateDomainServiceImpl implements CommandTemplateDomainService {
  /**
   * 渲染指令模板
   */
  renderTemplate(command: AICommand, context: CommandExecutionContext): string {
    // 支持 commandContent 和 template 字段（兼容旧格式）
    const templateString = (command as any).commandContent || command.template;
    
    if (!templateString) {
      return '';
    }

    try {
      // 使用 Jinja2 模板引擎
      const template = new Template(templateString);
      
      // 构建变量映射（支持嵌套对象结构）
      const variables = this.buildVariableMap(context);
      
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
  private buildVariableMap(context: CommandExecutionContext): Record<string, any> {
    const variables: Record<string, any> = {};

    // 基础变量
    variables['fileName'] = context.fileName || '';
    variables['folderPath'] = context.folderPath || '';
    variables['vaultName'] = context.vaultName || '';
    variables['vaultId'] = context.vaultId || '';
    variables['diagramType'] = context.diagramType || '';

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

