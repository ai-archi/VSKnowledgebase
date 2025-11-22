import * as vscode from 'vscode';
import { DocumentApplicationService } from '../application/DocumentApplicationService';
import { ArtifactFileSystemApplicationService } from '../../shared/application/ArtifactFileSystemApplicationService';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { Logger } from '../../../core/logger/Logger';
import { CommandAdapter } from '../../../core/vscode-api/CommandAdapter';
import { DocumentTreeViewProvider } from './DocumentTreeViewProvider';
export declare class DocumentCommands {
    private documentService;
    private artifactService;
    private vaultService;
    private logger;
    private context;
    private treeViewProvider;
    constructor(documentService: DocumentApplicationService, artifactService: ArtifactFileSystemApplicationService, vaultService: VaultApplicationService, logger: Logger, context: vscode.ExtensionContext, treeViewProvider: DocumentTreeViewProvider);
    register(commandAdapter: CommandAdapter): void;
}
//# sourceMappingURL=Commands.d.ts.map