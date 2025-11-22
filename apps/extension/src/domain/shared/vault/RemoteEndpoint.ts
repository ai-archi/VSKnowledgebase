/**
 * 远程端点
 * 用于 Git Vault 的远程仓库配置
 */
export interface RemoteEndpoint {
  url: string; // Git 仓库 URL
  branch?: string; // 分支名称，默认为 'main'
}


