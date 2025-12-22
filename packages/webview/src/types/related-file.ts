/**
 * RelatedFile 相关类型定义
 */
export interface RelatedFile {
  id: string;
  name: string;
  path: string;
  contentLocation?: string; // 完整文件路径
  type: 'document' | 'design' | 'code';
  icon?: string;
  vault?: {
    id: string;
    name: string;
  };
}

