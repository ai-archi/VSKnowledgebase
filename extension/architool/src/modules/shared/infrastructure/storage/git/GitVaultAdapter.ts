import { RemoteEndpoint } from '../../../domain/value_object/RemoteEndpoint';
import { Result } from '../../../../../core/types/Result';
import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';

export interface VaultError {
  code: string;
  message: string;
}

/**
 * 构建带认证信息的 Git URL
 * @param remote 远程仓库配置
 * @returns 带认证信息的 URL
 */
export function buildAuthenticatedUrl(remote: RemoteEndpoint): string {
  let url = remote.url;
  
  // 如果 URL 中已经包含认证信息，直接返回
  if (url.includes('@') && (url.startsWith('http://') || url.startsWith('https://'))) {
    return url;
  }
  
  // 只处理 HTTPS/HTTP URL，SSH URL 使用 SSH key 认证
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return url;
  }
  
  try {
    const urlObj = new URL(url);
    
    // 优先使用 accessToken
    if (remote.accessToken) {
      // 检测 Git 服务提供商
      const hostname = urlObj.hostname.toLowerCase();
      
      if (hostname.includes('github.com')) {
        // GitHub: 使用 token 作为用户名，密码留空
        urlObj.username = remote.accessToken;
        urlObj.password = '';
      } else if (hostname.includes('gitlab.com') || hostname.includes('gitlab')) {
        // GitLab: 使用 oauth2 作为用户名，token 作为密码
        urlObj.username = 'oauth2';
        urlObj.password = remote.accessToken;
      } else {
        // 其他 Git 服务：使用 token 作为用户名
        urlObj.username = remote.accessToken;
        urlObj.password = '';
      }
    } else if (remote.username && remote.password) {
      // 使用用户名密码
      urlObj.username = encodeURIComponent(remote.username);
      urlObj.password = encodeURIComponent(remote.password);
    }
    
    return urlObj.toString();
  } catch (error) {
    // 如果 URL 解析失败，返回原始 URL
    return url;
  }
}

export interface GitVaultAdapter {
  cloneRepository(remote: RemoteEndpoint, targetPath: string): Promise<Result<void, VaultError>>;
  pullRepository(vaultPath: string): Promise<Result<void, VaultError>>;
  pushRepository(vaultPath: string): Promise<Result<void, VaultError>>;
  getRemoteUrl(vaultPath: string): Promise<Result<string, VaultError>>;
  getCurrentBranch(vaultPath: string): Promise<Result<string, VaultError>>;
  isGitRepository(vaultPath: string): Promise<boolean>;
  checkoutBranch(vaultPath: string, branch: string): Promise<Result<void, VaultError>>;
  listRemoteBranches(remoteUrl: string, remote?: RemoteEndpoint): Promise<Result<string[], VaultError>>;
  updateRemoteUrl(vaultPath: string, remote: RemoteEndpoint): Promise<Result<void, VaultError>>;
}

export class GitVaultAdapterImpl implements GitVaultAdapter {
  private getGitInstance(repoPath: string): SimpleGit {
    const options: Partial<SimpleGitOptions> = {
      baseDir: repoPath,
      binary: 'git',
      maxConcurrentProcesses: 1,
    };
    return simpleGit(options);
  }

