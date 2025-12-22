/**
 * Artifact 相关类型定义
 */
export interface Artifact {
  id: string;
  title: string;
  path: string;
  contentLocation: string;
  vault: {
    id: string;
    name: string;
  };
  tags?: string[];
  viewType?: string;
}

