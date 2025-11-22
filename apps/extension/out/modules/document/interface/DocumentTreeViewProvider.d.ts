import * as vscode from 'vscode';
import { DocumentApplicationService } from '../application/DocumentApplicationService';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { Logger } from '../../../core/logger/Logger';
import { Artifact } from '../../../domain/shared/artifact/Artifact';
export declare class DocumentTreeItem extends vscode.TreeItem {
    readonly artifact: Artifact;
    readonly collapsibleState: vscode.TreeItemCollapsibleState;
    constructor(artifact: Artifact, collapsibleState: vscode.TreeItemCollapsibleState);
}
export declare class DocumentTreeViewProvider implements vscode.TreeDataProvider<DocumentTreeItem> {
    private documentService;
    private vaultService;
    private logger;
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<DocumentTreeItem | undefined | null | void>;
    constructor(documentService: DocumentApplicationService, vaultService: VaultApplicationService, logger: Logger);
    refresh(): void;
    getTreeItem(element: DocumentTreeItem): vscode.TreeItem;
    getChildren(element?: DocumentTreeItem): Promise<DocumentTreeItem[]>;
}
//# sourceMappingURL=DocumentTreeViewProvider.d.ts.map