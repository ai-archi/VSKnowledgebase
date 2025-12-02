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

  /**
   * 提取模板中的变量
   * @param template 模板内容
   * @returns 变量名列表
   */
  extractVariables(template: string): string[];

  /**
   * 验证变量是否完整
   * @param command AI指令
   * @param context 执行上下文
   * @returns 缺失的必需变量列表
   */
  validateVariables(command: AICommand, context: CommandExecutionContext): string[];
}

/**
 * 指令模板领域服务实现
 */
export class CommandTemplateDomainServiceImpl implements CommandTemplateDomainService {
  /**
   * 渲染指令模板
   */
  renderTemplate(command: AICommand, context: CommandExecutionContext): string {
    let rendered = command.template;

    // 替换标准变量
    const variables = this.buildVariableMap(context);
    
    // 替换所有 {{variableName}} 格式的变量
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      rendered = rendered.replace(regex, value || '');
    }

    return rendered;
  }

  /**
   * 构建变量映射
   */
  private buildVariableMap(context: CommandExecutionContext): Record<string, string> {
    const variables: Record<string, string> = {};

    // 基础变量
    if (context.fileName) {
      variables['fileName'] = context.fileName;
    }
    if (context.folderPath) {
      variables['folderPath'] = context.folderPath;
    }
    if (context.vaultName) {
      variables['vaultName'] = context.vaultName;
    }
    if (context.diagramType) {
      variables['diagramType'] = context.diagramType;
    }

    // 选中的文件列表
    if (context.selectedFiles && context.selectedFiles.length > 0) {
      const fileNames = context.selectedFiles.map(f => f.title || f.name).join('、');
      const filePaths = context.selectedFiles.map(f => {
        const vaultPrefix = f.vault ? `${f.vault.name}(vault): ` : '';
        return `${vaultPrefix}${f.path}`;
      }).join('\n');
      
      variables['selectedFiles'] = fileNames;
      variables['selectedFilePaths'] = filePaths;
      variables['selectedFilesCount'] = context.selectedFiles.length.toString();
    } else {
      variables['selectedFiles'] = '';
      variables['selectedFilePaths'] = '';
      variables['selectedFilesCount'] = '0';
    }

    // 其他自定义变量
    for (const [key, value] of Object.entries(context)) {
      if (!['vaultId', 'vaultName', 'fileName', 'folderPath', 'diagramType', 'selectedFiles'].includes(key)) {
        variables[key] = String(value || '');
      }
    }

    return variables;
  }

  /**
   * 提取模板中的变量
   */
  extractVariables(template: string): string[] {
    const variableRegex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = variableRegex.exec(template)) !== null) {
      const varName = match[1];
      if (!variables.includes(varName)) {
        variables.push(varName);
      }
    }

    return variables;
  }

  /**
   * 验证变量是否完整
   */
  validateVariables(command: AICommand, context: CommandExecutionContext): string[] {
    const missing: string[] = [];

    if (command.variables) {
      for (const variable of command.variables) {
        if (variable.required) {
          const value = this.getVariableValue(variable.name, context);
          if (!value || value.trim() === '') {
            missing.push(variable.name);
          }
        }
      }
    }

    return missing;
  }

  /**
   * 获取变量值
   */
  private getVariableValue(varName: string, context: CommandExecutionContext): string | undefined {
    const variableMap: Record<string, any> = {
      fileName: context.fileName,
      folderPath: context.folderPath,
      vaultName: context.vaultName,
      diagramType: context.diagramType,
      selectedFiles: context.selectedFiles?.length ? 'hasFiles' : undefined,
    };

    return variableMap[varName] || context[varName];
  }
}

