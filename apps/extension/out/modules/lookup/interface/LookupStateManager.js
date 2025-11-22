"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LookupStateManager = void 0;
class LookupStateManager {
    constructor() {
        this.state = {
            documentName: '',
            documentType: 'note',
            selectedDocuments: [],
        };
    }
    getState() {
        return { ...this.state };
    }
    setState(updates) {
        this.state = { ...this.state, ...updates };
    }
    reset() {
        this.state = {
            documentName: '',
            documentType: 'note',
            selectedDocuments: [],
        };
    }
}
exports.LookupStateManager = LookupStateManager;
//# sourceMappingURL=LookupStateManager.js.map