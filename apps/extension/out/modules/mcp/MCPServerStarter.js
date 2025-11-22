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
exports.MCPServerStarter = void 0;
const inversify_1 = require("inversify");
const types_1 = require("../../infrastructure/di/types");
const Logger_1 = require("../../core/logger/Logger");
let MCPServerStarter = class MCPServerStarter {
    constructor(logger) {
        this.logger = logger;
    }
    async start() {
        // MCP Server implementation will be added later
        this.logger.info('MCP Server starter initialized (not yet implemented)');
    }
    async stop() {
        // Cleanup if needed
    }
};
exports.MCPServerStarter = MCPServerStarter;
exports.MCPServerStarter = MCPServerStarter = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(types_1.TYPES.Logger)),
    __metadata("design:paramtypes", [Logger_1.Logger])
], MCPServerStarter);
//# sourceMappingURL=MCPServerStarter.js.map