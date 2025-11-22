import { Logger } from '../logger/Logger';
export declare class EventBus {
    private listeners;
    private logger?;
    constructor(logger?: Logger);
    emit(event: string, data?: any): void;
    on(event: string, handler: (data: any) => void): void;
    off(event: string, handler: (data: any) => void): void;
    clear(): void;
}
//# sourceMappingURL=EventBus.d.ts.map