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
exports.DocumentTreeViewProvider = exports.DocumentTreeItem = void 0;
const vscode = __importStar(require("vscode"));
class DocumentTreeItem extends vscode.TreeItem {
    constructor(artifact, collapsibleState) {
        super(artifact.title, collapsibleState);
        this.artifact = artifact;
        this.collapsibleState = collapsibleState;
        this.tooltip = artifact.path;
        this.command = {
            command: 'vscode.open',
            title: 'Open Document',
            arguments: [vscode.Uri.file(artifact.contentLocation)],
        };
    }
}
exports.DocumentTreeItem = DocumentTreeItem;
class DocumentTreeViewProvider {
    constructor(documentService, vaultService, logger) {
        this.documentService = documentService;
        this.vaultService = vaultService;
        this.logger = logger;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (element) {
            return [];
        }
        try {
            const vaultsResult = await this.vaultService.listVaults();
            if (!vaultsResult.success || vaultsResult.value.length === 0) {
                return [];
            }
            const allItems = [];
            const documentResults = await Promise.all(vaultsResult.value.map(vault => this.documentService.listDocuments(vault.id)));
            for (const documentsResult of documentResults) {
                if (documentsResult.success) {
                    const items = documentsResult.value.map(artifact => new DocumentTreeItem(artifact, vscode.TreeItemCollapsibleState.None));
                    allItems.push(...items);
                }
            }
            return allItems;
        }
        catch (error) {
            this.logger.error('Failed to get document tree items', error);
            return [];
        }
    }
}
exports.DocumentTreeViewProvider = DocumentTreeViewProvider;
//# sourceMappingURL=DocumentTreeViewProvider.js.map