  async cloneRepository(remote: RemoteEndpoint, targetPath: string): Promise<Result<void, VaultError>> {
    try {
      // Ensure target directory doesn't exist or is empty
      if (fs.existsSync(targetPath)) {
        const files = fs.readdirSync(targetPath);
        if (files.length > 0) {
          return {
            success: false,
            error: {
              code: 'DIRECTORY_NOT_EMPTY',
              message: `Target directory is not empty: ${targetPath}`,
            },
          };
        }
      } else {
        // Create parent directory if it doesn't exist
        const parentDir = path.dirname(targetPath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }
      }

      // Build authenticated URL if credentials are provided
      const authenticatedUrl = buildAuthenticatedUrl(remote);

      // Clone repository with submodules
      const git = simpleGit();
      await git.clone(authenticatedUrl, targetPath, [
        '--branch', remote.branch || 'main',
        '--recurse-submodules'
      ]);

      // Initialize and update submodules after clone (in case --recurse-submodules didn't work)
      const repoGit = this.getGitInstance(targetPath);
      try {
        await repoGit.raw(['submodule', 'update', '--init', '--recursive']);
      } catch (submoduleError: any) {
        // If submodule update fails, it might be because there are no submodules
        // This is not a critical error, so we log it but don't fail the clone
        // The clone itself was successful
      }

      return { success: true, value: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'CLONE_FAILED',
          message: `Failed to clone repository: ${error.message}`,
        },
      };
    }
  }

  async pullRepository(vaultPath: string): Promise<Result<void, VaultError>> {
    try {
      if (!(await this.isGitRepository(vaultPath))) {
        return {
          success: false,
          error: {
            code: 'NOT_A_GIT_REPOSITORY',
            message: `Path is not a Git repository: ${vaultPath}`,
          },
        };
      }

      const git = this.getGitInstance(vaultPath);
      // Pull with submodule updates
      await git.pull(['--recurse-submodules']);
      
      // Update submodules to ensure they are up to date
      try {
        await git.raw(['submodule', 'update', '--remote', '--recursive']);
      } catch (submoduleError: any) {
        // If submodule update fails, it might be because there are no submodules
        // This is not a critical error, so we log it but don't fail the pull
        // The pull itself was successful
      }

      return { success: true, value: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'PULL_FAILED',
          message: `Failed to pull repository: ${error.message}`,
        },
      };
    }
  }

  async pushRepository(vaultPath: string): Promise<Result<void, VaultError>> {
    try {
      if (!(await this.isGitRepository(vaultPath))) {
        return {
          success: false,
          error: {
            code: 'NOT_A_GIT_REPOSITORY',
            message: `Path is not a Git repository: ${vaultPath}`,
          },
        };
      }

      const git = this.getGitInstance(vaultPath);
      await git.push();

      return { success: true, value: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'PUSH_FAILED',
          message: `Failed to push repository: ${error.message}`,
        },
      };
    }
  }

  async getRemoteUrl(vaultPath: string): Promise<Result<string, VaultError>> {
    try {
      if (!(await this.isGitRepository(vaultPath))) {
        return {
          success: false,
          error: {
            code: 'NOT_A_GIT_REPOSITORY',
            message: `Path is not a Git repository: ${vaultPath}`,
          },
        };
      }

      const git = this.getGitInstance(vaultPath);
      const remotes = await git.getRemotes(true);
      const origin = remotes.find(r => r.name === 'origin');
      
      if (!origin || !origin.refs.fetch) {
        return {
          success: false,
          error: {
            code: 'NO_REMOTE_URL',
            message: 'No remote URL found for origin',
          },
        };
      }

      return { success: true, value: origin.refs.fetch };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'GET_REMOTE_FAILED',
          message: `Failed to get remote URL: ${error.message}`,
        },
      };
    }
  }

  async getCurrentBranch(vaultPath: string): Promise<Result<string, VaultError>> {
    try {
      if (!(await this.isGitRepository(vaultPath))) {
        return {
          success: false,
          error: {
            code: 'NOT_A_GIT_REPOSITORY',
            message: `Path is not a Git repository: ${vaultPath}`,
          },
        };
      }

      const git = this.getGitInstance(vaultPath);
      const branch = await git.revparse(['--abbrev-ref', 'HEAD']);

      return { success: true, value: branch.trim() };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'GET_BRANCH_FAILED',
          message: `Failed to get current branch: ${error.message}`,
        },
      };
    }
  }

  async isGitRepository(vaultPath: string): Promise<boolean> {
    try {
      const gitDir = path.join(vaultPath, '.git');
      return fs.existsSync(gitDir) && fs.statSync(gitDir).isDirectory();
    } catch {
      return false;
    }
  }

  async listRemoteBranches(remoteUrl: string, remote?: RemoteEndpoint): Promise<Result<string[], VaultError>> {
    try {
      // 如果提供了 remote 对象，使用带认证的 URL
      const authenticatedUrl = remote ? buildAuthenticatedUrl(remote) : remoteUrl;
      
      // 使用 git ls-remote 获取远程分支列表
      const git = simpleGit();
      const result = await git.listRemote(['--heads', authenticatedUrl]);
      
      // 解析输出，提取分支名称
      // 输出格式: <commit-hash>	refs/heads/branch-name
      const branches: string[] = [];
      const lines = result.trim().split('\n');
      
      for (const line of lines) {
        if (line.trim()) {
          const match = line.match(/refs\/heads\/(.+)$/);
          if (match && match[1]) {
            branches.push(match[1]);
          }
        }
      }
      
      // 如果没有找到分支，返回默认分支列表
      if (branches.length === 0) {
        return { success: true, value: ['main', 'master', 'develop'] };
      }
      
      // 排序：main 和 master 优先
      branches.sort((a, b) => {
        if (a === 'main') return -1;
        if (b === 'main') return 1;
        if (a === 'master') return -1;
        if (b === 'master') return 1;
        return a.localeCompare(b);
      });
      
      return { success: true, value: branches };
    } catch (error: any) {
      // 如果获取失败，返回默认分支列表
      return { success: true, value: ['main', 'master', 'develop'] };
    }
  }

  async checkoutBranch(vaultPath: string, branch: string): Promise<Result<void, VaultError>> {
    try {
      if (!(await this.isGitRepository(vaultPath))) {
        return {
          success: false,
          error: {
            code: 'NOT_A_GIT_REPOSITORY',
            message: `Path is not a Git repository: ${vaultPath}`,
          },
        };
      }

      const git = this.getGitInstance(vaultPath);
      await git.checkout(branch);

      return { success: true, value: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'CHECKOUT_FAILED',
          message: `Failed to checkout branch: ${error.message}`,
        },
      };
    }
  }

  async updateRemoteUrl(vaultPath: string, remote: RemoteEndpoint): Promise<Result<void, VaultError>> {
    try {
      if (!(await this.isGitRepository(vaultPath))) {
        return {
          success: false,
          error: {
            code: 'NOT_A_GIT_REPOSITORY',
            message: `Path is not a Git repository: ${vaultPath}`,
          },
        };
      }

      const git = this.getGitInstance(vaultPath);
      const authenticatedUrl = buildAuthenticatedUrl(remote);
      
      // 检查 origin remote 是否存在
      const remotes = await git.getRemotes();
      const originExists = remotes.some(r => r.name === 'origin');
      
      if (originExists) {
        // 更新现有的 remote URL
        await git.removeRemote('origin');
      }
      
      // 添加新的 remote URL
      await git.addRemote('origin', authenticatedUrl);

      return { success: true, value: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'UPDATE_REMOTE_FAILED',
          message: `Failed to update remote URL: ${error.message}`,
        },
      };
    }
  }
}
