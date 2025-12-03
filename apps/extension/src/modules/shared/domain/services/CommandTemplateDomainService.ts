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
    // 支持 commandContent 和 template 字段（兼容旧格式）
    const template = (command as any).commandContent || command.template;
    let rendered = template;

    // 构建变量映射（包含对象结构，支持 Jinja2 语法）
    const variables = this.buildVariableMap(context);
    
    // 简单的 Jinja2 语法支持
    // 1. 处理 {% if %} ... {% endif %}
    rendered = this.processIfStatements(rendered, variables);
    
    // 2. 处理 {% for %} ... {% endfor %}
    rendered = this.processForLoops(rendered, context);
    
    // 3. 替换 {{variable}} 格式的变量
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${this.escapeRegex(key)}\\}\\}`, 'g');
      rendered = rendered.replace(regex, String(value || ''));
    }

    // 4. 处理 {{ file.title or file.name }} 这种表达式
    rendered = this.processExpressions(rendered, context);

    return rendered.trim();
  }

  /**
   * 转义正则表达式特殊字符
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 处理 {% if %} ... {% endif %} 语句
   */
  private processIfStatements(template: string, variables: Record<string, any>): string {
    const ifRegex = /\{%\s*if\s+(\w+)\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g;
    return template.replace(ifRegex, (match, varName, content) => {
      const value = variables[varName];
      if (value && value !== '' && value !== '0' && value !== 'false') {
        return content;
      }
      return '';
    });
  }

  /**
   * 处理 {% for %} ... {% endfor %} 循环
   */
  private processForLoops(template: string, context: CommandExecutionContext): string {
    // 处理 {% for file in selectedFiles %} ... {% endfor %}
    const forRegex = /\{%\s*for\s+(\w+)\s+in\s+(\w+)\s*%\}([\s\S]*?)\{%\s*endfor\s*%\}/g;
    return template.replace(forRegex, (match, itemVar, arrayVar, content) => {
      if (arrayVar === 'selectedFiles' && context.selectedFiles) {
        return context.selectedFiles.map((file: any) => {
          let result = content;
          // 替换循环变量
          result = result.replace(new RegExp(`\\{\\{\\s*${itemVar}\\.(\\w+)\\s*\\}\\}`, 'g'), (_m: string, prop: string) => {
            return file[prop] || '';
          });
          // 处理 {{ file.title or file.name }} 这种表达式
          result = result.replace(/\{\{\s*(\w+)\.(\w+)\s+or\s+(\w+)\.(\w+)\s*\}\}/g, (m: string, obj1: string, prop1: string, obj2: string, prop2: string) => {
            if (obj1 === itemVar && obj2 === itemVar) {
              return file[prop1] || file[prop2] || '';
            }
            return m;
          });
          return result;
        }).join('');
      }
      return '';
    });
  }

  /**
   * 处理表达式如 {{ file.title or file.name }}
   */
  private processExpressions(template: string, context: CommandExecutionContext): string {
    // 处理 {{ file.title or file.name }} 这种表达式（在 for 循环外部）
    const exprRegex = /\{\{\s*(\w+)\.(\w+)\s+or\s+(\w+)\.(\w+)\s*\}\}/g;
    return template.replace(exprRegex, (match, obj1, prop1, obj2, prop2) => {
      // 这里主要处理 selectedFiles[0] 的情况
      if (context.selectedFiles && context.selectedFiles.length > 0) {
        const file = context.selectedFiles[0] as any;
        if (obj1 === 'file' && obj2 === 'file') {
          return file[prop1] || file[prop2] || '';
        }
      }
      return match;
    });
  }

  /**
   * 构建变量映射
   */
  private buildVariableMap(context: CommandExecutionContext): Record<string, string> {
    const variables: Record<string, string> = {};

    // 基础变量（即使为 undefined 也添加，使用空字符串）
    variables['fileName'] = context.fileName || '';
    variables['folderPath'] = context.folderPath || '';
    variables['vaultName'] = context.vaultName || '';
    variables['vaultId'] = context.vaultId || '';
    variables['diagramType'] = context.diagramType || '';

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
    // 不再需要验证，因为所有变量都是可选的
    return [];
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

