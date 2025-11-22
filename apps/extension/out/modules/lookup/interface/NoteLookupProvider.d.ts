import { LookupApplicationService } from '../application/LookupApplicationService';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { Logger } from '../../../core/logger/Logger';
import { LookupStateManager } from './LookupStateManager';
import { Artifact } from '../../../domain/shared/artifact/Artifact';
export interface LookupResult {
    create?: boolean;
    artifact?: Artifact;
}
export declare class NoteLookupProvider {
    private lookupService;
    private vaultService;
    private logger;
    stateManager: LookupStateManager;
    constructor(lookupService: LookupApplicationService, vaultService: VaultApplicationService, logger: Logger);
    show(): Promise<LookupResult | undefined>;
}
//# sourceMappingURL=NoteLookupProvider.d.ts.map