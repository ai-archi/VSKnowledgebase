import * as vscode from 'vscode';
import { TaskApplicationService } from '../application/TaskApplicationService';
import { Logger } from '../../../core/logger/Logger';
import { CommandAdapter } from '../../../core/vscode-api/CommandAdapter';
import { TaskTreeDataProvider } from './TaskTreeDataProvider';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';

export class TaskCommands {
  constructor(
    private taskService: TaskApplicationService,
    private logger: Logger,
    private context: vscode.ExtensionContext,
    private treeDataProvider: TaskTreeDataProvider,
    private vaultService: VaultApplicationService
  ) {}

  register(commandAdapter: CommandAdapter): void {
    commandAdapter.registerCommands([
      {
        command: 'archi.task.refresh',
        callback: () => {
          this.treeDataProvider.refresh();
        },
      },
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
            this.treeDataProvider.refresh();
          } else {
            vscode.window.showErrorMessage(`Failed to create task: ${result.error.message}`);
          }
        },
      },
    ]);
  }
}

