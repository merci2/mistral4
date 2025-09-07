interface Document {
  id: string;
  title: string;
  content: string;
  embedding: number[];
  metadata: {
    source: 'website' | 'upload' | 'manual';
    createdAt: Date;
    url?: string;
    fileType?: string;
  };
}

class KnowledgeBaseService {
  private documents: Document[] = [];
  private embeddingService: EmbeddingService;

  constructor(embeddingService: EmbeddingService) {
    this.embeddingService = embeddingService;
  }

  async addDocument(title: string, content: string, metadata: any): Promise<string> {
    const id = this.generateId();
    const embedding = await this.embeddingService.createEmbedding(content);
    
    const document: Document = {
      id,
      title,
      content,
      embedding,
      metadata: {
        ...metadata,
        createdAt: new Date()
      }
    };

    this.documents.push(document);
    this.saveToLocalStorage();
    return id;
  }

  async search(query: string, topK = 3): Promise<Document[]> {
    return await this.embeddingService.searchSimilar(
      query,
      this.documents,
      topK
    );
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private saveToLocalStorage() {
    // Note: In production, use proper database
    try {
      localStorage.setItem('knowledgeBase', JSON.stringify(this.documents));
    } catch (error) {
      console.warn('Could not save to localStorage:', error);
    }
  }
}