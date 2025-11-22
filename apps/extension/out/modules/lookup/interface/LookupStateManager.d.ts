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
export declare class LookupStateManager {
    private state;
    getState(): LookupState;
    setState(updates: Partial<LookupState>): void;
    reset(): void;
}
//# sourceMappingURL=LookupStateManager.d.ts.map