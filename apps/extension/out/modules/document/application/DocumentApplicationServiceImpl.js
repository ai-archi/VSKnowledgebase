"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentApplicationServiceImpl = void 0;
const inversify_1 = require("inversify");
const types_1 = require("../../../infrastructure/di/types");
const errors_1 = require("../../../domain/shared/artifact/errors");
const Logger_1 = require("../../../core/logger/Logger");
let DocumentApplicationServiceImpl = class DocumentApplicationServiceImpl {
    constructor(artifactService, vaultService, logger) {
        this.artifactService = artifactService;
        this.vaultService = vaultService;
        this.logger = logger;
    }
    async listDocuments(vaultId) {
        return this.artifactService.listArtifacts(vaultId);
    }
    async getDocument(vaultId, path) {
        return this.artifactService.getArtifact(vaultId, path);
    }
    async createDocument(vaultId, artifactPath, title, content) {
        const vaultResult = await this.vaultService.getVault(vaultId);
        if (!vaultResult.success) {
            return {
                success: false,
                error: new errors_1.ArtifactError(errors_1.ArtifactErrorCode.NOT_FOUND, `Vault not found: ${vaultId}`),
            };
        }
        return this.artifactService.createArtifact({
            vault: {
                id: vaultResult.value.id,
                name: vaultResult.value.name,
            },
            path: artifactPath,
            title,
            content,
            viewType: 'document',
        });
    }
    async updateDocument(vaultId, artifactPath, content) {
        // Get artifact first to get its ID
        const artifactResult = await this.artifactService.getArtifact(vaultId, artifactPath);
        if (!artifactResult.success) {
            return artifactResult;
        }
        // Update content
        const updateResult = await this.artifactService.updateArtifactContent(vaultId, artifactResult.value.id, content);
        if (!updateResult.success) {
            return {
                success: false,
                error: updateResult.error,
            };
        }
        // Get updated artifact
        return this.artifactService.getArtifact(vaultId, artifactPath);
    }
    async deleteDocument(vaultId, path) {
        return this.artifactService.deleteArtifact(vaultId, path);
    }
};
exports.DocumentApplicationServiceImpl = DocumentApplicationServiceImpl;
exports.DocumentApplicationServiceImpl = DocumentApplicationServiceImpl = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(types_1.TYPES.ArtifactFileSystemApplicationService)),
    __param(1, (0, inversify_1.inject)(types_1.TYPES.VaultApplicationService)),
    __param(2, (0, inversify_1.inject)(types_1.TYPES.Logger)),
    __metadata("design:paramtypes", [Object, Object, Logger_1.Logger])
], DocumentApplicationServiceImpl);
//# sourceMappingURL=DocumentApplicationServiceImpl.js.map