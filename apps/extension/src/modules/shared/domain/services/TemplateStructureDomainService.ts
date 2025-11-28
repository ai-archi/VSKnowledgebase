import { VaultReference } from '../value_object/VaultReference';
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
 * 模板结构领域服务接口
 * 处理模板结构相关的业务逻辑
 */
export interface TemplateStructureDomainService {
  /**
   * 解析模板内容为结构数组
   * @param template 模板内容（可能是字符串或对象）
   * @returns 解析后的结构数组
   */
  parseTemplateStructure(template: any): TemplateStructureItem[] | null;

  /**
   * 验证模板结构项
   * @param item 结构项
   * @returns 验证错误信息，如果验证通过则返回 null
   */
  validateStructureItem(item: TemplateStructureItem): string | null;
}

/**
 * 模板结构领域服务实现
 */
export class TemplateStructureDomainServiceImpl implements TemplateStructureDomainService {
  parseTemplateStructure(template: any): TemplateStructureItem[] | null {
    try {
      // 解析模板内容（可能是字符串或对象）
      let structure: any = null;

      if (typeof template === 'string') {
        try {
          structure = JSON.parse(template);
        } catch (e) {
          // 如果不是 JSON，返回 null
          return null;
        }
      } else if (template && typeof template === 'object') {
        structure = template;
      } else {
        return null;
      }

      // 获取结构数组（可能是 structure 字段或直接是数组）
      const structureArray = structure.structure || (Array.isArray(structure) ? structure : null);

      if (!Array.isArray(structureArray)) {
        return null;
      }

      // 验证并转换结构项
      const items: TemplateStructureItem[] = [];
      for (const item of structureArray) {
        const validationError = this.validateStructureItem(item);
        if (validationError) {
          // 跳过无效项，但继续处理其他项
          continue;
        }
        items.push(item as TemplateStructureItem);
      }

      return items.length > 0 ? items : null;
    } catch (error: any) {
      return null;
    }
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

