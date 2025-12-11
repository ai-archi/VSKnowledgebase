import { ArtifactTemplate } from '../entity/ArtifactTemplate';
import { ArtifactError, ArtifactErrorCode } from '../errors';

/**
 * 模板结构项
 */
export interface TemplateStructureItem {
  type: 'directory' | 'file';
  name: string;
  description?: string;
  children?: TemplateStructureItem[];
  template?: string; // 文件模板路径（仅用于文件类型）
}

/**
 * 变量替换映射
 */
export interface VariableMap {
  [key: string]: string;
}

/**
 * 模板结构领域服务接口
 * 处理模板结构相关的业务逻辑
 */
export interface TemplateStructureDomainService {
  /**
   * 解析模板内容并应用变量，返回 ArtifactTemplate 对象
   * @param template 模板内容（字符串，通常是 JSON 或 YAML 格式）
   * @param variables 变量映射（用于替换模板中的变量）
   * @returns 解析后的 ArtifactTemplate 对象，如果解析失败则返回 null
   */
  parseTemplateStructure(template: string, variables: VariableMap): ArtifactTemplate | null;

  /**
   * 验证模板结构项
   * @param item 结构项
   * @returns 验证错误信息，如果验证通过则返回 null
   */
  validateStructureItem(item: TemplateStructureItem): string | null;

  /**
   * 使用类似 Jinja2 的模板语法替换字符串中的变量
   * 支持 {{variable}} 语法，未来可扩展支持过滤器等
   * @param text 包含变量的文本
   * @param variables 变量映射
   * @returns 替换后的文本
   */
  renderTemplate(text: string, variables: VariableMap): string;
}

/**
 * 模板结构领域服务实现
 */
export class TemplateStructureDomainServiceImpl implements TemplateStructureDomainService {
  /**
   * 解析模板内容并应用变量
   */
  parseTemplateStructure(template: string, variables: VariableMap): ArtifactTemplate | null {
    try {
      if (!template || typeof template !== 'string') {
        return null;
      }

      // 解析模板内容（可能是 JSON 字符串）
      let structure: any = null;
      try {
        structure = JSON.parse(template);
      } catch (e) {
        // 如果不是 JSON，返回 null
        return null;
      }

      // 获取结构数组（可能是 structure 字段或直接是数组）
      const structureArray = structure.structure || (Array.isArray(structure) ? structure : null);

      if (!Array.isArray(structureArray)) {
        return null;
      }

      // 验证并转换结构项，同时应用变量替换
      const items: TemplateStructureItem[] = [];
      for (const item of structureArray) {
        // 先修复 name 字段的类型问题
        const fixedItem = this.fixItemName(item);
        
        // 验证结构项
        const validationError = this.validateStructureItem(fixedItem);
        if (validationError) {
          // 跳过无效项，但继续处理其他项
          continue;
        }

        // 应用变量替换
        const replacedItem = this.applyVariablesToItem(fixedItem, variables);
        items.push(replacedItem);
      }

      if (items.length === 0) {
        return null;
      }

      // 返回 ArtifactTemplate 对象
      return new ArtifactTemplate(items, variables, template);
    } catch (error: any) {
      return null;
    }
  }

  /**
   * 修复结构项的 name 字段（处理可能的对象序列化问题）
   */
  private fixItemName(item: any): TemplateStructureItem {
    const fixedItem = { ...item };

    // 确保 name 字段是字符串
    if (fixedItem.name && typeof fixedItem.name !== 'string') {
      if (typeof fixedItem.name === 'object') {
        // 如果是对象，尝试提取有用的值
        const objKeys = Object.keys(fixedItem.name);
        if (objKeys.length > 0 && objKeys[0] !== '[object Object]') {
          fixedItem.name = objKeys[0];
        } else {
          // 如果对象没有有效键，尝试 JSON.stringify
          const jsonStr = JSON.stringify(fixedItem.name);
          if (jsonStr !== '{}' && jsonStr !== 'null') {
            fixedItem.name = jsonStr;
          } else {
            fixedItem.name = String(fixedItem.name);
          }
        }
      } else {
        fixedItem.name = String(fixedItem.name);
      }
    }

    return fixedItem as TemplateStructureItem;
  }

  /**
   * 对结构项应用变量替换
   */
  private applyVariablesToItem(item: TemplateStructureItem, variables: VariableMap): TemplateStructureItem {
    const replacedItem: TemplateStructureItem = {
      ...item,
      name: this.renderTemplate(item.name, variables),
      description: item.description ? this.renderTemplate(item.description, variables) : undefined,
      template: item.template ? this.renderTemplate(item.template, variables) : undefined,
    };

    // 递归处理子项
    if (item.children && Array.isArray(item.children)) {
      replacedItem.children = item.children.map(child => this.applyVariablesToItem(child, variables));
    }

    return replacedItem;
  }

  /**
   * 使用类似 Jinja2 的模板语法替换变量
   * 支持 {{variable}} 语法
   * 未来可扩展支持：
   * - {{variable|filter}} 过滤器
   * - {{variable|default('value')}} 默认值
   * - {% if condition %} 条件语句
   * - {% for item in items %} 循环语句
   */
  renderTemplate(text: string, variables: VariableMap): string {
    if (!text || typeof text !== 'string') {
      return text;
    }

    let result = text;
    
    // 替换 {{variable}} 格式的变量
    // 使用正则表达式匹配 {{variable}} 或 {{variable|filter}} 格式
    const templateRegex = /\{\{([^}]+)\}\}/g;
    
    result = result.replace(templateRegex, (match, expression) => {
      // 去除空白字符
      expression = expression.trim();
      
      // 检查是否有过滤器（未来扩展）
      const parts = expression.split('|').map((p: string) => p.trim());
      const variableName = parts[0];
      
      // 获取变量值
      const value = variables[variableName];
      
      // 如果变量不存在，返回空字符串
      if (value === undefined || value === null) {
        return '';
      }
      
      // 确保值是字符串
      let stringValue: string;
      if (typeof value === 'string') {
        stringValue = value;
      } else if (typeof value === 'object') {
        // 如果是对象，尝试转换为字符串（避免 [object Object]）
        stringValue = String(value);
        if (stringValue === '[object Object]') {
          stringValue = JSON.stringify(value);
        }
      } else {
        stringValue = String(value);
      }
      
      // 应用过滤器（如果有）
      // 目前只支持基本替换，未来可以扩展过滤器
      for (let i = 1; i < parts.length; i++) {
        const filter = parts[i];
        // 未来可以在这里实现过滤器逻辑
        // 例如：lower, upper, capitalize, default 等
      }
      
      return stringValue;
    });
    
    return result;
  }

  validateStructureItem(item: TemplateStructureItem): string | null {
    if (!item || !item.type || !item.name) {
      return 'Structure item must have type and name';
    }

    if (item.type !== 'directory' && item.type !== 'file') {
      return `Invalid structure item type: ${item.type}`;
    }

    if (item.type === 'file' && item.children) {
      return 'File type structure item cannot have children';
    }

    if (item.type === 'directory' && item.children) {
      // 递归验证子项
      for (const child of item.children) {
        const childError = this.validateStructureItem(child);
        if (childError) {
          return `Child item validation failed: ${childError}`;
        }
      }
    }

    return null;
  }
}
