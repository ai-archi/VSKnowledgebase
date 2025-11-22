import { TaskApplicationService, Task, CreateTaskOptions } from './TaskApplicationService';
import { ArtifactFileSystemApplicationService } from '../../shared/application/ArtifactFileSystemApplicationService';
import { MetadataRepository } from '../../shared/infrastructure/MetadataRepository';
import { ArtifactError, Result } from '../../../domain/shared/artifact/errors';
import { Logger } from '../../../core/logger/Logger';
export declare class TaskApplicationServiceImpl implements TaskApplicationService {
    private artifactService;
    private metadataRepository;
    private logger;
    constructor(artifactService: ArtifactFileSystemApplicationService, metadataRepository: MetadataRepository, logger: Logger);
    listTasks(vaultId?: string, status?: Task['status']): Promise<Result<Task[], ArtifactError>>;
    createTask(options: CreateTaskOptions): Promise<Result<Task, ArtifactError>>;
    updateTask(taskId: string, updates: Partial<Task>): Promise<Result<Task, ArtifactError>>;
    deleteTask(taskId: string): Promise<Result<void, ArtifactError>>;
}
//# sourceMappingURL=TaskApplicationServiceImpl.d.ts.map