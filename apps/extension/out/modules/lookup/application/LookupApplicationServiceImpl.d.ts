import { LookupApplicationService, QuickCreateOptions } from './LookupApplicationService';
import { ArtifactFileSystemApplicationService } from '../../shared/application/ArtifactFileSystemApplicationService';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { Artifact } from '../../../domain/shared/artifact/Artifact';
import { ArtifactError, Result } from '../../../domain/shared/artifact/errors';
import { Logger } from '../../../core/logger/Logger';
export declare class LookupApplicationServiceImpl implements LookupApplicationService {
    private artifactService;
    private vaultService;
    private logger;
    constructor(artifactService: ArtifactFileSystemApplicationService, vaultService: VaultApplicationService, logger: Logger);
    quickCreate(options: QuickCreateOptions): Promise<Result<Artifact, ArtifactError>>;
    search(query: string, vaultId?: string): Promise<Result<Artifact[], ArtifactError>>;
}
//# sourceMappingURL=LookupApplicationServiceImpl.d.ts.map