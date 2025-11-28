import * as vscode from 'vscode';
import { LookupApplicationService } from '../application/LookupApplicationService';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { Logger } from '../../../core/logger/Logger';
import { LookupStateManager, LookupState } from './LookupStateManager';
import { Artifact } from '../../shared/domain/entity/artifact';

export interface LookupResult {
  create?: boolean;
  artifact?: Artifact;
}

export class NoteLookupProvider {
  public stateManager: LookupStateManager;

  constructor(
    private lookupService: LookupApplicationService,
    private vaultService: VaultApplicationService,
    private logger: Logger
  ) {
    this.stateManager = new LookupStateManager();
  }

  async show(): Promise<LookupResult | undefined> {
    const vaultsResult = await this.vaultService.listVaults();
    if (!vaultsResult.success || vaultsResult.value.length === 0) {
      vscode.window.showErrorMessage('No vaults available');
      return undefined;
    }

    const vaults = vaultsResult.value;
    const vaultItems = vaults.map(v => ({
      label: v.name,
      description: v.description,
      id: v.id,
    }));

    const selectedVault = await vscode.window.showQuickPick(vaultItems, {
      placeHolder: 'Select a vault',
    });

    if (!selectedVault) {
      return undefined;
    }

    const query = await vscode.window.showInputBox({
      prompt: 'Enter search query',
      placeHolder: 'Search for documents...',
    });

    if (query === undefined) {
      return undefined;
    }

    const searchResult = await this.lookupService.search(query, selectedVault.id);
    if (!searchResult.success) {
      vscode.window.showErrorMessage(`Search failed: ${searchResult.error.message}`);
      return undefined;
    }

    if (searchResult.value.length === 0) {
      const createNew = await vscode.window.showQuickPick(
        [
          { label: 'Create new document', value: 'create' },
          { label: 'Cancel', value: 'cancel' },
        ],
        {
          placeHolder: 'No documents found. Create new?',
        }
      );

      if (createNew?.value === 'create') {
        const documentName = await vscode.window.showInputBox({
          prompt: 'Enter document name',
        });
        if (documentName) {
          this.stateManager.setState({
            documentName,
            documentType: 'note',
            selectedDocuments: [],
          });
          return { create: true };
        }
      }

      return undefined;
    }

    const items = searchResult.value.map(a => ({
      label: a.title,
      description: a.path,
      artifact: a,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a document',
    });

    if (selected) {
      return { artifact: selected.artifact };
    }

    return undefined;
  }
}

