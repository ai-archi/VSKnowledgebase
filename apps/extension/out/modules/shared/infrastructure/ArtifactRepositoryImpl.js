"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtifactRepositoryImpl = void 0;
class ArtifactRepositoryImpl {
    constructor(fileAdapter) {
        this.fileAdapter = fileAdapter;
    }
    async findById(vaultId, artifactId) {
        // TODO: Implement
        return { success: true, value: null };
    }
    async findByPath(vaultId, path) {
        // TODO: Implement
        return { success: true, value: null };
    }
    async findAll(vaultId) {
        // TODO: Implement
        return { success: true, value: [] };
    }
    async save(artifact) {
        // TODO: Implement
        return { success: true, value: undefined };
    }
    async delete(vaultId, artifactId) {
        // TODO: Implement
        return { success: true, value: undefined };
    }
}
exports.ArtifactRepositoryImpl = ArtifactRepositoryImpl;
//# sourceMappingURL=ArtifactRepositoryImpl.js.map