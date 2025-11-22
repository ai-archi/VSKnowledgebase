import { RemoteEndpoint } from '../../../domain/shared/vault/RemoteEndpoint';
import { Result } from '../../../core/types/Result';
import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';

export interface VaultError {
  code: string;
  message: string;
}

export interface GitVaultAdapter {
  cloneRepository(remote: RemoteEndpoint, targetPath: string): Promise<Result<void, VaultError>>;
  pullRepository(vaultPath: string): Promise<Result<void, VaultError>>;
  pushRepository(vaultPath: string): Promise<Result<void, VaultError>>;
  getRemoteUrl(vaultPath: string): Promise<Result<string, VaultError>>;
  getCurrentBranch(vaultPath: string): Promise<Result<string, VaultError>>;
  isGitRepository(vaultPath: string): Promise<boolean>;
  checkoutBranch(vaultPath: string, branch: string): Promise<Result<void, VaultError>>;
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

      // Clone repository
      const git = simpleGit();
      await git.clone(remote.url, targetPath, ['--branch', remote.branch || 'main']);

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
      await git.pull();

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
}

