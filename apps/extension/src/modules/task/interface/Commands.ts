import * as vscode from 'vscode';
import * as path from 'path';
import { TaskApplicationService } from '../application/TaskApplicationService';
import { Logger } from '../../../core/logger/Logger';
import { CommandAdapter } from '../../../core/vscode-api/CommandAdapter';
import { TaskTreeDataProvider, TaskTreeItem } from './TaskTreeDataProvider';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { ArtifactApplicationService } from '../../shared/application/ArtifactApplicationService';
import { WebviewAdapter } from '../../../core/vscode-api/WebviewAdapter';
import { BaseFileTreeCommands } from '../../shared/interface/commands/BaseFileTreeCommands';
import { FileTreeDomainService } from '../../shared/domain/services/FileTreeDomainService';
import { FileOperationDomainService } from '../../shared/domain/services/FileOperationDomainService';

export class TaskCommands extends BaseFileTreeCommands<TaskTreeItem> {
  constructor(
    private taskService: TaskApplicationService,
    artifactService: ArtifactApplicationService,
    vaultService: VaultApplicationService,
    fileTreeDomainService: FileTreeDomainService,
    fileOperationDomainService: FileOperationDomainService,
    logger: Logger,
    context: vscode.ExtensionContext,
    treeViewProvider: TaskTreeDataProvider,
    treeView: vscode.TreeView<vscode.TreeItem>,
    webviewAdapter: WebviewAdapter
  ) {
    super(
      vaultService,
      artifactService,
      fileTreeDomainService,
      fileOperationDomainService,
      logger,
      context,
      treeViewProvider,
      treeView,
      webviewAdapter
    );
  }

  // ==================== 实现抽象方法 ====================

  protected getRefreshCommandName(): string {
    return 'archi.task.refresh';
  }

  protected getExpandAllCommandName(): string {
    return 'archi.task.expandAll';
  }

  protected getCollapseAllCommandName(): string {
    return 'archi.task.collapseAll';
  }

  protected getCreateFileCommandName(): string {
    return 'archi.task.addFile';
  }

  protected getCreateFolderCommandName(): string {
    return 'archi.task.addFolder';
  }

  protected getDeleteCommandName(): string {
    return 'archi.task.delete';
  }

  protected async handleDelete(item: TaskTreeItem): Promise<void> {
    // 先判断是否是文件或文件夹（优先级高于 vault）
    if (item.filePath || item.folderPath !== undefined) {
      // 删除文件或文件夹
      let filePath: string;
      let vaultId: string;
      let fileName: string;
      let isFolder = false;

      if (item.filePath) {
        filePath = item.filePath;
        vaultId = item.vaultId!;
        fileName = path.basename(filePath);
      } else if (item.folderPath !== undefined) {
        filePath = item.folderPath;
        vaultId = item.vaultId!;
        fileName = path.basename(item.folderPath) || item.folderPath;
        isFolder = true;
      } else {
        vscode.window.showErrorMessage('Unable to determine item to delete');
        return;
      }

      const vault = await this.findVaultByName(item.vaultName!);
      if (!vault) {
        vscode.window.showErrorMessage(`Vault not found: ${item.vaultName}`);
        return;
      }

      const confirm = await vscode.window.showWarningMessage(
        `Are you sure you want to delete ${isFolder ? 'folder' : 'file'} '${fileName}'? This action cannot be undone.`,
        { modal: true },
        'Delete'
      );

      if (confirm !== 'Delete') {
        return;
      }

      const result = await this.artifactService.delete(
        { id: vaultId, name: item.vaultName! },
        filePath,
        isFolder
      );

      if (result.success) {
        vscode.window.showInformationMessage(`${isFolder ? 'Folder' : 'File'} '${fileName}' deleted`);
        this.treeViewProvider.refresh();
      } else {
        vscode.window.showErrorMessage(`Failed to delete ${isFolder ? 'folder' : 'file'}: ${result.error.message}`);
      }
    } else if (item.vaultName && item.folderPath === undefined && item.filePath === undefined) {
      // 删除 vault（只有在没有 folderPath 和 filePath 的情况下才是 vault 节点）
      const confirm = await vscode.window.showWarningMessage(
        `Are you sure you want to delete vault '${item.vaultName}'? This action cannot be undone.`,
        { modal: true },
        'Delete'
      );

      if (confirm !== 'Delete') {
        return;
      }

      const vaultName = item.vaultName;
      if (!vaultName) {
        vscode.window.showErrorMessage('Vault name not found');
        return;
      }

      const vault = await this.findVaultByName(vaultName);
      if (!vault) {
        vscode.window.showErrorMessage(`Vault not found: ${vaultName}`);
        return;
      }

      const result = await this.vaultService.removeVault(vault.id);
      if (result.success) {
        vscode.window.showInformationMessage(`Vault '${vaultName}' deleted`);
        this.treeViewProvider.refresh();
      } else {
        vscode.window.showErrorMessage(`Failed to delete vault: ${result.error.message}`);
      }
    } else {
      vscode.window.showErrorMessage('Please select a vault, folder, or file to delete');
    }
  }

  // ==================== 注册特定命令 ====================

  protected registerSpecificCommands(commandAdapter: CommandAdapter): void {
    // 注册任务视图特定的命令
    commandAdapter.registerCommands([
      {
        command: 'archi.task.create',
        callback: async () => {
          const vaultsResult = await this.vaultService.listVaults();
          if (!vaultsResult.success || vaultsResult.value.length === 0) {
            vscode.window.showErrorMessage('No vaults available');
            return;
          }

          const vaultItems = vaultsResult.value.map(v => ({
            label: v.name,
            description: v.description,
            id: v.id,
          }));

          const selectedVault = await vscode.window.showQuickPick(vaultItems, {
            placeHolder: 'Select a vault',
          });

          if (!selectedVault) {
            return;
          }

          const taskTitle = await vscode.window.showInputBox({
            prompt: 'Enter task title',
          });

          if (!taskTitle) {
            return;
          }

          const result = await this.taskService.createTask({
            vaultId: selectedVault.id,
            artifactPath: `task/${taskTitle}.md`,
            title: taskTitle,
            status: 'pending',
          });

          if (result.success) {
            vscode.window.showInformationMessage(`Task created: ${taskTitle}`);
            this.treeViewProvider.refresh();
          } else {
            vscode.window.showErrorMessage(`Failed to create task: ${result.error.message}`);
          }
        },
      },
    ]);
  }
}

