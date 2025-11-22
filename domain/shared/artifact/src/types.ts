/**
 * 基础类型定义
 */

// 视图类型
export type ArtifactViewType = 'document' | 'design' | 'development' | 'test';

// 状态类型
export type ArtifactStatus = 'draft' | 'review' | 'published' | 'archived';

// 节点类型
export type ArtifactNodeType = 'FILE' | 'DIRECTORY';

// 链接类型
export type LinkType = 
  | 'implements'    // 实现关系
  | 'references'    // 引用关系
  | 'depends_on'    // 依赖关系
  | 'related_to'    // 相关关系
  | 'validates'     // 验证关系
  | 'tests';        // 测试关系

// 链接强度
export type LinkStrength = 'strong' | 'medium' | 'weak';

// 目标类型
export type TargetType = 'artifact' | 'code' | 'file' | 'component' | 'external';

// 变更类型
export type ChangeType = 'CREATE' | 'UPDATE' | 'DELETE' | 'RENAME' | 'MOVE';

// 文档内链接类型
export type ArtifactLinkInfoType = 'wikilink' | 'ref' | 'external';

