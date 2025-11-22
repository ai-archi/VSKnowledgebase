"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorSearchUtils = void 0;
const DuckDbFactory_1 = require("./DuckDbFactory");
class VectorSearchUtils {
    constructor(factory, dbPath, logger) {
        this.knex = null;
        this.embedder = null;
        this.initialized = false;
        this.dimension = 384; // all-MiniLM-L6-v2 模型维度
        this.factory = factory;
        this.dbPath = dbPath;
        this.logger = logger;
    }
    async initialize() {
        if (this.initialized) {
            return;
        }
        this.knex = DuckDbFactory_1.DuckDbFactory.createConnection(this.dbPath, this.logger);
        // Install and load VSS extension
        await this.knex.raw('INSTALL vss;');
        await this.knex.raw('LOAD vss;');
        // Create table for vector embeddings
        await this.knex.schema.createTableIfNotExists('artifact_metadata_vectors', (table) => {
            table.string('artifact_id').primary();
            table.string('title');
            table.string('description');
            table.specificType('embedding', 'DOUBLE[]');
            table.timestamp('updated_at');
        });
        try {
            const { pipeline } = await Promise.resolve().then(() => __importStar(require('@xenova/transformers')));
            this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        }
        catch (error) {
            this.logger?.warn('Failed to load transformer model, vector search will be disabled', error);
        }
        this.initialized = true;
    }
    async embed(text) {
        if (!this.embedder) {
            await this.initialize();
        }
        if (!this.embedder) {
            return [];
        }
        const output = await this.embedder(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data);
    }
    async search(query, limit = 10) {
        if (!this.knex) {
            throw new Error('Database not initialized');
        }
        await this.initialize();
        if (!this.embedder) {
            return [];
        }
        const queryVector = await this.embed(query);
        try {
            const results = await this.knex('artifact_metadata_vectors')
                .select('artifact_id')
                .orderByRaw('cosine_similarity(embedding, ?)', [queryVector])
                .limit(limit);
            return results.map((r) => r.artifact_id);
        }
        catch (error) {
            this.logger?.warn('Vector search not available, falling back to empty results:', error);
            return [];
        }
    }
    async upsertVector(artifactId, title, description) {
        if (!this.knex) {
            throw new Error('Database not initialized');
        }
        await this.initialize();
        if (!this.embedder) {
            return;
        }
        const text = `${title} ${description}`.trim();
        const embedding = await this.embed(text);
        await this.knex('artifact_metadata_vectors').insert({
            artifact_id: artifactId,
            title,
            description,
            embedding,
            updated_at: this.knex.fn.now(),
        }).onConflict('artifact_id').merge();
    }
    async removeVector(artifactId) {
        if (!this.knex) {
            throw new Error('Database not initialized');
        }
        await this.knex('artifact_metadata_vectors').where({ artifact_id: artifactId }).delete();
    }
}
exports.VectorSearchUtils = VectorSearchUtils;
//# sourceMappingURL=VectorSearchUtils.js.map