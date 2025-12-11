import { TemplateStructureItem } from '../services/TemplateStructureDomainService';

/**
 * ArtifactTemplate 领域对象
 * 表示一个已解析并应用变量的模板结构
 */
export class ArtifactTemplate {
  /**
   * 模板结构项列表
   */
  public readonly structure: TemplateStructureItem[];

  /**
   * 使用的变量映射
   */
  public readonly variables: Record<string, string>;

  /**
   * 原始模板内容（用于调试）
   */
  public readonly rawTemplate?: string;

  constructor(
    structure: TemplateStructureItem[],
    variables: Record<string, string>,
    rawTemplate?: string
  ) {
    this.structure = structure;
    this.variables = variables;
    this.rawTemplate = rawTemplate;
  }

  /**
   * 验证模板是否有效
   */
  isValid(): boolean {
    return this.structure.length > 0;
  }

  /**
   * 获取所有结构项（扁平化）
   */
  getAllItems(): TemplateStructureItem[] {
    const items: TemplateStructureItem[] = [];
    
    const traverse = (item: TemplateStructureItem) => {
      items.push(item);
      if (item.children) {
        item.children.forEach(traverse);
      }
    };
    
    this.structure.forEach(traverse);
    return items;
  }
}

