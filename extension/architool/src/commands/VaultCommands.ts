import * as vscode from 'vscode';
import * as path from 'path';
import { CommandAdapter, CommandDefinition } from '../core/vscode-api/CommandAdapter';
import { Logger } from '../core/logger/Logger';
import { VaultApplicationService } from '../modules/shared/application/VaultApplicationService';
import { RemoteEndpoint } from '../modules/shared/domain/value_object/RemoteEndpoint';
import { GitVaultAdapter } from '../modules/shared/infrastructure/storage/git/GitVaultAdapter';
import { Container } from 'inversify';
import { TYPES } from '../infrastructure/di/types';
import { DocumentTreeViewProvider } from '../views/DocumentTreeViewProvider';
import { AssistantsTreeViewProvider } from '../views/AssistantsTreeViewProvider';

/**
 * Vault 相关命令
 */
export class VaultCommands {
  constructor(
    private vaultService: VaultApplicationService,
    private container: Container,
    private logger: Logger,
    private documentTreeViewProvider?: DocumentTreeViewProvider,
    private assistantsTreeViewProvider?: AssistantsTreeViewProvider
  ) {}

  /**
   * 注册所有 vault 相关命令
   */
  register(commandAdapter: CommandAdapter): void {
    const commands: CommandDefinition[] = [
      {
        command: 'archi.vault.add',
        callback: async () => {
          const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
          if (!workspaceFolder) {
            vscode.window.showErrorMessage('Please open a workspace first.');
            return;
          }

          const vaultName = await vscode.window.showInputBox({
            prompt: 'Enter vault name',
            validateInput: (value) => {
              if (!value || value.trim().length === 0) {
                return 'Vault name cannot be empty';
              }
              if (/[<>:"/\\|?*]/.test(value)) {
                return 'Vault name contains invalid characters';
              }
              return null;
            }
          });
          if (!vaultName) return;

          const workspaceRoot = workspaceFolder.uri.fsPath;
          const vaultPath = path.join(workspaceRoot, '.architool', vaultName);

          const result = await this.vaultService.addLocalVault({
            name: vaultName,
            fsPath: vaultPath,
            description: '',
          });

          if (result.success) {
            vscode.window.showInformationMessage(`Vault '${vaultName}' added at ${vaultPath}`);
            this.refreshViews();
          } else {
            vscode.window.showErrorMessage(`Failed to add vault: ${result.error.message}`);
          }
        },
      },
      {
        command: 'archi.vault.addFromGit',
        callback: async () => {
          const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
          if (!workspaceFolder) {
            vscode.window.showErrorMessage('Please open a workspace first.');
            return;
          }

          const remoteUrl = await vscode.window.showInputBox({
            prompt: 'Enter Git repository URL',
            validateInput: (value) => {
              if (!value || value.trim().length === 0) {
                return 'Git repository URL cannot be empty';
              }
              if (!/^https?:\/\/.+/.test(value) && !/^git@.+/.test(value)) {
                return 'Please enter a valid Git repository URL';
              }
              return null;
            }
          });
          if (!remoteUrl) return;

          const vaultName = this.extractRepoName(remoteUrl.trim());
          if (!vaultName || vaultName.length === 0) {
            vscode.window.showErrorMessage('Failed to extract repository name from URL');
            return;
          }

          const auth = await this.collectGitAuth(remoteUrl.trim());
          if (auth === null) return; // User cancelled

          const remoteForBranchList: RemoteEndpoint = {
            url: remoteUrl.trim(),
            branch: 'main',
            sync: 'manual',
            ...(auth.accessToken && { accessToken: auth.accessToken }),
            ...(auth.username && { username: auth.username }),
            ...(auth.password && { password: auth.password }),
          };

          const gitAdapter = this.container.get<GitVaultAdapter>(TYPES.GitVaultAdapter);
          const branchesResult = await gitAdapter.listRemoteBranches(remoteUrl.trim(), remoteForBranchList);

          let branchOptions: vscode.QuickPickItem[] = [];
          if (branchesResult.success && branchesResult.value.length > 0) {
            branchOptions = branchesResult.value.map((branchName: string) => ({
              label: branchName,
              description: branchName === 'main' || branchName === 'master' ? 'Default branch' : undefined,
            }));
          } else {
            branchOptions = [
              { label: 'main', description: 'Default branch' },
              { label: 'master', description: 'Default branch' },
              { label: 'develop', description: 'Development branch' },
            ];
          }

          const selectedBranch = await vscode.window.showQuickPick(branchOptions, {
            placeHolder: 'Select a branch',
            canPickMany: false,
            ignoreFocusOut: false,
          });

          if (!selectedBranch) return;

          const remote: RemoteEndpoint = {
            url: remoteUrl.trim(),
            branch: selectedBranch.label || 'main',
            sync: 'manual',
            ...(auth.accessToken && { accessToken: auth.accessToken }),
            ...(auth.username && { username: auth.username }),
            ...(auth.password && { password: auth.password }),
          };

          vscode.window.showInformationMessage(`Cloning vault '${vaultName}' from Git...`);

          const result = await this.vaultService.addVaultFromGit({
            name: vaultName,
            remote,
            description: '',
          });

          if (result.success) {
            const workspaceRoot = workspaceFolder.uri.fsPath;
            const vaultPath = path.join(workspaceRoot, '.architool', vaultName);
            vscode.window.showInformationMessage(`Vault '${vaultName}' cloned from Git to ${vaultPath}`);
            this.refreshViews();
          } else {
            vscode.window.showErrorMessage(`Failed to clone vault from Git: ${result.error.message}`);
          }
        },
      },
      {
        command: 'archi.vault.list',
        callback: async () => {
          const result = await this.vaultService.listVaults();
          if (result.success) {
            const vaultList = result.value.map(v => `- ${v.name} (${v.remote ? 'Git vault' : 'Local vault'})`).join('\n');
            vscode.window.showInformationMessage(`Vaults:\n${vaultList}`);
          } else {
            vscode.window.showErrorMessage(`Failed to list vaults: ${result.error.message}`);
          }
        },
      },
      {
        command: 'archi.vault.fork',
        callback: async () => {
          const vaultsResult = await this.vaultService.listVaults();
          if (!vaultsResult.success || vaultsResult.value.length === 0) {
            vscode.window.showErrorMessage('No vaults available.');
            return;
          }

          const gitVaults = vaultsResult.value.filter(v => v.remote);
          if (gitVaults.length === 0) {
            vscode.window.showErrorMessage('No Git vaults available to fork.');
            return;
          }

          const vaultItems = gitVaults.map(v => ({
            label: v.name,
            description: v.description || `Git vault: ${v.remote?.url}`,
            id: v.id,
          }));

          const selectedVault = await vscode.window.showQuickPick(vaultItems, {
            placeHolder: 'Select a Git vault to fork',
          });

          if (!selectedVault) return;

          const newVaultName = await vscode.window.showInputBox({
            prompt: 'Enter name for the new local vault',
            validateInput: (value) => {
              if (!value || value.trim().length === 0) {
                return 'Vault name cannot be empty';
              }
              const existing = vaultsResult.value.find(v => v.name === value.trim());
              if (existing) {
                return 'Vault name already exists';
              }
              return null;
            },
          });

          if (!newVaultName) return;

          const result = await this.vaultService.forkGitVault(selectedVault.id, newVaultName.trim());
          if (result.success) {
            vscode.window.showInformationMessage(`Vault '${newVaultName}' forked from '${selectedVault.label}'.`);
            this.refreshViews();
          } else {
            vscode.window.showErrorMessage(`Failed to fork vault: ${result.error.message}`);
          }
        },
      },
      {
        command: 'archi.vault.sync',
        callback: async () => {
          const vaultsResult = await this.vaultService.listVaults();
          if (!vaultsResult.success || vaultsResult.value.length === 0) {
            vscode.window.showErrorMessage('No vaults available.');
            return;
          }

          const gitVaults = vaultsResult.value.filter(v => v.remote);
          if (gitVaults.length === 0) {
            vscode.window.showErrorMessage('No Git vaults available to sync.');
            return;
          }

          const vaultItems = gitVaults.map(v => ({
            label: v.name,
            description: v.description || `Git vault: ${v.remote?.url}`,
            id: v.id,
          }));

          const selectedVault = await vscode.window.showQuickPick(vaultItems, {
            placeHolder: 'Select a Git vault to sync',
          });

          if (!selectedVault) return;

          vscode.window.showInformationMessage(`Syncing vault '${selectedVault.label}'...`);
          const result = await this.vaultService.syncVault(selectedVault.id);
          if (result.success) {
            vscode.window.showInformationMessage(`Vault '${selectedVault.label}' synced successfully.`);
            this.refreshViews();
          } else {
            vscode.window.showErrorMessage(`Failed to sync vault: ${result.error.message}`);
          }
        },
      },
      {
        command: 'archi.vault.remove',
        callback: async () => {
          const vaultsResult = await this.vaultService.listVaults();
          if (!vaultsResult.success || vaultsResult.value.length === 0) {
            vscode.window.showErrorMessage('No vaults available.');
            return;
          }

          const vaultItems = vaultsResult.value.map(v => ({
            label: v.name,
            description: v.description || (v.remote ? 'Git vault' : 'Local vault'),
            id: v.id,
          }));

          const selectedVault = await vscode.window.showQuickPick(vaultItems, {
            placeHolder: 'Select a vault to remove',
          });

          if (!selectedVault) return;

          const confirm = await vscode.window.showWarningMessage(
            `Are you sure you want to remove vault '${selectedVault.label}'?`,
            { modal: true },
            'Yes',
            'No'
          );

          if (confirm !== 'Yes') return;

          const deleteFiles = await vscode.window.showQuickPick(
            ['Yes', 'No'],
            {
              placeHolder: 'Delete vault files from disk?',
            }
          );

          const result = await this.vaultService.removeVault(selectedVault.id, {
            deleteFiles: deleteFiles === 'Yes',
          });
          if (result.success) {
            if (deleteFiles === 'Yes') {
              vscode.window.showInformationMessage(`Vault '${selectedVault.label}' and its files have been removed.`);
            } else {
              vscode.window.showInformationMessage(`Vault '${selectedVault.label}' removed from configuration.`);
            }
            this.refreshViews();
          } else {
            vscode.window.showErrorMessage(`Failed to remove vault: ${result.error.message}`);
          }
        },
      },
    ];

    commandAdapter.registerCommands(commands);
  }

  /**
   * 刷新所有视图
   */
  private refreshViews(): void {
    if (this.documentTreeViewProvider) {
      this.documentTreeViewProvider.refresh();
    }
    if (this.assistantsTreeViewProvider) {
      this.assistantsTreeViewProvider.refresh();
    }
  }

  /**
   * 从 Git URL 中提取仓库名称
   */
  private extractRepoName(url: string): string {
    let cleanUrl = url;
    if (cleanUrl.includes('@') && (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://'))) {
      try {
        const urlObj = new URL(cleanUrl);
        cleanUrl = `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
      } catch {
        // Ignore
      }
    }

    let repoName = cleanUrl.replace(/\.git$/, '');

    if (repoName.includes('://')) {
      const parts = repoName.split('/');
      repoName = parts[parts.length - 1];
    } else if (repoName.includes('@') && repoName.includes(':')) {
      const parts = repoName.split(':');
      const lastPart = parts[parts.length - 1];
      const nameParts = lastPart.split('/');
      repoName = nameParts[nameParts.length - 1];
    }

    return repoName;
  }

  /**
   * 收集 Git 认证信息
   */
  private async collectGitAuth(remoteUrl: string): Promise<{ accessToken?: string; username?: string; password?: string } | null> {
    const isHttpsUrl = remoteUrl.startsWith('http://') || remoteUrl.startsWith('https://');
    if (!isHttpsUrl) {
      return {};
    }

    let authComplete = false;
    let accessToken: string | undefined;
    let username: string | undefined;
    let password: string | undefined;

    while (!authComplete) {
      const authChoice = await vscode.window.showQuickPick(
        [
          { label: 'No authentication', description: 'Public repository' },
          { label: 'Access Token', description: 'Use personal access token' },
          { label: 'Username & Password', description: 'Use username and password' },
        ],
        {
          placeHolder: 'Select authentication method (optional)',
          ignoreFocusOut: false,
        }
      );

      if (!authChoice) {
        return null; // User cancelled
      }

      if (authChoice.label === 'No authentication') {
        authComplete = true;
      } else if (authChoice.label === 'Access Token') {
        const token = await vscode.window.showInputBox({
          prompt: 'Enter access token',
          password: true,
          validateInput: (value) => {
            if (!value || value.trim().length === 0) {
              return 'Access token cannot be empty';
            }
            return null;
          },
        });
        if (token) {
          accessToken = token.trim();
          authComplete = true;
        }
      } else if (authChoice.label === 'Username & Password') {
        const user = await vscode.window.showInputBox({
          prompt: 'Enter username',
          validateInput: (value) => {
            if (!value || value.trim().length === 0) {
              return 'Username cannot be empty';
            }
            return null;
          },
        });
        if (user) {
          const pass = await vscode.window.showInputBox({
            prompt: 'Enter password',
            password: true,
            validateInput: (value) => {
              if (!value || value.trim().length === 0) {
                return 'Password cannot be empty';
              }
              return null;
            },
          });
          if (pass) {
            username = user.trim();
            password = pass.trim();
            authComplete = true;
          }
        }
      }
    }

    return { accessToken, username, password };
  }
}
