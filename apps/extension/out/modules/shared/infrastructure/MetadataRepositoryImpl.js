"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetadataRepositoryImpl = void 0;
class MetadataRepositoryImpl {
    constructor(yamlRepo) {
        this.metadataCache = new Map();
        this.yamlRepo = yamlRepo;
    }
    async findById(metadataId) {
        if (this.metadataCache.has(metadataId)) {
            return { success: true, value: this.metadataCache.get(metadataId) };
        }
        const result = await this.yamlRepo.readMetadata(metadataId);
        if (result.success && result.value) {
            this.metadataCache.set(metadataId, result.value);
        }
        return result;
    }
    async findByArtifactId(artifactId) {
        // TODO: Implement search by artifactId
        return { success: true, value: null };
    }
    async create(metadata) {
        const result = await this.yamlRepo.writeMetadata(metadata);
        if (result.success) {
            this.metadataCache.set(metadata.id, metadata);
            return { success: true, value: metadata };
        }
        return { success: false, error: result.error };
    }
    async update(metadata) {
        const result = await this.yamlRepo.writeMetadata(metadata);
        if (result.success) {
            this.metadataCache.set(metadata.id, metadata);
            return { success: true, value: metadata };
        }
        return { success: false, error: result.error };
    }
    async delete(metadataId) {
        const result = await this.yamlRepo.deleteMetadata(metadataId);
        if (result.success) {
            this.metadataCache.delete(metadataId);
        }
        return result;
    }
}
exports.MetadataRepositoryImpl = MetadataRepositoryImpl;
//# sourceMappingURL=MetadataRepositoryImpl.js.map