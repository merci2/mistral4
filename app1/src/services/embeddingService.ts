import { pipeline } from '@xenova/transformers';

class EmbeddingService {
  private embedder: any;

  async initialize() {
    this.embedder = await pipeline(
      'feature-extraction',
      'sentence-transformers/all-MiniLM-L6-v2'
    );
  }

  async createEmbedding(text: string): Promise<number[]> {
    const output = await this.embedder(text, {
      pooling: 'mean',
      normalize: true,
    });
    return Array.from(output.data);
  }

  async searchSimilar(query: string, documents: any[], topK = 5) {
    const queryEmbedding = await this.createEmbedding(query);
    
    // Cosine similarity calculation
    const similarities = documents.map(doc => ({
      ...doc,
      similarity: this.cosineSimilarity(queryEmbedding, doc.embedding)
    }));

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, a_i, i) => sum + a_i * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, a_i) => sum + a_i * a_i, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, b_i) => sum + b_i * b_i, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }
}