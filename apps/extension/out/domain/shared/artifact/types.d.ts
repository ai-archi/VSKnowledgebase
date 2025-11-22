/**
 * Artifact 视图类型
 */
export type ArtifactViewType = 'document' | 'design' | 'development' | 'test';
/**
 * Artifact 状态类型
 */
export type ArtifactStatus = 'draft' | 'review' | 'published' | 'archived';
/**
 * 节点类型
 */
export type ArtifactNodeType = 'FILE' | 'DIRECTORY';
/**
 * 链接类型
 */
export type LinkType = 'implements' | 'references' | 'depends_on' | 'related_to' | 'validates' | 'tests';
/**
 * 链接强度
 */
export type LinkStrength = 'strong' | 'medium' | 'weak';
/**
 * 目标类型
 */
export type TargetType = 'artifact' | 'code' | 'file' | 'component' | 'external';
/**
 * 变更类型
 */
export type ChangeType = 'CREATE' | 'UPDATE' | 'DELETE' | 'RENAME' | 'MOVE';
/**
 * 文档内链接类型
 */
export type ArtifactLinkInfoType = 'wikilink' | 'ref' | 'external';
//# sourceMappingURL=types.d.ts.map