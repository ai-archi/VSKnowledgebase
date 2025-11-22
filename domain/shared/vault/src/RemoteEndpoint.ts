/**
 * RemoteEndpoint
 * 远程仓库配置
 */
export interface RemoteEndpoint {
  url: string; // Git 仓库 URL
  branch: string; // 分支名称，默认：main/master
  sync: 'auto' | 'manual'; // 同步策略
}

