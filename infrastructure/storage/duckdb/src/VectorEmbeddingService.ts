import { pipeline } from '@xenova/transformers';

/**
 * 向量嵌入服务
 * 提供文本向量化功能
 */
export class VectorEmbeddingService {
  private embedder: any = null;
  private initialized: boolean = false;
  private readonly dimension = 384; // all-MiniLM-L6-v2 模型维度
  private readonly modelName = 'Xenova/all-MiniLM-L6-v2';

  /**
   * 初始化嵌入模型（懒加载）
   */
  async initialize(): Promise<void> {
    if (this.initialized && this.embedder) {
      return;
    }

    try {
      // 使用 @xenova/transformers 加载模型
      this.embedder = await pipeline(
        'feature-extraction',
        this.modelName,
        { quantized: true } // 使用量化模型以减少内存占用
      );
      this.initialized = true;
    } catch (error: any) {
      throw new Error(`Failed to initialize embedding model: ${error.message}`);
    }
  }

  /**
   * 将文本转换为向量
   * @param text 输入文本
   * @returns 向量数组（384 维）
   */
  async embed(text: string): Promise<number[]> {
    await this.initialize();

    if (!this.embedder) {
      throw new Error('Embedder not initialized');
    }

    try {
      const output = await this.embedder(text, {
        pooling: 'mean',
        normalize: true,
      });

      // 转换为数组并确保维度正确
      const vector = Array.from(output.data);
      if (vector.length !== this.dimension) {
        throw new Error(`Unexpected vector dimension: ${vector.length}, expected ${this.dimension}`);
      }

      return vector;
    } catch (error: any) {
      throw new Error(`Failed to embed text: ${error.message}`);
    }
  }

  /**
   * 批量嵌入（更高效）
   * @param texts 文本数组
   * @returns 向量数组的数组
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    await this.initialize();

    if (!this.embedder) {
      throw new Error('Embedder not initialized');
    }

    if (texts.length === 0) {
      return [];
    }

    try {
      // 批量处理
      const outputs = await Promise.all(
        texts.map(text => this.embed(text))
      );

      return outputs;
    } catch (error: any) {
      throw new Error(`Failed to embed batch: ${error.message}`);
    }
  }

  /**
   * 获取向量维度
   */
  getDimension(): number {
    return this.dimension;
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized && this.embedder !== null;
  }

  /**
   * 释放资源
   */
  async dispose(): Promise<void> {
    this.embedder = null;
    this.initialized = false;
  }
}

