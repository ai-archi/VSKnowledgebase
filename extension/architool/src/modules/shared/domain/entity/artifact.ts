import { VaultReference } from '../value_object/VaultReference';
import { ArtifactViewType, ArtifactStatus, ArtifactNodeType } from '../types';

/**
 * Artifact 核心实体
 * 架构管理的统一抽象，替代原有的 Note 概念
 */
export interface Artifact {
  // 核心标识
  id: string; // UUID，全局唯一
  vault: VaultReference;
  
  // 文件属性
  nodeType: ArtifactNodeType;
  path: string; // 相对路径，如 "documents/requirements/user-login.md"
  name: string; // 文件名，如 "user-login"
  format: string; // 文件格式，如 "md", "puml", "mermaid"
  contentLocation: string; // 完整文件系统路径
  
  // 分类与视图
  viewType: ArtifactViewType;
  category?: string; // 分类，如 "requirement", "architecture", "standard"
  
  // 内容属性
  title: string;
  description?: string;
  content?: string; // 内容体，可选（大文件不加载到内存）
  contentHash?: string; // 内容哈希，用于变更检测
  contentSize?: number; // 内容大小（字节），当内容未加载时提供
  
  // 元数据引用
  metadataId?: string; // 关联的元数据 ID
  
  // 时间戳
  createdAt: string; // ISO 8601 格式
  updatedAt: string; // ISO 8601 格式
  
  // 版本与状态
  version?: string; // 版本号
  status: ArtifactStatus;
  
  // 扩展属性
  tags?: string[]; // 标签数组
  custom?: Record<string, any>; // 自定义属性
  
  // 模板渲染相关（可选，仅在模板渲染时使用）
  templateFile?: {
    id?: string;
    path: string;
    name: string;
    title?: string;
    vault?: {
      id: string;
      name: string;
    };
  };
  
  selectedFiles?: Array<{
    id?: string;
    path: string;
    name: string;
    title?: string;
    vault?: {
      id: string;
      name: string;
    };
  }>;
}

