import * as vscode from 'vscode';
import { DocumentApplicationService } from '../application/DocumentApplicationService';
import { ArtifactFileSystemApplicationService } from '../../shared/application/ArtifactFileSystemApplicationService';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { Logger } from '../../../core/logger/Logger';
import { CommandAdapter } from '../../../core/vscode-api/CommandAdapter';
import { DocumentTreeViewProvider } from './DocumentTreeViewProvider';

export class DocumentCommands {
  constructor(
    private documentService: DocumentApplicationService,
    private artifactService: ArtifactFileSystemApplicationService,
    private vaultService: VaultApplicationService,
    private logger: Logger,
    private context: vscode.ExtensionContext,
    private treeViewProvider: DocumentTreeViewProvider
  ) {}

  register(commandAdapter: CommandAdapter): void {
    commandAdapter.registerCommands([
      {
        command: 'archi.document.refresh',
        callback: () => {
          this.treeViewProvider.refresh();
        },
      },
      {
        command: 'archi.document.create',
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

          const documentName = await vscode.window.showInputBox({
            prompt: 'Enter document name',
          });

          if (!documentName) {
            return;
          }

          const result = await this.documentService.createDocument(
            selectedVault.id,
            `note/${documentName}.md`,
            documentName,
            `# ${documentName}\n\n`
          );

          if (result.success) {
            vscode.window.showInformationMessage(`Document created: ${documentName}`);
            this.treeViewProvider.refresh();
            const doc = await vscode.workspace.openTextDocument(result.value.contentLocation);
            await vscode.window.showTextDocument(doc);
          } else {
            vscode.window.showErrorMessage(`Failed to create document: ${result.error.message}`);
          }
        },
      },
    ]);
  }
}

