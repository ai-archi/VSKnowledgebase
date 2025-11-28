import { ArtifactLinkInfo } from './value_object/ArtifactLinkInfo';

/**
 * ArtifactMetadata 值对象
 * 存储 Artifact 的扩展元数据，与 Artifact 分离存储
 */
export interface ArtifactMetadata {
  // 标识信息
  id: string; // 元数据 ID
  artifactId: string; // 关联的 Artifact ID
  vaultId: string; // 所属 Vault ID
  vaultName: string; // 所属 Vault 名称
  
  // 类型与分类
  type?: string; // 类型
  category?: string; // 分类
  
  // 标签
  tags?: string[]; // 标签数组，用于视点视图和搜索
  
  // 文档内链接
  links?: ArtifactLinkInfo[]; // 文档内的链接：wikilinks, refs, external
  
  // 显式关联关系
  relatedArtifacts?: string[]; // 关联的 Artifact ID 列表
  relatedCodePaths?: string[]; // 关联的代码路径
  relatedComponents?: string[]; // 架构组件 ID 列表
  
  // 作者与权限
  author?: string; // 作者
  owner?: string; // 所有者
  reviewers?: string[]; // 评审者列表
  
  // 扩展属性
  properties?: Record<string, any>; // 扩展属性，JSON 格式
  
  // 时间戳
  createdAt: string; // ISO 8601 格式
  updatedAt: string; // ISO 8601 格式
}

