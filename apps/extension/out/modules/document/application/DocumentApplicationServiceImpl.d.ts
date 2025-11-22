import { DocumentApplicationService } from './DocumentApplicationService';
import { ArtifactFileSystemApplicationService } from '../../shared/application/ArtifactFileSystemApplicationService';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { Artifact } from '../../../domain/shared/artifact/Artifact';
import { ArtifactError, Result } from '../../../domain/shared/artifact/errors';
import { Logger } from '../../../core/logger/Logger';
export declare class DocumentApplicationServiceImpl implements DocumentApplicationService {
    private artifactService;
    private vaultService;
    private logger;
    constructor(artifactService: ArtifactFileSystemApplicationService, vaultService: VaultApplicationService, logger: Logger);
    listDocuments(vaultId: string): Promise<Result<Artifact[], ArtifactError>>;
    getDocument(vaultId: string, path: string): Promise<Result<Artifact, ArtifactError>>;
    createDocument(vaultId: string, artifactPath: string, title: string, content: string): Promise<Result<Artifact, ArtifactError>>;
    updateDocument(vaultId: string, artifactPath: string, content: string): Promise<Result<Artifact, ArtifactError>>;
    deleteDocument(vaultId: string, path: string): Promise<Result<void, ArtifactError>>;
}
//# sourceMappingURL=DocumentApplicationServiceImpl.d.ts.map