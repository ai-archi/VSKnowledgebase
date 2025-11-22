export interface LookupDocument {
  id: string;
  title: string;
  path: string;
  vaultName: string;
}

export interface LookupState {
  documentName: string;
  documentType: string;
  selectedDocuments: LookupDocument[];
}

export class LookupStateManager {
  private state: LookupState = {
    documentName: '',
    documentType: 'note',
    selectedDocuments: [],
  };

  getState(): LookupState {
    return { ...this.state };
  }

  setState(updates: Partial<LookupState>): void {
    this.state = { ...this.state, ...updates };
  }

  reset(): void {
    this.state = {
      documentName: '',
      documentType: 'note',
      selectedDocuments: [],
    };
  }
}

