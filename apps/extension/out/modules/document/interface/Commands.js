"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentCommands = void 0;
const vscode = __importStar(require("vscode"));
class DocumentCommands {
    constructor(documentService, artifactService, vaultService, logger, context, treeViewProvider) {
        this.documentService = documentService;
        this.artifactService = artifactService;
        this.vaultService = vaultService;
        this.logger = logger;
        this.context = context;
        this.treeViewProvider = treeViewProvider;
    }
    register(commandAdapter) {
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
                    const result = await this.documentService.createDocument(selectedVault.id, `note/${documentName}.md`, documentName, `# ${documentName}\n\n`);
                    if (result.success) {
                        vscode.window.showInformationMessage(`Document created: ${documentName}`);
                        this.treeViewProvider.refresh();
                        const doc = await vscode.workspace.openTextDocument(result.value.contentLocation);
                        await vscode.window.showTextDocument(doc);
                    }
                    else {
                        vscode.window.showErrorMessage(`Failed to create document: ${result.error.message}`);
                    }
                },
            },
        ]);
    }
}
exports.DocumentCommands = DocumentCommands;
//# sourceMappingURL=Commands.js.map