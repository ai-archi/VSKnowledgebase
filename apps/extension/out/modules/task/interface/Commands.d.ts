import * as vscode from 'vscode';
import { TaskApplicationService } from '../application/TaskApplicationService';
import { Logger } from '../../../core/logger/Logger';
import { CommandAdapter } from '../../../core/vscode-api/CommandAdapter';
import { TaskTreeDataProvider } from './TaskTreeDataProvider';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
export declare class TaskCommands {
    private taskService;
    private logger;
    private context;
    private treeDataProvider;
    private vaultService;
    constructor(taskService: TaskApplicationService, logger: Logger, context: vscode.ExtensionContext, treeDataProvider: TaskTreeDataProvider, vaultService: VaultApplicationService);
    register(commandAdapter: CommandAdapter): void;
}
//# sourceMappingURL=Commands.d.ts.map