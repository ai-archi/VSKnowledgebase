/**
 * RemoteEndpoint
 * 远程仓库配置
 */
export interface RemoteEndpoint {
  url: string; // Git 仓库 URL
  branch: string; // 分支名称，默认：main/master
  sync: 'auto' | 'manual'; // 同步策略
  // 认证信息（可选）
  username?: string; // 用户名
  password?: string; // 密码
  accessToken?: string; // Access Token（优先于 username/password）
}

