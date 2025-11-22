import * as vscode from 'vscode';
import { DocumentApplicationService } from '../application/DocumentApplicationService';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { Logger } from '../../../core/logger/Logger';
import { Artifact } from '../../../domain/shared/artifact/Artifact';

export class DocumentTreeItem extends vscode.TreeItem {
  constructor(
    public readonly artifact: Artifact,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(artifact.title, collapsibleState);
    this.tooltip = artifact.path;
    this.command = {
      command: 'vscode.open',
      title: 'Open Document',
      arguments: [vscode.Uri.file(artifact.contentLocation)],
    };
  }
}

export class DocumentTreeViewProvider implements vscode.TreeDataProvider<DocumentTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<DocumentTreeItem | undefined | null | void> =
    new vscode.EventEmitter<DocumentTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<DocumentTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  constructor(
    private documentService: DocumentApplicationService,
    private vaultService: VaultApplicationService,
    private logger: Logger
  ) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: DocumentTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: DocumentTreeItem): Promise<DocumentTreeItem[]> {
    if (element) {
      return [];
    }

    try {
      const vaultsResult = await this.vaultService.listVaults();
      if (!vaultsResult.success || vaultsResult.value.length === 0) {
        return [];
      }

      const allItems: DocumentTreeItem[] = [];

      const documentResults = await Promise.all(
        vaultsResult.value.map(vault => this.documentService.listDocuments(vault.id))
      );

      for (const documentsResult of documentResults) {
        if (documentsResult.success) {
          const items = documentsResult.value.map(
            artifact => new DocumentTreeItem(artifact, vscode.TreeItemCollapsibleState.None)
          );
          allItems.push(...items);
        }
      }

      return allItems;
    } catch (error: any) {
      this.logger.error('Failed to get document tree items', error);
      return [];
    }
  }
}

