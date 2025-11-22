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
exports.NoteLookupProvider = void 0;
const vscode = __importStar(require("vscode"));
const LookupStateManager_1 = require("./LookupStateManager");
class NoteLookupProvider {
    constructor(lookupService, vaultService, logger) {
        this.lookupService = lookupService;
        this.vaultService = vaultService;
        this.logger = logger;
        this.stateManager = new LookupStateManager_1.LookupStateManager();
    }
    async show() {
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
            const createNew = await vscode.window.showQuickPick([
                { label: 'Create new document', value: 'create' },
                { label: 'Cancel', value: 'cancel' },
            ], {
                placeHolder: 'No documents found. Create new?',
            });
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
exports.NoteLookupProvider = NoteLookupProvider;
//# sourceMappingURL=NoteLookupProvider.js.map