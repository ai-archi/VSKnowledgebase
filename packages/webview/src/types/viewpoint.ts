/**
 * Viewpoint 相关类型定义
 */
export interface Viewpoint {
  id: string;
  name: string;
  description?: string;
  type: 'tag' | 'code-related' | 'task';
  requiredTags?: string[];
  optionalTags?: string[];
  excludedTags?: string[];
  codeRelatedConfig?: {
    mode: 'forward' | 'reverse';
    currentFilePath?: string;
  };
  isPredefined: boolean;
  isDefault?: boolean;
}

