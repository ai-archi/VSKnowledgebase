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
exports.LookupApplicationServiceImpl = void 0;
const inversify_1 = require("inversify");
const types_1 = require("../../../infrastructure/di/types");
const errors_1 = require("../../../domain/shared/artifact/errors");
const Logger_1 = require("../../../core/logger/Logger");
let LookupApplicationServiceImpl = class LookupApplicationServiceImpl {
    constructor(artifactService, vaultService, logger) {
        this.artifactService = artifactService;
        this.vaultService = vaultService;
        this.logger = logger;
    }
    async quickCreate(options) {
        try {
            // Get vault first
            const vaultResult = await this.vaultService.getVault(options.vaultId);
            if (!vaultResult.success) {
                return {
                    success: false,
                    error: new errors_1.ArtifactError(errors_1.ArtifactErrorCode.NOT_FOUND, `Vault not found: ${options.vaultId}`),
                };
            }
            const vaultRef = {
                id: vaultResult.value.id,
                name: vaultResult.value.name,
            };
            const result = await this.artifactService.createArtifact({
                vault: vaultRef,
                path: `${options.viewType}/${options.title}.md`,
                title: options.title,
                content: options.content,
                viewType: options.viewType,
            });
            if (result.success) {
                return { success: true, value: result.value };
            }
            return result;
        }
        catch (error) {
            this.logger.error('Failed to quick create artifact', error);
            return {
                success: false,
                error: new errors_1.ArtifactError(errors_1.ArtifactErrorCode.OPERATION_FAILED, error.message || 'Failed to create artifact'),
            };
        }
    }
    async search(query, vaultId) {
        try {
            if (vaultId) {
                const result = await this.artifactService.listArtifacts(vaultId);
                if (result.success) {
                    const filtered = result.value.filter(a => a.title.toLowerCase().includes(query.toLowerCase()) ||
                        a.path.toLowerCase().includes(query.toLowerCase()));
                    return { success: true, value: filtered };
                }
                return result;
            }
            // Search across all vaults
            // This would require getting all vaults first
            return {
                success: false,
                error: new errors_1.ArtifactError(errors_1.ArtifactErrorCode.OPERATION_FAILED, 'Cross-vault search not yet implemented'),
            };
        }
        catch (error) {
            this.logger.error('Failed to search artifacts', error);
            return {
                success: false,
                error: new errors_1.ArtifactError(errors_1.ArtifactErrorCode.OPERATION_FAILED, error.message || 'Failed to search artifacts'),
            };
        }
    }
};
exports.LookupApplicationServiceImpl = LookupApplicationServiceImpl;
exports.LookupApplicationServiceImpl = LookupApplicationServiceImpl = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(types_1.TYPES.ArtifactFileSystemApplicationService)),
    __param(1, (0, inversify_1.inject)(types_1.TYPES.VaultApplicationService)),
    __param(2, (0, inversify_1.inject)(types_1.TYPES.Logger)),
    __metadata("design:paramtypes", [Object, Object, Logger_1.Logger])
], LookupApplicationServiceImpl);
//# sourceMappingURL=LookupApplicationServiceImpl.js.map